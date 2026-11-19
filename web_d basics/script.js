document.addEventListener("DOMContentLoaded", () => {

  let cart = [];
  let total = 0;

  // Add to Cart buttons
  document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', () => {

      const product = btn.dataset.product;
      const price = Number(btn.dataset.price);

      if (!product || isNaN(price)) return;

      cart.push({ name: product, price: price });
      total += price;

      updateCart();
    });
  });

  // Update cart UI
  function updateCart() {
    document.getElementById('cart-btn').textContent = `Cart (${cart.length})`;

    document.getElementById('cart-items').innerHTML = cart
      .map(item => `<li>${item.name} - ₹${item.price}</li>`)
      .join('');

    document.getElementById('total').textContent = total.toFixed(2);
  }

  // Open cart modal
  document.getElementById('cart-btn').addEventListener('click', () => {
    document.getElementById('cart-modal').style.display = 'block';
  });

  // Checkout
  document.getElementById('checkout-btn').addEventListener('click', () => {
    document.getElementById('cart-modal').style.display = 'none';
    document.getElementById('checkout-modal').style.display = 'block';
  });

  // Close modals
  document.querySelectorAll('.close').forEach(close => {
    close.addEventListener('click', () => {
      document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
      });
    });
  });

  // Submit checkout
  document.getElementById('checkout-form').addEventListener('submit', e => {
    e.preventDefault();
    alert('Purchase completed!');
    cart = [];
    total = 0;
    updateCart();
    document.getElementById('checkout-modal').style.display = 'none';
  });

});
