require('dotenv').config();

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(cors());

const environment = process.env.MPESA_ENV || 'sandbox';
const consumerKey = process.env.MPESA_CONSUMER_KEY || process.env.CONSUMER_KEY;
const consumerSecret = process.env.MPESA_CONSUMER_SECRET || process.env.CONSUMER_SECRET;
const businessShortcode = process.env.MPESA_SHORTCODE || '174379';
const passkey = process.env.MPESA_PASSKEY;
const callbackUrl = process.env.MPESA_CALLBACK_URL;

function normalizePhone(value) {
	let phone = String(value || '').replace(/\D/g, '');
	if (phone.startsWith('0')) phone = `254${phone.slice(1)}`;
	if (phone.startsWith('7') && phone.length === 9) phone = `254${phone}`;
	return phone;
}

function darajaUrls() {
	const host = environment === 'production'
		? 'https://api.safaricom.co.ke'
		: 'https://sandbox.safaricom.co.ke';
	return {
		oauth: `${host}/oauth/v1/generate?grant_type=client_credentials`,
		stk: `${host}/mpesa/stkpush/v1/processrequest`
	};
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

async function getDarajaToken() {
	const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
	const response = await axios.get(darajaUrls().oauth, {
		headers: { Authorization: `Basic ${auth}` },
		timeout: 15000
	});
	return response.data.access_token;
}

async function handleStkPush(req, res) {
	const phoneNumber = normalizePhone(req.body.phoneNumber || req.body.phone);
	const amount = Number(req.body.amount);

	if (!/^2547\d{8}$/.test(phoneNumber)) {
		return res.status(400).json({ success: false, error: 'Use a valid Kenyan Safaricom number, for example 254712345678.' });
	}
	if (!Number.isInteger(amount) || amount < 1) {
		return res.status(400).json({ success: false, error: 'Amount must be a positive whole number.' });
	}
	const missingConfig = [
		['CONSUMER_KEY or MPESA_CONSUMER_KEY', consumerKey],
		['CONSUMER_SECRET or MPESA_CONSUMER_SECRET', consumerSecret],
		['MPESA_PASSKEY', passkey],
		['MPESA_CALLBACK_URL', callbackUrl]
	].filter(([, value]) => !value).map(([name]) => name);
	if (missingConfig.length) {
		return res.status(500).json({
			success: false,
			error: `M-Pesa configuration is incomplete. Add these values to .env: ${missingConfig.join(', ')}.`
		});
	}

	try {
		const token = await getDarajaToken();
		const timestamp = darajaTimestamp();
		const password = Buffer.from(`${businessShortcode}${passkey}${timestamp}`).toString('base64');
		const payload = {
			BusinessShortCode: businessShortcode,
			Password: password,
			Timestamp: timestamp,
			TransactionType: 'CustomerPayBillOnline',
			Amount: amount,
			PartyA: phoneNumber,
			PartyB: businessShortcode,
			PhoneNumber: phoneNumber,
			CallBackURL: callbackUrl,
			AccountReference: String(req.body.accountReference || 'JerseySport').slice(0, 12),
			TransactionDesc: String(req.body.transactionDesc || 'Jersey Purchase').slice(0, 13)
		};
		const response = await axios.post(darajaUrls().stk, payload, {
			headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
			timeout: 20000
		});
		return res.json({ success: true, data: response.data });
	} catch (error) {
		const providerError = error.response?.data || error.message;
		console.error('M-Pesa request failed:', providerError);
		return res.status(502).json({ success: false, error: providerError });
	}
}

app.post('/mpesa', handleStkPush);
app.post('/api/stk-push', handleStkPush);

app.get('/health', (_req, res) => res.json({ ok: true, environment }));

app.listen(port, () => {
	console.log(`M-Pesa backend running on http://localhost:${port}`);
});
