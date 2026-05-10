/* ===== State ===== */
let currentUser = null;
let allProducts  = [];
let currentCategory = null;

/* ===== Init ===== */
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  await loadProducts();
  await refreshCartBadge();
});

/* ===== Navigation ===== */
function showPage(page) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  const el = document.getElementById(`page-${page}`);
  if (!el) return;
  el.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (page === 'cart')    { loadCart(); }
  if (page === 'profile') {
    if (!currentUser) { showPage('login'); return; }
    loadProfile();
    loadAddresses();
  }
}

/* ===================== AUTH ===================== */
async function checkAuth() {
  try {
    const data = await api('/api/auth/me');
    currentUser = data.user;
  } catch {
    currentUser = null;
  }
  renderAuthUI();
}

function renderAuthUI() {
  const authNav = document.getElementById('authNav');
  const userNav = document.getElementById('userNav');
  const nameEl  = document.getElementById('navUserName');

  if (currentUser) {
    authNav.style.display = 'none';
    userNav.style.display = 'flex';
    if (nameEl) nameEl.textContent = currentUser.email.split('@')[0];
  } else {
    authNav.style.display = 'flex';
    userNav.style.display = 'none';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const form  = e.target;
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';

  try {
    const data = await api('/api/auth/login', 'POST', {
      email:    form.email.value.trim(),
      password: form.password.value,
    });
    currentUser = data.user;
    renderAuthUI();
    form.reset();
    showPage('home');
    toast(`Welcome back, ${data.user.firstName || data.user.email.split('@')[0]}!`, 'success');
    refreshCartBadge();
  } catch (err) {
    showAlert(errEl, err.message);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const form  = e.target;
  const errEl = document.getElementById('registerError');
  errEl.style.display = 'none';

  try {
    const data = await api('/api/auth/register', 'POST', {
      email:     form.email.value.trim(),
      password:  form.password.value,
      firstName: form.firstName ? form.firstName.value.trim() : '',
      lastName:  form.lastName  ? form.lastName.value.trim()  : '',
    });
    currentUser = data.user;
    renderAuthUI();
    form.reset();
    showPage('home');
    toast('Account created! Welcome to MyClothes 🎉', 'success');
    refreshCartBadge();
  } catch (err) {
    showAlert(errEl, err.message);
  }
}

async function logout() {
  await api('/api/auth/logout', 'POST').catch(() => {});
  currentUser = null;
  renderAuthUI();
  showPage('home');
  refreshCartBadge();
  toast('Logged out successfully');
}

/* ===================== PRODUCTS ===================== */
async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><br>Loading products…</div>';

  try {
    allProducts = await api('/api/products');
    renderProducts(allProducts);
    await loadCategories();
  } catch {
    grid.innerHTML = '<div class="empty-state grid-span"><i class="fas fa-exclamation-circle"></i><h3>Failed to load products</h3></div>';
  }
}

async function loadCategories() {
  try {
    const cats = await api('/api/products/categories');
    const container = document.getElementById('categoryFilters');
    cats.forEach((cat) => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.textContent = cat;
      btn.onclick = () => setCategory(cat, btn);
      container.appendChild(btn);
    });
  } catch { /* ignore */ }
}

function setCategory(category, btn) {
  document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  currentCategory = category;
  filterProducts();
}

function filterProducts() {
  const q = (document.getElementById('searchInput').value || '').toLowerCase();
  const filtered = allProducts.filter((p) => {
    const matchCat  = !currentCategory || p.category === currentCategory;
    const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });
  renderProducts(filtered);
}

function renderProducts(products) {
  const grid = document.getElementById('productsGrid');

  if (!products.length) {
    grid.innerHTML = `
      <div class="empty-state grid-span">
        <i class="fas fa-search"></i>
        <h3>No products found</h3>
        <p>Try different keywords or categories</p>
      </div>`;
    return;
  }

  grid.innerHTML = products.map((p) => `
    <div class="product-card" onclick="openProductModal(${p.id})">
      <img
        src="${esc(p.image_url)}"
        alt="${esc(p.name)}"
        loading="lazy"
        onerror="this.src='https://placehold.co/500x300?text=No+Image'"
      />
      <div class="product-info">
        <div class="product-category">${esc(p.category)}</div>
        <div class="product-name">${esc(p.name)}</div>
        <div class="product-desc">${esc(p.description || '')}</div>
        <div class="product-price">$${fmt(p.price)}</div>
        <button class="btn-primary" style="width:100%" onclick="event.stopPropagation(); addToCart(${p.id})">
          <i class="fas fa-cart-plus"></i> Add to Cart
        </button>
      </div>
    </div>
  `).join('');
}

function openProductModal(id) {
  const p = allProducts.find((x) => x.id === id);
  if (!p) return;

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-product">
      <img src="${esc(p.image_url)}" alt="${esc(p.name)}" onerror="this.src='https://placehold.co/500x300?text=No+Image'" />
      <div class="modal-product-info">
        <div class="cat">${esc(p.category)}</div>
        <h2>${esc(p.name)}</h2>
        <div class="price">$${fmt(p.price)}</div>
        <p class="desc">${esc(p.description || '')}</p>
        <p class="stock"><i class="fas fa-box"></i> ${p.stock} in stock</p>
        <button class="btn-primary btn-block" onclick="addToCart(${p.id}); closeModal()">
          <i class="fas fa-cart-plus"></i> Add to Cart
        </button>
      </div>
    </div>`;
  document.getElementById('productModal').classList.add('open');
}

function closeModal() {
  document.getElementById('productModal').classList.remove('open');
}

/* ===================== CART ===================== */
async function addToCart(productId, quantity = 1) {
  try {
    const data = await api('/api/cart/add', 'POST', { productId, quantity });
    updateBadge(data.cartCount);
    toast('Added to cart!', 'success');
  } catch (err) {
    toast(err.message || 'Could not add to cart', 'error');
  }
}

async function refreshCartBadge() {
  try {
    const cart = await api('/api/cart');
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    updateBadge(count);
  } catch {
    updateBadge(0);
  }
}

function updateBadge(count) {
  document.getElementById('cartBadge').textContent = count || 0;
}

async function loadCart() {
  const itemsEl   = document.getElementById('cartItems');
  const summaryEl = document.getElementById('cartSummary');
  itemsEl.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i></div>';
  summaryEl.innerHTML = '';

  try {
    const cart = await api('/api/cart');
    renderCart(cart, itemsEl, summaryEl);
  } catch {
    itemsEl.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Failed to load cart</h3></div>';
  }
}

function renderCart(cart, itemsEl, summaryEl) {
  if (!cart.length) {
    itemsEl.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-shopping-cart"></i>
        <h3>Your cart is empty</h3>
        <p>Browse our collection and add something you love!</p>
        <button class="btn-primary" style="margin-top:20px" onclick="showPage('home')">
          <i class="fas fa-store"></i> Continue Shopping
        </button>
      </div>`;
    return;
  }

  const subtotal = cart.reduce((s, i) => s + (parseFloat(i.product.price) * i.quantity), 0);
  const shipping  = subtotal >= 100 ? 0 : 9.99;
  const total     = subtotal + shipping;

  itemsEl.innerHTML = cart.map((item) => `
    <div class="cart-item">
      <img
        src="${esc(item.product.image_url)}"
        alt="${esc(item.product.name)}"
        onerror="this.src='https://placehold.co/90x90?text=?'"
      />
      <div class="cart-item-info">
        <div class="cart-item-name">${esc(item.product.name)}</div>
        <div class="cart-item-cat">${esc(item.product.category)}</div>
        <div class="cart-item-price">$${fmt(item.product.price)} each</div>
        <div class="qty-control">
          <button class="qty-btn" onclick="changeQty(${item.productId}, ${item.quantity - 1})">−</button>
          <span class="qty-num">${item.quantity}</span>
          <button class="qty-btn" onclick="changeQty(${item.productId}, ${item.quantity + 1})">+</button>
          <button class="btn-danger" onclick="removeItem(${item.productId})">
            <i class="fas fa-trash-alt"></i> Remove
          </button>
        </div>
      </div>
      <div class="cart-item-total">$${fmt(parseFloat(item.product.price) * item.quantity)}</div>
    </div>`).join('');

  summaryEl.innerHTML = `
    <p class="summary-title">Order Summary</p>
    <div class="summary-row">
      <span>Subtotal (${cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
      <span>$${fmt(subtotal)}</span>
    </div>
    <div class="summary-row">
      <span>Shipping</span>
      <span>${shipping === 0 ? '<span style="color:#15803d">Free</span>' : '$' + fmt(shipping)}</span>
    </div>
    ${shipping > 0 ? `<p class="free-shipping"><i class="fas fa-truck"></i> Free shipping on orders $100+</p>` : ''}
    <div class="summary-row total-row">
      <span>Total</span>
      <strong>$${fmt(total)}</strong>
    </div>
    <button class="btn-primary btn-block" style="margin-top:20px" onclick="checkout()">
      <i class="fas fa-lock"></i> Proceed to Checkout
    </button>
    <button class="btn-outline btn-block" style="margin-top:10px" onclick="showPage('home')">
      <i class="fas fa-arrow-left"></i> Continue Shopping
    </button>`;
}

async function changeQty(productId, quantity) {
  try {
    const data = await api('/api/cart/update', 'PUT', { productId, quantity });
    updateBadge(data.cartCount);
    loadCart();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function removeItem(productId) {
  try {
    const data = await api(`/api/cart/remove/${productId}`, 'DELETE');
    updateBadge(data.cartCount);
    loadCart();
    toast('Item removed from cart');
  } catch { /* ignore */ }
}

function checkout() {
  toast('Checkout flow — integrate your payment gateway here!', 'success');
}

/* ===================== PROFILE ===================== */
async function loadProfile() {
  try {
    const u = await api('/api/user/profile');
    document.getElementById('profileFirstName').value = u.first_name || '';
    document.getElementById('profileLastName').value  = u.last_name  || '';
    document.getElementById('profileEmail').value     = u.email || '';
  } catch {
    showPage('login');
  }
}

async function handleProfileUpdate(e) {
  e.preventDefault();
  const form    = e.target;
  const successEl = document.getElementById('profileSuccess');
  successEl.style.display = 'none';
  try {
    await api('/api/user/profile', 'PUT', {
      firstName: form.firstName.value.trim(),
      lastName:  form.lastName.value.trim(),
    });
    successEl.style.display = 'block';
    setTimeout(() => { successEl.style.display = 'none'; }, 3000);
    toast('Profile updated!', 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* ===================== ADDRESSES ===================== */
async function loadAddresses() {
  const container = document.getElementById('addressList');
  try {
    const addrs = await api('/api/user/addresses');
    if (!addrs.length) {
      container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:16px 0">No addresses saved yet.</p>';
      return;
    }
    container.innerHTML = addrs.map((a) => `
      <div class="address-item ${a.is_default ? 'default-addr' : ''}">
        <div class="addr-text">
          ${a.is_default ? '<span class="default-badge">Default</span>' : ''}
          <p class="addr-street">${esc(a.street)}</p>
          <p>${esc(a.city)}${a.state ? ', ' + esc(a.state) : ''} ${esc(a.postal_code || '')}</p>
          <p>${esc(a.country)}</p>
        </div>
        <div class="addr-actions">
          <button title="Edit" onclick='editAddress(${JSON.stringify(a)})'>
            <i class="fas fa-pen"></i>
          </button>
          <button class="del-btn" title="Delete" onclick="deleteAddress(${a.id})">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>`).join('');
  } catch {
    container.innerHTML = '<p style="color:red">Failed to load addresses.</p>';
  }
}

function showAddressForm(reset = true) {
  if (reset) {
    document.getElementById('addressId').value    = '';
    document.getElementById('addrStreet').value   = '';
    document.getElementById('addrCity').value     = '';
    document.getElementById('addrState').value    = '';
    document.getElementById('addrPostal').value   = '';
    document.getElementById('addrCountry').value  = '';
    document.getElementById('addrDefault').checked = false;
    document.getElementById('addressFormTitle').textContent = 'New Address';
  }
  document.getElementById('addressForm').style.display = 'block';
}

function hideAddressForm() {
  document.getElementById('addressForm').style.display = 'none';
}

function editAddress(addr) {
  document.getElementById('addressId').value     = addr.id;
  document.getElementById('addrStreet').value    = addr.street;
  document.getElementById('addrCity').value      = addr.city;
  document.getElementById('addrState').value     = addr.state || '';
  document.getElementById('addrPostal').value    = addr.postal_code || '';
  document.getElementById('addrCountry').value   = addr.country;
  document.getElementById('addrDefault').checked = !!addr.is_default;
  document.getElementById('addressFormTitle').textContent = 'Edit Address';
  showAddressForm(false);
}

async function handleAddressSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('addressId').value;
  const body = {
    street:     document.getElementById('addrStreet').value.trim(),
    city:       document.getElementById('addrCity').value.trim(),
    state:      document.getElementById('addrState').value.trim(),
    postalCode: document.getElementById('addrPostal').value.trim(),
    country:    document.getElementById('addrCountry').value.trim(),
    isDefault:  document.getElementById('addrDefault').checked,
  };

  try {
    if (id) {
      await api(`/api/user/addresses/${id}`, 'PUT', body);
      toast('Address updated!', 'success');
    } else {
      await api('/api/user/addresses', 'POST', body);
      toast('Address added!', 'success');
    }
    hideAddressForm();
    loadAddresses();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function deleteAddress(id) {
  if (!confirm('Delete this address?')) return;
  try {
    await api(`/api/user/addresses/${id}`, 'DELETE');
    loadAddresses();
    toast('Address deleted');
  } catch {
    toast('Failed to delete address', 'error');
  }
}

/* ===================== HELPERS ===================== */
async function api(url, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
  };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function showAlert(el, msg) {
  el.textContent  = msg;
  el.style.display = 'block';
}

function toast(message, type = '') {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.className   = `toast ${type} show`;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.classList.remove('show'); }, 3200);
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmt(num) {
  return parseFloat(num).toFixed(2);
}
