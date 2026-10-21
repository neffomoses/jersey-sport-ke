<<<<<<< HEAD
# COMPLETE_CHANGES_CHECKOUT

## checkout.html changes
- Updated EmailJS initialization in `checkout.html` to use the same public key already used in `index.html`.
- Implemented “do both” checkout behavior inside `sendOrderEmail(event)`:
  1. POST the order to `submit_order.php` (persists the order to DB / orders.log depending on server state)
  2. Best-effort send the order email via EmailJS from the browser
- Only clears the local cart + resets the form when the backend persistence returns `success: true`.
- Kept EmailJS sending as best-effort so customer receives email attempts even if backend succeeds.

=======
# COMPLETE_CHANGES_CHECKOUT

## checkout.html changes
- Updated EmailJS initialization in `checkout.html` to use the same public key already used in `index.html`.
- Implemented “do both” checkout behavior inside `sendOrderEmail(event)`:
  1. POST the order to `submit_order.php` (persists the order to DB / orders.log depending on server state)
  2. Best-effort send the order email via EmailJS from the browser
- Only clears the local cart + resets the form when the backend persistence returns `success: true`.
- Kept EmailJS sending as best-effort so customer receives email attempts even if backend succeeds.

>>>>>>> f17c75c (Add website files and netlify config)
