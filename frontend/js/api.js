/**
 * ShopFlow API Client
 * Handles all HTTP communication with backend services.
 */
class ShopFlowAPI {
  constructor() {
    this.token = localStorage.getItem('shopflow_token');
    this.user = JSON.parse(localStorage.getItem('shopflow_user') || 'null');
  }

  get headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  }

  setAuth(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem('shopflow_token', token);
    localStorage.setItem('shopflow_user', JSON.stringify(user));
  }

  clearAuth() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('shopflow_token');
    localStorage.removeItem('shopflow_user');
  }

  isLoggedIn() {
    return !!this.token;
  }

  async request(baseUrl, path, options = {}) {
    const url = `${baseUrl}${path}`;
    try {
      const res = await fetch(url, {
        headers: this.headers,
        ...options,
      });
      const data = await res.json();
      if (!res.ok) {
        throw { status: res.status, ...data };
      }
      return data;
    } catch (err) {
      if (err.status) throw err;
      throw { status: 0, error: 'NETWORK_ERROR', message: `Cannot reach ${url}` };
    }
  }

  // ─── Auth ───
  async login(email, password) {
    const data = await this.request(CONFIG.AUTH_SERVICE_URL, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setAuth(data.token, data.user);
    return data;
  }

  // ─── Products ───
  async getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(CONFIG.PRODUCT_SERVICE_URL, `/api/products?${query}`);
  }

  async getCategories() {
    return this.request(CONFIG.PRODUCT_SERVICE_URL, '/api/categories');
  }

  // ─── Orders ───
  async getOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(CONFIG.ORDER_SERVICE_URL, `/api/orders?${query}`);
  }

  async getOrderStats() {
    return this.request(CONFIG.ORDER_SERVICE_URL, '/api/orders/stats/summary');
  }

  // ─── Health Checks ───
  async checkHealth(healthPath) {
    try {
      const res = await fetch(healthPath, { signal: AbortSignal.timeout(5000) });
      return await res.json();
    } catch {
      return { status: 'unreachable', service: 'unknown' };
    }
  }

  async checkAllHealth() {
    const services = Object.entries(CONFIG.HEALTH_URLS).map(([name, path]) => ({
      name,
      url: path,
    }));

    const results = await Promise.all(
      services.map(async (s) => {
        const health = await this.checkHealth(s.url);
        return { ...s, health };
      })
    );

    return results;
  }
}

const api = new ShopFlowAPI();
