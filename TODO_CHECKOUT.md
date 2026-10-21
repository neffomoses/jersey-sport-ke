# TODO_CHECKOUT

- [ ] Update `checkout.html` to submit order to backend (`submit_order.php`) via POST.
- [ ] Keep EmailJS sending as a best-effort (send from browser) and also call backend so order is persisted even if email fails.
- [ ] Replace EmailJS placeholders in `checkout.html` with the same IDs used elsewhere in the project (public key, service_6zr51e3, template_52wwywj).
- [ ] Fix cart payload sent to backend: send `items` as JSON string compatible with `submit_order.php`.
- [ ] After successful backend response: clear cart + reset form + re-render cart.
- [ ] Add basic UI messages for success/failure for both email and backend steps.

