<<<<<<< HEAD
## Implemented changes

### 1) Fixed/standardized checkout submission flow
- Updated `index.html` cart form to include a proper `autocomplete="on"` attribute.

### 2) Email notification
- Confirmed `submit_order.php` already sends an email to `mosesaraka2@gmail.com` (or `OWNER_EMAIL` from env) using PHP `mail()` and logs failures to `email.log`.
- No additional email code was added because backend already supports notification on successful submission.

## How to verify
1. Add items to cart.
2. Fill `name`, `email`, and `phone` in the cart panel.
3. Click **Submit Order**.
4. Check `email.log` for any `mail()` failures.
5. If email fails in your hosting environment, switch from `mail()` to SMTP (PHPMailer) which is supported by this project’s existing SMTP test harnesses.

=======
## Implemented changes

### 1) Fixed/standardized checkout submission flow
- Updated `index.html` cart form to include a proper `autocomplete="on"` attribute.

### 2) Email notification
- Confirmed `submit_order.php` sends an email to `info@jerseysportke.fit` (or `OWNER_EMAIL` from env) using PHP `mail()` and logs failures to `email.log`.
- No additional email code was added because backend already supports notification on successful submission.

## How to verify
1. Add items to cart.
2. Fill `name`, `email`, and `phone` in the cart panel.
3. Click **Submit Order**.
4. Check `email.log` for any `mail()` failures.
5. If email fails in your hosting environment, switch from `mail()` to SMTP (PHPMailer) which is supported by this project’s existing SMTP test harnesses.
>>>>>>> f17c75c (Add website files and netlify config)
