// ── 背景图片池 ──────────────────────────────────────
const BG_POOL = [
  'assets/images/微信图片_20260806002535_8833_88.jpg',
  'assets/images/微信图片_20260806002539_8836_88.jpg',
  'assets/images/微信图片_20260806002914_8840_88.jpg',
  'assets/images/微信图片_20260806002916_8843_88.jpg',
  'assets/images/微信图片_20260806002532_8831_88.jpg',
  'assets/images/微信图片_20260806002917_8844_88.jpg',
  'assets/images/微信图片_20260806002919_8845_88.jpg',
  'assets/images/微信图片_20260806002533_8832_88.jpg',
  'assets/images/微信图片_20260806002536_8834_88.jpg',
  'assets/images/微信图片_20260806002538_8835_88.jpg',
  'assets/images/微信图片_20260806002531_8830_88.jpg',
  'assets/images/微信图片_20260806002529_8829_88.jpg',
  'assets/images/微信图片_20260806002528_8828_88.jpg',
  'assets/images/微信图片_20260806002312_8827_88.jpg',
  'assets/images/微信图片_20260806002311_8826_88.jpg',
  'assets/images/微信图片_20260806002309_8825_88.jpg',
  'assets/images/微信图片_20260806002307_8823_88.jpg',
  'assets/images/微信图片_20260806002306_8822_88.jpg',
  'assets/images/微信图片_20260806002302_8819_88.jpg',
  'assets/images/微信图片_20260806001848_8817_88.jpg',
  'assets/images/微信图片_20260806001846_8816_88.jpg',
  'assets/images/微信图片_20260806001845_8815_88.jpg',
  'assets/images/微信图片_20260806001843_8814_88.jpg',
  'assets/images/微信图片_20260806001842_8812_88.jpg',
  'assets/images/微信图片_20260806001840_8811_88.jpg',
  'assets/images/微信图片_20260806001839_8810_88.jpg',
  'assets/images/微信图片_20260806001837_8809_88.jpg',
  'assets/images/微信图片_20260806001836_8808_88.jpg'
];

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── 登录界面：随机一张照片全屏铺满 + 暗色渐变遮罩 ──
(function initLoginBg() {
  const login = document.getElementById('login-screen');
  if (!login) return;
  const img = BG_POOL[Math.floor(Math.random() * BG_POOL.length)];
  login.style.backgroundImage = `url(${img})`;
  login.classList.add('has-photo-bg');
})();

// ── 主界面：照片慢速渐变换片 ────────────────────────
(function initMainBg() {
  const layerA = document.getElementById('bg-layer-a');
  const layerB = document.getElementById('bg-layer-b');
  if (!layerA || !layerB) return;

  const shuffled = shuffle([...BG_POOL]);
  let active = 'a';
  let idx = 0;

  layerA.style.backgroundImage = `url(${shuffled[0]})`;
  layerA.classList.add('visible');

  function next() {
    idx = (idx + 1) % shuffled.length;
    const fadeOut = active === 'a' ? layerA : layerB;
    const fadeIn  = active === 'a' ? layerB : layerA;

    fadeIn.style.backgroundImage = `url(${shuffled[idx]})`;
    fadeIn.classList.add('visible');
    fadeOut.classList.remove('visible');
    active = active === 'a' ? 'b' : 'a';
  }

  setInterval(next, 12000);
})();
