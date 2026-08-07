const Messages = {
  list: [],
  currentAuthor: 'boy',
  currentStyle: 'pink',

  async init() {
    await this.load();
    this.bindComposeModal();
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
    const container = document.getElementById('messages-list');
    const empty = document.getElementById('messages-empty');

    if (this.list.length === 0) {
      container.innerHTML = '';
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';
    container.innerHTML = this.list.map(m => this.cardHTML(m)).join('');
    this.bindCardEvents();
  },

  cardHTML(m) {
    const isUnread = !m.readAt;
    const authorName = m.author === 'boy' ? '男孩' : '棋文';
    const time = new Date(m.createdAt).toLocaleString('zh-CN', {
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return `
      <div class="envelope-card ${isUnread ? '' : 'opened'}" data-id="${m.id}" data-style="${m.style}">
        <div class="envelope-flap"></div>
        <div class="wax-seal">💝</div>
        <div class="envelope-body">
          ${isUnread ? '<div class="unread-badge"></div>' : ''}
          <div class="card-author">From: ${authorName}</div>
          <div class="card-text">${this.escapeHTML(m.content)}</div>
          <div class="card-time">${time}</div>
          ${!isUnread ? '<div class="card-read-label">✓ 已读</div>' : ''}
          <button class="card-delete" data-action="delete" data-id="${m.id}">删除</button>
        </div>
      </div>`;
  },

  bindCardEvents() {
    document.querySelectorAll('.envelope-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.dataset.action === 'delete') {
          e.stopPropagation();
          this.doDelete(e.target.dataset.id);
          return;
        }
        this.openCard(card);
      });
    });
  },

  async openCard(card) {
    const id = card.dataset.id;
    const msg = this.list.find(m => m.id === id);
    if (!msg || msg.readAt) return;

    // Play open animation
    card.classList.add('opening');
    card.classList.remove('opened');

    setTimeout(async () => {
      card.classList.remove('opening');
      card.classList.add('opened');
      await API.markRead(id);
      msg.readAt = new Date().toISOString();
      this.render();
    }, 500);
  },

  async doDelete(id) {
    if (!confirm('确定要删除这张纸条吗？')) return;
    await API.deleteMessage(id);
    await this.load();
  },

  bindComposeModal() {
    const modal = document.getElementById('message-modal');
    const fab = document.getElementById('fab-btn');
    const textarea = document.getElementById('msg-content');
    const charCount = document.getElementById('char-count');

    // FAB opens compose modal when on messages tab
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

    // Style picker
    modal.querySelectorAll('.swatch').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.swatch').forEach(b => b.classList.remove('active'));
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
      if (!content) return alert('请写下你想说的话~');

      const res = await API.createMessage(this.currentAuthor, content, this.currentStyle);
      if (!res.ok) return alert(res.error);

      modal.style.display = 'none';
      textarea.value = '';
      charCount.textContent = '0';
      await this.load();
    });
  },

  startPolling() {
    setInterval(async () => {
      const res = await API.getMessages();
      if (res.ok && res.data.length !== this.list.length) {
        this.list = res.data;
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
