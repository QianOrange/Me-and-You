const MapApp = {
  map: null,
  markers: [],
  layerGroup: null,
  defaultCenter: [35.86, 104.19],
  defaultZoom: 6,

  categoryIcons: {
    dating:     { color: '#e8a0bf', emoji: '💕' },
    travel:     { color: '#a0c4e8', emoji: '✈️' },
    food:       { color: '#f0c8a0', emoji: '🍽️' },
    first_time: { color: '#ff6b8a', emoji: '✨' }
  },

  init() {
    this.map = L.map('map-container').setView(this.defaultCenter, this.defaultZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18
    }).addTo(this.map);

    this.layerGroup = L.layerGroup().addTo(this.map);

    // Click on map to get coordinates (for manual entry fallback)
    this.map.on('click', (e) => {
      const lat = e.latlng.lat.toFixed(6);
      const lng = e.latlng.lng.toFixed(6);
      document.getElementById('mk-lat').value = lat;
      document.getElementById('mk-lng').value = lng;
    });

    this.load();
    this.bindMarkerModal();
    this.startPolling();
  },

  async load() {
    const res = await API.getMarkers();
    if (!res.ok) return;
    this.markers = res.data;
    this.render();
  },

  render() {
    this.layerGroup.clearLayers();
    const bounds = [];

    this.markers.forEach(m => {
      const icon = this.makeIcon(m.category);
      const marker = L.marker([m.lat, m.lng], { icon }).addTo(this.layerGroup);
      marker.bindPopup(this.popupHTML(m), { closeButton: false });
      bounds.push([m.lat, m.lng]);
    });

    if (bounds.length > 0) {
      this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  },

  makeIcon(category) {
    const cfg = this.categoryIcons[category] || this.categoryIcons.dating;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="36" height="36">
      <path d="M20 35 L8 18 C3 12 3 4 13 4 C17 4 20 8 20 8 C20 8 23 4 27 4 C37 4 37 12 32 18 Z"
        fill="${cfg.color}" stroke="#fff" stroke-width="2"/>
      <text x="20" y="24" text-anchor="middle" font-size="14">${cfg.emoji}</text>
    </svg>`;
    return L.divIcon({
      html: svg,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36]
    });
  },

  popupHTML(m) {
    const catName = { dating: '约会', travel: '旅行', food: '美食', first_time: '第一次' }[m.category] || m.category;
    return `
      <strong>${this.escapeHTML(m.title)}</strong>
      <span class="popup-category">${catName}</span>
      <div class="popup-date">${m.date}</div>
      ${m.description ? `<div class="popup-desc">${this.escapeHTML(m.description)}</div>` : ''}
      <button class="popup-delete" onclick="MapApp.doDelete('${m.id}')">删除</button>
    `;
  },

  async doDelete(id) {
    if (!confirm('确定要删除这个标记吗？')) return;
    await API.deleteMarker(id);
    await this.load();
  },

  // ── Place search ────────────────────────────────────────────
  async searchPlace(query) {
    if (!query || query.length < 2) return;
    const resultsDiv = document.getElementById('mk-search-results');
    resultsDiv.innerHTML = '<div class="search-loading">🔍 搜索中...</div>';
    try {
      const results = await API.searchPlace(query);
      if (!results || results.length === 0) {
        resultsDiv.innerHTML = '<div class="search-empty">未找到地点，试试更具体的名称</div>';
        return;
      }
      resultsDiv.innerHTML = results.map(r => {
        const name = r.display_name.split(',');
        const shortName = name.slice(0, 3).join(', ');
        return `<div class="search-result-item" data-lat="${r.lat}" data-lng="${r.lon}" data-name="${r.display_name}">
          📍 ${shortName}
        </div>`;
      }).join('');
      this.bindSearchResults();
    } catch (e) {
      resultsDiv.innerHTML = '<div class="search-empty">搜索失败，请重试</div>';
    }
  },

  bindSearchResults() {
    document.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const lat = parseFloat(item.dataset.lat);
        const lng = parseFloat(item.dataset.lng);
        document.getElementById('mk-lat').value = lat.toFixed(6);
        document.getElementById('mk-lng').value = lng.toFixed(6);
        // Highlight selected
        document.querySelectorAll('.search-result-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        // Also center map on the selected location
        this.map.setView([lat, lng], 14);
      });
    });
  },

  // ── Marker modal ────────────────────────────────────────────
  bindMarkerModal() {
    const modal = document.getElementById('marker-modal');
    const fab = document.getElementById('fab-btn');
    const searchInput = document.getElementById('mk-search');
    const searchBtn = document.getElementById('mk-search-btn');

    fab.addEventListener('click', () => {
      if (!App || App.currentTab !== 'map') return;
      modal.style.display = 'flex';
    });

    // Search
    let searchTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        this.searchPlace(searchInput.value.trim());
      }, 500);
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.searchPlace(searchInput.value.trim());
      }
    });
    searchBtn.addEventListener('click', () => {
      this.searchPlace(searchInput.value.trim());
    });

    document.getElementById('mk-cancel').addEventListener('click', () => {
      modal.style.display = 'none';
      this.clearMarkerForm();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
        this.clearMarkerForm();
      }
    });

    document.getElementById('mk-send').addEventListener('click', async () => {
      const title = document.getElementById('mk-title').value.trim();
      const description = document.getElementById('mk-desc').value.trim();
      const category = document.getElementById('mk-category').value;
      const date = document.getElementById('mk-date').value;
      const lat = parseFloat(document.getElementById('mk-lat').value);
      const lng = parseFloat(document.getElementById('mk-lng').value);

      if (!title) return alert('请输入地点名称');
      if (!date) return alert('请选择日期');
      if (isNaN(lat) || isNaN(lng)) return alert('请搜索并选择一个地点');

      const res = await API.createMarker({ title, description, category, date, lat, lng });
      if (!res.ok) return alert(res.error);

      modal.style.display = 'none';
      this.clearMarkerForm();
      await this.load();
    });
  },

  clearMarkerForm() {
    document.getElementById('mk-title').value = '';
    document.getElementById('mk-desc').value = '';
    document.getElementById('mk-category').value = 'dating';
    document.getElementById('mk-date').value = '';
    document.getElementById('mk-search').value = '';
    document.getElementById('mk-lat').value = '';
    document.getElementById('mk-lng').value = '';
    document.getElementById('mk-search-results').innerHTML = '';
  },

  startPolling() {
    setInterval(async () => {
      const res = await API.getMarkers();
      if (res.ok && res.data.length !== this.markers.length) {
        this.markers = res.data;
        this.render();
      }
    }, 10000);
  },

  escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
