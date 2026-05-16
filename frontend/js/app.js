/**
 * ShopFlow Dashboard Application
 */
(function () {
  // ─── State ───
  let currentSection = 'overview';
  let productsPage = 1;
  let ordersPage = 1;
  let healthInterval = null;

  // ─── DOM Refs ───
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ─── Init ───
  function init() {
    if (api.isLoggedIn()) {
      showDashboard();
    } else {
      showLogin();
    }

    // Login form
    $('#login-form').addEventListener('submit', handleLogin);

    // Navigation
    $$('.nav-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(link.dataset.section);
      });
    });

    // Logout
    $('#logout-btn').addEventListener('click', handleLogout);

    // Filters
    $('#product-search').addEventListener('input', debounce(() => loadProducts(), 400));
    $('#product-category-filter').addEventListener('change', () => loadProducts());
    $('#order-status-filter').addEventListener('change', () => loadOrders());
  }

  // ─── Auth ───
  async function handleLogin(e) {
    e.preventDefault();
    const email = $('#login-email').value;
    const password = $('#login-password').value;
    const errorEl = $('#login-error');

    try {
      $('#login-btn').textContent = 'Signing in...';
      $('#login-btn').disabled = true;
      errorEl.classList.add('hidden');

      await api.login(email, password);
      showDashboard();
    } catch (err) {
      errorEl.textContent = err.message || 'Login failed. Are the backend services running?';
      errorEl.classList.remove('hidden');
    } finally {
      $('#login-btn').textContent = 'Sign In';
      $('#login-btn').disabled = false;
    }
  }

  function handleLogout() {
    api.clearAuth();
    if (healthInterval) clearInterval(healthInterval);
    showLogin();
  }

  function showLogin() {
    $('#login-screen').classList.add('active');
    $('#dashboard-screen').classList.remove('active');
  }

  function showDashboard() {
    $('#login-screen').classList.remove('active');
    $('#dashboard-screen').classList.add('active');

    // Update user info
    if (api.user) {
      $('#user-name').textContent = api.user.name || api.user.email;
      $('#user-role').textContent = api.user.role;
    }

    navigateTo('overview');
    startHealthChecks();
  }

  // ─── Navigation ───
  function navigateTo(section) {
    currentSection = section;

    $$('.nav-link').forEach((l) => l.classList.remove('active'));
    $(`.nav-link[data-section="${section}"]`).classList.add('active');

    $$('.section').forEach((s) => s.classList.remove('active'));
    $(`#section-${section}`).classList.add('active');

    const titles = {
      overview: 'Overview',
      products: 'Products',
      orders: 'Orders',
      health: 'Service Health',
    };
    $('#page-title').textContent = titles[section] || section;

    // Load data for section
    switch (section) {
      case 'overview': loadOverview(); break;
      case 'products': loadProducts(); loadCategories(); break;
      case 'orders': loadOrders(); break;
      case 'health': loadHealth(); break;
    }
  }

  // ─── Overview ───
  async function loadOverview() {
    try {
      const [productsData, statsData] = await Promise.allSettled([
        api.getProducts({ limit: 100, active_only: true }),
        api.getOrderStats(),
      ]);

      if (productsData.status === 'fulfilled') {
        const products = productsData.value;
        $('#stat-products').textContent = products.pagination?.total || '—';

        const lowStock = products.products?.filter(
          (p) => p.stock_quantity <= CONFIG.LOW_STOCK_THRESHOLD
        ).length || 0;
        $('#stat-low-stock').textContent = lowStock;
      }

      if (statsData.status === 'fulfilled') {
        const stats = statsData.value.stats;
        $('#stat-orders').textContent = stats.total_orders;
        $('#stat-revenue').textContent = `$${stats.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

        // Load recent orders
        const recentOrders = await api.getOrders({ limit: 5 });
        renderRecentOrders(recentOrders.orders);
      } else {
        $('#stat-orders').textContent = '—';
        $('#stat-revenue').textContent = '—';
        $('#recent-orders-table').innerHTML = '<p class="muted">Order service unavailable</p>';
      }
    } catch (err) {
      console.error('Overview load error:', err);
    }
  }

  function renderRecentOrders(orders) {
    if (!orders || orders.length === 0) {
      $('#recent-orders-table').innerHTML = '<p class="muted">No orders yet</p>';
      return;
    }

    const html = `
      <table>
        <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          ${orders.map((o) => `
            <tr>
              <td><strong>${o.order_number}</strong></td>
              <td>${o.user_email}</td>
              <td>$${o.total.toFixed(2)}</td>
              <td><span class="status status-${o.status}">${o.status}</span></td>
              <td>${new Date(o.created_at).toLocaleDateString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    $('#recent-orders-table').innerHTML = html;
  }

  // ─── Products ───
  async function loadProducts() {
    try {
      const search = $('#product-search').value;
      const categoryId = $('#product-category-filter').value;

      const params = { page: productsPage, limit: 15 };
      if (search) params.search = search;
      if (categoryId) params.category_id = categoryId;

      const data = await api.getProducts(params);
      renderProducts(data.products, data.pagination);
    } catch (err) {
      $('#products-table').innerHTML = `<p class="muted">Failed to load products: ${err.message}</p>`;
    }
  }

  function renderProducts(products, pagination) {
    if (!products || products.length === 0) {
      $('#products-table').innerHTML = '<p class="muted">No products found</p>';
      $('#products-pagination').innerHTML = '';
      return;
    }

    const html = `
      <table>
        <thead><tr><th>SKU</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th></tr></thead>
        <tbody>
          ${products.map((p) => {
            let stockClass = '';
            if (p.stock_quantity <= 5) stockClass = 'stock-critical';
            else if (p.stock_quantity <= CONFIG.LOW_STOCK_THRESHOLD) stockClass = 'stock-low';

            return `
              <tr>
                <td><code>${p.sku}</code></td>
                <td>${p.name}</td>
                <td>${p.category_name || '—'}</td>
                <td>$${p.price.toFixed(2)}</td>
                <td class="${stockClass}">${p.stock_quantity}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
    $('#products-table').innerHTML = html;
    renderPagination('products', pagination);
  }

  async function loadCategories() {
    try {
      const data = await api.getCategories();
      const select = $('#product-category-filter');
      const current = select.value;
      select.innerHTML = '<option value="">All Categories</option>';
      data.categories.forEach((c) => {
        select.innerHTML += `<option value="${c.id}">${c.name} (${c.product_count})</option>`;
      });
      select.value = current;
    } catch (err) {
      console.error('Categories load error:', err);
    }
  }

  // ─── Orders ───
  async function loadOrders() {
    try {
      const status = $('#order-status-filter').value;
      const params = { page: ordersPage, limit: 15 };
      if (status) params.status = status;

      const data = await api.getOrders(params);
      renderOrders(data.orders, data.pagination);
    } catch (err) {
      $('#orders-table').innerHTML = `<p class="muted">Failed to load orders: ${err.message}</p>`;
    }
  }

  function renderOrders(orders, pagination) {
    if (!orders || orders.length === 0) {
      $('#orders-table').innerHTML = '<p class="muted">No orders found</p>';
      $('#orders-pagination').innerHTML = '';
      return;
    }

    const html = `
      <table>
        <thead><tr><th>Order #</th><th>Customer</th><th>Subtotal</th><th>Tax</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          ${orders.map((o) => `
            <tr>
              <td><strong>${o.order_number}</strong></td>
              <td>${o.user_email}</td>
              <td>$${o.subtotal.toFixed(2)}</td>
              <td>$${o.tax.toFixed(2)}</td>
              <td><strong>$${o.total.toFixed(2)}</strong></td>
              <td><span class="status status-${o.status}">${o.status}</span></td>
              <td>${new Date(o.created_at).toLocaleDateString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    $('#orders-table').innerHTML = html;
    renderPagination('orders', pagination);
  }

  // ─── Health ───
  async function loadHealth() {
    const container = $('#health-cards');
    container.innerHTML = '<p class="muted">Checking services...</p>';

    const results = await api.checkAllHealth();

    container.innerHTML = results.map((s) => {
      const isHealthy = s.health.status === 'healthy';
      const isUnreachable = s.health.status === 'unreachable';
      const statusText = isUnreachable ? 'Unreachable' : (isHealthy ? 'Healthy' : 'Unhealthy');
      const statusClass = isUnreachable ? 'unhealthy' : (isHealthy ? 'healthy' : 'unhealthy');
      const emoji = isUnreachable ? '🔴' : (isHealthy ? '🟢' : '🟡');

      let details = '';
      if (!isUnreachable) {
        if (s.health.version) details += `<div class="health-detail"><span>Version</span><span>${s.health.version}</span></div>`;
        if (s.health.uptime) details += `<div class="health-detail"><span>Uptime</span><span>${Math.floor(s.health.uptime)}s</span></div>`;
        if (s.health.checks) {
          for (const [name, check] of Object.entries(s.health.checks)) {
            const checkStatus = check.connected ? '✅ Connected' : '❌ Disconnected';
            details += `<div class="health-detail"><span>${name}</span><span>${checkStatus}</span></div>`;
          }
        }
        if (s.health.worker) {
          details += `<div class="health-detail"><span>Events Processed</span><span>${s.health.worker.events_processed || 0}</span></div>`;
          details += `<div class="health-detail"><span>Events Failed</span><span>${s.health.worker.events_failed || 0}</span></div>`;
        }
      }

      return `
        <div class="health-card ${statusClass}">
          <div class="health-card-header">
            <h3>${emoji} ${s.name}</h3>
            <span class="status status-${isHealthy ? 'delivered' : 'cancelled'}">${statusText}</span>
          </div>
          <div class="health-detail"><span>URL</span><span>${s.url}</span></div>
          ${details}
        </div>
      `;
    }).join('');
  }

  function startHealthChecks() {
    if (healthInterval) clearInterval(healthInterval);
    updateConnectionStatus();
    healthInterval = setInterval(updateConnectionStatus, CONFIG.HEALTH_CHECK_INTERVAL);
  }

  async function updateConnectionStatus() {
    const el = $('#connection-status');
    try {
      await api.checkHealth(CONFIG.AUTH_SERVICE_URL);
      el.className = 'connection-status connected';
      el.querySelector('.status-text').textContent = 'Services Online';
    } catch {
      el.className = 'connection-status disconnected';
      el.querySelector('.status-text').textContent = 'Services Offline';
    }
  }

  // ─── Pagination ───
  function renderPagination(type, pagination) {
    if (!pagination || pagination.totalPages <= 1) {
      $(`#${type}-pagination`).innerHTML = '';
      return;
    }

    const { page, totalPages, total } = pagination;
    $(`#${type}-pagination`).innerHTML = `
      <button ${page <= 1 ? 'disabled' : ''} onclick="window.paginate('${type}', ${page - 1})">← Prev</button>
      <span class="page-info">Page ${page} of ${totalPages} (${total} total)</span>
      <button ${page >= totalPages ? 'disabled' : ''} onclick="window.paginate('${type}', ${page + 1})">Next →</button>
    `;
  }

  window.paginate = function (type, page) {
    if (type === 'products') {
      productsPage = page;
      loadProducts();
    } else if (type === 'orders') {
      ordersPage = page;
      loadOrders();
    }
  };

  // ─── Utils ───
  function debounce(fn, delay) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ─── Boot ───
  document.addEventListener('DOMContentLoaded', init);
})();
