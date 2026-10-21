<<<<<<< HEAD
// EmailJS order submit handler
// NOTE: this expects a form with id="jersey-order-form" and fields: #name, #phone, #email, #notes
// Your current checkout/cart form uses different ids, so keep this file for the specific EmailJS page.

document.getElementById('jersey-order-form')?.addEventListener('submit', function (event) {
  event.preventDefault();

  const orderData = {
    customer_name: document.getElementById('name').value,
    customer_phone: document.getElementById('phone').value,
    customer_email: document.getElementById('email').value,
    delivery_notes: document.getElementById('notes').value
  };

  emailjs.send('SJOiqqa', 'YOUR_TEMPLATE_ID', orderData)
    .then(function (response) {
      console.log('SUCCESS!', response.status, response.text);
      alert('Order submitted successfully! We will contact you shortly.');
      document.getElementById('jersey-order-form').reset();
    }, function (error) {
      console.error('FAILED...', error);
      alert('Oops! Something went wrong. Please try again.');
    });
});

// Quantity inputs in cart (optional enhancement)
// If your cart HTML includes elements with .cart-item-qty, we’ll wire them.
(function attachCartQuantityHandlers() {
  const root = document;
  const getQtyButtons = () => root.querySelectorAll('[data-qty-action][data-qty-index]');
  const qtyInputs = () => root.querySelectorAll('.cart-item-qty');

  if (!getQtyButtons().length || !qtyInputs().length) return;

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-qty-action][data-qty-index]');
    if (!btn) return;

    const index = btn.getAttribute('data-qty-index');
    const action = btn.getAttribute('data-qty-action');

    // Find corresponding qty input
    const input = root.querySelector(`.cart-item-qty[data-qty-index="${index}"]`);
    if (!input) return;

    const step = 1;
    let current = Number(input.value) || 0;

    if (action === 'increase') current += step;
    if (action === 'decrease') current = Math.max(0, current - step);

    input.value = String(current);

    // Trigger change so existing totals can recalc
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
})();



=======
// EmailJS order submit handler
// NOTE: this expects a form with id="jersey-order-form" and fields: #name, #phone, #email, #notes
// Your current checkout/cart form uses different ids, so keep this file for the specific EmailJS page.

document.getElementById('jersey-order-form')?.addEventListener('submit', function (event) {
  event.preventDefault();

  const orderData = {
    customer_name: document.getElementById('name').value,
    customer_phone: document.getElementById('phone').value,
    customer_email: document.getElementById('email').value,
    delivery_notes: document.getElementById('notes').value
  };

  emailjs.send('SJOiqqa', 'YOUR_TEMPLATE_ID', orderData)
    .then(function (response) {
      console.log('SUCCESS!', response.status, response.text);
      alert('Order submitted successfully! We will contact you shortly.');
      document.getElementById('jersey-order-form').reset();
    }, function (error) {
      console.error('FAILED...', error);
      alert('Oops! Something went wrong. Please try again.');
    });
});

// Quantity inputs in cart (optional enhancement)
// If your cart HTML includes elements with .cart-item-qty, we’ll wire them.
(function attachCartQuantityHandlers() {
  const root = document;
  const getQtyButtons = () => root.querySelectorAll('[data-qty-action][data-qty-index]');
  const qtyInputs = () => root.querySelectorAll('.cart-item-qty');

  if (!getQtyButtons().length || !qtyInputs().length) return;

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-qty-action][data-qty-index]');
    if (!btn) return;

    const index = btn.getAttribute('data-qty-index');
    const action = btn.getAttribute('data-qty-action');

    // Find corresponding qty input
    const input = root.querySelector(`.cart-item-qty[data-qty-index="${index}"]`);
    if (!input) return;

    const step = 1;
    let current = Number(input.value) || 0;

    if (action === 'increase') current += step;
    if (action === 'decrease') current = Math.max(0, current - step);

    input.value = String(current);

    // Trigger change so existing totals can recalc
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
})();



>>>>>>> f17c75c (Add website files and netlify config)
