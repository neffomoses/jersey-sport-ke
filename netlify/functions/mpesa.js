const axios = require('axios');

function normalizePhone(value) {
  let phone = String(value || '').replace(/\D/g, '');
  if (phone.startsWith('0')) phone = `254${phone.slice(1)}`;
  if (phone.startsWith('7') && phone.length === 9) phone = `254${phone}`;
  return phone;
}

function darajaTimestamp() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date()).reduce((values, part) => {
    if (part.type !== 'literal') values[part.type] = part.value;
    return values;
  }, {});

  return `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}${parts.second}`;
}

function jsonResponse(statusCode, data) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { Allow: 'POST' },
      body: 'Method Not Allowed'
    };
  }

  let request;
  try {
    const body = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString('utf8')
      : event.body;
    request = JSON.parse(body || '{}');
  } catch {
    return jsonResponse(400, { success: false, error: 'Request body must be valid JSON.' });
  }
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    return jsonResponse(400, { success: false, error: 'Request body must be a JSON object.' });
  }

  const phoneNumber = normalizePhone(request.phoneNumber || request.phone);
  const amount = Number(request.amount);
  if (!/^2547\d{8}$/.test(phoneNumber)) {
    return jsonResponse(400, {
      success: false,
      error: 'Use a valid Kenyan Safaricom number, for example 254712345678.'
    });
  }
  if (!Number.isInteger(amount) || amount < 1) {
    return jsonResponse(400, { success: false, error: 'Amount must be a positive whole number.' });
  }

  const environment = process.env.MPESA_ENV || 'sandbox';
  const consumerKey = process.env.MPESA_CONSUMER_KEY || process.env.CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET || process.env.CONSUMER_SECRET;
  const shortCode = process.env.MPESA_SHORTCODE || '174379';
  const passkey = process.env.MPESA_PASSKEY;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;
  const missingConfig = [
    ['CONSUMER_KEY or MPESA_CONSUMER_KEY', consumerKey],
    ['CONSUMER_SECRET or MPESA_CONSUMER_SECRET', consumerSecret],
    ['MPESA_PASSKEY', passkey],
    ['MPESA_CALLBACK_URL', callbackUrl]
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missingConfig.length) {
    return jsonResponse(500, {
      success: false,
      error: `M-Pesa configuration is incomplete. Add these values to the environment: ${missingConfig.join(', ')}.`
    });
  }

  const host = environment === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';

  try {
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const tokenResponse = await axios.get(
      `${host}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: { Authorization: `Basic ${auth}` },
        timeout: 15000
      }
    );
    const timestamp = darajaTimestamp();
    const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');
    const payload = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: shortCode,
      PhoneNumber: phoneNumber,
      CallBackURL: callbackUrl,
      AccountReference: String(request.accountReference || 'JerseySport').slice(0, 12),
      TransactionDesc: String(request.transactionDesc || 'Jersey Purchase').slice(0, 13)
    };
    const response = await axios.post(
      `${host}/mpesa/stkpush/v1/processrequest`,
      payload,
      {
        headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` },
        timeout: 20000
      }
    );

    return jsonResponse(200, { success: true, data: response.data });
  } catch (error) {
    const providerError = error.response?.data || error.message;
    console.error('M-Pesa request failed:', providerError);
    return jsonResponse(502, { success: false, error: providerError });
  }
};
