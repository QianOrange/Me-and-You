const API = {
  _token: null,

  setToken(token) {
    this._token = token;
    localStorage.setItem('auth_token', token);
  },

  loadToken() {
    this._token = localStorage.getItem('auth_token');
    return !!this._token;
  },

  async _fetch(path, options = {}) {
    const headers = options.headers || {};
    if (this._token) {
      headers['Authorization'] = `Bearer ${this._token}`;
    }
    const res = await fetch(path, { ...options, headers });
    if (res.status === 401) {
      localStorage.removeItem('auth_token');
      this._token = null;
      document.getElementById('login-screen').style.display = 'flex';
      document.getElementById('app-main').style.display = 'none';
      throw new Error('未登录');
    }
    return res.json();
  },

  async get(path) { return this._fetch(path); },
  async post(path, body) {
    return this._fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  },
  async put(path, body) {
    return this._fetch(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  },
  async del(path) {
    return this._fetch(path, { method: 'DELETE' });
  },

  // Auth
  async login(password) {
    const res = await this._fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    return res;
  },

  // Messages
  getMessages() { return this.get('/api/messages'); },
  createMessage(author, content, style) { return this.post('/api/messages', { author, content, style }); },
  markRead(id) { return this.put(`/api/messages/${id}`, { readAt: new Date().toISOString() }); },
  deleteMessage(id) { return this.del(`/api/messages/${id}`); },

  // Markers
  getMarkers() { return this.get('/api/markers'); },
  createMarker(data) { return this.post('/api/markers', data); },
  deleteMarker(id) { return this.del(`/api/markers/${id}`); },

  // Geocoding
  async searchPlace(query) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=zh`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'OurLittleWorld/1.0' }
    });
    return res.json();
  }
};
