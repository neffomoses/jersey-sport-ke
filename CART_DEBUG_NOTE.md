<<<<<<< HEAD
Cart debug notes (for fixing “cart shows even when no jersey added”):

1) The empty state is expected to render when localStorage cart is empty.
   - script.js always calls renderCart() at the end.
   - renderCart() renders the “Your cart is empty” block when items.length === 0.

2) If the cart panel is visible immediately on page load, it means #cart-panel is incorrectly open.
   - Check that your CSS only opens it when `.cart-panel.open` is applied.
   - In script.js, openCart() adds `.open` to #cart-panel; closeCart() removes it.

3) Suggested quick test:
   - Open DevTools Console and run:
     localStorage.getItem('jersey_sport_cart_v1')
   - If it’s not null/empty JSON, old items are still in storage.

4) If you want the panel to start closed visually, ensure:
   - #cart-panel has no `.open` class in HTML.
   - No script runs openCart() on load except when user clicks.

5) Optional improvement:
   - Instead of keeping the empty message in the drawer, show the drawer only after clicking Cart.

=======
Cart debug notes (for fixing “cart shows even when no jersey added”):

1) The empty state is expected to render when localStorage cart is empty.
   - script.js always calls renderCart() at the end.
   - renderCart() renders the “Your cart is empty” block when items.length === 0.

2) If the cart panel is visible immediately on page load, it means #cart-panel is incorrectly open.
   - Check that your CSS only opens it when `.cart-panel.open` is applied.
   - In script.js, openCart() adds `.open` to #cart-panel; closeCart() removes it.

3) Suggested quick test:
   - Open DevTools Console and run:
     localStorage.getItem('jersey_sport_cart_v1')
   - If it’s not null/empty JSON, old items are still in storage.

4) If you want the panel to start closed visually, ensure:
   - #cart-panel has no `.open` class in HTML.
   - No script runs openCart() on load except when user clicks.

5) Optional improvement:
   - Instead of keeping the empty message in the drawer, show the drawer only after clicking Cart.

>>>>>>> f17c75c (Add website files and netlify config)
