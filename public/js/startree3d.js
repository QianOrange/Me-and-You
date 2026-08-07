// ── 3D Christmas Star Tree ──────────────────────────
const StarTree3D = (() => {
  let scene, camera, renderer, container;
  let treeGroup, lightGroup, snowGroup, starGroup, garlandGroup;
  let topStar, glowSprite;
  let starSprites = [], lightDots = [], snowParticles;
  let onClickCallback = null;
  let raycaster, mouse;
  let isHovering = false;
  let animId;

  const STAR_EMOJI = { pink:'💗', blue:'💙', lavender:'💜', peach:'🧡', mint:'💚' };
  const STAR_COLOR = { pink:'#f8a0c8', blue:'#a0c8f0', lavender:'#c4a0e8', peach:'#f0c0a0', mint:'#a0e8c4' };

  // Tier definitions: { baseY, height, radiusBottom }
  const TIERS = [
    { baseY: -1.5, height: 5.0, radius: 3.0 },
    { baseY:  0.0, height: 4.5, radius: 2.3 },
    { baseY:  1.5, height: 3.8, radius: 1.6 },
    { baseY:  3.0, height: 3.0, radius: 0.9 },
  ];

  const TIER_GREENS = [0x1B5E20, 0x2E7D32, 0x388E3C, 0x43A047];

  // ── Init ───────────────────────────────────────────
  function init(containerId) {
    container = document.getElementById(containerId);
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a14, 0.00015);

    // Camera
    camera = new THREE.PerspectiveCamera(45, w / Math.max(h, 1), 0.5, 80);
    camera.position.set(0, 3.5, 12);
    camera.lookAt(0, 2.5, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Raycaster
    raycaster = new THREE.Raycaster();
    raycaster.params.Sprite.threshold = 0.5;
    mouse = new THREE.Vector2();

    // Lighting
    scene.add(new THREE.AmbientLight(0x222244, 1.2));
    const keyLight = new THREE.DirectionalLight(0xffeedd, 1.5);
    keyLight.position.set(5, 8, 5);
    scene.add(keyLight);
    const warmLight = new THREE.PointLight(0xff9944, 8, 15);
    warmLight.position.set(0, 3, 3);
    scene.add(warmLight);
    const coolLight = new THREE.PointLight(0x4488ff, 3, 10);
    coolLight.position.set(-4, 1, -3);
    scene.add(coolLight);

    // Build scene
    treeGroup = new THREE.Group();
    lightGroup = new THREE.Group();
    starGroup = new THREE.Group();
    garlandGroup = new THREE.Group();
    snowGroup = new THREE.Group();

    _buildTree();
    _buildTopStar();
    _buildLights();
    _buildGarland();
    _buildSnow();
    _buildGround();

    scene.add(treeGroup);
    scene.add(lightGroup);
    scene.add(starGroup);
    scene.add(garlandGroup);
    scene.add(snowGroup);

    // Events
    renderer.domElement.addEventListener('mousemove', _onMouseMove);
    renderer.domElement.addEventListener('click', _onClick);
    renderer.domElement.addEventListener('mouseenter', () => { isHovering = true; });
    renderer.domElement.addEventListener('mouseleave', () => { isHovering = false; });
    window.addEventListener('resize', _onResize);

    _animate();
  }

  // ── Build tree (4 tiered cones + trunk) ────────────
  function _buildTree() {
    TIERS.forEach((tier, i) => {
      const geom = new THREE.ConeGeometry(tier.radius, tier.height, 48, 8);
      const mat = new THREE.MeshStandardMaterial({
        color: TIER_GREENS[i],
        roughness: 0.75,
        metalness: 0.05,
      });
      const cone = new THREE.Mesh(geom, mat);
      cone.position.y = tier.baseY + tier.height / 2;
      cone.castShadow = true;
      cone.receiveShadow = true;
      treeGroup.add(cone);
    });

    // Trunk
    const trunkGeom = new THREE.CylinderGeometry(0.35, 0.45, 2.2, 16);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5D4037, roughness: 0.8, metalness: 0.05 });
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.position.y = -2.6;
    trunk.castShadow = true;
    treeGroup.add(trunk);
  }

  // ── Top golden star ─────────────────────────────────
  function _buildTopStar() {
    const topY = TIERS[3].baseY + TIERS[3].height + 0.3;
    const starGeom = new THREE.OctahedronGeometry(0.45, 0);
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xFFD700, roughness: 0.2, metalness: 0.8, emissive: 0xFFA000, emissiveIntensity: 0.6,
    });
    topStar = new THREE.Mesh(starGeom, starMat);
    topStar.position.y = topY;
    treeGroup.add(topStar);

    // Glow sprite
    const glowTex = _createGlowTexture('#FFD700', 0.8);
    const glowMat = new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7 });
    glowSprite = new THREE.Sprite(glowMat);
    glowSprite.position.y = topY;
    glowSprite.scale.set(3, 3, 1);
    treeGroup.add(glowSprite);
  }

  // ── Blinking lights on cone surfaces ───────────────
  function _buildLights() {
    const colors = [0xFFEB3B, 0xFF5252, 0x40C4FF, 0xE040FB, 0xFFAB40, 0x69F0AE, 0xFFFFFF];
    TIERS.forEach((tier) => {
      const count = tier === TIERS[0] ? 70 : tier === TIERS[1] ? 55 : tier === TIERS[2] ? 40 : 30;
      for (let i = 0; i < count; i++) {
        const t = Math.random(); // 0=base, 1=tip
        const r = tier.radius * (1 - t) + 0.08;
        const theta = Math.random() * Math.PI * 2;
        const worldY = tier.baseY + t * tier.height;
        const x = r * Math.cos(theta);
        const z = r * Math.sin(theta);

        const dotGeom = new THREE.SphereGeometry(0.06, 6, 6);
        const dotMat = new THREE.MeshStandardMaterial({
          color: colors[Math.floor(Math.random() * colors.length)],
          roughness: 0.3,
          emissive: colors[Math.floor(Math.random() * colors.length)],
          emissiveIntensity: 0.5,
        });
        const dot = new THREE.Mesh(dotGeom, dotMat);
        dot.position.set(x, worldY, z);
        dot.userData = { phase: Math.random() * Math.PI * 2, speed: 1.5 + Math.random() * 3, baseEmissive: 0.5 };
        lightGroup.add(dot);
        lightDots.push(dot);
      }
    });
  }

  // ── Spiral garland ──────────────────────────────────
  function _buildGarland() {
    const points = [];
    const totalH = TIERS[3].baseY + TIERS[3].height - TIERS[0].baseY;
    const baseR = 3.1;
    const turns = 7;
    for (let i = 0; i <= 200; i++) {
      const t = i / 200;
      const y = TIERS[0].baseY + t * totalH;
      const r = baseR * (1 - t) * 0.92;
      const angle = t * Math.PI * 2 * turns;
      points.push(new THREE.Vector3(r * Math.cos(angle), y, r * Math.sin(angle)));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeom = new THREE.TubeGeometry(curve, 120, 0.04, 6, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0xFFD700, roughness: 0.3, metalness: 0.9, emissive: 0x996600, emissiveIntensity: 0.3,
    });
    const tube = new THREE.Mesh(tubeGeom, tubeMat);
    garlandGroup.add(tube);
  }

  // ── Snow particles ──────────────────────────────────
  function _buildSnow() {
    const count = 350;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 1] = Math.random() * 16 - 3;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 18;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff, size: 0.08, map: _createGlowTexture('#ffffff', 0.6),
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7, transparent: true,
    });
    snowParticles = new THREE.Points(geom, mat);
    snowGroup.add(snowParticles);
  }

  // ── Ground plane (snow) ─────────────────────────────
  function _buildGround() {
    const groundGeom = new THREE.CircleGeometry(6, 32);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xeeeeff, roughness: 0.9, metalness: 0 });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -3.7;
    ground.receiveShadow = true;
    scene.add(ground);
  }

  // ── Star messages (sprites on tree surface) ─────────
  function setStars(messages, onClick) {
    onClickCallback = onClick;
    // Clear old
    starSprites.forEach(s => starGroup.remove(s));
    starSprites = [];

    if (!messages || messages.length === 0) return;

    // Pre-calc positions spread across tiers
    const positions = _generateStarPositions(messages.length);

    messages.forEach((msg, i) => {
      const emoji = STAR_EMOJI[msg.style] || '💗';
      const color = STAR_COLOR[msg.style] || '#f8a0c8';
      const isUnread = !msg.read_at;
      const pos = positions[i];

      const tex = _createStarTexture(emoji, color, isUnread);
      const mat = new THREE.SpriteMaterial({
        map: tex, blending: THREE.NormalBlending, depthTest: true, depthWrite: false,
      });

      const sprite = new THREE.Sprite(mat);
      sprite.position.copy(pos);
      sprite.scale.set(isUnread ? 1.1 : 0.75, isUnread ? 1.1 : 0.75, 1);
      sprite.userData = { messageId: msg.id, isUnread, emoji, color, basePos: pos.clone(), phase: Math.random() * Math.PI * 2 };
      starGroup.add(sprite);
      starSprites.push(sprite);
    });
  }

  function _generateStarPositions(count) {
    const positions = [];
    const distPerTier = [10, 8, 7, 5]; // how many per tier
    let tierIdx = 0;
    let tierCount = 0;

    for (let i = 0; i < count; i++) {
      while (tierCount >= distPerTier[tierIdx] && tierIdx < 3) {
        tierIdx++;
        tierCount = 0;
      }
      const tier = TIERS[Math.min(tierIdx, 3)];
      // Place near the bottom edge (more visible) — t ranges 0.1–0.8
      const t = 0.1 + (tierCount / distPerTier[Math.min(tierIdx, 3)]) * 0.7;
      const r = tier.radius * (1 - t) + 0.25;
      const theta = ((i * 2.399) % (Math.PI * 2)); // golden-angle-ish spread
      const worldY = tier.baseY + t * tier.height;
      positions.push(new THREE.Vector3(r * Math.cos(theta), worldY, r * Math.sin(theta)));
      tierCount++;
    }
    return positions;
  }

  // ── Canvas texture helpers ──────────────────────────
  function _createStarTexture(emoji, colorHex, isUnread) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Glow background
    const gradient = ctx.createRadialGradient(size/2, size/2, size*0.05, size/2, size/2, size*0.48);
    gradient.addColorStop(0, colorHex);
    gradient.addColorStop(0.4, colorHex + '88');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Emoji
    ctx.font = '52px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, size/2, size/2);

    return new THREE.CanvasTexture(canvas);
  }

  function _createGlowTexture(colorHex, intensity) {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, colorHex);
    gradient.addColorStop(0.3, colorHex + 'aa');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }

  // ── Mouse / Click ──────────────────────────────────
  function _onMouseMove(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Hover effect: scale up nearest star sprite
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(starSprites);
    starSprites.forEach(s => {
      const base = s.userData.isUnread ? 1.1 : 0.75;
      const target = (hits.length > 0 && hits[0].object === s) ? base * 1.35 : base;
      s.scale.lerp(new THREE.Vector3(target, target, 1), 0.15);
    });
  }

  function _onClick(e) {
    if (!onClickCallback) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(new THREE.Vector2(mx, my), camera);
    const hits = raycaster.intersectObjects(starSprites);
    if (hits.length > 0) {
      const id = hits[0].object.userData.messageId;
      if (id) onClickCallback(id);
    }
  }

  // ── Resize ──────────────────────────────────────────
  function _onResize() {
    if (!container || !renderer) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  // ── Animation loop ──────────────────────────────────
  function _animate() {
    animId = requestAnimationFrame(_animate);

    const time = Date.now() * 0.001;

    // Rotate tree (slow, pause on hover)
    const rotSpeed = isHovering ? 0.05 : 0.25;
    treeGroup.rotation.y += rotSpeed * 0.016;
    lightGroup.rotation.y = treeGroup.rotation.y;
    starGroup.rotation.y = treeGroup.rotation.y;
    garlandGroup.rotation.y = treeGroup.rotation.y;

    // Top star rotation + pulse
    if (topStar) {
      topStar.rotation.y += 0.03;
      const s = 1 + Math.sin(time * 2.5) * 0.15;
      topStar.scale.setScalar(s);
      glowSprite.scale.set(2.8 + Math.sin(time * 2.5) * 0.6, 2.8 + Math.sin(time * 2.5) * 0.6, 1);
    }

    // Blinking lights
    lightDots.forEach(dot => {
      const p = dot.userData;
      const v = 0.5 + 0.5 * Math.sin(time * p.speed + p.phase);
      dot.material.emissiveIntensity = p.baseEmissive * (0.3 + v * 0.7);
      dot.material.opacity = 0.5 + v * 0.5;
    });

    // Snow
    if (snowParticles) {
      const pos = snowParticles.geometry.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i + 1] -= 0.012; // fall speed
        if (pos[i + 1] < -3.5) {
          pos[i + 1] = 12;
          pos[i] = (Math.random() - 0.5) * 18;
          pos[i + 2] = (Math.random() - 0.5) * 18;
        }
      }
      snowParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Bob stars gently
    starSprites.forEach(s => {
      const b = Math.sin(time * 1.8 + s.userData.phase) * 0.08;
      s.position.y = s.userData.basePos.y + b;
    });

    // Camera gentle sway
    camera.position.x = Math.sin(time * 0.3) * 0.8;
    camera.lookAt(0, 2.5, 0);

    renderer.render(scene, camera);
  }

  // ── Public API ──────────────────────────────────────
  return { init, setStars };
})();
