const Messages = {
  list: [],
  currentAuthor: 'boy',
  currentStyle: 'pink',
  _pollTimer: null,
  _3dReady: false,

  STAR_MOOD: {
    pink: '心动', blue: '想念', lavender: '温柔', peach: '甜蜜', mint: '期待'
  },

  async init() {
    if (typeof StarTree3D !== 'undefined') {
      StarTree3D.init('tree-canvas');
      // Delay to let the 3D scene initialize before loading stars
      setTimeout(async () => {
        this._3dReady = true;
        await this.load();
        this.bindComposeModal();
        this.bindStarDetailModal();
        this.startPolling();
      }, 500);
    } else {
      await this.load();
      this.bindComposeModal();
      this.bindStarDetailModal();
      this.startPolling();
    }
  },

  async load() {
    const res = await API.getMessages();
    if (res.ok) {
      this.list = res.data;
      this.render();
    }
  },

  render() {
    const empty = document.getElementById('messages-empty');
    const container = document.getElementById('star-tree-container');

    if (this.list.length === 0) {
      empty.style.display = 'flex';
      if (container) container.style.height = '300px';
    } else {
      empty.style.display = 'none';
      if (container) container.style.height = '';
    }

    if (this._3dReady && typeof StarTree3D !== 'undefined') {
      StarTree3D.setStars(this.list, (id) => this.openStarDetail(id));
    }
  },

  openStarDetail(id) {
    const msg = this.list.find(m => m.id === id);
    if (!msg) return;

    const STAR_EMOJI = { pink:'💗', blue:'💙', lavender:'💜', peach:'🧡', mint:'💚' };
    const modal = document.getElementById('star-detail-modal');
    document.getElementById('star-detail-emoji').textContent = STAR_EMOJI[msg.style] || '💗';
    document.getElementById('star-detail-author').textContent =
      msg.author === 'boy' ? '👦 男孩' : '👧 棋文';
    document.getElementById('star-detail-mood').textContent =
      '心情：' + (this.STAR_MOOD[msg.style] || '心动');
    document.getElementById('star-detail-content').textContent = msg.content;
    document.getElementById('star-detail-time').textContent =
      new Date(msg.created_at).toLocaleString('zh-CN', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

    modal.dataset.messageId = id;
    modal.style.display = 'flex';

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

    modal.querySelectorAll('.author-option').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.author-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentAuthor = btn.dataset.author;
      });
    });

    modal.querySelectorAll('.star-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.star-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentStyle = btn.dataset.style;
      });
    });

    textarea.addEventListener('input', () => {
      charCount.textContent = textarea.value.length;
    });

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
