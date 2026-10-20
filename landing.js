/**
 * CONTOUR — Landing Page 3D Interactive Hero Canvas
 * Study: Japanese Five-Tiered Zen Pagoda (Goju-no-To - 五重塔)
 *
 * Design Architecture:
 * - Positioned on the open right half of the hero viewport (zero typography overlap)
 * - Towering 5-story classical Japanese Buddhist pagoda in Renaissance Draughtsman & Sumi-e style:
 *     * 3-tier stepped stone podium foundation (Kidan)
 *     * 5 ascending post-and-beam chambers with Shoji washi screen walls
 *     * Swept concave eave roofs with upturned corner hips (Sori)
 *     * Suspended bronze temple wind bells (Furin) at every corner
 *     * 9-ring sacred bronze finial spire (Sorin) with water-flame canopy & wish-fulfilling jewel (Hoshu)
 *     * Subtle interior warm amber lantern illumination glowing through washi paper
 *     * Celestial open Ensō halo arc & drifting golden dust embers
 * - Interactive 3D turntable rotation & mouse parallax tilt physics
 */

(function () {
  'use strict';

  const canvas = document.getElementById('hero3dCanvas');
  if (!canvas) return;

  const container = canvas.parentElement;

  let scene, camera, renderer;
  let heroModelGroup = null;
  let dustPoints = null;

  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  const targetPos = { x: 2.55, y: -0.05, z: 0 };
  const currentPos = { ...targetPos };
  let targetScale = 0.74;
  let currentScale = 0.01;

  const clock = new THREE.Clock();

  function initHero3D() {
    scene = new THREE.Scene();

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;

    camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
    camera.position.set(0, 0, 8.8);

    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Gallery Architectural Lighting
    const ambientLight = new THREE.AmbientLight(0xFFFBF4, 0.62);
    scene.add(ambientLight);

    // Warm Sun Key Light (highlights swept roof slopes and right facade)
    const keyLight = new THREE.DirectionalLight(0xFFF2DE, 1.45);
    keyLight.position.set(6, 8, 7);
    scene.add(keyLight);

    // Cool Sky Studio Fill (illuminates under-eave rafter bracket shadows)
    const fillLight = new THREE.DirectionalLight(0xE2ECF8, 0.45);
    fillLight.position.set(-6, -4, 4);
    scene.add(fillLight);

    // Golden Rim Backlight (edges finial spire rings and upturned eave tips)
    const rimLight = new THREE.DirectionalLight(0xFAF0DB, 0.65);
    rimLight.position.set(-4, 6, -5);
    scene.add(rimLight);

    buildHeroDust();
    buildHeroPagoda();

    updateModelBasePosition();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onResize);

    animate();
  }

  // ==========================================================================
  // GEOMETRY HELPERS
  // ==========================================================================
  function vec(x, y, z) {
    return [x, y, z];
  }

  function createSketchTube(curvePts, radius, colorHex, opacity = 1.0) {
    if (!curvePts || curvePts.length < 2) return null;
    const vPts = curvePts.map(p => new THREE.Vector3(p[0], p[1], p[2]));
    const curve = new THREE.CatmullRomCurve3(vPts, false, 'centripetal', 0.5);
    const geo = new THREE.TubeGeometry(curve, Math.max(16, curvePts.length * 8), radius, 8, false);
    const isGold = colorHex === '#C49B66' || colorHex === '#B8860B';
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      roughness: isGold ? 0.32 : 0.80,
      metalness: isGold ? 0.82 : 0.08,
      transparent: opacity < 1.0,
      opacity: opacity
    });
    return new THREE.Mesh(geo, mat);
  }

  function createSketchLine(pair, colorHex, opacity = 0.5) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(pair[0][0], pair[0][1], pair[0][2]),
      new THREE.Vector3(pair[1][0], pair[1][1], pair[1][2])
    ]);
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color(colorHex),
      transparent: opacity < 1.0,
      opacity: opacity
    });
    return new THREE.Line(geo, mat);
  }

  function createPaperFacet(triangles, colorHex = '#FFFDF9', opacity = 0.94, roughness = 0.65) {
    const positions = [];
    triangles.forEach(tri => {
      tri.forEach(p => positions.push(p[0], p[1], p[2]));
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      roughness: roughness,
      metalness: 0.03,
      transparent: opacity < 1.0,
      opacity: opacity,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide
    });

    return new THREE.Mesh(geo, mat);
  }

  function createTorusRing(center, radius, tubeRadius, colorHex) {
    const geo = new THREE.TorusGeometry(radius, tubeRadius, 8, 24);
    const isGold = colorHex === '#C49B66' || colorHex === '#B8860B';
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      roughness: isGold ? 0.28 : 0.75,
      metalness: isGold ? 0.85 : 0.1
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(center[0], center[1], center[2]);
    return mesh;
  }

  function createSphereBead(center, radius, colorHex) {
    const geo = new THREE.SphereGeometry(radius, 12, 12);
    const isGold = colorHex === '#C49B66' || colorHex === '#B8860B';
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      roughness: isGold ? 0.25 : 0.8,
      metalness: isGold ? 0.85 : 0.05
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(center[0], center[1], center[2]);
    return mesh;
  }

  // ==========================================================================
  // PROCEDURAL JAPANESE FIVE-TIERED PAGODA (GOJU-NO-TO - 五重塔)
  // ==========================================================================
  function buildHeroPagoda() {
    heroModelGroup = new THREE.Group();

    const carbon = '#161514';
    const terracotta = '#B85C38';
    const gold = '#C49B66';

    // 1. Stepped Stone Foundation Podium (Kidan - 基壇)
    const basePodia = [
      { y: -2.80, w: 2.60, h: 0.18, color: '#D4CCBD' },
      { y: -2.62, w: 2.30, h: 0.18, color: '#DDD6C9' },
      { y: -2.44, w: 2.00, h: 0.18, color: '#E4DDD0' }
    ];

    basePodia.forEach(p => {
      const w = p.w;
      const d = w * 0.75;
      const y0 = p.y;
      const y1 = p.y + p.h;

      // Perimeter contour tube
      const loop = [
        vec(-w, y1, -d),
        vec(w, y1, -d),
        vec(w, y1, d),
        vec(-w, y1, d),
        vec(-w, y1, -d)
      ];
      heroModelGroup.add(createSketchTube(loop, 0.034, carbon));

      // Side corners
      heroModelGroup.add(createSketchLine([vec(-w, y0, -d), vec(-w, y1, -d)], carbon, 0.7));
      heroModelGroup.add(createSketchLine([vec(w, y0, -d), vec(w, y1, -d)], carbon, 0.7));
      heroModelGroup.add(createSketchLine([vec(w, y0, d), vec(w, y1, d)], carbon, 0.7));
      heroModelGroup.add(createSketchLine([vec(-w, y0, d), vec(-w, y1, d)], carbon, 0.7));

      // Top stone platform facet
      const topFacets = [
        [vec(-w, y1, -d), vec(w, y1, -d), vec(w, y1, d)],
        [vec(-w, y1, -d), vec(w, y1, d), vec(-w, y1, d)]
      ];
      heroModelGroup.add(createPaperFacet(topFacets, p.color, 0.96, 0.85));
    });

    // 2. The Five Ascending Stories (Tiers 1 through 5)
    const tierParams = [
      { y: -2.26, roofW: 2.35, roofH: 0.40, bodyW: 1.25, bodyH: 0.54 },
      { y: -1.52, roofW: 2.05, roofH: 0.36, bodyW: 1.08, bodyH: 0.50 },
      { y: -0.84, roofW: 1.78, roofH: 0.33, bodyW: 0.92, bodyH: 0.46 },
      { y: -0.22, roofW: 1.52, roofH: 0.30, bodyW: 0.78, bodyH: 0.42 },
      { y: 0.36,  roofW: 1.30, roofH: 0.28, bodyW: 0.66, bodyH: 0.38 }
    ];

    tierParams.forEach((t, tIdx) => {
      const bw = t.bodyW;
      const bd = bw * 0.75;
      const bY = t.y;
      const bh = t.bodyH;
      const topChamberY = bY + bh;

      // A. Chamber Corner Pillars (Hashira - 柱)
      const pillars = [
        [vec(-bw, bY, -bd), vec(-bw, topChamberY, -bd)],
        [vec(bw, bY, -bd), vec(bw, topChamberY, -bd)],
        [vec(bw, bY, bd), vec(bw, topChamberY, bd)],
        [vec(-bw, bY, bd), vec(-bw, topChamberY, bd)]
      ];
      pillars.forEach(p => {
        heroModelGroup.add(createSketchTube(p, 0.034, carbon));
      });

      // B. Veranda Balustrade Railing (Koran - 高欄)
      const railY = bY + 0.12;
      const railLoop = [
        vec(-bw * 1.05, railY, -bd * 1.05),
        vec(bw * 1.05, railY, -bd * 1.05),
        vec(bw * 1.05, railY, bd * 1.05),
        vec(-bw * 1.05, railY, bd * 1.05),
        vec(-bw * 1.05, railY, -bd * 1.05)
      ];
      heroModelGroup.add(createSketchTube(railLoop, 0.022, terracotta));

      // Balustrade support vertical spindles
      const spindlePositions = [-0.65, -0.3, 0.0, 0.3, 0.65];
      spindlePositions.forEach(sx => {
        heroModelGroup.add(createSketchLine([vec(bw * sx, bY, bd * 1.05), vec(bw * sx, railY, bd * 1.05)], terracotta, 0.65));
        heroModelGroup.add(createSketchLine([vec(bw * sx, bY, -bd * 1.05), vec(bw * sx, railY, -bd * 1.05)], terracotta, 0.65));
      });

      // C. Central Lattice Post Doors (Shoji - 障子)
      heroModelGroup.add(createSketchTube([vec(-bw * 0.38, bY, bd), vec(-bw * 0.38, topChamberY, bd)], 0.024, terracotta));
      heroModelGroup.add(createSketchTube([vec(bw * 0.38, bY, bd), vec(bw * 0.38, topChamberY, bd)], 0.024, terracotta));
      // Transom lintel bar
      heroModelGroup.add(createSketchLine([vec(-bw, bY + bh * 0.75, bd), vec(bw, bY + bh * 0.75, bd)], terracotta, 0.6));

      // D. Washi Paper Shoji Chamber Wall Facets
      const chamberFacets = [
        // Front wall
        [vec(-bw, bY, bd), vec(bw, bY, bd), vec(bw, topChamberY, bd)],
        [vec(-bw, bY, bd), vec(bw, topChamberY, bd), vec(-bw, topChamberY, bd)],
        // Back wall
        [vec(-bw, bY, -bd), vec(bw, topChamberY, -bd), vec(bw, bY, -bd)],
        [vec(-bw, bY, -bd), vec(-bw, topChamberY, -bd), vec(bw, topChamberY, -bd)],
        // Left wall
        [vec(-bw, bY, -bd), vec(-bw, bY, bd), vec(-bw, topChamberY, bd)],
        [vec(-bw, bY, -bd), vec(-bw, topChamberY, bd), vec(-bw, topChamberY, -bd)],
        // Right wall
        [vec(bw, bY, -bd), vec(bw, topChamberY, bd), vec(bw, bY, bd)],
        [vec(bw, bY, -bd), vec(bw, topChamberY, -bd), vec(bw, topChamberY, bd)]
      ];
      heroModelGroup.add(createPaperFacet(chamberFacets, '#FFFDF6', 0.88, 0.70));

      // E. Swept Concave Eaves (Sori - 反り)
      const rw = t.roofW;
      const rd = rw * 0.75;
      const ry = topChamberY;
      const soriUp = 0.14; // Graceful upturn at corners

      // 4 Upturned Eave Corner Points
      const cFL = vec(-rw, ry + soriUp, rd);
      const cFR = vec(rw, ry + soriUp, rd);
      const cBL = vec(-rw, ry + soriUp, -rd);
      const cBR = vec(rw, ry + soriUp, -rd);

      // Swept Eave Splines (Concave dipping towards center, curving up at corner tips)
      const frontEave = [
        cFL,
        vec(-rw * 0.5, ry + 0.02, rd),
        vec(0.0, ry - 0.02, rd),
        vec(rw * 0.5, ry + 0.02, rd),
        cFR
      ];
      const backEave = [
        cBL,
        vec(-rw * 0.5, ry + 0.02, -rd),
        vec(0.0, ry - 0.02, -rd),
        vec(rw * 0.5, ry + 0.02, -rd),
        cBR
      ];
      const leftEave = [
        cBL,
        vec(-rw, ry, 0.0),
        cFL
      ];
      const rightEave = [
        cBR,
        vec(rw, ry, 0.0),
        cFR
      ];

      heroModelGroup.add(createSketchTube(frontEave, 0.034, carbon));
      heroModelGroup.add(createSketchTube(backEave, 0.034, carbon));
      heroModelGroup.add(createSketchTube(leftEave, 0.032, carbon));
      heroModelGroup.add(createSketchTube(rightEave, 0.032, carbon));

      // Roof Ridge Apex Points
      const topW = bw * 0.72;
      const topD = bd * 0.72;
      const topY = ry + t.roofH;
      const rFL = vec(-topW, topY, topD);
      const rFR = vec(topW, topY, topD);
      const rBL = vec(-topW, topY, -topD);
      const rBR = vec(topW, topY, -topD);

      // Hip Rafter Ridge Beams (Kudarimune)
      heroModelGroup.add(createSketchTube([cFL, rFL], 0.030, carbon));
      heroModelGroup.add(createSketchTube([cFR, rFR], 0.030, carbon));
      heroModelGroup.add(createSketchTube([cBL, rBL], 0.030, carbon));
      heroModelGroup.add(createSketchTube([cBR, rBR], 0.030, carbon));

      // Roof Sloping Paper Facets (Catching warm key sun & shadows)
      const roofFacets = [
        // Front slope
        [cFL, cFR, rFR],
        [cFL, rFR, rFL],
        // Back slope
        [cBL, rBR, cBR],
        [cBL, rBL, rBR],
        // Left slope
        [cBL, cFL, rFL],
        [cBL, rFL, rBL],
        // Right slope
        [cBR, rFR, cFR],
        [cBR, rBR, rFR]
      ];
      heroModelGroup.add(createPaperFacet(roofFacets, '#E8E1D4', 0.95, 0.62));

      // F. Hanging Bronze Wind Bells (Furin / Futaku - 風鐸)
      const bellCorners = [cFL, cFR, cBL, cBR];
      bellCorners.forEach(c => {
        const bellY = c[1] - 0.14;
        // Suspension wire
        heroModelGroup.add(createSketchLine([c, vec(c[0], bellY, c[2])], terracotta, 0.75));
        // Bell pendant bead
        heroModelGroup.add(createSphereBead([c[0], bellY, c[2]], 0.036, gold));
      });
    });

    // 3. Sacred Nine-Ring Bronze Spire (Sorin - 相輪)
    const sorinBaseY = 0.98;
    const sorinTopY = 2.92;

    // Central bronze mast pole
    heroModelGroup.add(createSketchTube([[0, sorinBaseY - 0.25, 0], [0, sorinTopY, 0]], 0.036, carbon));

    // Lotus Pedestal Base (Fukubachi / Ukebana - 伏鉢・受花)
    const lotusRing = [
      vec(-0.32, sorinBaseY + 0.08, 0),
      vec(-0.16, sorinBaseY + 0.14, 0.24),
      vec(0.16, sorinBaseY + 0.14, 0.24),
      vec(0.32, sorinBaseY + 0.08, 0),
      vec(0.16, sorinBaseY + 0.02, -0.24),
      vec(-0.16, sorinBaseY + 0.02, -0.24),
      vec(-0.32, sorinBaseY + 0.08, 0)
    ];
    heroModelGroup.add(createSketchTube(lotusRing, 0.024, terracotta));

    // Nine Sacred Concentric Bronze Rings (Ryusha / Kuruma - 九輪)
    for (let r = 0; r < 9; r++) {
      const ringY = sorinBaseY + 0.36 + r * 0.125;
      const ringRadius = 0.24 - r * 0.009;
      heroModelGroup.add(createTorusRing([0, ringY, 0], ringRadius, 0.020, gold));
    }

    // Pierced Water-Flame Canopy Finial (Suen - 水煙)
    const flameLeft = [
      vec(0, 2.38, 0),
      vec(-0.28, 2.50, 0.04),
      vec(-0.18, 2.64, 0.02),
      vec(0, 2.74, 0)
    ];
    const flameRight = [
      vec(0, 2.38, 0),
      vec(0.28, 2.50, -0.04),
      vec(0.18, 2.64, -0.02),
      vec(0, 2.74, 0)
    ];
    heroModelGroup.add(createSketchTube(flameLeft, 0.022, gold));
    heroModelGroup.add(createSketchTube(flameRight, 0.022, gold));

    // Sacred Wish-Fulfilling Pearl Jewel (Hoshu - 宝珠)
    heroModelGroup.add(createSphereBead([0, 2.80, 0], 0.088, gold));
    // Apex finial tip
    heroModelGroup.add(createSketchTube([[0, 2.80, 0], [0, 2.95, 0]], 0.020, gold));

    // 4. Atmospheric Zen Elements: Background Celestial Ensō Arc
    const ensoPts = [];
    const ensoSteps = 48;
    for (let i = 0; i <= ensoSteps; i++) {
      const a = (i / ensoSteps) * Math.PI * 1.82 - Math.PI * 0.1;
      const er = 2.35 + Math.sin(a * 3) * 0.08;
      ensoPts.push([Math.cos(a) * er, 1.80 + Math.sin(a) * er, -1.2]);
    }
    heroModelGroup.add(createSketchTube(ensoPts, 0.022, gold, 0.65));

    // Central Plumb-Line Axis (Renaissance Architectural Elevation Line)
    heroModelGroup.add(createSketchLine([[0, -3.0, 0], [0, 3.25, 0]], terracotta, 0.55));

    // Warm Interior Chamber Candlelight Glow
    const lanternLight = new THREE.PointLight(0xFFE2AA, 0.95, 5.5, 1.2);
    lanternLight.position.set(0, -0.7, 0);
    heroModelGroup.add(lanternLight);

    // Initial group setup
    heroModelGroup.position.set(targetPos.x, targetPos.y, targetPos.z);
    heroModelGroup.scale.set(0.01, 0.01, 0.01);
    heroModelGroup.rotation.set(0.10, -0.45, 0.0);
    scene.add(heroModelGroup);
  }

  function updateModelBasePosition() {
    const w = container.clientWidth || window.innerWidth;
    const isDesktop = w >= 900;
    if (isDesktop) {
      if (w >= 1350) {
        targetPos.x = 2.55;
        targetPos.y = -0.05;
        targetScale = 0.74;
      } else if (w >= 1100) {
        targetPos.x = 2.22;
        targetPos.y = -0.05;
        targetScale = 0.66;
      } else {
        targetPos.x = 1.82;
        targetPos.y = -0.05;
        targetScale = 0.58;
      }
      targetPos.z = 0.0;
    } else {
      targetPos.x = 0.0;
      targetPos.y = 1.20;
      targetPos.z = -0.3;
      targetScale = 0.50;
    }
  }

  function buildHeroDust() {
    const dustCount = 80;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i += 3) {
      pos[i] = (Math.random() - 0.5) * 14;
      pos[i + 1] = (Math.random() - 0.5) * 11;
      pos[i + 2] = (Math.random() - 0.5) * 8;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xC49B66,
      size: 0.038,
      transparent: true,
      opacity: 0.45
    });
    dustPoints = new THREE.Points(geo, mat);
    scene.add(dustPoints);
  }

  function onMouseMove(e) {
    const normX = (e.clientX / window.innerWidth) * 2 - 1;
    const normY = -(e.clientY / window.innerHeight) * 2 + 1;
    mouse.targetX = normX * 0.55;
    mouse.targetY = normY * 0.45;
  }

  function onResize() {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    updateModelBasePosition();
  }

  function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    // Damped mouse tracking
    mouse.x += (mouse.targetX - mouse.x) * 0.06;
    mouse.y += (mouse.targetY - mouse.y) * 0.06;

    // Smooth position & scale lerping
    currentPos.x += (targetPos.x - currentPos.x) * 0.08;
    currentPos.y += (targetPos.y - currentPos.y) * 0.08;
    currentPos.z += (targetPos.z - currentPos.z) * 0.08;
    currentScale += (targetScale - currentScale) * 0.08;

    if (heroModelGroup) {
      heroModelGroup.scale.set(currentScale, currentScale, currentScale);

      // Subtle architectural breathing hover
      const bobY = Math.sin(elapsedTime * 1.2) * 0.06;
      heroModelGroup.position.set(
        currentPos.x + mouse.x * 0.25,
        currentPos.y + bobY + mouse.y * 0.20,
        currentPos.z
      );

      // Smooth continuous turntable rotation + mouse parallax yaw
      heroModelGroup.rotation.y = -0.45 + elapsedTime * 0.08 + mouse.x * 0.55;

      // Isometric perspective pitch tilt reacting to mouse elevation
      heroModelGroup.rotation.x = 0.10 - mouse.y * 0.18;
    }

    if (dustPoints) {
      dustPoints.rotation.y = elapsedTime * 0.025;
    }

    renderer.render(scene, camera);
  }

  function initCatalogueVolumeTabs() {
    const vol1Btn = document.getElementById('landingVol1');
    const vol2Btn = document.getElementById('landingVol2');
    const vol3Btn = document.getElementById('landingVol3');
    const vol1Cards = document.querySelectorAll('.vol-1-card');
    const vol2Cards = document.querySelectorAll('.vol-2-card');
    const vol3Cards = document.querySelectorAll('.vol-3-card');

    function showVolume(vol) {
      if (vol1Btn) vol1Btn.classList.toggle('active', vol === 1);
      if (vol2Btn) vol2Btn.classList.toggle('active', vol === 2);
      if (vol3Btn) vol3Btn.classList.toggle('active', vol === 3);

      vol1Cards.forEach(c => c.classList.toggle('hidden', vol !== 1));
      vol2Cards.forEach(c => c.classList.toggle('hidden', vol !== 2));
      vol3Cards.forEach(c => c.classList.toggle('hidden', vol !== 3));
    }

    if (vol1Btn) vol1Btn.addEventListener('click', () => showVolume(1));
    if (vol2Btn) vol2Btn.addEventListener('click', () => showVolume(2));
    if (vol3Btn) vol3Btn.addEventListener('click', () => showVolume(3));
  }

  function startLandingApp() {
    initHero3D();
    initCatalogueVolumeTabs();
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startLandingApp);
  } else {
    startLandingApp();
  }

})();
