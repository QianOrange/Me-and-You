const Messages = {
  list: [],
  currentAuthor: 'boy',
  currentStyle: 'pink',
  _pollTimer: null,

  // Predefined % positions mapped to Christmas tree tiers (viewBox 800x700)
  STAR_POSITIONS: [
    // Tier 5 (bottom, widest) — 6 positions
    { x: 30, y: 70 }, { x: 37, y: 74 }, { x: 44, y: 77 },
    { x: 56, y: 77 }, { x: 63, y: 74 }, { x: 70, y: 70 },
    // Tier 4 — 5 positions
    { x: 34, y: 58 }, { x: 42, y: 62 }, { x: 50, y: 65 },
    { x: 58, y: 62 }, { x: 66, y: 58 },
    // Tier 3 — 5 positions
    { x: 36, y: 47 }, { x: 44, y: 51 }, { x: 50, y: 54 },
    { x: 56, y: 51 }, { x: 64, y: 47 },
    // Tier 2 — 4 positions
    { x: 40, y: 37 }, { x: 47, y: 41 },
    { x: 53, y: 41 }, { x: 60, y: 37 },
    // Tier 1 (top) — 3 positions
    { x: 44, y: 26 }, { x: 50, y: 30 }, { x: 56, y: 26 },
  ],

  STAR_EMOJI: {
    pink: '💗', blue: '💙', lavender: '💜', peach: '🧡', mint: '💚'
  },

  STAR_MOOD: {
    pink: '心动', blue: '想念', lavender: '温柔', peach: '甜蜜', mint: '期待'
  },

  async init() {
    await this.load();
    this.bindComposeModal();
    this.bindStarDetailModal();
    this.startPolling();
  },

  async load() {
    const res = await API.getMessages();
    if (res.ok) {
      this.list = res.data;
      this.render();
    }
  },

  render() {
    const layer = document.getElementById('stars-layer');
    const empty = document.getElementById('messages-empty');
    const container = document.getElementById('star-tree-container');

    if (this.list.length === 0) {
      layer.innerHTML = '';
      empty.style.display = 'block';
      if (container) container.style.minHeight = '300px';
      return;
    }

    empty.style.display = 'none';
    if (container) container.style.minHeight = '550px';

    const stars = this.list.map((m, i) => {
      const pos = this.STAR_POSITIONS[i % this.STAR_POSITIONS.length];
      return this.starHTML(m, pos, i);
    }).join('');

    layer.innerHTML = stars;
    this.bindStarEvents();
  },

  starHTML(m, pos, index) {
    const isRead = !!m.read_at;
    const emoji = this.STAR_EMOJI[m.style] || '💗';
    const delay = (index * 0.7) % 5;

    return `
      <div class="star-sticker ${isRead ? 'read' : 'unread'}"
           data-id="${m.id}"
           data-style="${m.style}"
           data-read="${isRead}"
           style="left:${pos.x}%;top:${pos.y}%;animation-delay:${delay}s">
        <svg class="star-shape-svg" viewBox="0 0 40 40">
          <polygon class="star-shape" points="20,2 25,15 39,15 28,24 32,38 20,29 8,38 12,24 1,15 15,15"/>
          <polygon class="star-shape-inner" points="20,9 23,16 31,16 25,21 27,29 20,25 13,29 15,21 9,16 17,16"/>
        </svg>
        <span class="star-emoji-overlay">${emoji}</span>
      </div>`;
  },

  bindStarEvents() {
    document.querySelectorAll('.star-sticker').forEach(star => {
      star.addEventListener('click', () => {
        this.openStarDetail(star.dataset.id);
      });
    });
  },

  openStarDetail(id) {
    const msg = this.list.find(m => m.id === id);
    if (!msg) return;

    const modal = document.getElementById('star-detail-modal');
    document.getElementById('star-detail-emoji').textContent = this.STAR_EMOJI[msg.style] || '💗';
    document.getElementById('star-detail-author').textContent =
      msg.author === 'boy' ? '👦 男孩' : '👧 棋文';
    document.getElementById('star-detail-mood').textContent =
      '心情：' + (this.STAR_MOOD[msg.style] || '心动');
    document.getElementById('star-detail-content').textContent = msg.content;
    document.getElementById('star-detail-time').textContent =
      new Date(msg.created_at).toLocaleString('zh-CN', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

    // Store current id for delete
    modal.dataset.messageId = id;

    modal.style.display = 'flex';

    // Mark as read if unread
    if (!msg.read_at) {
      API.markRead(id).then(() => {
        msg.read_at = new Date().toISOString();
        this.render();
      });
    }
  },

  bindStarDetailModal() {
    const modal = document.getElementById('star-detail-modal');

    document.getElementById('star-detail-close').addEventListener('click', () => {
      modal.style.display = 'none';
    });

    document.getElementById('star-detail-close-btn').addEventListener('click', () => {
      modal.style.display = 'none';
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });

    document.getElementById('star-detail-delete').addEventListener('click', async () => {
      const id = modal.dataset.messageId;
      if (!id) return;
      if (!confirm('确定要摘下这颗星星吗？')) return;
      await API.deleteMessage(id);
      modal.style.display = 'none';
      await this.load();
    });
  },

  bindComposeModal() {
    const modal = document.getElementById('message-modal');
    const fab = document.getElementById('fab-btn');
    const textarea = document.getElementById('msg-content');
    const charCount = document.getElementById('char-count');

    fab.addEventListener('click', () => {
      if (!App || App.currentTab !== 'messages') return;
      modal.style.display = 'flex';
      textarea.focus();
    });

    document.getElementById('msg-cancel').addEventListener('click', () => {
      modal.style.display = 'none';
      textarea.value = '';
      charCount.textContent = '0';
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
        textarea.value = '';
        charCount.textContent = '0';
      }
    });

    // Author toggle
    modal.querySelectorAll('.author-option').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.author-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentAuthor = btn.dataset.author;
      });
    });

    // Star type picker
    modal.querySelectorAll('.star-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.star-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentStyle = btn.dataset.style;
      });
    });

    // Char count
    textarea.addEventListener('input', () => {
      charCount.textContent = textarea.value.length;
    });

    // Send
    document.getElementById('msg-send').addEventListener('click', async () => {
      const content = textarea.value.trim();
      if (!content) return alert('请写下让你心动的那个瞬间~');

      const res = await API.createMessage(this.currentAuthor, content, this.currentStyle);
      if (!res.ok) return alert(res.error);

      modal.style.display = 'none';
      textarea.value = '';
      charCount.textContent = '0';
      await this.load();
    });
  },

  startPolling() {
    if (this._pollTimer) clearInterval(this._pollTimer);
    this._pollTimer = setInterval(async () => {
      const res = await API.getMessages();
      if (res.ok && res.data.length !== this.list.length) {
        this.list = res.data;
        this.render();
      }
    }, 10000);
  }
};
