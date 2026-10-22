<<<<<<< HEAD
# jersey-sport-ke
jersey selling website
=======
# Jersey Sporty Sport

A football-themed Kenya online jersey store with product categories, a cart, and PHP/MySQL backend for order inquiries.

## Files

- `index.html` – main storefront page
- `styles.css` – football-themed styling
- `script.js` – cart and frontend interaction logic
- `submit_order.php` – backend order submission script
- `db.sql` – MySQL database and orders table setup

## Setup Instructions

1. Install PHP and MySQL if not already installed.
2. Place the project folder in your VS Code workspace.
3. Create the database:
   - Open your MySQL client or phpMyAdmin.
   - Run the SQL in `db.sql`.

4. Update database credentials in `submit_order.php` if needed:
   - `$host`
   - `$user`
   - `$password`
   - `$database`

5. Optional: enable SMTP email order notifications by creating a `.env` file from `.env.example` and adding your SMTP credentials.

   To enable reliable SMTP sending from the server, install PHPMailer via Composer and add SMTP credentials to `.env`:

   ```bash
   composer require phpmailer/phpmailer
   ```

   Example `.env` entries:

   ```text
   SMTP_HOST=smtp.mailprovider.com
   SMTP_PORT=587
   SMTP_USER=your_smtp_username
   SMTP_PASS=your_smtp_password
   SMTP_SECURE=tls
   MAIL_FROM_ADDRESS=no-reply@yourdomain.com
   MAIL_FROM_NAME="Jersey Sport"
   OWNER_EMAIL=info@jerseysportke.fit
   ```

PHPMailer will now auto-select a secure transport when `SMTP_SECURE` is not provided:
- Port 465 → `ssl`
- Port 587 or 2525 → `tls`
- Any other port → opportunistic TLS (`SMTPAutoTLS`) is used

If your SMTP provider uses a self-signed certificate (development environments), add:

```text
SMTP_ALLOW_SELF_SIGNED=true
```

### Abandoned-cart email reminder

The checkout contact form offers an optional, unchecked consent for one cart reminder. No account is required. After consent, the cart is queued for one email after one hour; a submitted order cancels any pending reminder for that email address. Configure the database and SMTP settings in `.env`, then install dependencies with `composer install`.

Run the sender once to verify its configuration:

```powershell
php send_abandoned_cart_reminders.php
```

For automatic delivery on Windows, create a Task Scheduler task that runs hourly. Set the program to your PHP CLI executable (for example `C:\xampp\php\php.exe`), the argument to the full path of `send_abandoned_cart_reminders.php`, and “Start in” to the project folder. On Linux, an equivalent hourly cron entry is:

```cron
0 * * * * /usr/bin/php /path/to/jersey-sport/send_abandoned_cart_reminders.php
```

6. Start the PHP server from the project folder:

```powershell
php -S localhost:8000
```

6. Open your browser at:

```
http://localhost:8000/index.html
```

## Notes

- The store includes World Cup, EPL, LaLiga, UEFA Giants, and Retro jersey categories.
- Add items to cart and submit an order inquiry.
- Contact details are included in the sidebar: `0741465524`, `info@jerseysportke.fit`, and Instagram `@jersey.s.p.o.r.t`.

## Optional

- Replace placeholder jersey images in `index.html` with real photos.
- Add real payment or checkout logic if you want to make the store production-ready.
## Payment

- Payment method: MPESA send money
- MPESA number: `0741465524`

### M-Pesa STK Push (sandbox)

The checkout uses `server.js` for Daraja STK Push requests. Install dependencies and start it from this folder:

```powershell
npm.cmd install
node server.js
```

Set these values in `.env` before testing:

```text
MPESA_ENV=sandbox
MPESA_CONSUMER_KEY=your_daraja_consumer_key
MPESA_CONSUMER_SECRET=your_daraja_consumer_secret
MPESA_SHORTCODE=174379
MPESA_TILL_NUMBER=1840947
MPESA_PASSKEY=your_sandbox_passkey
MPESA_CALLBACK_URL=https://your-public-https-url/api/mpesa_callback.php
```

The Express service uses the Buy Goods transaction type, rounds the submitted amount to an integer, and uses the configured Till as `PartyB` (default `1840947`). `MPESA_SHORTCODE` must be the business shortcode used with your passkey.

Set `MPESA_ENV=production` when using production Daraja credentials; keep it set to `sandbox` while testing. The callback URL must be publicly reachable over HTTPS; `localhost` will not receive Safaricom callbacks. The checkout frontend posts to `/mpesa`; the Express service also accepts `/api/mpesa` and `/api/stk-push`.

When deploying the storefront to Netlify, configure the `MPESA_*` credentials as Netlify environment variables, including a public HTTPS callback URL. The checkout handler accepts both the Netlify function's `{ success, data }` response and a raw Daraja response.
>>>>>>> f17c75c (Add website files and netlify config)
