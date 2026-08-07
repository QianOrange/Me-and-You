const App = {
  currentTab: 'messages',
  _started: false,

  init() {
    // Always bind login handler so it works on both fresh and stale-token paths
    this.bindLogin();

    if (!API.loadToken()) {
      document.getElementById('login-screen').style.display = 'flex';
      document.getElementById('app-main').style.display = 'none';
      return;
    }
    this.startApp();
  },

  bindLogin() {
    const passwordInput = document.getElementById('login-password');
    const loginBtn = document.getElementById('login-btn');
    const errorEl = document.getElementById('login-error');

    const doLogin = async () => {
      const password = passwordInput.value.trim();
      if (!password) {
        errorEl.textContent = '请输入密码';
        return;
      }
      loginBtn.textContent = '验证中...';
      loginBtn.disabled = true;
      errorEl.textContent = '';

      try {
        const res = await API.login(password);
        if (res.ok) {
          API.setToken(res.data.token);
          document.getElementById('login-screen').style.display = 'none';
          document.getElementById('app-main').style.display = '';
          this._started = false;
          this.startApp();
          return;
        }
        errorEl.textContent = res.error || '密码错误';
      } catch (e) {
        errorEl.textContent = '网络错误，请重试';
      }
      loginBtn.textContent = '进入 ♡';
      loginBtn.disabled = false;
    };

    loginBtn.addEventListener('click', doLogin);
    passwordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doLogin();
    });
  },

  startApp() {
    if (this._started) return;
    this._started = true;

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });

    // FAB routes to the active tab's create action
    document.getElementById('fab-btn').addEventListener('click', () => {
      if (this.currentTab === 'messages') {
        document.getElementById('message-modal').style.display = 'flex';
        document.getElementById('msg-content').focus();
      } else {
        document.getElementById('marker-modal').style.display = 'flex';
      }
    });

    // Init sub-modules
    Messages.init();
    MapApp.init();
  },

  switchTab(tab) {
    this.currentTab = tab;

    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    document.querySelectorAll('.tab-content').forEach(c => {
      c.classList.toggle('active', c.id === `tab-${tab}`);
    });

    if (tab === 'map' && MapApp.map) {
      setTimeout(() => MapApp.map.invalidateSize(), 100);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
