(function () {
  'use strict';
  

  const CART_KEY = 'jersey_sport_cart_v1';

  const els = {
    cartToggle: document.getElementById('cart-toggle'),
    cartCount: document.getElementById('cart-count'),
    cartPanel: document.getElementById('cart-panel'),
    closeCart: document.getElementById('close-cart'),
    clearCart: document.getElementById('clear-cart'),
    whatsappOrderBtn: document.getElementById('whatsapp-order-btn'),
    cartItems: document.getElementById('cart-items'),
    cartTotal: document.getElementById('cart-total'),
    cartFeedback: document.getElementById('cart-feedback'),
    reviewStep: document.getElementById('review-step'),
    customerDetailsStep: document.getElementById('customer-details-step'),
    reviewSummary: document.getElementById('review-summary'),
    addAnotherJerseyBtn: document.getElementById('add-another-jersey-btn'),
    continueToDetailsBtn: document.getElementById('continue-to-details-btn'),
    backToReviewBtn: document.getElementById('back-to-review-btn'),
    checkoutModal: document.getElementById('checkout-modal'),
    closeCheckoutModalBtn: document.getElementById('close-checkout-modal'),
    checkoutBtn: document.getElementById('checkout-btn'),
    orderForm: document.getElementById('order-form'),
    orderName: document.getElementById('order-name'),
    orderEmail: document.getElementById('order-email'),
    orderRecoveryConsent: document.getElementById('order-recovery-consent'),
    orderMessage: document.getElementById('order-message'),
    orderItems: document.getElementById('order-items'),
    orderTotal: document.getElementById('order-total'),
    orderPhone: document.getElementById('order-phone'),
    orderPaymentInputs: document.getElementsByName('payment_option'),
    orderDeposit: document.getElementById('order-deposit'),
    orderFeedback: document.getElementById('order-feedback'),
    submitOrderBtn: document.getElementById('submit-order-btn'),
    mpesaPayBtn: document.getElementById('mpesa-pay-btn'),
    mpesaStatus: document.getElementById('mpesa-status'),
    pageOverlay: document.querySelector('.page-overlay'),
    searchInput: document.getElementById('product-search'),
    
    productModal: document.getElementById('product-modal'),
    closeModal: document.getElementById('close-modal'),
    modalForm: document.getElementById('modal-customization-form'),
    modalProductTitle: document.getElementById('modal-product-title'),
    modalProductName: document.getElementById('modal-product-name'),
    modalProductPrice: document.getElementById('modal-product-price'),
    modalSize: document.getElementById('modal-size'),
    modalPrintedName: document.getElementById('modal-printed-name'),
    modalDeliveryLocation: document.getElementById('modal-delivery-location'),
    modalPhone: document.getElementById('modal-phone'),
    modalEmail: document.getElementById('modal-email'),
    modalRecoveryConsent: document.getElementById('modal-recovery-consent'),
    modalNotes: document.getElementById('modal-notes'),
    modalQty: document.getElementById('modal-qty'),
    modalPlayerName: document.getElementById('modal-player-name'),
    modalPlayerNumber: document.getElementById('modal-player-number'),
    modalBadge: document.getElementById('modal-badge'),
    modalPricePreview: document.getElementById('modal-price-preview')
    ,
    // Signup / newsletter elements
    signupModal: document.getElementById('signup-modal'),
    signupForm: document.getElementById('signup-form'),
    signupEmail: document.getElementById('signup-email'),
    signupName: document.getElementById('signup-name'),
    signupClose: document.getElementById('signup-close'),
    signupFeedback: document.getElementById('signup-feedback'),
    signupDiscount: document.getElementById('signup-discount')
  };
  // Diagnostic: ensure modal form was found
  console.log('Modal form element present:', !!els.modalForm, 'modalConfirm exists:', !!document.getElementById('modal-confirm-btn'));
  // runtime discount state
  let appliedDiscount = null; // { id, code, percent }

  const cards = Array.from(document.querySelectorAll('.product-card'));
  // Ensure Add-to-Cart buttons cannot act as form submit buttons
  try {
    document.querySelectorAll('.add-to-cart').forEach(b => { try { b.setAttribute('type', 'button'); } catch (e) {} });
  } catch (e) {}
  const normalize = (value) => String(value || '').toLowerCase().trim();

  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function getCartItems() {
    return Object.values(loadCart());
  }

  function formatKSH(value) {
    const amount = Number(value) || 0;
    return 'KSH ' + amount.toLocaleString('en-KE');
  }

  // Submit order data to server endpoint and return parsed JSON result
  function submitOrderToServer(formData) {
    try {
      return fetch('submit_order.php', { method: 'POST', body: formData })
        .then(r => r.json())
        .catch(() => ({ success: false }));
    } catch (e) {
      return Promise.resolve({ success: false });
    }
  }

  // Show an order confirmation modal with summary and explicit OK button
  function showOrderConfirmationModal(order) {
    // Remove existing modal if present
    const existing = document.getElementById('order-confirmation-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'order-confirmation-modal';
    modal.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);z-index:10000;padding:20px;';

    const box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:8px;max-width:720px;width:100%;padding:18px;box-shadow:0 8px 24px rgba(0,0,0,0.2);color:#111;max-height:80vh;overflow:auto;';

    const title = document.createElement('h3');
    title.textContent = 'Order Confirmation';
    title.style.marginTop = '0';

    const p = document.createElement('p');
    p.innerHTML = `<strong>Customer:</strong> ${escapeHtml(order.customer_name || '')} <br><strong>Phone:</strong> ${escapeHtml(order.customer_phone || '')} <br><strong>Email:</strong> ${escapeHtml(order.customer_email || '')}`;

    // Items table
    const table = document.createElement('div');
    table.innerHTML = '<h4>Items</h4>';
    const tbl = document.createElement('table');
    tbl.style.cssText = 'width:100%;border-collapse:collapse;margin-top:8px';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th align="left">Item</th><th>Size</th><th>Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Line</th></tr>';
    tbl.appendChild(thead);
    const tbody = document.createElement('tbody');
    let calc = 0;
    for (const it of (order.items || [])) {
      const unit = Number(it.unit_price || it.price || 0) || 0;
      const qty = Number(it.qty || 1) || 1;
      const line = unit * qty;
      calc += line;
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #eee';
      tr.innerHTML = `<td>${escapeHtml(it.name || '')}</td><td align="center">${escapeHtml(it.size || 'N/A')}</td><td align="center">${qty}</td><td style="text-align:right">${escapeHtml(formatKSH(unit))}</td><td style="text-align:right">${escapeHtml(formatKSH(line))}</td>`;
      tbody.appendChild(tr);
    }
    tbl.appendChild(tbody);
    const foot = document.createElement('div');
    foot.style.cssText = 'margin-top:12px;font-weight:600;text-align:right';
    foot.textContent = 'Total: ' + formatKSH(order.total ?? calc);

    const buttons = document.createElement('div');
    buttons.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:14px';
    const ok = document.createElement('button');
    ok.className = 'button primary';
    ok.textContent = 'OK';
    const close = document.createElement('button');
    close.className = 'button secondary';
    close.textContent = 'Close';

    buttons.appendChild(close);
    buttons.appendChild(ok);

    box.appendChild(title);
    box.appendChild(p);
    box.appendChild(table);
    box.appendChild(tbl);
    box.appendChild(foot);
    box.appendChild(buttons);
    modal.appendChild(box);
    document.body.appendChild(modal);

    // Hook up actions
    ok.addEventListener('click', () => {
      saveCart({});
      renderCart();
      closeCart();
      modal.remove();
      window.location.href = 'order-success.html';
    });
    close.addEventListener('click', () => modal.remove());
  }

  function escapeHtml(text) {
    return String(text)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  async function loadApprovedReviews() {
    const reviewList = document.getElementById('approved-reviews');
    if (!reviewList) return;
    try {
      const response = await fetch('api/reviews.php', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Unable to load reviews');
      const result = await response.json();
      const reviews = Array.isArray(result.reviews) ? result.reviews : [];
      if (!reviews.length) {
        reviewList.innerHTML = '<p class="review-meta">Customer reviews will appear here after the first approved review.</p>';
        return;
      }
      reviewList.innerHTML = reviews.map((review) => {
        const stars = '★'.repeat(Number(review.rating) || 0) + '☆'.repeat(Math.max(0, 5 - Number(review.rating || 0)));
        const card = document.createElement('article');
        card.className = 'approved-review-card';
        card.innerHTML = `<div class="approved-review-copy"><div class="approved-review-rating" aria-label="${Number(review.rating)} out of 5 stars">${stars}</div><strong>${escapeHtml(review.name)}</strong><p>${escapeHtml(review.review)}</p></div>`;
        return card.outerHTML;
      }).join('');
    } catch (error) {
      reviewList.innerHTML = '<p class="review-meta">Customer reviews are temporarily unavailable.</p>';
    }
  }

  let cartFeedbackTimer = null;

  function showCartFeedback(message, type = 'success') {
    if (!els.cartFeedback) return;
    clearCartFeedback();
    els.cartFeedback.textContent = message;
    els.cartFeedback.className = 'cart-feedback cart-feedback-' + type + ' visible';
    cartFeedbackTimer = window.setTimeout(clearCartFeedback, 3000);
  }

  function clearCartFeedback() {
    if (!els.cartFeedback) return;
    els.cartFeedback.textContent = '';
    els.cartFeedback.className = 'cart-feedback';
    if (cartFeedbackTimer) {
      window.clearTimeout(cartFeedbackTimer);
      cartFeedbackTimer = null;
    }
  }

  function updateCartCount() {
    if (!els.cartCount) return;
    const total = getCartItems().reduce((sum, item) => sum + item.qty, 0);
    els.cartCount.textContent = String(total);
  }

  function clearInitialCartBadgeIfEmpty() {
    // Prevent showing a stale badge value from HTML (e.g. "1") when storage is empty.
    if (!els.cartToggle || !els.cartCount) return;
    const total = getCartItems().reduce((sum, item) => sum + item.qty, 0);
    els.cartCount.textContent = String(total);
  }


  function updateCartButtonState() {
    if (!els.cartToggle) return;
    const isOpen = els.cartPanel?.classList.contains('open');
    els.cartToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    els.cartToggle.classList.toggle('active', Boolean(isOpen));
  }

  function openCart() {
    els.cartPanel?.classList.add('open');
    els.pageOverlay?.classList.add('active');
    updateCartButtonState();
  }

  function closeCart() {
    els.cartPanel?.classList.remove('open');
    els.pageOverlay?.classList.remove('active');
    updateCartButtonState();
  }

  function renderReviewSummary() {
    if (!els.reviewSummary) return;
    const items = getCartItems();

    if (!items.length) {
      els.reviewSummary.innerHTML = '<p class="review-meta">Your cart is empty.</p>';
      return;
    }

    const total = items.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.qty) || 1)), 0);
    els.reviewSummary.innerHTML = items.map((item) => {
      const lineTotal = (Number(item.price) || 0) * (Number(item.qty) || 1);
      const printedName = item.printed_name || item.player_name || 'Custom print';
      const sizeLabel = item.size ? item.size : 'Not set';
      const notePart = item.notes ? `<div class="review-meta">Note: ${escapeHtml(item.notes)}</div>` : '';
      const qty = Number(item.qty) || 1;

      return `
        <div class="review-item">
          <div class="review-item-main">
            <div class="review-team-row">
              <strong>Team: ${escapeHtml(item.name)}</strong>
              <span>${formatKSH(lineTotal)}</span>
            </div>
            <div class="review-detail-list">
              <div class="review-detail-row"><span>Size:</span> <strong>${escapeHtml(sizeLabel)}</strong></div>
              <div class="review-detail-row"><span>Qty:</span> <strong>${qty}</strong></div>
            </div>
            <div class="review-meta">Printed name: ${escapeHtml(printedName)}</div>
            <div class="review-meta">Unit price: ${formatKSH(Number(item.price) || 0)}</div>
            ${notePart}
          </div>
        </div>
      `;
    }).join('') + `<div class="review-total"><span>Order total</span><strong>${formatKSH(total)}</strong></div>`;
  }

  function toggleCheckoutStep(showReview) {
    const hasItems = getCartItems().length > 0;
    if (!hasItems) {
      if (els.reviewStep) els.reviewStep.hidden = false;
      if (els.customerDetailsStep) els.customerDetailsStep.hidden = true;
      return;
    }

    if (els.reviewStep) els.reviewStep.hidden = !showReview;
    if (els.customerDetailsStep) els.customerDetailsStep.hidden = showReview;
  }

  function openCheckoutModal() {
    const items = getCartItems();
    if (!items.length) {
      showCartFeedback('Your cart is empty.', 'error');
      return;
    }

    closeCart();
    renderReviewSummary();
    toggleCheckoutStep(true);
    if (els.checkoutModal) {
      els.checkoutModal.classList.add('open');
      els.checkoutModal.setAttribute('aria-hidden', 'false');
      els.pageOverlay?.classList.add('active');
    }
  }

  function closeCheckoutModal() {
    if (els.checkoutModal) {
      els.checkoutModal.classList.remove('open');
      els.checkoutModal.setAttribute('aria-hidden', 'true');
    }
    els.pageOverlay?.classList.remove('active');
  }

// Populate the size dropdown based on product type.
  // Boots (Nike/Puma/Adidas) use EU shoe sizes 38-43; jerseys keep S/M/L/XL/XXL.
  function populateSizeOptions(select, productName) {
    if (!select) return;
    const isBoots = /boots/i.test(productName || '');
    const bootSizes = ['38', '39', '40', '41', '42', '43'];
    const jerseySizes = ['S', 'M', 'L', 'XL', 'XXL'];

    const options = isBoots ? bootSizes : jerseySizes;
    select.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = isBoots ? 'Choose your size' : 'Choose your size';
    select.appendChild(placeholder);

    options.forEach((size) => {
      const opt = document.createElement('option');
      opt.value = size;
      opt.textContent = isBoots ? size : `${size}`;
      select.appendChild(opt);
    });
  }

  function openCustomizationModal(name, price) {
    // If modal exists, open it. Otherwise fall back to directly adding to cart.
    if (!els.productModal) {
      const id = `${name.replace(/\s+/g, '-').toLowerCase()}-default`;
      const cart = loadCart();
      if (!cart[id]) {
        cart[id] = { id, name, price, qty: 1, size: null, notes: '' };
      } else {
        cart[id].qty += 1;
      }
      saveCart(cart);
      renderCart();
      return;
    }

    if (els.modalProductTitle) els.modalProductTitle.textContent = `Customize Your ${name}`;
    if (els.modalProductName) els.modalProductName.value = name;
    if (els.modalProductPrice) els.modalProductPrice.value = price;
    // Populate size options according to the product type (boots vs jersey)
    populateSizeOptions(els.modalSize, name);
    // Reset addon controls and preview
    if (els.modalQty) els.modalQty.value = 1;
    if (els.modalPrintedName) els.modalPrintedName.value = '';
    if (els.modalDeliveryLocation) els.modalDeliveryLocation.value = '';
    if (els.modalPlayerName) els.modalPlayerName.value = '';
    if (els.modalPlayerNumber) els.modalPlayerNumber.value = '';
    if (els.modalBadge) els.modalBadge.value = 'none';
    if (typeof updateModalPricePreview === 'function') updateModalPricePreview();
    els.productModal.style.display = 'flex';
    els.pageOverlay?.classList.add('active');
    els.modalSize?.focus();
  }


  function closeCustomizationModal() {
    if (!els.productModal) return;
    els.productModal.style.display = 'none';
    els.modalForm?.reset();
    els.pageOverlay?.classList.remove('active');
  }

  function renderCart() {
    const cart = loadCart();
    const items = Object.values(cart);
    const cartEntries = Object.entries(cart);

    updateCartCount();
    if (!els.cartItems || !els.cartTotal) return;

    const isCartOpen = Boolean(els.cartPanel?.classList.contains('open'));
    els.cartItems.innerHTML = '';
    renderReviewSummary();

    if (!items.length) {
      const emptyState = document.createElement('div');
      emptyState.className = 'cart-item';
      emptyState.style.cssText = 'opacity:0.85; display: flex; flex-direction: column; gap: 8px; padding: 15px 0; color: #fff;';
      emptyState.innerHTML = '<strong>Your cart is empty</strong><span>Add jerseys from the shop to see them here.</span>';
      els.cartItems.appendChild(emptyState);
      els.cartTotal.textContent = formatKSH(0);
      updateWhatsAppOrderLink(items, 0);
      toggleCheckoutStep(true);
      updateOrderFormFields(items, 0);
      return;
    }

    let subtotal = 0;
    for (const [cartKey, item] of cartEntries) {
      subtotal += item.price * item.qty;
      const detailsString = item.size ? `(${item.size}) ${item.notes ? '<br><small style="color:#bfc7bb;">Note: ' + escapeHtml(item.notes) + '</small>' : ''}` : '';
      const itemId = item.id || cartKey;

      const row = document.createElement('div');
      row.className = 'cart-item';
      row.innerHTML = `
        <div class="cart-item-heading">
          <strong class="cart-item-name">${escapeHtml(item.name || 'Selected jersey')}</strong>
          <button type="button" data-action="remove" data-id="${escapeHtml(itemId)}" class="remove-item" aria-label="Remove ${escapeHtml(item.name || 'jersey')} from cart">Remove</button>
        </div>
        <div class="cart-item-details">
          <span class="cart-item-size">${detailsString}</span>
          <div class="cart-item-price">${formatKSH(item.price)} each</div>
        </div>
        <div class="cart-item-controls">
          <button type="button" data-action="decrease" data-id="${escapeHtml(itemId)}" aria-label="Decrease ${escapeHtml(item.name || 'jersey')} quantity">-</button>
          <span class="cart-item-quantity">${item.qty}</span>
          <button type="button" data-action="increase" data-id="${escapeHtml(itemId)}" aria-label="Increase ${escapeHtml(item.name || 'jersey')} quantity">+</button>
        </div>`;

      els.cartItems.appendChild(row);
    }

    // If discount applied, show original and discounted total
    let adjustedTotal = subtotal;
    if (appliedDiscount && appliedDiscount.percent) {
      const discountAmount = Math.round(subtotal * (Number(appliedDiscount.percent) / 100));
      adjustedTotal = subtotal - discountAmount;
      if (els.cartTotal) els.cartTotal.innerHTML = `<span style="color:var(--muted);text-decoration:line-through;margin-right:8px">${formatKSH(subtotal)}</span> ${formatKSH(adjustedTotal)}`;
    } else {
      if (els.cartTotal) els.cartTotal.textContent = formatKSH(subtotal);
    }
    updateOrderFormFields(items, adjustedTotal);
    updateWhatsAppOrderLink(items, adjustedTotal);
    // If there are items and user hasn't signed up, show signup modal once
    try {
      const hasItems = items.length > 0;
      const signed = localStorage.getItem('jersey_sport_signed_up');
      const shown = localStorage.getItem('jersey_sport_signup_shown');
      const emailProvided = Boolean((els.orderEmail && els.orderEmail.value) || '');
      if (hasItems && !signed && !shown && !emailProvided) {
        // show after a short delay so user sees cart first
        localStorage.setItem('jersey_sport_signup_shown', '1');
        setTimeout(() => {
          openSignupModal();
        }, 1200);
      }
    } catch (e) {}
    if (!isCartOpen) {
      openCart();
    }
    toggleCheckoutStep(true);
  }

  function updateWhatsAppOrderLink(items, total) {
    if (!els.whatsappOrderBtn) return;
    const lines = items.map((item) => {
      const size = item.size ? `, size ${item.size}` : '';
      return `- ${item.name}${size} x${item.qty}`;
    });
    const message = lines.length
      ? `Hello Jersey Sport, I would like to order:\n${lines.join('\n')}\nTotal: ${formatKSH(total)}`
      : 'Hello Jersey Sport, I would like to ask about your jerseys.';
    els.whatsappOrderBtn.href = `https://wa.me/254741465524?text=${encodeURIComponent(message)}`;
  }

  function updateOrderFormFields(items, subtotal) {
    if (!els.orderItems || !els.orderTotal || !els.submitOrderBtn) return;
    const hasItems = items.length > 0;

    if (!hasItems) {
      els.orderItems.value = '';
      els.orderTotal.value = '';
      els.submitOrderBtn.disabled = true;
      els.submitOrderBtn.style.display = 'none';
      if (els.mpesaPayBtn) els.mpesaPayBtn.style.display = 'none';
      if (els.mpesaStatus) els.mpesaStatus.textContent = '';
      return;
    }

    // Show the submit button only after an item has been confirmed and saved in the cart.
    els.submitOrderBtn.style.display = '';
    els.submitOrderBtn.disabled = false;

    // Store machine-readable items JSON for server/email and a formatted total for display
    els.orderItems.value = JSON.stringify(items.map((item) => ({
      id: item.id,
      name: item.name,
      size: item.size || null,
      qty: item.qty,
      unit_price: Number(item.price) || 0,
      notes: item.notes || '',
      printed_name: item.printed_name || item.player_name || '',
      delivery_location: item.delivery_location || '',
      customer_phone: item.customer_phone || '',
      customer_email: item.customer_email || '',
      player_name: item.player_name || '',
      player_number: item.player_number || '',
      badge: item.badge || 'none',
      addon_fee: Number(item.addon_fee || 0)
    })));
    els.orderTotal.value = String(subtotal);
    els.submitOrderBtn.disabled = false;
    // show mpesa button when cart has items
    if (els.mpesaPayBtn) {
      els.mpesaPayBtn.style.display = hasItems ? '' : 'none';
    }
  }

  // Helper to format phone into 2547xxxxxxxx
  function normalizeTo254(phone) {
    if (!phone) return '';
    let s = phone.replace(/[^0-9]/g, '');
    if (s.startsWith('0')) s = '254' + s.slice(1);
    if (s.startsWith('7') && s.length === 9) s = '254' + s;
    if (s.startsWith('07')) s = '254' + s.slice(1);
    return s;
  }

  // MPESA STK Push flow: call server endpoint to trigger STK push for amount
  async function initiateMpesaStk() {
    const items = getCartItems();
    if (!items || !items.length) { alert('Your cart is empty'); return; }
    const amt = Number(els.orderTotal?.value || 0);
    if (!amt || amt <= 0) { alert('Invalid amount'); return; }
    const phoneRaw = els.orderPhone?.value || '';
    const phone = normalizeTo254(phoneRaw);
    if (!phone || !/^2547\d{8}$/.test(phone)) { alert('Enter a valid Kenyan phone number (07... or 7...)'); return; }

    const payload = {
      phone,
      amount: String(amt),
      account_reference: els.orderName?.value || 'JerseyOrder',
      transaction_desc: 'Jersey Sport order',
      items: els.orderItems?.value || ''
    };

    // disable whole form and show overlay spinner
    const formOverlay = document.getElementById('form-overlay');
    const orderForm = els.orderForm;
    if (formOverlay) formOverlay.style.display = 'flex';
    if (orderForm) {
      Array.from(orderForm.elements || []).forEach(el => el.setAttribute && el.setAttribute('disabled', 'disabled'));
    }
    try {
      if (els.mpesaStatus) { els.mpesaStatus.style.color = '#333'; els.mpesaStatus.textContent = 'Requesting STK push...'; }
      els.mpesaPayBtn.disabled = true;
      els.mpesaPayBtn.textContent = 'Requesting STK...';
      const res = await fetch('/mpesa', { method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ phoneNumber: phone, amount: Number(amt), accountReference: payload.account_reference, transactionDesc: payload.transaction_desc, items: payload.items }) });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j) {
        const serverError = j?.error;
        const detail = typeof serverError === 'string' ? serverError : (serverError?.errorMessage || serverError?.message);
        const msg = detail ? `Failed to request STK push: ${detail}` : 'Failed to request STK push. Try again later.';
        if (els.mpesaStatus) { els.mpesaStatus.style.color = '#a00'; els.mpesaStatus.textContent = msg; }
        console.error('STK response', res, j);
        return;
      }
      const resp = j?.data || j?.response || j || {};
      if (j?.success && String(resp.ResponseCode ?? resp.responseCode) === '0') {
        const desc = resp.ResponseDescription || resp.responseDescription || resp.errorMessage || 'Complete payment on your phone';
        if (els.mpesaStatus) { els.mpesaStatus.style.color = 'green'; els.mpesaStatus.textContent = 'STK requested — ' + desc; }
        console.log('STK success', j);
      } else {
        const error = j?.error || resp.CustomerMessage || resp.ResponseDescription || resp.errorMessage;
        const detail = typeof error === 'string' ? error : (error?.errorMessage || error?.message || j?.message || 'Unknown');
        const msg = 'STK push failed: ' + detail;
        if (els.mpesaStatus) { els.mpesaStatus.style.color = '#a00'; els.mpesaStatus.textContent = msg; }
        console.error('STK failed', j);
      }
    } catch (e) {
      console.error(e);
      if (els.mpesaStatus) { els.mpesaStatus.style.color = '#a00'; els.mpesaStatus.textContent = 'Error while initiating M-Pesa request.'; }
    } finally {
      // re-enable form and hide overlay
      if (formOverlay) formOverlay.style.display = 'none';
      if (orderForm) {
        Array.from(orderForm.elements || []).forEach(el => el.removeAttribute && el.removeAttribute('disabled'));
      }
      if (els.mpesaPayBtn) {
        els.mpesaPayBtn.disabled = false;
        els.mpesaPayBtn.textContent = 'Pay with M-Pesa (STK)';
      }
    }
  }

  if (els.mpesaPayBtn) {
    els.mpesaPayBtn.addEventListener('click', (e) => {
      e.preventDefault();
      initiateMpesaStk();
    });
  }

  if (els.addAnotherJerseyBtn) {
    els.addAnotherJerseyBtn.addEventListener('click', () => {
      closeCheckoutModal();
      openCart();
      renderCart();
      renderReviewSummary();
      toggleCheckoutStep(true);

      const catalogSection = document.getElementById('products') || document.querySelector('.products-section');
      if (catalogSection) {
        catalogSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      if (els.cartPanel) {
        els.cartPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  if (els.continueToDetailsBtn) {
    els.continueToDetailsBtn.addEventListener('click', () => {
      toggleCheckoutStep(false);
      const details = els.customerDetailsStep;
      if (details) {
        const firstInput = details.querySelector('input[required], textarea[required]');
        if (firstInput) {
          setTimeout(() => firstInput.focus(), 60);
        }
      }
    });
  }

  if (els.backToReviewBtn) {
    els.backToReviewBtn.addEventListener('click', () => {
      toggleCheckoutStep(true);
      if (els.reviewStep) {
        els.reviewStep.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  function updateCartItem(id, delta) {
    const cart = loadCart();
    const item = cart[id];
    if (!item) return;

    item.qty += delta;
    if (item.qty <= 0) {
      delete cart[id];
      saveCart(cart);
      renderCart();
      showCartFeedback(`${item.name} removed from cart.`);
      return;
    }

    saveCart(cart);
    renderCart();
    showCartFeedback(`${delta > 0 ? 'Increased' : 'Decreased'} ${item.name} quantity to ${item.qty}.`);
  }

  function removeCartItem(id) {
    const cart = loadCart();
    const item = cart[id];
    if (!item) return;
    delete cart[id];
    saveCart(cart);
    renderCart();
    showCartFeedback(`${item.name} removed from cart.`);
  }

  function clearCartItems() {
    if (!confirm('Clear all items from your cart?')) return;
    saveCart({});
    renderCart();
    showCartFeedback('Cart cleared.');
  }

  function handleModalSubmit(event) {
    console.log('handleModalSubmit called');
    // preventDefault so page doesn't reload and stop propagation to avoid other handlers
    event.preventDefault();
    try { event.stopPropagation(); event.stopImmediatePropagation(); } catch (e) {}

    const name = els.modalProductName.value;
    const basePrice = Number(els.modalProductPrice.value || '0');
    const size = els.modalSize.value;
    const printedName = els.modalPrintedName?.value?.trim() || '';
    const deliveryLocation = els.modalDeliveryLocation?.value?.trim() || '';
    const qty = Math.max(1, Number(els.modalQty?.value || 1) || 1);
    const phone = els.modalPhone.value;
    const email = els.modalEmail.value;
    const notes = els.modalNotes.value;
    const playerName = els.modalPlayerName?.value || '';
    const playerNumber = els.modalPlayerNumber?.value || '';
    const badge = els.modalBadge?.value || 'none';

    if (!size || !printedName || !deliveryLocation || !phone || !email) {
      alert('Please enter jersey size, name to be printed, delivery location, phone number, and email before adding to cart.');
      return;
    }

    // Compute addon fees
    let addonFee = 0;
    if (playerName || playerNumber) addonFee += 300; // name+number printing
    if (badge === 'club') addonFee += 200;
    if (badge === 'league') addonFee += 300;
    const finalUnitPrice = basePrice + addonFee;

    // Unique key handles separate customizations cleanly
    const id = `${name.replace(/\s+/g, '-')}-${size}-${playerName || 'nopn'}-${playerNumber || 'non'}-${badge}-${Date.now()}`;
    const cart = loadCart();

    const item = {
      id,
      name,
      price: finalUnitPrice,
      qty,
      size,
      notes,
      printed_name: printedName,
      delivery_location: deliveryLocation,
      customer_phone: phone,
      customer_email: email,
      player_name: playerName,
      player_number: playerNumber,
      badge,
      addon_fee: addonFee
    };
    if (!cart[id]) {
      cart[id] = item;
    } else {
      cart[id].qty += qty;
    }

    if (els.orderPhone && phone) els.orderPhone.value = phone;
    if (els.orderEmail && email) els.orderEmail.value = email;
    if (els.orderMessage) {
      const orderText = [notes, deliveryLocation].filter(Boolean).join('\n');
      els.orderMessage.value = orderText || 'Delivery location: ' + deliveryLocation;
    }

    saveCart(cart);
    syncCartRecovery();
    closeCustomizationModal();
    // Re-render cart and keep it open so the user can keep shopping and see previous selections.
    renderCart();
    try {
      openCart();
      if (els.cartPanel) {
        els.cartPanel.setAttribute('tabindex', '-1');
        els.cartPanel.focus({ preventScroll: false });
        try { els.cartPanel.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
      }
    } catch (e) {}
    showCartFeedback(`Added ${qty}× ${name} ${size ? `(${size})` : ''} to cart.`);

    if (els.submitOrderBtn) {
      els.submitOrderBtn.classList.remove('submit-pop');
      void els.submitOrderBtn.offsetWidth;
      els.submitOrderBtn.classList.add('submit-pop');
    }
  }

  function handleOrderSubmit(event) {
    event.preventDefault();
    const feedbackDiv = els.orderFeedback;
    const submitBtn = els.submitOrderBtn;

    if (!feedbackDiv || !submitBtn) return;
    // Validate deposit when selected
    const paymentOptionSelected = (document.querySelector('input[name="payment_option"]:checked') || {}).value || 'full';
    const depositValueStr = els.orderDeposit?.value || '';
    const depositValueNum = depositValueStr ? Number(depositValueStr) : 0;

    // compute cart total to validate deposit
    const rawCartItemsForValidation = getCartItems();
    const computedTotal = rawCartItemsForValidation.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 1), 0);

    if (paymentOptionSelected === 'deposit') {
      if (!depositValueStr || isNaN(depositValueNum) || depositValueNum <= 0) {
        feedbackDiv.style.color = 'red';
        feedbackDiv.textContent = 'Please enter a valid deposit amount.';
        return;
      }
      if (depositValueNum > computedTotal) {
        feedbackDiv.style.color = 'red';
        feedbackDiv.textContent = 'Deposit cannot exceed the order total.';
        return;
      }
    }

    submitBtn.textContent = "Processing Order...";
    submitBtn.disabled = true;

    const rawCartItems = getCartItems();
    let totalCalculatedAmount = 0;
    
    // Create a plain text summary that will format cleanly inside any standard email template
    let orderSummaryText = "";

    const itemsArray = rawCartItems.map((item, index) => {
      const itemPrice = Number(item.price) || 1300;
      const itemLineTotal = itemPrice * item.qty;
      totalCalculatedAmount += itemLineTotal;

      orderSummaryText += `${index + 1}. ${item.name}\n`;
      orderSummaryText += `   - Size: ${item.size || 'N/A'}\n`;
      orderSummaryText += `   - Name to print: ${item.printed_name || item.player_name || 'N/A'}\n`;
      orderSummaryText += `   - Delivery location: ${item.delivery_location || 'N/A'}\n`;
      orderSummaryText += `   - Qty: ${item.qty}\n`;
      orderSummaryText += `   - Price: ${formatKSH(itemPrice)} each (Subtotal: ${formatKSH(itemLineTotal)})\n`;
      if (item.notes) {
        orderSummaryText += `   - Notes: ${item.notes}\n`;
      }
      orderSummaryText += `\n`;

      return {
        name: item.name,
        size: item.size || 'N/A',
        qty: item.qty,
        unit_price: itemPrice,
        unit_price_display: 'KSH ' + itemPrice.toLocaleString('en-KE'),
        line_total: itemLineTotal,
        line_total_display: 'KSH ' + itemLineTotal.toLocaleString('en-KE'),
        notes: item.notes || "None"
      };
    });

    // Apply discount (if any) before preparing template data
    let discountAmount = 0;
    if (appliedDiscount && appliedDiscount.percent) {
      discountAmount = Math.round(totalCalculatedAmount * (Number(appliedDiscount.percent) / 100));
      totalCalculatedAmount = Math.max(0, totalCalculatedAmount - discountAmount);
    }

    const customerName = els.orderName?.value || "Customer";
    const customerEmail = els.orderEmail?.value || "No Email";
    const customerPhone = els.orderPhone?.value || "No Phone";
    const deliveryNotes = els.orderMessage?.value || "None";

    // Loop format template structure compatibility
    const orders = itemsArray.map(it => ({
      name: it.name,
      size: it.size,
      units: it.qty,
      price: String(it.unit_price)
    }));

    const templateParams = {
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      delivery_notes: deliveryNotes,
      
      // Plain text block summary (Use {{order_summary}} in EmailJS template)
      order_summary: orderSummaryText,

      // Arrays format (Requires {{#orders}} loops in EmailJS template)
      orders,
      delivery_location: rawCartItems.map(item => item.delivery_location || 'N/A').join('; '),
      cost: {
        shipping: 'Free',
        total: String(totalCalculatedAmount),
        jersey: String(totalCalculatedAmount),
        Delivery: 'Free'
      },

      cart_total: formatKSH(totalCalculatedAmount),
      cart_items: JSON.stringify(orders, null, 2)
    };

    // attach discount info if applied
    if (appliedDiscount && appliedDiscount.percent) {
      templateParams.discount_code = appliedDiscount.code;
      templateParams.discount_percent = String(appliedDiscount.percent);
      templateParams.discount_amount = String(discountAmount);
      templateParams.cart_total_after_discount = formatKSH(Math.round(totalCalculatedAmount));
    }

    // include payment option + deposit for email templates
    const paymentOptionForEmail = (document.querySelector('input[name="payment_option"]:checked') || {}).value || 'full';
    const depositValue = els.orderDeposit?.value || '';
    templateParams.payment_option = paymentOptionForEmail;
    templateParams.deposit = depositValue;

    // Send via EmailJS then ensure server receives the same order
    const processServerSubmission = () => {
      const fd = new FormData();
      fd.append('name', customerName);
      fd.append('email', customerEmail);
      fd.append('phone', customerPhone);
      fd.append('message', deliveryNotes);
      fd.append('items', JSON.stringify(rawCartItems));
      fd.append('total', String(totalCalculatedAmount));
      if (appliedDiscount) {
        fd.append('discount_code', appliedDiscount.code || '');
        fd.append('discount_percent', String(appliedDiscount.percent || 0));
      }
      // append payment option & deposit
      fd.append('payment_option', paymentOptionForEmail);
      if (depositValue) fd.append('deposit', String(depositValue));

      feedbackDiv.style.color = 'black';
      feedbackDiv.textContent = 'Submitting order to server...';

      return submitOrderToServer(fd).then(j => {
        const ok = j && j.success;
        feedbackDiv.style.color = ok ? 'green' : 'red';
        feedbackDiv.textContent = ok ? '⚽ Order submitted successfully.' : '⚠️ Order sent, but server did not confirm.';

        try {
          // include payment option and deposit in last-order snapshot
          const paymentOption = (document.querySelector('input[name="payment_option"]:checked') || {}).value || 'full';
          const depositVal = els.orderDeposit?.value || '';
          localStorage.setItem('jersey_sport_last_order', JSON.stringify({
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: customerPhone,
            delivery_notes: deliveryNotes,
            items: rawCartItems,
            total: totalCalculatedAmount,
            payment_option: paymentOption,
            deposit: depositVal
          }));
        } catch (e) {}

        submitBtn.textContent = 'Submit Order';
        submitBtn.disabled = false;

        showOrderConfirmationModal({
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          delivery_notes: deliveryNotes,
          items: rawCartItems,
          total: totalCalculatedAmount
        });
        // Redeem discount code server-side if present
        try {
          if (appliedDiscount && appliedDiscount.code) {
            fetch('api/discount.php', { method: 'POST', body: new URLSearchParams({ action: 'redeem', code: appliedDiscount.code }) }).catch(() => {});
          }
        } catch (e) {}
      });
    };

    if (window.emailjs) {
      window.emailjs.send("service_6zr51e3", "template_52wwywj", templateParams)
        .then(() => processServerSubmission())
        .catch((err) => {
          console.error('EmailJS failed, trying server-only', err);
          processServerSubmission();
        });
    } else {
      processServerSubmission();
    }
  }

  function handleBodyClick(event) {
    // Ignore clicks that originate from inside the customization modal
    if (els.productModal && event.target && event.target.closest && event.target.closest('#product-modal')) {
      return;
    }

    const button = event.target.closest('button');
    if (!button) return;

    if (button.matches('.add-to-cart')) {
      const card = button.closest('.product-card');
      if (!card) return;

      const name = card.getAttribute('data-name') || 'Jersey';
      const price = Number(card.getAttribute('data-price') || '0');

      // If a customization modal exists, open it. Otherwise add straight to cart.
      if (els.productModal) {
        openCustomizationModal(name, price);
      } else {
        // Fallback: add to cart immediately when modal not present
        const id = `${name.replace(/\s+/g, '-').toLowerCase()}-default`;
        const cart = loadCart();
        if (!cart[id]) {
          cart[id] = { id, name, price, qty: 1, size: null, notes: '' };
        } else {
          cart[id].qty += 1;
        }

        saveCart(cart);
        renderCart();
        showCartFeedback(`Added ${name} to cart.`);
        openCart();
      }
      return;
    }

    if (button === els.cartToggle) {
      if (els.cartPanel?.classList.contains('open')) {
        closeCart();
      } else {
        openCart();
        renderCart();
      }
      return;
    }

    if (button === els.closeCart) {
      closeCart();
      return;
    }

    if (button === els.checkoutBtn) {
      openCheckoutModal();
      return;
    }

    if (button === els.clearCart) {
      clearCartItems();
      return;
    }

    if (button === els.closeModal) {
      closeCustomizationModal();
      return;
    }

    const action = button.dataset.action;
    const itemId = button.dataset.id;
    if (!action || !itemId) return;

    if (action === 'increase') {
      updateCartItem(itemId, 1);
    } else if (action === 'decrease') {
      updateCartItem(itemId, -1);
    } else if (action === 'remove') {
      event.preventDefault();
      event.stopPropagation();
      removeCartItem(itemId);
    }
  }

  function applySearchFilter() {
    if (!els.searchInput) return;
    const query = normalize(els.searchInput.value);
    for (const card of cards) {
      const name = normalize(card.getAttribute('data-name') || '');
      const visible = !query || name.includes(query);
      card.style.display = visible ? '' : 'none';
    }
  }

  // Robust: attach direct click handlers to every Add-to-Cart button.
  // This prevents any global click-handler/overlay issues from blocking it.
  for (const addBtn of document.querySelectorAll('.add-to-cart')) {
    addBtn.addEventListener('click', (e) => {
      const card = addBtn.closest('.product-card');
      if (!card) return;
      const name = card.getAttribute('data-name') || 'Jersey';
      const price = Number(card.getAttribute('data-price') || '0');
      e.preventDefault();
      e.stopPropagation();
      openCustomizationModal(name, price);
    });
  }

  // Fallback global handler
  document.addEventListener('click', handleBodyClick, true);

  // Safety: never let renderCart() failures break the cart UI.
  function safeRenderCart() {
    try {
      renderCart();
    } catch (e) {
      console.error('renderCart failed', e);
    }
  }

  if (els.closeCart) {
    els.closeCart.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeCart();
    });
  }

  if (els.closeModal) {
    els.closeModal.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeCustomizationModal();
    });
  }

  els.pageOverlay?.addEventListener('click', () => {
    closeCart();
    closeCustomizationModal();
  });

  // Update price preview when modal inputs change
  function updateModalPricePreview() {
    if (!els.modalPricePreview || !els.modalProductPrice) return;
    const basePrice = Number(els.modalProductPrice.value || '0');
    let addon = 0;
    if ((els.modalPlayerName && els.modalPlayerName.value) || (els.modalPlayerNumber && els.modalPlayerNumber.value)) addon += 300;
    if (els.modalBadge) {
      if (els.modalBadge.value === 'club') addon += 200;
      if (els.modalBadge.value === 'league') addon += 300;
    }
    const total = basePrice + addon;
    els.modalPricePreview.textContent = formatKSH(total) + (addon ? ` (includes KSH ${addon} addons)` : '');
  }

  // Signup modal controls
  function openSignupModal() {
    if (!els.signupModal) return;
    els.signupModal.style.display = 'flex';
    els.pageOverlay?.classList.add('active');
    try { els.signupEmail?.focus(); } catch (e) {}
  }

  function closeSignupModal() {
    if (!els.signupModal) return;
    els.signupModal.style.display = 'none';
    els.signupFeedback && (els.signupFeedback.textContent = '');
    els.pageOverlay?.classList.remove('active');
  }

  async function handleSignupSubmit(e) {
    e.preventDefault();
    const email = (els.signupEmail && els.signupEmail.value || '').trim();
    const name = (els.signupName && els.signupName.value || '').trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      if (els.signupFeedback) { els.signupFeedback.style.color = 'red'; els.signupFeedback.textContent = 'Please enter a valid email address.'; }
      return;
    }

    try {
      if (els.signupFeedback) { els.signupFeedback.style.color = 'black'; els.signupFeedback.textContent = 'Signing you up...'; }

      // send to server lead collector (abandonment.php handles lead storage)
      const fd = new FormData();
      fd.append('email', email);
      if (name) fd.append('name', name);
      fd.append('source', 'newsletter_signup');
      try { fd.append('items', JSON.stringify(getCartItems())); } catch (e) {}
      fetch('api/abandonment.php', { method: 'POST', body: fd }).catch(() => {});

      // Attempt to send a welcome email via EmailJS (best-effort)
      if (window.emailjs) {
        try {
          await window.emailjs.send('service_6zr51e3', 'template_52wwywj', {
            customer_name: name || 'Subscriber',
            customer_email: email,
            order_summary: 'Newsletter signup - send welcome/discount code',
            cart_items: JSON.stringify(getCartItems() || [])
          });
        } catch (err) { /* ignore email send failures */ }
      }


      // Request server to generate a unique discount code
      try {
        const gen = await fetch('api/discount.php', { method: 'POST', body: new URLSearchParams({ action: 'generate', email: email, name: name }) });
        const genJ = await gen.json().catch(() => null);
        if (genJ && genJ.success) {
          const code = genJ.code;
          localStorage.setItem('jersey_sport_signed_up', JSON.stringify({ email: email, name: name, at: Date.now(), code: code }));
          if (els.signupDiscount) {
            els.signupDiscount.style.display = '';
            els.signupDiscount.innerHTML = `<div class=\\"signup-discount\\"><div>Use code</div><div class=\\"code\\">${code}</div><div>at checkout for ${genJ.percent}% off</div></div>`;
          }
          // prefill checkout email
          if (els.orderEmail) els.orderEmail.value = email;
        }
      } catch (err) {
        // fall back to local code
        localStorage.setItem('jersey_sport_signed_up', JSON.stringify({ email: email, name: name, at: Date.now() }));
        if (els.signupDiscount) {
          els.signupDiscount.style.display = '';
          els.signupDiscount.innerHTML = `<div class=\\"signup-discount\\"><div>Use code</div><div class=\\"code\\">JERSEY10</div><div>at checkout for 10% off</div></div>`;
        }
      }

      if (els.signupFeedback) { els.signupFeedback.style.color = 'green'; els.signupFeedback.textContent = 'Signed up — discount applied. Check your email.'; }
      setTimeout(() => closeSignupModal(), 2200);
    } catch (err) {
      if (els.signupFeedback) { els.signupFeedback.style.color = 'red'; els.signupFeedback.textContent = 'Signup failed. Try again later.'; }
    }
  }

  if (els.signupForm) els.signupForm.addEventListener('submit', handleSignupSubmit);
  if (els.signupClose) els.signupClose.addEventListener('click', closeSignupModal);

  // Discount apply flow
  els.discountInput = document.getElementById('discount-code');
  els.applyDiscountBtn = document.getElementById('apply-discount-btn');
  els.discountInfo = document.getElementById('discount-info');

  async function applyDiscountCode(code) {
    if (!code) return false;
    try {
      const res = await fetch('api/discount.php', { method: 'POST', body: new URLSearchParams({ action: 'validate', code: code.trim() }) });
      const j = await res.json().catch(() => null);
      if (j && j.success) {
        appliedDiscount = { id: j.id, code: j.code, percent: Number(j.percent || 0) };
        if (els.discountInfo) els.discountInfo.textContent = `Applied ${appliedDiscount.percent}% off (${appliedDiscount.code})`;
        // update cart total display
        try { renderCart(); } catch (e) {}
        return true;
      }
      if (els.discountInfo) els.discountInfo.textContent = j && j.message ? j.message : 'Invalid code';
      return false;
    } catch (e) {
      if (els.discountInfo) els.discountInfo.textContent = 'Unable to validate code';
      return false;
    }
  }

  if (els.applyDiscountBtn) {
    els.applyDiscountBtn.addEventListener('click', async () => {
      const code = (els.discountInput && els.discountInput.value) || '';
      if (!code) { if (els.discountInfo) els.discountInfo.textContent = 'Enter a code first'; return; }
      els.applyDiscountBtn.disabled = true;
      const ok = await applyDiscountCode(code);
      els.applyDiscountBtn.disabled = false;
      if (ok) { showCartFeedback('Discount applied'); } else { showCartFeedback('Discount not applied', 'error'); }
    });
  }

  // Wire up modal preview listeners if present
  if (els.modalPlayerName) els.modalPlayerName.addEventListener('input', updateModalPricePreview);
  if (els.modalPlayerNumber) els.modalPlayerNumber.addEventListener('input', updateModalPricePreview);
  if (els.modalBadge) els.modalBadge.addEventListener('change', updateModalPricePreview);
  if (els.modalQty) els.modalQty.addEventListener('input', updateModalPricePreview);

  // Prevent the modal's submit button click from reaching the global capture click handler
  if (els.modalForm) {
    // support both the old submit button and the new modal-confirm-btn
    const confirmBtnSubmit = els.modalForm.querySelector('button[type="submit"]');
    if (confirmBtnSubmit) {
      confirmBtnSubmit.addEventListener('click', (e) => {
        try { e.stopPropagation(); e.stopImmediatePropagation(); } catch (err) {}
      }, true);
    }
    const modalConfirm = document.getElementById('modal-confirm-btn');
    if (modalConfirm) {
      modalConfirm.addEventListener('click', (e) => {
        console.log('modalConfirm clicked');
        try { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); } catch (err) {}
        try {
          // Prefer the native submit flow so any form-level listeners run normally
          if (els.modalForm && typeof els.modalForm.requestSubmit === 'function') {
            els.modalForm.requestSubmit();
          } else if (els.modalForm) {
            const ev = new Event('submit', { bubbles: true, cancelable: true });
            els.modalForm.dispatchEvent(ev);
          } else {
            handleModalSubmit({ preventDefault: () => {}, stopPropagation: () => {}, stopImmediatePropagation: () => {} });
          }
        } catch (err) { console.error('modal confirm error', err); }
        try { renderCart(); } catch (err) {}
      }, true);
    }
  }

  function syncCartRecovery(consent = !!els.orderRecoveryConsent?.checked) {
    const email = (els.orderEmail?.value || '').trim();
    const phone = (els.orderPhone?.value || '').trim();
    const items = getCartItems();
    if (!email || !Array.isArray(items) || !items.length) return;
    const payload = new FormData();
    payload.append('email', email);
    payload.append('phone', phone || '');
    payload.append('items', JSON.stringify(items));
    payload.append('url', window.location.href);
    payload.append('consent', consent ? 'true' : 'false');
    fetch('api/abandonment.php', { method: 'POST', body: payload }).catch(() => {});
  }

  els.orderEmail?.addEventListener('blur', () => syncCartRecovery());
  els.orderPhone?.addEventListener('blur', () => syncCartRecovery());
  els.orderRecoveryConsent?.addEventListener('change', () => syncCartRecovery(els.orderRecoveryConsent.checked));

  // Show/hide deposit field when payment option changes
  function refreshDepositVisibility() {
    const depositRow = document.getElementById('deposit-row');
    const selected = (document.querySelector('input[name="payment_option"]:checked') || {}).value || 'full';
    if (depositRow) depositRow.style.display = selected === 'deposit' ? '' : 'none';
  }
  for (const el of (els.orderPaymentInputs || [])) {
    try { el.addEventListener('change', refreshDepositVisibility); } catch (e) {}
  }
  // initialize visibility
  refreshDepositVisibility();

  els.modalForm?.addEventListener('submit', (e) => {
    handleModalSubmit(e);
    // ensure button visibility updates after adding items
    try { renderCart(); } catch (err) { /* ignore */ }
  });

  if (els.searchInput) {
    els.searchInput.addEventListener('input', applySearchFilter);
  }

  els.orderForm?.addEventListener('submit', handleOrderSubmit);

  // Allow other scripts (fallback) to notify this code to re-render the cart
  document.addEventListener('cart-updated', () => {
    try { renderCart(); } catch (e) { /* ignore if renderCart not available yet */ }
  });

  clearInitialCartBadgeIfEmpty();
  renderCart();
  loadApprovedReviews();
})();
