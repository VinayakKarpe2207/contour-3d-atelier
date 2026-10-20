/**
 * CONTOUR — 3D Dimensional Graphite & Cross-Hatch Atelier
 * Real sketch-style multi-stroke 3D artwork across 10 Master Studies.
 */

(function () {
  'use strict';

  // ==========================================================================
  // CONFIGURATION & STATE
  // ==========================================================================
  const CONFIG = {
    canvasColor: 0xF6F4ED,
    shadowColor: 0x221E19,
    defaultColor: '#181716',
    contourRadius: 0.024,
    detailRadius: 0.014,
    cameraDistance: 9.5,
    cameraMinDist: 4.5,
    cameraMaxDist: 16.0
  };

  const STATE = {
    currentVolume: 1,
    currentPlateIndex: 0,
    currentColor: CONFIG.defaultColor,
    currentRadius: CONFIG.contourRadius,
    isJitterEnabled: true,
    isAutoRotate: true,
    isSoundEnabled: true,
    isHatchEnabled: true,
    isGuidesEnabled: true,
    isDrawingMode: false,
    isDrawingActive: false,
    drawnPoints: [],
    drawnMesh: null,
    isAnimatingSketch: false
  };

  // DOM Elements
  const canvas = document.getElementById('webglCanvas');
  const canvasViewport = document.getElementById('canvasViewport');
  const statusText = document.getElementById('statusText');
  const plateCounter = document.getElementById('plateCounter');
  const plateButtons = document.querySelectorAll('.plate-card');
  const volBtn1 = document.getElementById('volBtn1');
  const volBtn2 = document.getElementById('volBtn2');
  const volBtn3 = document.getElementById('volBtn3');
  const atelierApp = document.getElementById('atelierApp');
  const galleryEditionBadge = document.getElementById('galleryEditionBadge');
  const sidebarSectionLabel = document.getElementById('sidebarSectionLabel');
  const hankoSeal = document.getElementById('hankoSeal');
  const perspectiveIndicator = document.getElementById('perspectiveIndicator');
  const alignStatus = document.getElementById('alignStatus');
  const snapPerspectiveBtn = document.getElementById('snapPerspectiveBtn');
  const resketchBtn = document.getElementById('resketchBtn');
  const drawModeBtn = document.getElementById('drawModeBtn');
  const clearDrawingBtn = document.getElementById('clearDrawingBtn');
  const drawingHint = document.getElementById('drawingHint');
  const soundToggle = document.getElementById('soundToggle');
  const jitterToggle = document.getElementById('jitterToggle');
  const autoRotateToggle = document.getElementById('autoRotateToggle');
  const hatchToggle = document.getElementById('hatchToggle');
  const guidesToggle = document.getElementById('guidesToggle');
  const curatorModalBtn = document.getElementById('curatorModalBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const curatorModal = document.getElementById('curatorModal');
  const coordAzm = document.getElementById('coordAzm');
  const coordAlt = document.getElementById('coordAlt');
  const coordDepth = document.getElementById('coordDepth');
  const swatchButtons = document.querySelectorAll('.swatch-btn');

  // Three.js Core Objects
  let scene, camera, renderer;
  let artworkRootGroup = null;
  let activeArtGroup = null;
  let backingShadowPlane, dustParticles;

  // Active artwork layer groups
  let contourLayerGroup = null;
  let detailLayerGroup = null;
  let hatchLayerGroup = null;
  let guideLayerGroup = null;

  // Camera Orbit Physics & Coordinates
  const spherical = {
    radius: CONFIG.cameraDistance,
    theta: 0,
    phi: Math.PI / 2
  };
  const targetSpherical = { ...spherical };
  const cameraTarget = new THREE.Vector3(0, 0, 0);

  let isPointerDown = false;
  let prevPointerX = 0;
  let prevPointerY = 0;
  let pointerVelocityX = 0;
  let pointerVelocityY = 0;

  let audioCtx = null;

  // ==========================================================================
  // HELPER GEOMETRY BUILDERS
  // ==========================================================================
  function vec(x, y, z = 0) {
    return new THREE.Vector3(x, y, z);
  }

  function createCurve(points, closed = false) {
    const vPoints = points.map(p => (p instanceof THREE.Vector3 ? p : vec(p[0], p[1], p[2])));
    return new THREE.CatmullRomCurve3(vPoints, closed, 'centripetal', 0.5);
  }

  function createTubeFromPoints(points, radius, colorHex, opacity = 1.0, closed = false) {
    if (!points || points.length < 2) return null;
    const curve = createCurve(points, closed);
    const geometry = new THREE.TubeGeometry(curve, Math.max(16, points.length * 10), radius, 8, closed);

    geometry.userData = {
      originalPositions: geometry.attributes.position.clone()
    };

    const isMetallic = colorHex === '#B8860B';
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      roughness: isMetallic ? 0.35 : 0.84,
      metalness: isMetallic ? 0.85 : 0.05,
      transparent: opacity < 1.0,
      opacity: opacity,
      shadowSide: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    return mesh;
  }

  function createLineSegments(pairs, colorHex, opacity = 0.75) {
    if (!pairs || pairs.length === 0) return null;

    const positions = [];
    for (let i = 0; i < pairs.length; i++) {
      const p1 = pairs[i][0];
      const p2 = pairs[i][1];
      positions.push(p1.x, p1.y, p1.z);
      positions.push(p2.x, p2.y, p2.z);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    geometry.userData = {
      originalPositions: geometry.attributes.position.clone()
    };

    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(colorHex),
      transparent: true,
      opacity: opacity,
      linewidth: 1
    });

    return new THREE.LineSegments(geometry, material);
  }

  // ==========================================================================
  // THE 10 MASTER GRAPHITE STUDIES
  // ==========================================================================

  /** STUDY 01: BLOOMING LILY (Flora) */
  function buildLilyData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };

    // Stem
    data.contours.push([[-0.08, -3.4, 0], [-0.07, -2.2, 0.08], [-0.05, -1.0, 0.05], [0, -0.3, 0]]);
    data.contours.push([[0.08, -3.4, 0], [0.07, -2.2, 0.08], [0.05, -1.0, 0.05], [0, -0.3, 0]]);
    for (let y = -3.1; y < -0.6; y += 0.4) {
      data.hatches.push([vec(-0.08, y, 0.05), vec(0.08, y + 0.03, 0.05)]);
    }

    // Left Leaf
    data.contours.push([
      [-0.06, -2.1, 0.1], [-0.8, -1.9, 0.4], [-1.8, -1.6, 0.8],
      [-2.6, -1.3, 1.0], [-2.0, -1.1, 0.7], [-1.0, -1.3, 0.3], [-0.06, -1.5, 0.1]
    ]);
    data.details.push([[-0.06, -1.8, 0.1], [-1.0, -1.55, 0.5], [-2.6, -1.3, 1.0]]);
    for (let i = 1; i <= 5; i++) {
      const t = i / 6;
      const mx = -0.06 - t * 2.2;
      const my = -1.8 + t * 0.4;
      data.details.push([vec(mx, my, 0.4), vec(mx - 0.25, my + 0.18, 0.45)]);
      data.details.push([vec(mx, my, 0.4), vec(mx + 0.15, my - 0.16, 0.35)]);
    }

    // Right Leaf
    data.contours.push([
      [0.06, -2.6, 0.1], [0.7, -2.5, 0.3], [1.6, -2.3, 0.6],
      [2.3, -2.1, 0.8], [1.7, -1.9, 0.5], [0.8, -2.1, 0.2], [0.06, -2.2, 0.1]
    ]);
    data.details.push([[0.06, -2.4, 0.1], [1.0, -2.3, 0.4], [2.3, -2.1, 0.8]]);

    // 6 Lily Petals
    const petalAngles = [Math.PI / 2, Math.PI / 6, -Math.PI / 6, -Math.PI / 2, -5 * Math.PI / 6, 5 * Math.PI / 6];
    petalAngles.forEach((angle, idx) => {
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const perpX = -sinA;
      const perpY = cosA;
      const isInner = idx % 2 === 0;
      const length = isInner ? 2.6 : 2.3;
      const zRecurve = isInner ? -0.85 : 0.65;
      const width = isInner ? 0.72 : 0.62;

      const tipX = cosA * length;
      const tipY = sinA * length;
      const tipZ = zRecurve;
      const midR = length * 0.55;
      const midX = cosA * midR;
      const midY = sinA * midR;
      const midZ = zRecurve * 0.4;

      data.contours.push([[cosA * 0.3, sinA * 0.3, 0.1], [midX + perpX * width, midY + perpY * width, midZ], [tipX, tipY, tipZ]]);
      data.contours.push([[cosA * 0.3, sinA * 0.3, 0.1], [midX - perpX * width, midY - perpY * width, midZ], [tipX, tipY, tipZ]]);
      data.details.push([[cosA * 0.3, sinA * 0.3, 0.1], [midX, midY, midZ + 0.05], [tipX, tipY, tipZ]]);

      for (let h = 1; h <= 6; h++) {
        const hr = 0.45 + h * 0.12;
        const hw = (width * 0.6) * (1 - h / 7);
        data.hatches.push([vec(cosA * hr + perpX * hw, sinA * hr + perpY * hw, 0.15), vec(cosA * hr - perpX * hw, sinA * hr - perpY * hw, 0.15)]);
      }
    });

    // Stamens & Pistil
    const stamenAngles = [Math.PI / 3, Math.PI * 0.6, Math.PI, -Math.PI * 0.75, -Math.PI / 4, 0];
    stamenAngles.forEach(sAngle => {
      const sc = Math.cos(sAngle);
      const ss = Math.sin(sAngle);
      data.contours.push([[0, 0, 0.15], [sc * 0.45, ss * 0.45, 0.65], [sc * 0.85, ss * 0.85, 1.15]]);
      data.details.push([
        [sc * 0.85 - 0.15 * ss, ss * 0.85 + 0.15 * sc, 1.15],
        [sc * 0.85 + 0.15 * ss, ss * 0.85 - 0.15 * sc, 1.2],
        [sc * 0.85 - 0.15 * ss, ss * 0.85 + 0.15 * sc, 1.23]
      ]);
    });
    data.contours.push([[0, 0, 0.15], [0.05, 0.1, 0.75], [0.1, 0.2, 1.45]]);

    // Guides
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
      data.guides.push([vec(0, 0, 0), vec(Math.cos(a) * 3.0, Math.sin(a) * 3.0, 0)]);
    }

    return data;
  }

  /** STUDY 02: CLASSIC GT COUPE (Automotive) */
  function buildCarData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };
    const zNear = 0.85;
    const zFar = -0.85;

    // Body Lines
    data.contours.push([[3.1, -0.75, zNear], [3.2, -0.4, 0], [3.1, -0.75, zFar]]);
    data.contours.push([[3.15, -0.4, zNear * 0.7], [2.8, -0.15, zNear * 0.8], [2.0, -0.1, zNear * 0.75], [1.0, 0.5, zNear * 0.65], [0.2, 1.15, zNear * 0.5]]);
    data.contours.push([[0.2, 1.15, zNear * 0.5], [0, 1.2, 0], [-0.7, 1.18, 0], [-1.5, 0.85, 0], [-2.2, 0.35, 0], [-2.9, 0.38, 0]]);
    data.contours.push([[-2.9, 0.38, 0], [-3.1, -0.1, 0], [-3.0, -0.75, zNear], [-3.15, -0.75, 0], [-3.0, -0.75, zFar]]);

    // Rocker Panel & Fenders
    data.contours.push([
      [3.0, -0.75, zNear], [2.4, -0.75, zNear], [2.3, -0.3, zNear], [1.7, -0.15, zNear], [1.1, -0.3, zNear],
      [1.0, -0.75, zNear], [-0.8, -0.75, zNear], [-0.9, -0.3, zNear], [-1.5, -0.15, zNear], [-2.1, -0.3, zNear],
      [-2.2, -0.75, zNear], [-2.9, -0.75, zNear]
    ]);

    // Windows & Steering Wheel
    data.contours.push([[0.9, 0.55, zNear * 0.65], [0.15, 1.1, zNear * 0.5], [-0.6, 1.12, zNear * 0.5], [-1.4, 0.8, zNear * 0.55], [-1.3, 0.25, zNear * 0.8], [0.75, 0.25, zNear * 0.8], [0.9, 0.55, zNear * 0.65]]);
    for (let a = 0; a <= Math.PI * 2; a += 0.4) {
      data.details.push([vec(0.1 + Math.cos(a) * 0.28, 0.6 + Math.sin(a) * 0.28, zNear * 0.25), vec(0.1 + Math.cos(a + 0.4) * 0.28, 0.6 + Math.sin(a + 0.4) * 0.28, zNear * 0.25)]);
    }

    // Wheels
    function buildWireWheel(cx, cy, cz) {
      const tireR = 0.58;
      const rimR = 0.42;
      for (let a = 0; a <= Math.PI * 2; a += 0.3) {
        data.contours.push([[cx + Math.cos(a) * tireR, cy + Math.sin(a) * tireR, cz], [cx + Math.cos(a + 0.3) * tireR, cy + Math.sin(a + 0.3) * tireR, cz]]);
        data.details.push([vec(cx + Math.cos(a) * rimR, cy + Math.sin(a) * rimR, cz), vec(cx + Math.cos(a + 0.3) * rimR, cy + Math.sin(a + 0.3) * rimR, cz)]);
      }
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        data.details.push([vec(cx + Math.cos(a) * 0.1, cy + Math.sin(a) * 0.1, cz + 0.05), vec(cx + Math.cos(a + 0.3) * rimR, cy + Math.sin(a + 0.3) * rimR, cz)]);
      }
    }
    buildWireWheel(1.7, -0.75, zNear);
    buildWireWheel(-1.5, -0.75, zNear);
    buildWireWheel(1.7, -0.75, zFar);
    buildWireWheel(-1.5, -0.75, zFar);

    // Grille & Mesh
    data.contours.push([[3.1, -0.5, 0.4], [3.2, -0.2, 0], [3.1, -0.5, -0.4], [3.0, -0.8, -0.25], [3.0, -0.8, 0.25], [3.1, -0.5, 0.4]]);
    for (let i = -3; i <= 3; i++) {
      data.hatches.push([vec(3.1, -0.3 + i * 0.08, 0.3), vec(3.05, -0.7 + i * 0.08, -0.3)]);
      data.hatches.push([vec(3.1, -0.3 + i * 0.08, -0.3), vec(3.05, -0.7 + i * 0.08, 0.3)]);
    }

    // Ground Scribble Shadow
    for (let i = -18; i <= 18; i++) {
      const gx = i * 0.16;
      data.hatches.push([vec(gx - 0.25, -1.35, 0.6), vec(gx + 0.25, -1.35, -0.6)]);
    }
    data.guides.push([vec(3.6, -1.35, 0), vec(-3.6, -1.35, 0)]);

    return data;
  }

  /** STUDY 03: EARTH & ASTROLABE (Cosmology) */
  function buildEarthData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };
    const R = 2.1;

    data.contours.push([[0, -2.7, 0], [0, 2.7, 0]]);

    // Equator with Ticks
    for (let a = 0; a <= Math.PI * 2; a += 0.15) {
      data.contours.push([[R * Math.cos(a), 0, R * Math.sin(a)], [R * Math.cos(a + 0.15), 0, R * Math.sin(a + 0.15)]]);
      data.details.push([vec(R * Math.cos(a), 0, R * Math.sin(a)), vec((R + 0.12) * Math.cos(a), 0, (R + 0.12) * Math.sin(a))]);
    }

    // Meridians
    for (let m = 0; m < 6; m++) {
      const phi = (m / 6) * Math.PI;
      for (let a = -Math.PI / 2; a <= Math.PI / 2; a += 0.18) {
        data.details.push([vec(R * Math.cos(a) * Math.cos(phi), R * Math.sin(a), R * Math.cos(a) * Math.sin(phi)), vec(R * Math.cos(a + 0.18) * Math.cos(phi), R * Math.sin(a + 0.18), R * Math.cos(a + 0.18) * Math.sin(phi))]);
      }
    }

    // Coastlines
    function latLonToVec(latDeg, lonDeg) {
      const lat = (latDeg * Math.PI) / 180;
      const lon = (lonDeg * Math.PI) / 180;
      return vec(R * 1.015 * Math.cos(lat) * Math.sin(lon), R * 1.015 * Math.sin(lat), R * 1.015 * Math.cos(lat) * Math.cos(lon));
    }
    const na = [[70, -160], [60, -140], [45, -125], [26, -80], [45, -65], [70, -160]];
    for (let i = 0; i < na.length - 1; i++) data.contours.push([latLonToVec(na[i][0], na[i][1]), latLonToVec(na[i + 1][0], na[i + 1][1])]);
    const sa = [[10, -75], [-20, -70], [-55, -68], [-35, -50], [10, -75]];
    for (let i = 0; i < sa.length - 1; i++) data.contours.push([latLonToVec(sa[i][0], sa[i][1]), latLonToVec(sa[i + 1][0], sa[i + 1][1])]);
    const ea = [[58, 10], [42, 30], [-25, 32], [-34, 20], [5, 2], [58, 10]];
    for (let i = 0; i < ea.length - 1; i++) data.contours.push([latLonToVec(ea[i][0], ea[i][1]), latLonToVec(ea[i + 1][0], ea[i + 1][1])]);

    // Night Shading
    for (let i = -10; i <= 10; i++) {
      const y = (i / 11) * (R * 0.85);
      const rowR = Math.sqrt(R * R - y * y);
      data.hatches.push([vec(-rowR * 0.95, y, 0.4), vec(-rowR * 0.15, y - 0.25, 0.8)]);
    }

    // Tilted Orbit & Satellite
    const tilt = 32 * Math.PI / 180;
    for (let a = 0; a <= Math.PI * 2; a += 0.15) {
      data.contours.push([[3.3 * Math.cos(a), 3.3 * Math.sin(a) * Math.sin(tilt), 3.3 * Math.sin(a) * Math.cos(tilt)], [3.3 * Math.cos(a + 0.15), 3.3 * Math.sin(a + 0.15) * Math.sin(tilt), 3.3 * Math.sin(a + 0.15) * Math.cos(tilt)]]);
    }
    const sx = 3.3 * Math.cos(Math.PI * 0.35);
    const sy = 3.3 * Math.sin(Math.PI * 0.35) * Math.sin(tilt);
    const sz = 3.3 * Math.sin(Math.PI * 0.35) * Math.cos(tilt);
    data.contours.push([[sx - 0.15, sy - 0.15, sz], [sx + 0.15, sy + 0.15, sz]]);
    data.details.push([[sx - 0.55, sy - 0.25, sz], [sx + 0.55, sy + 0.25, sz]]);

    return data;
  }

  /** STUDY 04: DA VINCI FLYING MACHINE (Renaissance) */
  function buildOrnithopterData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };

    // Longitudinal Fuselage Spine
    data.contours.push([[0, 1.2, 0], [0, -0.6, 0.2], [0, -2.4, 0]]);
    // Cockpit Pilot Cradle Ring
    for (let a = 0; a <= Math.PI * 2; a += 0.3) {
      data.contours.push([
        [Math.cos(a) * 0.55, -0.6 + Math.sin(a) * 0.35, 0.15],
        [Math.cos(a + 0.3) * 0.55, -0.6 + Math.sin(a + 0.3) * 0.35, 0.15]
      ]);
    }

    // Left Wing Leading Spar & Ribs
    data.contours.push([[0, 0.4, 0], [-1.2, 1.5, 0.3], [-2.4, 1.8, 0.5], [-3.6, 1.5, 0.7]]);
    // Scalloped trailing edge
    data.contours.push([[0, -0.2, 0], [-1.0, 0.4, 0.2], [-2.2, 0.6, 0.4], [-3.6, 1.5, 0.7]]);
    for (let i = 1; i <= 6; i++) {
      const t = i / 7;
      const lx1 = -t * 3.6;
      const ly1 = 0.4 + t * 1.1;
      const lx2 = -t * 3.2;
      const ly2 = -0.2 + t * 0.8;
      data.details.push([[lx1, ly1, 0.4], [lx2, ly2, 0.3]]);
      data.hatches.push([vec(lx1, ly1, 0.4), vec(lx1 + 0.25, ly1 - 0.35, 0.35)]);
    }

    // Right Wing Leading Spar & Ribs
    data.contours.push([[0, 0.4, 0], [1.2, 1.5, 0.3], [2.4, 1.8, 0.5], [3.6, 1.5, 0.7]]);
    data.contours.push([[0, -0.2, 0], [1.0, 0.4, 0.2], [2.2, 0.6, 0.4], [3.6, 1.5, 0.7]]);
    for (let i = 1; i <= 6; i++) {
      const t = i / 7;
      const rx1 = t * 3.6;
      const ry1 = 0.4 + t * 1.1;
      const rx2 = t * 3.2;
      const ry2 = -0.2 + t * 0.8;
      data.details.push([[rx1, ry1, 0.4], [rx2, ry2, 0.3]]);
      data.hatches.push([vec(rx1, ry1, 0.4), vec(rx1 - 0.25, ry1 - 0.35, 0.35)]);
    }

    // Fan Tail Rudder
    data.contours.push([[0, -2.0, 0], [-1.2, -3.1, 0.2], [1.2, -3.1, 0.2], [0, -2.0, 0]]);
    for (let i = -3; i <= 3; i++) {
      data.details.push([[0, -2.0, 0], [i * 0.35, -3.1, 0.2]]);
    }

    // Flight Pulleys & Tension Cables
    data.guides.push([vec(0, 1.2, 0), vec(-2.4, 1.8, 0.5)]);
    data.guides.push([vec(0, 1.2, 0), vec(2.4, 1.8, 0.5)]);
    data.guides.push([vec(0, -0.6, 0.15), vec(-1.8, 0.5, 0.3)]);
    data.guides.push([vec(0, -0.6, 0.15), vec(1.8, 0.5, 0.3)]);

    return data;
  }

  /** STUDY 05: TOURBILLON HOROLOGY (Mechanical Precision) */
  function buildWatchData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };

    // Outer Case & Bezel
    for (let a = 0; a <= Math.PI * 2; a += 0.15) {
      data.contours.push([[Math.cos(a) * 2.8, Math.sin(a) * 2.8, 0], [Math.cos(a + 0.15) * 2.8, Math.sin(a + 0.15) * 2.8, 0]]);
      data.details.push([vec(Math.cos(a) * 2.5, Math.sin(a) * 2.5, 0), vec(Math.cos(a + 0.15) * 2.5, Math.sin(a + 0.15) * 2.5, 0)]);
      // 12 Hour Index Markers
      if (Math.round(a * 6 / Math.PI) === a * 6 / Math.PI) {
        data.contours.push([[Math.cos(a) * 2.5, Math.sin(a) * 2.5, 0], [Math.cos(a) * 2.2, Math.sin(a) * 2.2, 0]]);
      }
    }

    // Main Center Gear Wheel (24 Teeth)
    const teeth = 24;
    for (let i = 0; i < teeth; i++) {
      const a1 = (i / teeth) * Math.PI * 2;
      const a2 = ((i + 0.5) / teeth) * Math.PI * 2;
      data.contours.push([[Math.cos(a1) * 1.6, Math.sin(a1) * 1.6, 0.1], [Math.cos(a1) * 1.8, Math.sin(a1) * 1.8, 0.1]]);
      data.contours.push([[Math.cos(a1) * 1.8, Math.sin(a1) * 1.8, 0.1], [Math.cos(a2) * 1.8, Math.sin(a2) * 1.8, 0.1]]);
      data.contours.push([[Math.cos(a2) * 1.8, Math.sin(a2) * 1.8, 0.1], [Math.cos(a2) * 1.6, Math.sin(a2) * 1.6, 0.1]]);
    }
    // Gear Cross-Arms (3 Spoke Wheel)
    for (let k = 0; k < 3; k++) {
      const ga = (k / 3) * Math.PI * 2;
      data.details.push([[0, 0, 0.1], [Math.cos(ga) * 1.6, Math.sin(ga) * 1.6, 0.1]]);
    }

    // Tourbillon Cage & Balance Wheel (Lower Chamber)
    const tcx = 0;
    const tcy = -1.1;
    for (let a = 0; a <= Math.PI * 2; a += 0.2) {
      data.contours.push([[tcx + Math.cos(a) * 0.9, tcy + Math.sin(a) * 0.9, 0.25], [tcx + Math.cos(a + 0.2) * 0.9, tcy + Math.sin(a + 0.2) * 0.9, 0.25]]);
    }
    // Coiled Hairspring Spiral
    for (let a = 0; a <= Math.PI * 6; a += 0.3) {
      const sr = 0.08 + a * 0.035;
      data.details.push([vec(tcx + Math.cos(a) * sr, tcy + Math.sin(a) * sr, 0.3), vec(tcx + Math.cos(a + 0.3) * (sr + 0.01), tcy + Math.sin(a + 0.3) * (sr + 0.01), 0.3)]);
    }

    // Watch Hands (10:10 Position)
    // Hour Hand (10 o'clock)
    const ha = (10 / 12) * Math.PI * 2 + Math.PI / 2;
    data.contours.push([[0, 0, 0.4], [Math.cos(ha) * 1.2, Math.sin(ha) * 1.2, 0.4]]);
    // Minute Hand (2 o'clock / 10 min)
    const ma = (2 / 12) * Math.PI * 2 + Math.PI / 2;
    data.contours.push([[0, 0, 0.45], [Math.cos(ma) * 1.9, Math.sin(ma) * 1.9, 0.45]]);

    // Geneva Stripe Hatching across Bridge Plates
    for (let y = 0.5; y <= 2.2; y += 0.2) {
      data.hatches.push([vec(-1.8, y, 0.15), vec(-0.3, y - 0.25, 0.15)]);
      data.hatches.push([vec(0.3, y, 0.15), vec(1.8, y - 0.25, 0.15)]);
    }

    data.guides.push([vec(0, -2.8, 0), vec(0, 2.8, 0)]);
    data.guides.push([vec(-2.8, 0, 0), vec(2.8, 0, 0)]);

    return data;
  }

  /** STUDY 06: LOGARITHMIC NAUTILUS (Sacred Geometry) */
  function buildNautilusData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };

    // Outer Golden Spiral
    const spiralPts = [];
    const b = 0.18;
    for (let a = 0; a <= Math.PI * 4.6; a += 0.1) {
      const r = 0.12 * Math.exp(b * a);
      const z = Math.sin(a) * 0.25;
      spiralPts.push([Math.cos(a) * r, Math.sin(a) * r, z]);
    }
    data.contours.push(spiralPts);

    // Inner Septa Chambers
    for (let c = 1; c <= 16; c++) {
      const a = c * 0.85;
      const r = 0.12 * Math.exp(b * a);
      const innerR = r * 0.42;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      const ix = Math.cos(a - 0.6) * innerR;
      const iy = Math.sin(a - 0.6) * innerR;

      data.contours.push([[px, py, 0.1], [ix, iy, 0.0]]);

      // Septa hatching
      for (let h = 1; h <= 4; h++) {
        const t = h / 5;
        const hx = ix + (px - ix) * t;
        const hy = iy + (py - iy) * t;
        data.hatches.push([vec(hx, hy, 0.05), vec(hx + 0.15, hy - 0.15, 0.05)]);
      }
    }

    // Outer Shell Ribs
    for (let a = Math.PI * 2; a <= Math.PI * 4.4; a += 0.25) {
      const r = 0.12 * Math.exp(b * a);
      data.details.push([vec(Math.cos(a) * r, Math.sin(a) * r, 0.15), vec(Math.cos(a) * (r + 0.18), Math.sin(a) * (r + 0.18), 0.15)]);
    }

    // Golden Ratio Grid Guides
    data.guides.push([vec(-2.5, -2.5, 0), vec(2.5, -2.5, 0), vec(2.5, 2.5, 0), vec(-2.5, 2.5, 0), vec(-2.5, -2.5, 0)]);
    data.guides.push([vec(0, 0, 0), vec(2.5, 1.54, 0)]);

    return data;
  }

  /** STUDY 07: CLASSICAL ROMAN TEMPLE (Architecture) */
  function buildTempleData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };

    // 1. Stylobate Steps (3 tiers)
    data.contours.push([[-3.2, -2.4, 0.6], [3.2, -2.4, 0.6], [3.2, -2.1, 0.6], [-3.2, -2.1, 0.6], [-3.2, -2.4, 0.6]]);
    data.contours.push([[-3.0, -2.1, 0.4], [3.0, -2.1, 0.4], [3.0, -1.8, 0.4], [-3.0, -1.8, 0.4], [-3.0, -2.1, 0.4]]);
    data.contours.push([[-2.8, -1.8, 0.2], [2.8, -1.8, 0.2], [2.8, -1.5, 0.2], [-2.8, -1.5, 0.2], [-2.8, -1.8, 0.2]]);

    // 2. Colonnade (6 Fluted Columns)
    const cols = [-2.4, -1.44, -0.48, 0.48, 1.44, 2.4];
    cols.forEach(cx => {
      // Left and right column shaft
      data.contours.push([[cx - 0.14, -1.5, 0.2], [cx - 0.12, 1.2, 0.2]]);
      data.contours.push([[cx + 0.14, -1.5, 0.2], [cx + 0.12, 1.2, 0.2]]);
      // Center fluting lines
      data.details.push([[cx - 0.04, -1.5, 0.22], [cx - 0.04, 1.2, 0.22]]);
      data.details.push([[cx + 0.04, -1.5, 0.22], [cx + 0.04, 1.2, 0.22]]);
      // Capital Volutes
      data.contours.push([[cx - 0.2, 1.2, 0.2], [cx + 0.2, 1.2, 0.2], [cx + 0.24, 1.35, 0.2], [cx - 0.24, 1.35, 0.2], [cx - 0.2, 1.2, 0.2]]);
      // Column Shadow Hatching
      for (let y = -1.3; y <= 1.0; y += 0.25) {
        data.hatches.push([vec(cx - 0.12, y, 0.2), vec(cx + 0.05, y - 0.08, 0.2)]);
      }
    });

    // 3. Entablature & Architrave
    data.contours.push([[-2.8, 1.35, 0.2], [2.8, 1.35, 0.2], [2.8, 1.65, 0.2], [-2.8, 1.65, 0.2], [-2.8, 1.35, 0.2]]);
    for (let x = -2.6; x <= 2.6; x += 0.4) {
      data.details.push([[x, 1.35, 0.22], [x, 1.65, 0.22]]);
    }

    // 4. Triangular Pediment & Tympanum
    data.contours.push([[-2.9, 1.65, 0.2], [0, 2.8, 0.2], [2.9, 1.65, 0.2], [-2.9, 1.65, 0.2]]);
    // Inner pediment frame
    data.details.push([[-2.6, 1.75, 0.22], [0, 2.6, 0.22], [2.6, 1.75, 0.22], [-2.6, 1.75, 0.22]]);

    // Tympanum Hatching (Portico Depth Shadow)
    for (let x = -2.2; x <= 2.2; x += 0.2) {
      const topY = 1.75 + (1 - Math.abs(x) / 2.6) * 0.8;
      data.hatches.push([vec(x, 1.75, 0.1), vec(x + 0.15, topY, 0.1)]);
    }

    data.guides.push([vec(0, -2.4, 0), vec(0, 3.2, 0)]);

    return data;
  }

  /** STUDY 08: GALLOPING STALLION (Equine Anatomy) */
  function buildStallionData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };

    // Torso, Back & Flank
    data.contours.push([
      [-1.8, 0.8, 0], [-1.2, 0.95, 0.1], [-0.4, 0.85, 0.15],
      [0.6, 0.7, 0.1], [1.2, 0.9, 0], [1.6, 1.4, -0.1]
    ]);
    // Barrel Abdomen & Chest
    data.contours.push([
      [-1.6, 0.1, 0], [-1.0, -0.2, 0.1], [0.0, -0.15, 0.2],
      [0.8, 0.2, 0.25], [1.5, 0.6, 0.1]
    ]);

    // Arched Neck & Head
    data.contours.push([
      [1.2, 0.9, 0], [1.8, 1.6, 0.1], [2.2, 2.2, 0.15],
      [2.7, 2.3, 0.15], [3.1, 1.9, 0.2], [3.0, 1.6, 0.2],
      [2.5, 1.5, 0.18], [1.9, 1.1, 0.15], [1.5, 0.6, 0.1]
    ]);
    // Alert Ear & Muzzle
    data.contours.push([[2.2, 2.2, 0.15], [2.3, 2.6, 0.15], [2.5, 2.3, 0.15]]);
    data.details.push([[2.9, 1.8, 0.2], [3.1, 1.85, 0.2]]); // Nostril

    // Flowing Mane Locks
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const mx = 1.3 + t * 0.9;
      const my = 1.0 + t * 1.2;
      data.details.push([[mx, my, 0.1], [mx - 0.45, my + 0.35, 0.25], [mx - 0.7, my + 0.1, 0.2]]);
    }

    // Forelegs in Full Stride
    data.contours.push([[1.3, 0.4, 0.2], [1.6, -0.5, 0.3], [2.4, -1.2, 0.4], [2.8, -1.4, 0.45]]); // Stretched Leg
    data.contours.push([[1.0, 0.3, -0.2], [0.6, -0.6, -0.2], [0.8, -1.2, -0.2], [1.2, -1.3, -0.2]]); // Folded Leg

    // Hindlegs Extended Back
    data.contours.push([[-1.6, 0.6, 0.1], [-2.2, 0.0, 0.2], [-2.8, -0.8, 0.3], [-3.4, -1.2, 0.4]]);
    data.contours.push([[-1.4, 0.5, -0.2], [-1.8, -0.2, -0.2], [-2.2, -0.9, -0.2], [-2.6, -1.3, -0.2]]);

    // Flowing Tail
    data.contours.push([
      [-1.8, 0.8, 0], [-2.4, 1.0, 0], [-3.1, 0.6, 0.1], [-3.6, 0.0, 0.15], [-3.4, -0.5, 0.1]
    ]);
    data.details.push([[-2.2, 0.9, 0], [-2.8, 0.7, 0.05], [-3.3, 0.2, 0.1]]);

    // Muscular Anatomy Hatching
    for (let i = 0; i < 6; i++) {
      const sx = 0.8 + i * 0.1;
      data.hatches.push([vec(sx, 0.3 + i * 0.05, 0.2), vec(sx - 0.2, -0.1 + i * 0.05, 0.2)]);
    }

    data.guides.push([vec(-3.8, -1.5, 0), vec(3.4, -1.5, 0)]); // Ground datum

    return data;
  }

  /** STUDY 09: VINTAGE BIPLANE (Early Aviation) */
  function buildBiplaneData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };

    // Upper Wing (Curved Chord)
    data.contours.push([[-3.4, 1.3, 0.4], [0, 1.45, 0.4], [3.4, 1.3, 0.4], [3.3, 1.0, -0.4], [0, 1.15, -0.4], [-3.3, 1.0, -0.4], [-3.4, 1.3, 0.4]]);
    // Lower Wing
    data.contours.push([[-3.0, -0.2, 0.3], [0, -0.1, 0.3], [3.0, -0.2, 0.3], [2.9, -0.5, -0.3], [0, -0.4, -0.3], [-2.9, -0.5, -0.3], [-3.0, -0.2, 0.3]]);

    // Fuselage Body
    data.contours.push([[2.6, 0.3, 0], [1.2, 0.5, 0.25], [-1.0, 0.4, 0.2], [-2.8, 0.2, 0.08], [-3.0, 0.2, 0]]);
    data.contours.push([[2.6, 0.3, 0], [1.2, 0.1, -0.25], [-1.0, 0.1, -0.2], [-2.8, 0.2, -0.08], [-3.0, 0.2, 0]]);

    // Radial Engine Cowl & Propeller
    data.contours.push([[2.6, 0.7, 0], [2.8, 0.3, 0.3], [2.6, -0.1, 0], [2.4, 0.3, -0.3], [2.6, 0.7, 0]]);
    // Propeller Blades (2 Blades)
    data.contours.push([[2.8, 1.6, 0], [2.85, 0.3, 0], [2.8, -1.0, 0]]);

    // Interplane Struts & X-Wire Rigging
    [-2.2, -0.8, 0.8, 2.2].forEach(sx => {
      data.contours.push([[sx, 1.15, 0.2], [sx, -0.15, 0.15]]);
      data.contours.push([[sx, 1.0, -0.2], [sx, -0.3, -0.15]]);
    });
    // Diagonal wire rigging
    data.guides.push([vec(-2.2, 1.15, 0.2), vec(-0.8, -0.15, 0.15)]);
    data.guides.push([vec(-0.8, 1.15, 0.2), vec(-2.2, -0.15, 0.15)]);
    data.guides.push([vec(0.8, 1.15, 0.2), vec(2.2, -0.15, 0.15)]);
    data.guides.push([vec(2.2, 1.15, 0.2), vec(0.8, -0.15, 0.15)]);

    // Wheels Undercarriage
    data.contours.push([[1.1, -0.2, 0], [0.9, -1.2, 0.5], [1.5, -1.2, 0.5], [1.1, -0.2, 0]]);
    data.contours.push([[1.1, -0.2, 0], [0.9, -1.2, -0.5], [1.5, -1.2, -0.5], [1.1, -0.2, 0]]);
    for (let a = 0; a <= Math.PI * 2; a += 0.4) {
      data.details.push([vec(1.2 + Math.cos(a) * 0.3, -1.2 + Math.sin(a) * 0.3, 0.5), vec(1.2 + Math.cos(a + 0.4) * 0.3, -1.2 + Math.sin(a + 0.4) * 0.3, 0.5)]);
      data.details.push([vec(1.2 + Math.cos(a) * 0.3, -1.2 + Math.sin(a) * 0.3, -0.5), vec(1.2 + Math.cos(a + 0.4) * 0.3, -1.2 + Math.sin(a + 0.4) * 0.3, -0.5)]);
    }

    // Tail Rudder & Elevators
    data.contours.push([[-2.8, 0.2, 0], [-3.4, 0.9, 0], [-3.1, 0.2, 0]]);
    data.contours.push([[-2.8, 0.2, 0.5], [-3.2, 0.2, 0.5], [-3.2, 0.2, -0.5], [-2.8, 0.2, -0.5]]);

    return data;
  }

  /** STUDY 10: MYTHICAL PHOENIX (Avian Mythology) */
  function buildPhoenixData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };

    // Crested Head & Curved Raptor Beak
    data.contours.push([[0, 1.6, 0.2], [0.3, 1.9, 0.25], [0.7, 1.8, 0.3], [0.9, 1.55, 0.3], [0.65, 1.45, 0.28], [0.3, 1.4, 0.2]]);
    // 3 Flame Crest Plumes
    data.contours.push([[0.3, 1.9, 0.25], [0.2, 2.5, 0.3], [0.5, 2.8, 0.35], [0.6, 2.4, 0.3]]);
    data.contours.push([[0.1, 1.8, 0.2], [-0.2, 2.3, 0.2], [0.0, 2.6, 0.25], [0.1, 2.2, 0.2]]);
    data.contours.push([[-0.1, 1.7, 0.15], [-0.5, 2.0, 0.15], [-0.4, 2.3, 0.18]]);

    // Serpentine Neck & Muscular Torso
    data.contours.push([[0.3, 1.4, 0.2], [0.1, 0.9, 0.15], [-0.1, 0.3, 0.1], [0.1, -0.4, 0.15], [0.0, -1.1, 0.1]]);
    data.contours.push([[0.0, 1.6, 0.2], [-0.3, 1.1, 0.1], [-0.4, 0.4, 0.05], [-0.2, -0.4, 0.1], [0.0, -1.1, 0.1]]);

    // Left Wing of Fire
    data.contours.push([[-0.2, 0.6, 0.1], [-1.2, 1.5, 0.3], [-2.2, 2.4, 0.5], [-3.2, 2.8, 0.7], [-2.8, 2.0, 0.5], [-2.2, 1.4, 0.4], [-1.2, 0.8, 0.25], [-0.2, 0.2, 0.1]]);
    // Wing primary feather flame curls
    for (let i = 1; i <= 5; i++) {
      const t = i / 6;
      const wx = -0.2 - t * 3.0;
      const wy = 0.6 + t * 2.2;
      data.details.push([[wx, wy, 0.4], [wx + 0.4, wy - 0.7, 0.3], [wx + 0.8, wy - 0.5, 0.25]]);
      data.hatches.push([vec(wx, wy, 0.4), vec(wx + 0.3, wy - 0.4, 0.3)]);
    }

    // Right Wing of Fire
    data.contours.push([[0.2, 0.6, 0.1], [1.2, 1.5, 0.3], [2.2, 2.4, 0.5], [3.2, 2.8, 0.7], [2.8, 2.0, 0.5], [2.2, 1.4, 0.4], [1.2, 0.8, 0.25], [0.2, 0.2, 0.1]]);
    for (let i = 1; i <= 5; i++) {
      const t = i / 6;
      const wx = 0.2 + t * 3.0;
      const wy = 0.6 + t * 2.2;
      data.details.push([[wx, wy, 0.4], [wx - 0.4, wy - 0.7, 0.3], [wx - 0.8, wy - 0.5, 0.25]]);
      data.hatches.push([vec(wx, wy, 0.4), vec(wx - 0.3, wy - 0.4, 0.3)]);
    }

    // Undulating Flame Tail Plumes
    const tail1 = [];
    for (let t = 0; t <= 1; t += 0.08) {
      const tx = Math.sin(t * Math.PI * 3) * 0.4;
      const ty = -1.1 - t * 2.2;
      const tz = Math.cos(t * Math.PI * 2) * 0.3;
      tail1.push([tx, ty, tz]);
    }
    data.contours.push(tail1);

    const tail2 = [];
    for (let t = 0; t <= 1; t += 0.08) {
      const tx = -0.3 + Math.sin(t * Math.PI * 3 + 1) * 0.5;
      const ty = -1.1 - t * 2.4;
      const tz = -0.2 + Math.cos(t * Math.PI * 2 + 1) * 0.3;
      tail2.push([tx, ty, tz]);
    }
    data.contours.push(tail2);

    const tail3 = [];
    for (let t = 0; t <= 1; t += 0.08) {
      const tx = 0.3 + Math.sin(t * Math.PI * 3 - 1) * 0.5;
      const ty = -1.1 - t * 2.4;
      const tz = 0.2 + Math.cos(t * Math.PI * 2 - 1) * 0.3;
      tail3.push([tx, ty, tz]);
    }
    data.contours.push(tail3);

    // Radiant Ascension Aura Rays
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      data.guides.push([vec(0, 0.2, 0), vec(Math.cos(a) * 3.4, Math.sin(a) * 3.4 + 0.2, 0)]);
    }

    return data;
  }

  // ==========================================================================
  // THE 10 JAPANESE SUMI-E ZEN INK STUDIES (VOLUME II)
  // ==========================================================================

  /** STUDY 11: ANCIENT BONSAI PINE (Matsu - 松) */
  function buildPineData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };

    // Gnarled primary trunk spine (twisting upward with ancient bends)
    const trunkMain = [
      vec(-0.4, -2.5, 0.1),
      vec(-0.2, -1.9, 0.3),
      vec(0.3, -1.3, 0.2),
      vec(0.5, -0.6, -0.1),
      vec(0.1, 0.1, 0.3),
      vec(-0.4, 0.8, 0.1),
      vec(-0.2, 1.5, -0.2),
      vec(0.2, 2.1, 0.1)
    ];
    data.contours.push(trunkMain);

    // Flanking bark ridge contours (gnarled cork bark volume)
    const trunkLeft = [
      vec(-0.65, -2.5, -0.1),
      vec(-0.42, -1.8, 0.1),
      vec(0.08, -1.2, 0.4),
      vec(0.28, -0.5, 0.1),
      vec(-0.15, 0.2, 0.5),
      vec(-0.62, 0.9, 0.2),
      vec(-0.38, 1.5, -0.1),
      vec(0.05, 2.0, 0.2)
    ];
    const trunkRight = [
      vec(-0.15, -2.5, 0.3),
      vec(0.02, -1.9, 0.5),
      vec(0.52, -1.4, 0.0),
      vec(0.72, -0.7, -0.3),
      vec(0.32, 0.0, 0.1),
      vec(-0.18, 0.7, -0.1),
      vec(-0.02, 1.4, -0.3),
      vec(0.35, 2.1, 0.0)
    ];
    data.contours.push(trunkLeft, trunkRight);

    // Craggy roots gripping mountain stone
    const root1 = [vec(-0.4, -2.3, 0.1), vec(-0.8, -2.6, 0.4), vec(-1.2, -2.7, 0.5)];
    const root2 = [vec(-0.2, -2.3, 0.2), vec(0.3, -2.6, -0.3), vec(0.8, -2.7, -0.4)];
    const root3 = [vec(-0.6, -2.4, -0.1), vec(-1.0, -2.6, -0.4), vec(-1.4, -2.7, -0.5)];
    data.contours.push(root1, root2, root3);

    // Weathered branches (Bonsai boughs spreading horizontally)
    const branch1 = [
      vec(0.5, -0.6, -0.1),
      vec(1.1, -0.8, 0.2),
      vec(1.7, -0.7, 0.4),
      vec(2.2, -0.9, 0.3)
    ];
    const subBranch1 = [vec(1.4, -0.75, 0.3), vec(1.8, -1.2, 0.1), vec(2.1, -1.3, 0.0)];
    data.contours.push(branch1, subBranch1);

    const branch2 = [
      vec(-0.4, 0.8, 0.1),
      vec(-1.0, 0.9, -0.2),
      vec(-1.6, 0.7, 0.1),
      vec(-2.2, 0.5, 0.3)
    ];
    const subBranch2 = [vec(-1.3, 0.8, 0.0), vec(-1.7, 1.1, -0.2), vec(-2.1, 1.2, -0.3)];
    data.contours.push(branch2, subBranch2);

    const branch3 = [
      vec(-0.2, 1.5, -0.2),
      vec(0.4, 1.6, 0.1),
      vec(1.0, 1.5, 0.3),
      vec(1.5, 1.3, 0.2)
    ];
    data.contours.push(branch3);

    const branch4 = [
      vec(0.2, 2.1, 0.1),
      vec(0.0, 2.4, 0.0),
      vec(-0.4, 2.5, 0.2),
      vec(-0.7, 2.4, 0.1)
    ];
    const branch5 = [vec(0.1, 2.3, 0.0), vec(0.5, 2.5, -0.1), vec(0.8, 2.4, -0.1)];
    data.contours.push(branch4, branch5);

    // Needle Clouds (Niwaki tuft pads)
    function addPinePad(cx, cy, cz, radiusX, radiusY, count) {
      const ring = [];
      const steps = 18;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const r = (i % 2 === 0) ? radiusX : radiusX * 0.85;
        ring.push(vec(cx + Math.cos(a) * r, cy + Math.sin(a) * radiusY, cz + Math.sin(a * 2) * 0.12));
      }
      data.details.push(ring);

      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 1.8 + 0.1;
        const len = radiusX * (0.7 + Math.sin(i * 3) * 0.25);
        const p1 = vec(cx, cy - radiusY * 0.3, cz);
        const p2 = vec(cx + Math.cos(a) * len, cy + Math.sin(a) * (radiusY * 0.9), cz + (i % 3 - 1) * 0.08);
        data.hatches.push([p1, p2]);
      }
    }

    addPinePad(2.2, -0.9, 0.3, 0.7, 0.35, 14);
    addPinePad(2.1, -1.3, 0.0, 0.5, 0.28, 10);
    addPinePad(-2.2, 0.5, 0.3, 0.75, 0.38, 14);
    addPinePad(-2.1, 1.2, -0.3, 0.6, 0.3, 12);
    addPinePad(1.5, 1.3, 0.2, 0.65, 0.32, 12);
    addPinePad(-0.5, 2.5, 0.1, 0.8, 0.4, 16);
    addPinePad(0.7, 2.4, -0.1, 0.55, 0.3, 10);

    for (let y = -2.1; y <= 1.5; y += 0.35) {
      data.hatches.push([vec(-0.35, y, 0.1), vec(0.25, y + 0.08, 0.2)]);
      data.hatches.push([vec(-0.25, y + 0.1, 0.0), vec(0.35, y + 0.18, 0.15)]);
    }

    data.guides.push([vec(-3.0, -1.6, -0.5), vec(-1.0, -1.6, -0.5)]);
    data.guides.push([vec(-0.8, -1.6, -0.5), vec(2.8, -1.6, -0.5)]);
    data.guides.push([vec(-2.5, 0.0, -0.6), vec(2.5, 0.0, -0.6)]);

    return data;
  }

  /** STUDY 12: SWIMMING NISHIKIGOI (Koi - 鯉) */
  function buildKoiData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };

    // Fluid S-curve dorsal spine
    const spine = [
      vec(0.0, 2.5, 0.1),
      vec(-0.4, 1.8, 0.25),
      vec(-0.6, 0.9, 0.15),
      vec(-0.2, 0.0, -0.1),
      vec(0.4, -0.8, -0.2),
      vec(0.6, -1.6, 0.0),
      vec(0.2, -2.3, 0.15),
      vec(-0.1, -2.8, 0.25)
    ];
    data.contours.push(spine);

    // Body cross-section contour rings giving 3D cylindrical mass
    const ribParams = [
      { y: 2.2, rx: 0.45, rz: 0.35, ox: -0.2, oz: 0.2 },
      { y: 1.5, rx: 0.85, rz: 0.65, ox: -0.5, oz: 0.2 },
      { y: 0.8, rx: 1.05, rz: 0.80, ox: -0.5, oz: 0.1 },
      { y: 0.0, rx: 0.95, rz: 0.72, ox: -0.1, oz: -0.1 },
      { y: -0.7, rx: 0.75, rz: 0.58, ox: 0.35, oz: -0.2 },
      { y: -1.4, rx: 0.52, rz: 0.42, ox: 0.55, oz: -0.05 },
      { y: -2.1, rx: 0.28, rz: 0.22, ox: 0.25, oz: 0.12 }
    ];

    ribParams.forEach((rib, idx) => {
      const ring = [];
      const steps = 16;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        ring.push(vec(
          rib.ox + Math.cos(a) * rib.rx,
          rib.y + Math.sin(a) * 0.1,
          rib.oz + Math.sin(a) * rib.rz
        ));
      }
      data.details.push(ring);

      if (idx > 0 && idx < ribParams.length - 1) {
        for (let i = 0; i < 4; i++) {
          const a1 = (i / 4) * Math.PI - Math.PI / 2;
          const a2 = a1 + 0.3;
          data.hatches.push([
            vec(rib.ox + Math.cos(a1) * rib.rx, rib.y, rib.oz + Math.sin(a1) * rib.rz),
            vec(rib.ox + Math.cos(a2) * rib.rx * 0.85, rib.y - 0.2, rib.oz + Math.sin(a2) * rib.rz * 0.85)
          ]);
        }
      }
    });

    // Lateral flank outline curves
    const leftFlank = [
      vec(-0.25, 2.4, 0.1),
      vec(-1.1, 1.5, 0.2),
      vec(-1.45, 0.7, 0.1),
      vec(-1.0, -0.1, -0.15),
      vec(-0.2, -0.8, -0.25),
      vec(0.1, -1.6, 0.0),
      vec(0.05, -2.2, 0.15)
    ];
    const rightFlank = [
      vec(0.2, 2.4, 0.1),
      vec(0.25, 1.5, 0.15),
      vec(0.45, 0.7, 0.05),
      vec(0.75, -0.1, -0.08),
      vec(0.95, -0.8, -0.15),
      vec(0.85, -1.6, -0.05),
      vec(0.45, -2.2, 0.12)
    ];
    data.contours.push(leftFlank, rightFlank);

    // Mouth & Whiskers
    const mouth = [vec(-0.25, 2.45, 0.1), vec(0.0, 2.65, 0.05), vec(0.2, 2.45, 0.1)];
    data.contours.push(mouth);

    const leftBarbel = [
      vec(-0.22, 2.5, 0.1),
      vec(-0.6, 2.65, 0.25),
      vec(-0.9, 2.45, 0.35)
    ];
    const rightBarbel = [
      vec(0.18, 2.5, 0.1),
      vec(0.55, 2.65, -0.05),
      vec(0.85, 2.45, -0.15)
    ];
    data.details.push(leftBarbel, rightBarbel);

    // Dorsal Fin along spine
    const dorsalFin = [
      vec(-0.55, 1.2, 0.3),
      vec(-0.45, 0.8, 0.65),
      vec(-0.2, 0.1, 0.6),
      vec(0.25, -0.6, 0.45),
      vec(0.5, -1.2, 0.15)
    ];
    data.contours.push(dorsalFin);
    for (let f = 0; f < 5; f++) {
      const t = f / 4;
      const base = vec(-0.5 + t * 0.9, 1.0 - t * 2.0, 0.2);
      const tip = vec(-0.45 + t * 0.85, 1.0 - t * 1.9, 0.55);
      data.details.push([base, tip]);
    }

    // Sweeping Pectoral Fins
    const leftPectoralMain = [
      vec(-1.1, 1.4, 0.2),
      vec(-1.8, 1.2, 0.45),
      vec(-2.4, 0.7, 0.6),
      vec(-2.1, 0.3, 0.5)
    ];
    const leftPectoralInner = [
      vec(-1.0, 1.1, 0.15),
      vec(-1.6, 0.8, 0.35),
      vec(-2.1, 0.3, 0.5)
    ];
    data.contours.push(leftPectoralMain, leftPectoralInner);

    const rightPectoralMain = [
      vec(0.3, 1.4, 0.1),
      vec(1.1, 1.2, -0.15),
      vec(1.8, 0.8, -0.3),
      vec(1.5, 0.4, -0.25)
    ];
    const rightPectoralInner = [
      vec(0.4, 1.1, 0.05),
      vec(1.0, 0.8, -0.1),
      vec(1.5, 0.4, -0.25)
    ];
    data.contours.push(rightPectoralMain, rightPectoralInner);

    // Caudal (Tail) Fin ribbons
    const tailPeduncle = vec(-0.1, -2.8, 0.25);
    const tailStrokes = [
      [tailPeduncle, vec(-0.7, -3.3, 0.5), vec(-1.1, -3.8, 0.7)],
      [tailPeduncle, vec(-0.4, -3.4, 0.4), vec(-0.6, -4.0, 0.5)],
      [tailPeduncle, vec(0.0, -3.5, 0.3), vec(0.0, -4.1, 0.35)],
      [tailPeduncle, vec(0.4, -3.4, 0.2), vec(0.6, -3.9, 0.15)],
      [tailPeduncle, vec(0.7, -3.2, 0.1), vec(1.0, -3.6, 0.0)]
    ];
    tailStrokes.forEach(s => data.contours.push(s));

    // Water Surface Ripple Waves
    for (let r = 1.6; r <= 3.2; r += 0.8) {
      const ripple = [];
      const steps = 24;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        ripple.push(vec(Math.cos(a) * r, Math.sin(a) * (r * 0.7) - 0.2, -0.6));
      }
      data.details.push(ripple);
    }

    return data;
  }

  /** STUDY 13: RED-CROWNED CRANE (Tsuru - 鶴) */
  function buildCraneData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };

    // S-curved serpentine neck
    const neck = [
      vec(0.1, 0.2, 0.0),
      vec(0.3, 0.8, 0.1),
      vec(0.65, 1.4, 0.05),
      vec(0.5, 2.0, -0.05),
      vec(0.75, 2.45, 0.0),
      vec(1.05, 2.5, 0.0)
    ];
    data.contours.push(neck);

    // Sharp calligraphic beak
    const beakTop = [vec(1.0, 2.52, 0.0), vec(1.6, 2.45, 0.0)];
    const beakBottom = [vec(1.0, 2.46, 0.0), vec(1.6, 2.45, 0.0)];
    data.contours.push(beakTop, beakBottom);

    // Iconic Red Crown (Tancho mark on head)
    const crownLoop = [
      vec(0.85, 2.56, 0.04),
      vec(0.95, 2.62, 0.0),
      vec(1.05, 2.58, -0.04),
      vec(0.95, 2.52, 0.0),
      vec(0.85, 2.56, 0.04)
    ];
    data.details.push(crownLoop);

    // Aerodynamic body torso
    const torsoTop = [vec(0.1, 0.2, 0.0), vec(-0.5, 0.35, 0.0), vec(-1.1, 0.1, 0.0)];
    const torsoBtm = [vec(0.1, 0.2, 0.0), vec(-0.4, -0.2, 0.0), vec(-1.1, 0.1, 0.0)];
    data.contours.push(torsoTop, torsoBtm);

    for (let x = -0.1; x >= -0.9; x -= 0.3) {
      const hoop = [];
      for (let i = 0; i <= 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        hoop.push(vec(x, 0.1 + Math.sin(a) * 0.25, Math.cos(a) * 0.22));
      }
      data.details.push(hoop);
    }

    // Majestic Expansive Wings
    const leftWingSpar = [
      vec(-0.2, 0.25, 0.1),
      vec(-0.8, 0.9, 0.5),
      vec(-1.8, 1.4, 0.9),
      vec(-2.8, 1.7, 1.1)
    ];
    data.contours.push(leftWingSpar);

    const leftFeathers = [
      [vec(-2.8, 1.7, 1.1), vec(-3.3, 1.5, 1.0)],
      [vec(-2.6, 1.6, 1.0), vec(-3.1, 1.2, 0.9)],
      [vec(-2.3, 1.4, 0.9), vec(-2.8, 0.9, 0.8)],
      [vec(-1.9, 1.3, 0.8), vec(-2.4, 0.6, 0.7)],
      [vec(-1.5, 1.1, 0.65), vec(-2.0, 0.4, 0.55)],
      [vec(-1.1, 0.9, 0.5), vec(-1.6, 0.2, 0.4)],
      [vec(-0.7, 0.6, 0.35), vec(-1.2, 0.0, 0.25)]
    ];
    leftFeathers.forEach(f => data.contours.push(f));

    const rightWingSpar = [
      vec(-0.2, 0.25, -0.1),
      vec(-0.8, 1.0, -0.5),
      vec(-1.7, 1.5, -0.85),
      vec(-2.6, 1.8, -1.05)
    ];
    data.contours.push(rightWingSpar);

    const rightFeathers = [
      [vec(-2.6, 1.8, -1.05), vec(-3.1, 1.6, -1.0)],
      [vec(-2.4, 1.6, -0.95), vec(-2.9, 1.3, -0.9)],
      [vec(-2.1, 1.4, -0.85), vec(-2.6, 1.0, -0.75)],
      [vec(-1.8, 1.3, -0.75), vec(-2.2, 0.7, -0.65)],
      [vec(-1.4, 1.1, -0.6), vec(-1.8, 0.4, -0.5)],
      [vec(-1.0, 0.9, -0.45), vec(-1.4, 0.2, -0.35)],
      [vec(-0.6, 0.6, -0.3), vec(-1.0, 0.0, -0.2)]
    ];
    rightFeathers.forEach(f => data.contours.push(f));

    // Secondary tail plumes
    const tailPlumes = [
      [vec(-1.0, 0.1, 0.0), vec(-1.5, -0.2, 0.1), vec(-2.0, -0.4, 0.15)],
      [vec(-1.0, 0.1, 0.0), vec(-1.6, -0.3, 0.0), vec(-2.1, -0.6, 0.0)],
      [vec(-1.0, 0.1, 0.0), vec(-1.5, -0.2, -0.1), vec(-1.9, -0.5, -0.12)]
    ];
    tailPlumes.forEach(tp => data.contours.push(tp));

    // Trailing Stilt Legs
    const leg1 = [
      vec(-0.6, -0.1, 0.08),
      vec(-1.4, -0.9, 0.15),
      vec(-2.3, -1.8, 0.22),
      vec(-2.8, -2.4, 0.28)
    ];
    const toe1 = [vec(-2.8, -2.4, 0.28), vec(-3.0, -2.55, 0.32)];
    const toe2 = [vec(-2.8, -2.4, 0.28), vec(-2.9, -2.6, 0.24)];
    data.contours.push(leg1, toe1, toe2);

    const leg2 = [
      vec(-0.6, -0.1, -0.08),
      vec(-1.3, -1.0, -0.12),
      vec(-2.1, -1.9, -0.18),
      vec(-2.6, -2.5, -0.22)
    ];
    const toe3 = [vec(-2.6, -2.5, -0.22), vec(-2.8, -2.65, -0.18)];
    const toe4 = [vec(-2.6, -2.5, -0.22), vec(-2.7, -2.7, -0.26)];
    data.contours.push(leg2, toe3, toe4);

    data.guides.push([vec(2.0, 2.4, 0.0), vec(-3.5, 2.4, 0.0)]);
    data.guides.push([vec(1.0, 0.8, 0.3), vec(-3.8, 0.8, 0.3)]);
    data.guides.push([vec(0.5, -1.2, -0.2), vec(-3.6, -1.2, -0.2)]);

    return data;
  }

  /** STUDY 14: WIND-BLOWN BAMBOO (Take - 竹) */
  function buildBambooData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };

    const stalks = [
      {
        base: vec(-0.6, -2.7, 0.0),
        pts: [vec(-0.6, -2.7, 0.0), vec(-0.5, -1.6, 0.1), vec(-0.2, -0.5, 0.15), vec(0.3, 0.6, 0.1), vec(1.0, 1.7, 0.0), vec(1.8, 2.6, -0.1)],
        nodeCount: 5,
        leafScale: 1.0
      },
      {
        base: vec(-1.3, -2.7, -0.25),
        pts: [vec(-1.3, -2.7, -0.25), vec(-1.1, -1.5, -0.2), vec(-0.7, -0.4, -0.15), vec(-0.1, 0.7, -0.1), vec(0.6, 1.8, -0.15), vec(1.4, 2.7, -0.2)],
        nodeCount: 5,
        leafScale: 0.85
      },
      {
        base: vec(0.2, -2.7, 0.25),
        pts: [vec(0.2, -2.7, 0.25), vec(0.4, -1.7, 0.3), vec(0.8, -0.6, 0.35), vec(1.4, 0.4, 0.3), vec(2.1, 1.3, 0.2), vec(2.7, 1.9, 0.1)],
        nodeCount: 4,
        leafScale: 0.75
      }
    ];

    stalks.forEach((stalk, sIdx) => {
      data.contours.push(stalk.pts);

      const thickPts = stalk.pts.map(p => vec(p.x + (sIdx === 0 ? 0.07 : 0.05), p.y, p.z + 0.04));
      data.contours.push(thickPts);

      for (let n = 1; n <= stalk.nodeCount; n++) {
        const t = n / (stalk.nodeCount + 1);
        const ny = -2.7 + t * 5.0;
        const nx = stalk.pts[0].x + (stalk.pts[stalk.pts.length - 1].x - stalk.pts[0].x) * Math.pow(t, 1.4);
        const nz = stalk.pts[0].z + (stalk.pts[stalk.pts.length - 1].z - stalk.pts[0].z) * t;

        const ring1 = [
          vec(nx - 0.14, ny, nz - 0.08),
          vec(nx + 0.14, ny + 0.02, nz + 0.08),
          vec(nx + 0.14, ny + 0.06, nz + 0.08),
          vec(nx - 0.14, ny + 0.04, nz - 0.08),
          vec(nx - 0.14, ny, nz - 0.08)
        ];
        data.details.push(ring1);

        const twig1 = [
          vec(nx, ny + 0.05, nz),
          vec(nx + 0.4 * stalk.leafScale, ny + 0.25, nz + 0.15),
          vec(nx + 0.7 * stalk.leafScale, ny + 0.2, nz + 0.2)
        ];
        data.contours.push(twig1);

        const leafAngles = [0.1, -0.25, 0.35];
        leafAngles.forEach((la, lIdx) => {
          const lx = nx + (0.5 + lIdx * 0.18) * stalk.leafScale;
          const ly = ny + (0.2 + lIdx * 0.05);
          const lz = nz + 0.15 + (lIdx - 1) * 0.08;
          const bladeLen = (0.75 + lIdx * 0.15) * stalk.leafScale;

          const leafTop = [
            vec(lx, ly, lz),
            vec(lx + bladeLen * 0.5, ly + la * 0.4 + 0.06, lz + 0.04),
            vec(lx + bladeLen, ly + la * 0.8, lz + 0.02)
          ];
          const leafBtm = [
            vec(lx, ly, lz),
            vec(lx + bladeLen * 0.5, ly + la * 0.4 - 0.06, lz - 0.02),
            vec(lx + bladeLen, ly + la * 0.8, lz + 0.02)
          ];
          data.details.push(leafTop, leafBtm);

          data.hatches.push([
            vec(lx, ly, lz),
            vec(lx + bladeLen, ly + la * 0.8, lz + 0.02)
          ]);
        });
      }
    });

    for (let wy = -1.5; wy <= 2.2; wy += 0.9) {
      data.guides.push([
        vec(-2.8, wy - 0.2, 0.2),
        vec(-0.5, wy + 0.1, 0.1),
        vec(2.8, wy + 0.4, -0.1)
      ]);
    }

    return data;
  }

  /** STUDY 15: CHERRY BLOSSOM BRANCH (Sakura - 桜) */
  function buildSakuraData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };

    const mainBranch = [
      vec(-2.8, -1.2, 0.1),
      vec(-1.9, -0.5, -0.1),
      vec(-1.2, -0.6, 0.2),
      vec(-0.3, 0.1, 0.1),
      vec(0.6, 0.0, -0.15),
      vec(1.4, 0.7, 0.05),
      vec(2.3, 1.3, 0.2)
    ];
    data.contours.push(mainBranch);

    const barkThick = [
      vec(-2.8, -1.35, 0.15),
      vec(-1.9, -0.65, -0.05),
      vec(-1.2, -0.72, 0.25),
      vec(-0.3, -0.02, 0.15),
      vec(0.6, -0.12, -0.1),
      vec(1.4, 0.58, 0.1),
      vec(2.3, 1.22, 0.25)
    ];
    data.contours.push(barkThick);

    for (let i = 0; i < mainBranch.length - 1; i++) {
      data.hatches.push([mainBranch[i], barkThick[i]]);
    }

    const twigs = [
      [vec(-1.9, -0.5, -0.1), vec(-2.2, 0.3, -0.2), vec(-2.4, 0.8, -0.15)],
      [vec(-0.3, 0.1, 0.1), vec(-0.5, 0.9, 0.3), vec(-0.3, 1.5, 0.35)],
      [vec(0.6, 0.0, -0.15), vec(0.9, -0.7, -0.3), vec(1.3, -1.2, -0.25)],
      [vec(1.4, 0.7, 0.05), vec(1.2, 1.5, 0.2), vec(0.9, 2.1, 0.25)],
      [vec(2.3, 1.3, 0.2), vec(2.7, 1.8, 0.3)]
    ];
    twigs.forEach(t => data.contours.push(t));

    function addSakuraFlower(cx, cy, cz, radius, rotAngle, tiltX) {
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2 + rotAngle;
        const petalLen = radius;
        const petalWidth = radius * 0.42;

        const tipX = cx + Math.cos(a) * petalLen;
        const tipY = cy + Math.sin(a) * petalLen;
        const tipZ = cz + Math.sin(a) * (tiltX || 0);

        const leftX = cx + Math.cos(a - 0.28) * (petalLen * 0.7);
        const leftY = cy + Math.sin(a - 0.28) * (petalLen * 0.7);
        const rightX = cx + Math.cos(a + 0.28) * (petalLen * 0.7);
        const rightY = cy + Math.sin(a + 0.28) * (petalLen * 0.7);

        const petalLoop = [
          vec(cx, cy, cz),
          vec(leftX, leftY, tipZ * 0.7),
          vec(tipX - Math.sin(a) * (petalWidth * 0.2), tipY + Math.cos(a) * (petalWidth * 0.2), tipZ),
          vec(tipX, tipY, tipZ),
          vec(tipX + Math.sin(a) * (petalWidth * 0.2), tipY - Math.cos(a) * (petalWidth * 0.2), tipZ),
          vec(rightX, rightY, tipZ * 0.7),
          vec(cx, cy, cz)
        ];
        data.details.push(petalLoop);

        const stamenTip = vec(cx + Math.cos(a) * (petalLen * 0.45), cy + Math.sin(a) * (petalLen * 0.45), cz);
        data.hatches.push([vec(cx, cy, cz), stamenTip]);
      }

      data.details.push([
        vec(cx - 0.04, cy, cz),
        vec(cx + 0.04, cy, cz),
        vec(cx, cy + 0.04, cz + 0.03),
        vec(cx - 0.04, cy, cz)
      ]);
    }

    addSakuraFlower(-2.4, 0.8, -0.15, 0.48, 0.2, 0.1);
    addSakuraFlower(-1.4, -0.2, 0.1, 0.52, 0.5, -0.1);
    addSakuraFlower(-0.3, 1.5, 0.35, 0.46, 0.1, 0.2);
    addSakuraFlower(0.1, 0.3, 0.2, 0.55, 0.8, 0.0);
    addSakuraFlower(1.3, -1.2, -0.25, 0.45, 0.4, -0.2);
    addSakuraFlower(0.9, 2.1, 0.25, 0.5, 0.6, 0.15);
    addSakuraFlower(2.7, 1.8, 0.3, 0.42, 0.9, 0.05);

    const bud1 = [vec(-2.5, 1.0, -0.15), vec(-2.6, 1.15, -0.18), vec(-2.55, 1.25, -0.15)];
    const bud2 = [vec(1.4, -1.4, -0.25), vec(1.45, -1.55, -0.28)];
    data.contours.push(bud1, bud2);

    const fallingPetals = [
      vec(-1.8, -1.4, 0.3),
      vec(-0.8, -1.8, 0.5),
      vec(0.4, -1.9, 0.2),
      vec(1.6, -2.2, 0.4),
      vec(2.2, -0.6, 0.6),
      vec(-0.2, -2.5, 0.1)
    ];
    fallingPetals.forEach((fp, idx) => {
      const a = idx * 1.1;
      const pet = [
        vec(fp.x, fp.y, fp.z),
        vec(fp.x + 0.12 * Math.cos(a), fp.y + 0.14 * Math.sin(a), fp.z + 0.06),
        vec(fp.x + 0.24 * Math.cos(a), fp.y + 0.05 * Math.sin(a), fp.z + 0.02),
        vec(fp.x + 0.12 * Math.cos(a + 0.8), fp.y - 0.08 * Math.sin(a), fp.z - 0.04),
        vec(fp.x, fp.y, fp.z)
      ];
      data.details.push(pet);
    });

    data.guides.push([vec(-3.0, 1.0, -0.2), vec(0.0, 0.2, 0.1), vec(3.0, -0.6, 0.4)]);
    data.guides.push([vec(-2.5, -0.8, 0.0), vec(0.5, -1.6, 0.3), vec(3.0, -2.4, 0.5)]);

    return data;
  }

  /** STUDY 16: FIVE-TIERED ZEN PAGODA (Goju-no-To - 塔) */
  function buildPagodaData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };

    const baseWidths = [2.4, 2.1, 1.8];
    baseWidths.forEach((w, bIdx) => {
      const by = -2.6 + bIdx * 0.15;
      const baseBox = [
        vec(-w, by, -w * 0.7),
        vec(w, by, -w * 0.7),
        vec(w, by, w * 0.7),
        vec(-w, by, w * 0.7),
        vec(-w, by, -w * 0.7)
      ];
      data.contours.push(baseBox);
    });

    const tierParams = [
      { y: -2.15, roofW: 2.2, roofH: 0.35, bodyW: 1.2, bodyH: 0.5 },
      { y: -1.45, roofW: 1.9, roofH: 0.32, bodyW: 1.05, bodyH: 0.46 },
      { y: -0.80, roofW: 1.65, roofH: 0.30, bodyW: 0.9, bodyH: 0.42 },
      { y: -0.20, roofW: 1.45, roofH: 0.28, bodyW: 0.8, bodyH: 0.38 },
      { y: 0.35, roofW: 1.25, roofH: 0.26, bodyW: 0.7, bodyH: 0.35 }
    ];

    tierParams.forEach((t) => {
      const bw = t.bodyW;
      const bh = t.bodyH;
      const bY = t.y;

      const rail = [
        vec(-bw, bY + 0.1, -bw * 0.7),
        vec(bw, bY + 0.1, -bw * 0.7),
        vec(bw, bY + 0.1, bw * 0.7),
        vec(-bw, bY + 0.1, bw * 0.7),
        vec(-bw, bY + 0.1, -bw * 0.7)
      ];
      data.details.push(rail);

      data.contours.push([vec(-bw, bY, -bw * 0.7), vec(-bw, bY + bh, -bw * 0.7)]);
      data.contours.push([vec(bw, bY, -bw * 0.7), vec(bw, bY + bh, -bw * 0.7)]);
      data.contours.push([vec(bw, bY, bw * 0.7), vec(bw, bY + bh, bw * 0.7)]);
      data.contours.push([vec(-bw, bY, bw * 0.7), vec(-bw, bY + bh, bw * 0.7)]);

      data.hatches.push([vec(-bw * 0.4, bY, bw * 0.7), vec(-bw * 0.4, bY + bh, bw * 0.7)]);
      data.hatches.push([vec(bw * 0.4, bY, bw * 0.7), vec(bw * 0.4, bY + bh, bw * 0.7)]);

      const rw = t.roofW;
      const ry = bY + bh;
      const soriUp = 0.12;

      const frontEave = [
        vec(-rw, ry + soriUp, rw * 0.7),
        vec(-rw * 0.5, ry, rw * 0.7),
        vec(0.0, ry - 0.02, rw * 0.7),
        vec(rw * 0.5, ry, rw * 0.7),
        vec(rw, ry + soriUp, rw * 0.7)
      ];
      const backEave = [
        vec(-rw, ry + soriUp, -rw * 0.7),
        vec(-rw * 0.5, ry, -rw * 0.7),
        vec(0.0, ry - 0.02, -rw * 0.7),
        vec(rw * 0.5, ry, -rw * 0.7),
        vec(rw, ry + soriUp, -rw * 0.7)
      ];
      const leftEave = [
        vec(-rw, ry + soriUp, -rw * 0.7),
        vec(-rw, ry, 0.0),
        vec(-rw, ry + soriUp, rw * 0.7)
      ];
      const rightEave = [
        vec(rw, ry + soriUp, -rw * 0.7),
        vec(rw, ry, 0.0),
        vec(rw, ry + soriUp, rw * 0.7)
      ];
      data.contours.push(frontEave, backEave, leftEave, rightEave);

      const topW = bw * 0.7;
      const topY = ry + t.roofH;
      data.details.push([vec(-rw, ry + soriUp, rw * 0.7), vec(-topW, topY, topW * 0.7)]);
      data.details.push([vec(rw, ry + soriUp, rw * 0.7), vec(topW, topY, topW * 0.7)]);
      data.details.push([vec(-rw, ry + soriUp, -rw * 0.7), vec(-topW, topY, -topW * 0.7)]);
      data.details.push([vec(rw, ry + soriUp, -rw * 0.7), vec(topW, topY, -topW * 0.7)]);

      const bell1 = [vec(-rw, ry + soriUp, rw * 0.7), vec(-rw, ry + soriUp - 0.1, rw * 0.7)];
      const bell2 = [vec(rw, ry + soriUp, rw * 0.7), vec(rw, ry + soriUp - 0.1, rw * 0.7)];
      data.details.push(bell1, bell2);
    });

    const sorinBaseY = 0.95;
    const sorinTopY = 2.85;

    data.contours.push([vec(0, sorinBaseY, 0), vec(0, sorinTopY, 0)]);

    for (let r = 0; r < 9; r++) {
      const ringY = sorinBaseY + 0.35 + r * 0.11;
      const ringW = 0.22 - r * 0.008;
      const ring = [];
      for (let i = 0; i <= 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        ring.push(vec(Math.cos(a) * ringW, ringY, Math.sin(a) * ringW * 0.7));
      }
      data.details.push(ring);
    }

    const flameLeft = [vec(0, 2.38, 0), vec(-0.25, 2.52, 0.05), vec(0, 2.68, 0)];
    const flameRight = [vec(0, 2.38, 0), vec(0.25, 2.52, -0.05), vec(0, 2.68, 0)];
    data.contours.push(flameLeft, flameRight);

    const hoshu = [];
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      hoshu.push(vec(Math.cos(a) * 0.08, 2.76 + Math.sin(a) * 0.08, Math.sin(a) * 0.06));
    }
    data.contours.push(hoshu);

    data.guides.push([vec(0, -2.8, 0), vec(0, 3.2, 0)]);

    return data;
  }

  /** STUDY 17: THE GREAT WAVE (Oki-nami - 波) */
  function buildGreatWaveData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };

    const mainWaveRidge = [
      vec(2.8, -2.2, -0.2),
      vec(2.2, -1.8, 0.0),
      vec(1.4, -1.2, 0.3),
      vec(0.5, -0.4, 0.45),
      vec(-0.6, 0.6, 0.4),
      vec(-1.5, 1.6, 0.25),
      vec(-1.9, 2.1, 0.1),
      vec(-1.7, 2.3, -0.1),
      vec(-1.1, 2.0, -0.2),
      vec(-0.6, 1.4, -0.15)
    ];
    data.contours.push(mainWaveRidge);

    const barrelRibs = [
      [vec(1.2, -1.8, 0.1), vec(0.4, -0.8, 0.1), vec(-0.5, 0.2, 0.0), vec(-1.2, 1.2, -0.1), vec(-0.7, 1.4, -0.15)],
      [vec(0.6, -2.0, -0.1), vec(-0.2, -1.0, -0.1), vec(-0.9, 0.0, -0.2), vec(-1.4, 0.8, -0.25)],
      [vec(-0.2, -2.1, -0.3), vec(-0.8, -1.2, -0.3), vec(-1.3, -0.3, -0.35)]
    ];
    barrelRibs.forEach(r => data.details.push(r));

    const claws = [
      [vec(-1.7, 2.3, -0.1), vec(-1.4, 2.5, 0.0), vec(-1.0, 2.3, 0.1)],
      [vec(-1.5, 2.2, 0.0), vec(-1.1, 2.4, 0.15), vec(-0.7, 2.1, 0.2)],
      [vec(-1.3, 2.0, 0.1), vec(-0.8, 2.2, 0.25), vec(-0.4, 1.8, 0.3)],
      [vec(-1.1, 1.8, 0.15), vec(-0.6, 1.9, 0.3), vec(-0.2, 1.5, 0.35)],
      [vec(-0.9, 1.5, 0.1), vec(-0.4, 1.6, 0.2), vec(-0.1, 1.2, 0.2)],
      [vec(-1.8, 2.0, 0.2), vec(-1.6, 2.3, 0.3), vec(-1.3, 2.1, 0.35)]
    ];
    claws.forEach(c => data.contours.push(c));

    const sprayDrops = [
      vec(-1.2, 2.6, 0.15), vec(-0.8, 2.5, 0.3), vec(-0.4, 2.2, 0.4),
      vec(-0.1, 1.9, 0.45), vec(0.2, 1.6, 0.35), vec(-1.8, 2.5, 0.1),
      vec(-0.5, 2.6, 0.25), vec(0.3, 1.2, 0.2), vec(-2.1, 2.2, -0.2),
      vec(-1.5, 2.7, 0.0), vec(-0.9, 2.7, 0.2), vec(-0.2, 2.3, 0.3)
    ];
    sprayDrops.forEach((sd) => {
      data.details.push([
        vec(sd.x, sd.y, sd.z),
        vec(sd.x + 0.04, sd.y + 0.04, sd.z + 0.02),
        vec(sd.x + 0.04, sd.y - 0.04, sd.z - 0.02),
        vec(sd.x, sd.y, sd.z)
      ]);
    });

    const swell1 = [
      vec(-2.8, -2.4, 0.4),
      vec(-1.8, -2.0, 0.5),
      vec(-0.6, -2.2, 0.45),
      vec(0.8, -1.9, 0.35),
      vec(2.2, -2.3, 0.2)
    ];
    const swell2 = [
      vec(-2.8, -2.6, 0.2),
      vec(-1.5, -2.2, 0.3),
      vec(0.0, -2.5, 0.25),
      vec(1.6, -2.1, 0.15),
      vec(2.8, -2.5, 0.0)
    ];
    data.contours.push(swell1, swell2);

    for (let x = -2.4; x <= 2.2; x += 0.35) {
      data.hatches.push([
        vec(x, -2.3 + Math.sin(x * 3) * 0.15, 0.3),
        vec(x + 0.25, -2.1 + Math.sin(x * 3) * 0.15, 0.35)
      ]);
    }

    // Sacred Mount Fuji framed in the hollow background trough
    const fujiBaseL = vec(-0.9, -1.1, -1.2);
    const fujiPeakL = vec(-0.25, -0.3, -1.2);
    const fujiPeakR = vec(0.05, -0.3, -1.2);
    const fujiBaseR = vec(0.7, -1.1, -1.2);

    data.contours.push([fujiBaseL, fujiPeakL, fujiPeakR, fujiBaseR]);

    const fujiSnow = [
      vec(-0.45, -0.55, -1.2),
      vec(-0.35, -0.62, -1.2),
      vec(-0.1, -0.5, -1.2),
      vec(0.15, -0.6, -1.2),
      vec(0.3, -0.55, -1.2)
    ];
    data.details.push(fujiSnow);

    data.guides.push([vec(2.8, -2.2, 0.0), vec(0.0, 0.0, 0.0), vec(-1.7, 2.3, 0.0)]);

    return data;
  }

  /** STUDY 18: ZEN ENSŌ CIRCLE & MOON (Ensō - 円) */
  function buildEnsoData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };

    const ensoPoints1 = [];
    const ensoPoints2 = [];
    const ensoPoints3 = [];

    const totalSteps = 42;
    const startAngle = 1.1;
    const sweepRange = Math.PI * 2 * 0.88;

    for (let i = 0; i <= totalSteps; i++) {
      const t = i / totalSteps;
      const angle = startAngle + t * sweepRange;

      const baseR = 2.1;
      const thickness = Math.sin(t * Math.PI) * 0.18 + 0.04;
      const zOffset = Math.sin(t * Math.PI * 2) * 0.15;

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      ensoPoints1.push(vec(cosA * (baseR - thickness), sinA * (baseR - thickness), zOffset));
      ensoPoints2.push(vec(cosA * baseR, sinA * baseR, zOffset * 0.8));
      ensoPoints3.push(vec(cosA * (baseR + thickness), sinA * (baseR + thickness), zOffset * 0.6));
    }

    data.contours.push(ensoPoints1, ensoPoints2, ensoPoints3);

    for (let k = 0; k < 8; k++) {
      const t = 0.82 + (k / 8) * 0.16;
      const a = startAngle + t * sweepRange;
      const p1 = vec(Math.cos(a) * (2.1 - 0.15 + k * 0.04), Math.sin(a) * (2.1 - 0.15 + k * 0.04), 0.0);
      const p2 = vec(Math.cos(a + 0.08) * (2.1 - 0.12 + k * 0.035), Math.sin(a + 0.08) * (2.1 - 0.12 + k * 0.035), 0.02);
      data.hatches.push([p1, p2]);
    }

    const moonCenterX = -0.3;
    const moonCenterY = 0.45;
    const moonRadius = 0.65;

    const moonOuter = [];
    for (let a = -Math.PI * 0.45; a <= Math.PI * 0.45; a += 0.15) {
      moonOuter.push(vec(
        moonCenterX + Math.cos(a) * moonRadius,
        moonCenterY + Math.sin(a) * moonRadius,
        0.05
      ));
    }
    const moonInner = [];
    for (let a = Math.PI * 0.45; a >= -Math.PI * 0.45; a -= 0.15) {
      moonInner.push(vec(
        moonCenterX + 0.22 + Math.cos(a) * (moonRadius * 0.8),
        moonCenterY + Math.sin(a) * (moonRadius * 0.8),
        0.05
      ));
    }
    data.contours.push(moonOuter, moonInner);

    const horizon1 = [vec(-2.5, -2.6, 0.0), vec(2.5, -2.6, 0.0)];
    const horizon2 = [vec(-1.8, -2.75, 0.0), vec(1.8, -2.75, 0.0)];
    data.details.push(horizon1, horizon2);

    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      data.guides.push([
        vec(Math.cos(a) * 0.4, Math.sin(a) * 0.4, 0.0),
        vec(Math.cos(a) * 2.8, Math.sin(a) * 2.8, 0.0)
      ]);
    }

    return data;
  }

  /** STUDY 19: CLOUD DRAGON (Ryu - 龍) */
  function buildDragonData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };

    const spine = [
      vec(-2.4, -2.2, -0.4),
      vec(-1.8, -1.6, -0.1),
      vec(-1.2, -1.8, 0.4),
      vec(-0.4, -1.2, 0.6),
      vec(0.6, -0.8, 0.2),
      vec(1.4, -0.2, -0.3),
      vec(1.6, 0.7, -0.4),
      vec(0.8, 1.4, 0.1),
      vec(-0.2, 1.2, 0.6),
      vec(-0.8, 1.6, 0.4),
      vec(-1.2, 2.0, 0.1)
    ];
    data.contours.push(spine);

    const flank1 = spine.map((p, i) => vec(p.x + 0.15 * Math.cos(i * 0.6), p.y - 0.15, p.z + 0.15 * Math.sin(i * 0.6)));
    const flank2 = spine.map((p, i) => vec(p.x - 0.15 * Math.cos(i * 0.6), p.y + 0.15, p.z - 0.15 * Math.sin(i * 0.6)));
    data.contours.push(flank1, flank2);

    for (let i = 1; i < spine.length - 1; i++) {
      const p = spine[i];
      const finTip = vec(p.x, p.y + 0.35, p.z + 0.15);
      data.details.push([p, finTip]);
      data.hatches.push([p, vec(p.x + 0.1, p.y + 0.25, p.z)]);
    }

    const headBase = vec(-1.2, 2.0, 0.1);
    const snout = vec(-2.2, 2.1, 0.0);
    const jawBtm = vec(-2.0, 1.7, 0.05);

    const upperHead = [headBase, vec(-1.6, 2.3, 0.1), snout];
    const lowerJaw = [vec(-1.3, 1.9, 0.08), jawBtm];
    data.contours.push(upperHead, lowerJaw);

    data.details.push([vec(-2.0, 2.1, 0.02), vec(-2.0, 1.9, 0.02)]);
    data.details.push([vec(-1.8, 2.15, 0.02), vec(-1.8, 1.95, 0.02)]);

    const leftHorn = [
      vec(-1.4, 2.25, 0.15),
      vec(-1.2, 2.8, 0.3),
      vec(-0.9, 3.1, 0.25)
    ];
    const leftHornTine = [vec(-1.2, 2.8, 0.3), vec(-1.5, 3.0, 0.35)];
    data.contours.push(leftHorn, leftHornTine);

    const rightHorn = [
      vec(-1.4, 2.25, -0.05),
      vec(-1.3, 2.75, -0.2),
      vec(-1.0, 3.05, -0.25)
    ];
    data.contours.push(rightHorn);

    const whisker1 = [
      vec(-2.1, 2.1, 0.05),
      vec(-2.6, 1.8, 0.3),
      vec(-2.9, 1.3, 0.5),
      vec(-2.7, 0.7, 0.4)
    ];
    const whisker2 = [
      vec(-2.1, 2.1, -0.05),
      vec(-2.5, 2.3, -0.2),
      vec(-2.8, 2.5, -0.3)
    ];
    data.contours.push(whisker1, whisker2);

    const clawBase = vec(0.6, -0.8, 0.2);
    const talonArm = [clawBase, vec(1.2, -0.9, 0.5), vec(1.5, -0.6, 0.6)];
    data.contours.push(talonArm);

    const talons = [
      [vec(1.5, -0.6, 0.6), vec(1.8, -0.5, 0.7)],
      [vec(1.5, -0.6, 0.6), vec(1.7, -0.7, 0.8)],
      [vec(1.5, -0.6, 0.6), vec(1.6, -0.9, 0.65)],
      [vec(1.5, -0.6, 0.6), vec(1.3, -0.8, 0.5)]
    ];
    talons.forEach(t => data.contours.push(t));

    function addCloudScroll(cx, cy, cz, radius) {
      const scroll = [];
      for (let i = 0; i <= 20; i++) {
        const a = (i / 20) * Math.PI * 3.2;
        const r = (i / 20) * radius;
        scroll.push(vec(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.7, cz + Math.sin(a * 2) * 0.1));
      }
      data.details.push(scroll);
    }

    addCloudScroll(-1.5, -0.6, 0.4, 0.7);
    addCloudScroll(1.0, 0.5, -0.2, 0.85);
    addCloudScroll(-0.6, 1.8, 0.5, 0.6);
    addCloudScroll(2.0, -1.2, 0.1, 0.65);

    data.guides.push([vec(-2.8, 2.5, 0.0), vec(2.8, -2.5, 0.0)]);

    return data;
  }

  /** STUDY 20: MOUNT FUJI & MIST (Fuji-san - 富士) */
  function buildFujiData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };

    const leftSlope = [
      vec(-3.4, -2.0, 0.1),
      vec(-2.5, -1.6, 0.05),
      vec(-1.7, -0.9, 0.0),
      vec(-1.1, 0.0, -0.05),
      vec(-0.65, 1.1, -0.08),
      vec(-0.45, 1.8, -0.1)
    ];
    const craterSummit = [
      vec(-0.45, 1.8, -0.1),
      vec(-0.25, 1.76, -0.15),
      vec(0.0, 1.74, -0.18),
      vec(0.25, 1.76, -0.15),
      vec(0.45, 1.8, -0.1)
    ];
    const rightSlope = [
      vec(0.45, 1.8, -0.1),
      vec(0.65, 1.1, -0.08),
      vec(1.1, 0.0, -0.05),
      vec(1.7, -0.9, 0.0),
      vec(2.5, -1.6, 0.05),
      vec(3.4, -2.0, 0.1)
    ];
    data.contours.push(leftSlope, craterSummit, rightSlope);

    const craterRing = [];
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      craterRing.push(vec(Math.cos(a) * 0.45, 1.8 + Math.sin(a) * 0.08, Math.sin(a) * 0.2 - 0.1));
    }
    data.contours.push(craterRing);

    const snowLine = [
      vec(-1.0, 0.2, 0.0),
      vec(-0.85, 0.4, 0.0),
      vec(-0.7, 0.15, 0.0),
      vec(-0.5, 0.35, 0.0),
      vec(-0.35, 0.1, 0.0),
      vec(-0.2, 0.4, 0.0),
      vec(0.0, 0.18, 0.0),
      vec(0.2, 0.38, 0.0),
      vec(0.35, 0.12, 0.0),
      vec(0.5, 0.32, 0.0),
      vec(0.7, 0.1, 0.0),
      vec(0.85, 0.35, 0.0),
      vec(1.0, 0.2, 0.0)
    ];
    data.contours.push(snowLine);

    const gullyXOffsets = [-0.35, -0.2, -0.05, 0.1, 0.25, 0.35];
    gullyXOffsets.forEach(gx => {
      const gully = [
        vec(gx, 1.75, -0.1),
        vec(gx * 1.5, 1.0, -0.05),
        vec(gx * 2.1, 0.25, 0.0)
      ];
      data.details.push(gully);
      data.hatches.push([vec(gx * 1.5, 1.0, -0.05), vec(gx * 1.5 + 0.06, 0.85, -0.05)]);
    });

    function addMistBand(y, xStart, xEnd, z, thickness) {
      const topBand = [
        vec(xStart, y, z),
        vec(xStart + 0.4, y + thickness, z),
        vec(xEnd - 0.4, y + thickness, z),
        vec(xEnd, y, z)
      ];
      const btmBand = [
        vec(xStart, y, z),
        vec(xStart + 0.4, y - thickness, z),
        vec(xEnd - 0.4, y - thickness, z),
        vec(xEnd, y, z)
      ];
      data.details.push(topBand, btmBand);

      const leftCap = [vec(xStart, y, z), vec(xStart - 0.25, y, z), vec(xStart, y + thickness, z)];
      const rightCap = [vec(xEnd, y, z), vec(xEnd + 0.25, y, z), vec(xEnd, y + thickness, z)];
      data.details.push(leftCap, rightCap);
    }

    addMistBand(-0.6, -2.6, 0.2, 0.25, 0.12);
    addMistBand(-1.2, -0.4, 2.8, 0.28, 0.14);
    addMistBand(-1.8, -3.2, 3.2, 0.32, 0.15);

    const shoreY = -2.2;
    const shoreLine = [vec(-3.6, shoreY, 0.3), vec(3.6, shoreY, 0.3)];
    const shoreReflect = [vec(-3.0, shoreY - 0.15, 0.25), vec(3.0, shoreY - 0.15, 0.25)];
    data.contours.push(shoreLine);
    data.details.push(shoreReflect);

    const pineLocations = [-2.2, -1.6, 1.4, 2.0];
    pineLocations.forEach(px => {
      data.details.push([vec(px, shoreY, 0.3), vec(px, shoreY + 0.35, 0.3)]);
      data.details.push([vec(px - 0.15, shoreY + 0.25, 0.3), vec(px, shoreY + 0.45, 0.3), vec(px + 0.15, shoreY + 0.25, 0.3)]);
    });

    const sunRing = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      sunRing.push(vec(Math.cos(a) * 0.95, 2.1 + Math.sin(a) * 0.95, -0.6));
    }
    data.details.push(sunRing);

    data.guides.push([vec(0, -2.5, 0), vec(0, 3.2, 0)]);
    for (let a = 0; a < Math.PI; a += Math.PI / 6) {
      data.guides.push([
        vec(Math.cos(a) * 1.1, 2.1 + Math.sin(a) * 1.1, -0.6),
        vec(Math.cos(a) * 2.2, 2.1 + Math.sin(a) * 2.2, -0.6)
      ]);
    }

    return data;
  }

  // ==========================================================================
  // VOLUME III: SACRED JAPANESE TEMPLE & PAGODA ARCHITECTURE (STUDIES 21 - 30)
  // ==========================================================================

  /** STUDY 21: THREE-TIERED MOUNTAIN PAGODA (Sanju-no-To - 三重塔) */
  function buildSanjuNoToData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };

    // Stone podium foundation
    const baseWidths = [2.4, 2.1, 1.8];
    baseWidths.forEach((w, bIdx) => {
      const by = -2.6 + bIdx * 0.16;
      data.contours.push([
        vec(-w, by, -w * 0.75), vec(w, by, -w * 0.75), vec(w, by, w * 0.75), vec(-w, by, w * 0.75), vec(-w, by, -w * 0.75)
      ]);
    });

    const tierParams = [
      { y: -2.12, roofW: 2.50, roofH: 0.42, bodyW: 1.35, bodyH: 0.58 },
      { y: -1.20, roofW: 2.15, roofH: 0.38, bodyW: 1.10, bodyH: 0.52 },
      { y: -0.36, roofW: 1.80, roofH: 0.34, bodyW: 0.88, bodyH: 0.46 }
    ];

    tierParams.forEach((t) => {
      const bw = t.bodyW, bh = t.bodyH, bY = t.y;
      const bd = bw * 0.75;

      // Balustrade railing
      data.details.push([
        vec(-bw * 1.05, bY + 0.12, -bd * 1.05), vec(bw * 1.05, bY + 0.12, -bd * 1.05),
        vec(bw * 1.05, bY + 0.12, bd * 1.05), vec(-bw * 1.05, bY + 0.12, bd * 1.05),
        vec(-bw * 1.05, bY + 0.12, -bd * 1.05)
      ]);

      // 4 Pillars
      data.contours.push([vec(-bw, bY, -bd), vec(-bw, bY + bh, -bd)]);
      data.contours.push([vec(bw, bY, -bd), vec(bw, bY + bh, -bd)]);
      data.contours.push([vec(bw, bY, bd), vec(bw, bY + bh, bd)]);
      data.contours.push([vec(-bw, bY, bd), vec(-bw, bY + bh, bd)]);

      // Shoji door lattice
      data.hatches.push([vec(-bw * 0.35, bY, bd), vec(-bw * 0.35, bY + bh, bd)]);
      data.hatches.push([vec(bw * 0.35, bY, bd), vec(bw * 0.35, bY + bh, bd)]);

      // Swept eaves
      const rw = t.roofW, ry = bY + bh, soriUp = 0.14;
      const rd = rw * 0.75;
      data.contours.push([
        vec(-rw, ry + soriUp, rd), vec(-rw * 0.5, ry, rd), vec(0, ry - 0.02, rd), vec(rw * 0.5, ry, rd), vec(rw, ry + soriUp, rd)
      ]);
      data.contours.push([
        vec(-rw, ry + soriUp, -rd), vec(-rw * 0.5, ry, -rd), vec(0, ry - 0.02, -rd), vec(rw * 0.5, ry, -rd), vec(rw, ry + soriUp, -rd)
      ]);
      data.contours.push([vec(-rw, ry + soriUp, -rd), vec(-rw, ry, 0), vec(-rw, ry + soriUp, rd)]);
      data.contours.push([vec(rw, ry + soriUp, -rd), vec(rw, ry, 0), vec(rw, ry + soriUp, rd)]);

      // Hip ridge rafters
      const topW = bw * 0.72, topY = ry + t.roofH;
      data.details.push([vec(-rw, ry + soriUp, rd), vec(-topW, topY, topW * 0.75)]);
      data.details.push([vec(rw, ry + soriUp, rd), vec(topW, topY, topW * 0.75)]);
      data.details.push([vec(-rw, ry + soriUp, -rd), vec(-topW, topY, -topW * 0.75)]);
      data.details.push([vec(rw, ry + soriUp, -rd), vec(topW, topY, -topW * 0.75)]);

      // Wind bells
      data.details.push([vec(-rw, ry + soriUp, rd), vec(-rw, ry + soriUp - 0.12, rd)]);
      data.details.push([vec(rw, ry + soriUp, rd), vec(rw, ry + soriUp - 0.12, rd)]);
    });

    // Spire
    data.contours.push([vec(0, 0.44, 0), vec(0, 2.85, 0)]);
    for (let r = 0; r < 9; r++) {
      const ringY = 0.85 + r * 0.12;
      const ringW = 0.24 - r * 0.008;
      const ring = [];
      for (let i = 0; i <= 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        ring.push(vec(Math.cos(a) * ringW, ringY, Math.sin(a) * ringW * 0.75));
      }
      data.details.push(ring);
    }
    // Flame & jewel
    data.contours.push([vec(0, 2.38, 0), vec(-0.24, 2.52, 0.04), vec(0, 2.68, 0)]);
    data.contours.push([vec(0, 2.38, 0), vec(0.24, 2.52, -0.04), vec(0, 2.68, 0)]);
    const jewel = [];
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      jewel.push(vec(Math.cos(a) * 0.09, 2.76 + Math.sin(a) * 0.09, Math.sin(a) * 0.07));
    }
    data.contours.push(jewel);

    data.guides.push([vec(0, -2.8, 0), vec(0, 3.2, 0)]);
    return data;
  }

  /** STUDY 22: THE GOLDEN WATER PAVILION (Kinkaku-ji - 金閣寺) */
  function buildKinkakujiData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };

    // Water surface ripples
    for (let rx of [-2.4, -1.2, 0.0, 1.2, 2.4]) {
      data.details.push([vec(rx - 0.4, -2.5, 0.8), vec(rx + 0.4, -2.5, 0.8)]);
      data.details.push([vec(rx - 0.3, -2.5, 1.2), vec(rx + 0.3, -2.5, 1.2)]);
    }

    // Projecting fishing deck (Tsuridono)
    const deck = [vec(-1.8, -2.2, 0.5), vec(-1.2, -2.2, 0.5), vec(-1.2, -2.2, 1.4), vec(-1.8, -2.2, 1.4), vec(-1.8, -2.2, 0.5)];
    data.contours.push(deck);

    // Floor 1 (Shinden Palace Style)
    const f1Pillars = [-1.4, -0.7, 0.0, 0.7, 1.4];
    f1Pillars.forEach(px => {
      data.contours.push([vec(px, -2.3, 0.8), vec(px, -1.4, 0.8)]);
      data.contours.push([vec(px, -2.3, -0.8), vec(px, -1.4, -0.8)]);
    });
    data.details.push([vec(-1.5, -2.0, 0.85), vec(1.5, -2.0, 0.85)]);

    // Lower Roof
    data.contours.push([vec(-1.85, -1.4, 1.1), vec(1.85, -1.4, 1.1), vec(1.85, -1.4, -1.1), vec(-1.85, -1.4, -1.1), vec(-1.85, -1.4, 1.1)]);

    // Floor 2 (Buke Samurai Style)
    for (let px of [-1.1, -0.4, 0.4, 1.1]) {
      data.contours.push([vec(px, -1.25, 0.65), vec(px, -0.4, 0.65)]);
      data.contours.push([vec(px, -1.25, -0.65), vec(px, -0.4, -0.65)]);
    }
    for (let sy of [-1.0, -0.8, -0.6]) {
      data.hatches.push([vec(-1.1, sy, 0.65), vec(1.1, sy, 0.65)]);
    }

    // Mid Roof
    data.contours.push([vec(-1.55, -0.3, 0.95), vec(1.55, -0.3, 0.95), vec(1.55, -0.3, -0.95), vec(-1.55, -0.3, -0.95), vec(-1.55, -0.3, 0.95)]);

    // Floor 3 (Zen Hall Style)
    for (let px of [-0.8, 0.8]) {
      data.contours.push([vec(px, -0.15, 0.5), vec(px, 0.65, 0.5)]);
      data.contours.push([vec(px, -0.15, -0.5), vec(px, 0.65, -0.5)]);
    }
    const katomado = [
      vec(-0.35, 0.0, 0.52), vec(-0.35, 0.35, 0.52), vec(-0.25, 0.48, 0.52),
      vec(0, 0.55, 0.52), vec(0.25, 0.48, 0.52), vec(0.35, 0.35, 0.52), vec(0.35, 0.0, 0.52)
    ];
    data.details.push(katomado);

    // Pyramidal Roof
    const roofPeak = vec(0, 1.35, 0);
    data.contours.push([vec(-1.25, 0.72, 0.85), roofPeak]);
    data.contours.push([vec(1.25, 0.72, 0.85), roofPeak]);
    data.contours.push([vec(-1.25, 0.72, -0.85), roofPeak]);
    data.contours.push([vec(1.25, 0.72, -0.85), roofPeak]);

    // Golden Phoenix (Hō-ō)
    data.contours.push([vec(0, 1.35, 0), vec(0, 1.55, 0.05), vec(0, 1.70, 0)]);
    data.contours.push([vec(0, 1.55, 0.05), vec(-0.38, 1.68, 0), vec(-0.25, 1.82, 0.02)]);
    data.contours.push([vec(0, 1.55, 0.05), vec(0.38, 1.68, 0), vec(0.25, 1.82, -0.02)]);
    data.details.push([vec(0, 1.48, 0), vec(-0.15, 1.32, -0.2), vec(-0.25, 1.20, -0.35)]);
    data.details.push([vec(0, 1.48, 0), vec(0.15, 1.32, -0.2), vec(0.25, 1.20, -0.35)]);

    data.guides.push([vec(0, -2.6, 0), vec(0, 2.2, 0)]);
    return data;
  }

  /** STUDY 23: FLOATING GRAND TORII & WATER SHRINE (Itsukushima O-Torii - 厳島大鳥居) */
  function buildToriiGateData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };

    // Ryobu-torii Columns
    for (let px of [-1.45, 1.45]) {
      data.contours.push([vec(px, -2.5, 0), vec(px, 1.45, 0)]);
      for (let cz of [-0.65, 0.65]) {
        data.contours.push([vec(px, -2.5, cz), vec(px, -0.2, cz)]);
        data.details.push([vec(px, -0.8, 0), vec(px, -0.5, cz)]);
        data.details.push([vec(px, -1.8, 0), vec(px, -1.8, cz)]);
      }
    }

    // Swept Dual Lintels (Kasagi & Shimaki)
    const kasagi = [vec(-2.55, 1.82, 0), vec(-1.45, 1.65, 0), vec(0, 1.62, 0), vec(1.45, 1.65, 0), vec(2.55, 1.82, 0)];
    const shimaki = [vec(-2.45, 1.55, 0), vec(-1.45, 1.45, 0), vec(0, 1.42, 0), vec(1.45, 1.45, 0), vec(2.45, 1.55, 0)];
    data.contours.push(kasagi);
    data.contours.push(shimaki);
    data.details.push([vec(-2.55, 1.82, 0), vec(-2.45, 1.55, 0)]);
    data.details.push([vec(2.55, 1.82, 0), vec(2.45, 1.55, 0)]);

    // Tablet Plaque (Gaku)
    const gaku = [vec(-0.35, 0.95, 0.08), vec(0.35, 0.95, 0.08), vec(0.35, 1.40, 0.08), vec(-0.35, 1.40, 0.08), vec(-0.35, 0.95, 0.08)];
    data.contours.push(gaku);

    // Tie-Beam (Nuki) with Wedge Keys
    const nuki = [vec(-2.05, 0.82, 0), vec(2.05, 0.82, 0)];
    data.contours.push(nuki);
    for (let px of [-1.45, 1.45]) {
      data.details.push([vec(px - 0.08, 0.92, 0.05), vec(px + 0.08, 0.72, 0.05)]);
    }

    // Tidal Water Waves
    for (let y of [-2.5, -2.4]) {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        data.hatches.push([vec(Math.cos(a) * 1.4, y, Math.sin(a) * 0.6), vec(Math.cos(a) * 1.8, y, Math.sin(a) * 0.8)]);
      }
    }

    data.guides.push([vec(0, -2.6, 0), vec(0, 2.4, 0)]);
    return data;
  }

  /** STUDY 24: TAHŌTŌ MULTI-TREASURE PAGODA (Tahōtō - 多宝塔) */
  function buildTahotoData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };

    // Square Base
    const base = [vec(-1.7, -2.5, -1.2), vec(1.7, -2.5, -1.2), vec(1.7, -2.5, 1.2), vec(-1.7, -2.5, 1.2), vec(-1.7, -2.5, -1.2)];
    data.contours.push(base);

    // Pillars & Balustrade
    const cols = [[-1.3, -0.9], [1.3, -0.9], [1.3, 0.9], [-1.3, 0.9]];
    cols.forEach(c => data.contours.push([vec(c[0], -2.5, c[1]), vec(c[0], -1.3, c[1])]));
    data.details.push([vec(-1.35, -2.1, 0.95), vec(1.35, -2.1, 0.95), vec(1.35, -2.1, -0.95), vec(-1.35, -2.1, -0.95), vec(-1.35, -2.1, 0.95)]);

    // Lower Roof
    const lowRoof = [vec(-2.3, -1.15, 1.45), vec(2.3, -1.15, 1.45), vec(2.3, -1.15, -1.45), vec(-2.3, -1.15, -1.45), vec(-2.3, -1.15, 1.45)];
    data.contours.push(lowRoof);

    // Cylindrical Kamebara Dome
    for (let hIdx = 0; hIdx < 5; hIdx++) {
      const hy = -0.9 + hIdx * 0.18;
      const hr = 1.05 * Math.cos((hIdx / 4) * (Math.PI * 0.42));
      const ring = [];
      for (let i = 0; i <= 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ring.push(vec(Math.cos(a) * hr, hy, Math.sin(a) * hr * 0.75));
      }
      data.contours.push(ring);
    }

    // Radiating Brackets
    for (let aIdx = 0; aIdx < 8; aIdx++) {
      const a = (aIdx / 8) * Math.PI * 2;
      data.details.push([vec(Math.cos(a) * 0.95, -0.05, Math.sin(a) * 0.7), vec(Math.cos(a) * 1.35, 0.35, Math.sin(a) * 0.95)]);
    }

    // Upper Roof
    const topRoof = [vec(-1.75, 0.48, 1.2), vec(1.75, 0.48, 1.2), vec(1.75, 0.48, -1.2), vec(-1.75, 0.48, -1.2), vec(-1.75, 0.48, 1.2)];
    data.contours.push(topRoof);

    // Spire
    data.contours.push([vec(0, 0.5, 0), vec(0, 2.85, 0)]);
    for (let r = 0; r < 9; r++) {
      const ry = 0.95 + r * 0.11;
      const rw = 0.22 - r * 0.007;
      const ring = [];
      for (let i = 0; i <= 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        ring.push(vec(Math.cos(a) * rw, ry, Math.sin(a) * rw * 0.75));
      }
      data.details.push(ring);
    }
    const jewel = [];
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      jewel.push(vec(Math.cos(a) * 0.09, 2.72 + Math.sin(a) * 0.09, Math.sin(a) * 0.07));
    }
    data.contours.push(jewel);

    data.guides.push([vec(0, -2.6, 0), vec(0, 3.2, 0)]);
    return data;
  }

  /** STUDY 25: CANTILEVERED MOUNTAIN STAGE HALL (Kake-zukuri - 懸造り本堂) */
  function buildKakezukuriData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };

    // Rocky Cliff Line
    const cliff = [vec(-2.4, -2.6, -1.0), vec(-1.8, -2.0, -0.5), vec(-1.2, -1.4, 0), vec(-0.8, -0.8, 0.5), vec(-0.6, -0.4, 0.8)];
    data.contours.push(cliff);

    // Timber Scaffold Pillars
    const cols = [[-0.6, -1.2], [0.2, -1.8], [1.0, -2.3], [1.8, -2.6]];
    cols.forEach(c => {
      for (let cz of [-0.8, 0.0, 0.8]) {
        data.contours.push([vec(c[0], c[1], cz), vec(c[0], -0.3, cz)]);
      }
    });

    // Horizontal Tie-Beams & Braces
    for (let ty of [-1.5, -0.9, -0.4]) {
      data.details.push([vec(-0.6, ty, -0.8), vec(1.8, ty, -0.8)]);
      data.details.push([vec(-0.6, ty, 0.8), vec(1.8, ty, 0.8)]);
    }
    data.details.push([vec(0.2, -1.8, 0.8), vec(1.0, -0.4, 0.8)]);
    data.details.push([vec(1.0, -2.3, 0.8), vec(1.8, -0.9, 0.8)]);

    // Cantilevered Platform Stage
    const platform = [vec(-1.2, -0.3, -1.2), vec(2.0, -0.3, -1.2), vec(2.0, -0.3, 1.2), vec(-1.2, -0.3, 1.2), vec(-1.2, -0.3, -1.2)];
    data.contours.push(platform);
    const railing = [vec(0.0, -0.05, 1.25), vec(2.05, -0.05, 1.25), vec(2.05, -0.05, -1.25), vec(0.0, -0.05, -1.25)];
    data.contours.push(railing);

    // Main Hall Columns & Sprawling Hiwada Roof
    const hallCols = [[-1.0, -0.8], [-0.1, -0.8], [-1.0, 0.8], [-0.1, 0.8]];
    hallCols.forEach(c => data.contours.push([vec(c[0], -0.3, c[1]), vec(c[0], 0.8, c[1])]));

    const roof = [vec(-1.5, 0.95, 1.4), vec(0.5, 0.95, 1.4), vec(0.5, 0.95, -1.4), vec(-1.5, 0.95, -1.4), vec(-1.5, 0.95, 1.4)];
    data.contours.push(roof);
    data.contours.push([vec(-1.5, 0.95, 1.4), vec(-0.5, 1.6, 0)]);
    data.contours.push([vec(0.5, 0.95, 1.4), vec(-0.5, 1.6, 0)]);

    // Mountain Clouds
    for (let cIdx = 0; cIdx < 3; cIdx++) {
      const cy = -1.6 + cIdx * 0.7;
      data.details.push([vec(0.5 + cIdx * 0.3, cy, 1.4), vec(1.5 + cIdx * 0.3, cy + 0.1, 1.4), vec(2.2 + cIdx * 0.3, cy, 1.4)]);
    }

    data.guides.push([vec(-0.5, -2.6, 0), vec(-0.5, 2.2, 0)]);
    return data;
  }

  /** STUDY 26: ZEN MOUNTAIN GRAND GATE (Sanmon - 山門) */
  function buildSanmonGateData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };

    // Stone Podium
    const podium = [vec(-2.5, -2.5, -1.2), vec(2.5, -2.5, -1.2), vec(2.5, -2.5, 1.2), vec(-2.5, -2.5, 1.2), vec(-2.5, -2.5, -1.2)];
    data.contours.push(podium);

    // 6 Front & Rear Lower Columns
    const colsX = [-2.0, -1.2, -0.4, 0.4, 1.2, 2.0];
    colsX.forEach(cx => {
      data.contours.push([vec(cx, -2.5, 0.8), vec(cx, -0.8, 0.8)]);
      data.contours.push([vec(cx, -2.5, -0.8), vec(cx, -0.8, -0.8)]);
    });

    // 3 Arched Entrance Portals
    for (let ax of [-0.8, 0.0, 0.8]) {
      const arch = [vec(ax - 0.35, -2.5, 0.82), vec(ax - 0.35, -1.3, 0.82), vec(ax, -1.0, 0.82), vec(ax + 0.35, -1.3, 0.82), vec(ax + 0.35, -2.5, 0.82)];
      data.details.push(arch);
    }

    // Intermediate Pent Roof (Hisashi)
    const midRoof = [vec(-2.65, -0.7, 1.15), vec(2.65, -0.7, 1.15), vec(2.65, -0.7, -1.15), vec(-2.65, -0.7, -1.15), vec(-2.65, -0.7, 1.15)];
    data.contours.push(midRoof);

    // Upper Story Balcony Gallery
    data.details.push([vec(-2.15, -0.45, 0.9), vec(2.15, -0.45, 0.9), vec(2.15, -0.45, -0.9), vec(-2.15, -0.45, -0.9), vec(-2.15, -0.45, 0.9)]);
    for (let cx of [-1.6, -0.8, 0.0, 0.8, 1.6]) {
      data.contours.push([vec(cx, -0.5, 0.7), vec(cx, 0.65, 0.7)]);
      data.contours.push([vec(cx, -0.5, -0.7), vec(cx, 0.65, -0.7)]);
    }

    // Grand Hipped-and-Gabled Roof (Irimoya)
    const topRoof = [vec(-2.5, 0.75, 1.25), vec(2.5, 0.75, 1.25), vec(2.5, 0.75, -1.25), vec(-2.5, 0.75, -1.25), vec(-2.5, 0.75, 1.25)];
    data.contours.push(topRoof);
    const ridge = [vec(-1.8, 1.55, 0), vec(1.8, 1.55, 0)];
    data.contours.push(ridge);

    data.details.push([vec(-2.5, 0.75, 1.25), vec(-1.8, 1.55, 0)]);
    data.details.push([vec(2.5, 0.75, 1.25), vec(1.8, 1.55, 0)]);
    data.details.push([vec(-2.5, 0.75, -1.25), vec(-1.8, 1.55, 0)]);
    data.details.push([vec(2.5, 0.75, -1.25), vec(1.8, 1.55, 0)]);

    data.guides.push([vec(0, -2.6, 0), vec(0, 2.2, 0)]);
    return data;
  }

  /** STUDY 27: OCTAGONAL HALL OF DREAMS (Hakkaku-dō - 八角堂) */
  function buildHakkakudoData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };

    // Octagonal Foundation Podia
    for (let p of [[-2.6, 2.1], [-2.4, 1.85]]) {
      const pts = [];
      for (let i = 0; i <= 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        pts.push(vec(Math.cos(a) * p[1], p[0], Math.sin(a) * p[1]));
      }
      data.contours.push(pts);
    }

    // 8 Octagonal Perimeter Columns
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      data.contours.push([vec(Math.cos(a) * 1.4, -2.4, Math.sin(a) * 1.4), vec(Math.cos(a) * 1.4, -1.0, Math.sin(a) * 1.4)]);
    }

    // 8 Shoji Screen Lattice Rails
    for (let i = 0; i < 8; i++) {
      const a1 = (i / 8) * Math.PI * 2;
      const a2 = ((i + 1) / 8) * Math.PI * 2;
      data.details.push([vec(Math.cos(a1) * 1.4, -1.6, Math.sin(a1) * 1.4), vec(Math.cos(a2) * 1.4, -1.6, Math.sin(a2) * 1.4)]);
    }

    // 8 Swept Eaves & Radiating Hip Ridges
    const roofEave = [];
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      roofEave.push(vec(Math.cos(a) * 2.2, -0.73, Math.sin(a) * 2.2));
    }
    data.contours.push(roofEave);

    const roofApex = vec(0, 0.15, 0);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      data.contours.push([vec(Math.cos(a) * 2.2, -0.73, Math.sin(a) * 2.2), roofApex]);
      data.details.push([vec(Math.cos(a) * 2.2, -0.73, Math.sin(a) * 2.2), vec(Math.cos(a) * 2.2, -0.85, Math.sin(a) * 2.2)]);
    }

    // Bronze Spire & Flame Jewel (Kaen-Hoshu)
    data.contours.push([vec(0, 0.15, 0), vec(0, 2.35, 0)]);
    const lotus = [];
    for (let i = 0; i <= 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      lotus.push(vec(Math.cos(a) * 0.35, 0.35, Math.sin(a) * 0.35));
    }
    data.details.push(lotus);

    const jewel = [];
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      jewel.push(vec(Math.cos(a) * 0.16, 2.15 + Math.sin(a) * 0.16, Math.sin(a) * 0.12));
    }
    data.contours.push(jewel);

    data.guides.push([vec(0, -2.7, 0), vec(0, 2.8, 0)]);
    return data;
  }

  /** STUDY 28: SACRED BELFRY & GREAT BRONZE BELL (Shōrō & Bonshō - 鐘楼) */
  function buildBelfryData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };

    // Trapezoidal Timber Skirt Base (Hakamagoshi)
    const skirtBtm = [vec(-1.8, -2.5, -1.4), vec(1.8, -2.5, -1.4), vec(1.8, -2.5, 1.4), vec(-1.8, -2.5, 1.4), vec(-1.8, -2.5, -1.4)];
    const skirtTop = [vec(-1.4, -1.4, -1.0), vec(1.4, -1.4, -1.0), vec(1.4, -1.4, 1.0), vec(-1.4, -1.4, 1.0), vec(-1.4, -1.4, -1.0)];
    data.contours.push(skirtBtm);
    data.contours.push(skirtTop);
    for (let i = 0; i < 4; i++) {
      data.contours.push([skirtBtm[i], skirtTop[i]]);
    }

    // 4 Corner Timber Columns
    const cols = [[-1.2, -0.8], [1.2, -0.8], [1.2, 0.8], [-1.2, 0.8]];
    cols.forEach(c => data.contours.push([vec(c[0], -1.4, c[1]), vec(c[0] * 0.9, 0.65, c[1] * 0.9)]));

    // Belfry Roof
    const roof = [vec(-1.95, 0.65, 1.35), vec(1.95, 0.65, 1.35), vec(1.95, 0.65, -1.35), vec(-1.95, 0.65, -1.35), vec(-1.95, 0.65, 1.35)];
    data.contours.push(roof);
    data.contours.push([vec(-1.4, 1.35, 0), vec(1.4, 1.35, 0)]);

    // Great Bronze Temple Bell (Bonshō)
    const crown = [vec(0, 0.25, 0), vec(-0.15, 0.35, 0), vec(0, 0.45, 0), vec(0.15, 0.35, 0), vec(0, 0.25, 0)];
    data.contours.push(crown);

    const bellRings = [[0.2, 0.35], [0.0, 0.45], [-0.3, 0.52], [-0.6, 0.60], [-0.8, 0.68]];
    bellRings.forEach(br => {
      const ring = [];
      for (let i = 0; i <= 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ring.push(vec(Math.cos(a) * br[1], br[0], Math.sin(a) * br[1]));
      }
      data.contours.push(ring);
    });

    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      data.details.push([vec(Math.cos(a) * 0.35, 0.2, Math.sin(a) * 0.35), vec(Math.cos(a) * 0.68, -0.8, Math.sin(a) * 0.68)]);
    }

    // Horizontal Striker Log (Shumoku)
    data.contours.push([vec(-1.1, -0.35, 0.6), vec(0.35, -0.35, 0.15)]);
    data.details.push([vec(-0.8, 0.5, 0.6), vec(-0.8, -0.35, 0.6)]);
    data.details.push([vec(0.1, 0.5, 0.2), vec(0.1, -0.35, 0.2)]);

    data.guides.push([vec(0, -2.6, 0), vec(0, 2.0, 0)]);
    return data;
  }

  /** STUDY 29: SILVER ZEN PAVILION & MOON TERRACE (Ginkaku-ji - 銀閣寺) */
  function buildGinkakujiData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };

    // Conical White Sand Moon Mound (Kogetsudai)
    const moundRings = [[-2.5, 0.75], [-2.3, 0.62], [-2.1, 0.50], [-1.9, 0.35]];
    moundRings.forEach(mr => {
      const ring = [];
      for (let i = 0; i <= 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ring.push(vec(1.3 + Math.cos(a) * mr[1], mr[0], 0.7 + Math.sin(a) * mr[1] * 0.75));
      }
      data.contours.push(ring);
    });

    // Raked Sand Ripple Waves (Ginshadan)
    for (let zx of [-2.2, -1.4, -0.6, 0.2]) {
      data.details.push([vec(zx, -2.5, 0.9), vec(zx + 0.5, -2.5, 0.9)]);
    }

    // Floor 1 (Shingyōden)
    const f1Pillars = [-1.4, -0.7, 0.0, 0.7];
    f1Pillars.forEach(px => {
      data.contours.push([vec(px, -2.4, 0.7), vec(px, -1.2, 0.7)]);
      data.contours.push([vec(px, -2.4, -0.7), vec(px, -1.2, -0.7)]);
    });

    // Lower Roof
    const midRoof = [vec(-1.75, -1.1, 1.05), vec(1.05, -1.1, 1.05), vec(1.05, -1.1, -1.05), vec(-1.75, -1.1, -1.05), vec(-1.75, -1.1, 1.05)];
    data.contours.push(midRoof);

    // Floor 2 (Chōunkaku)
    const f2Pillars = [-1.1, -0.4, 0.3, 0.9];
    f2Pillars.forEach(px => {
      data.contours.push([vec(px, -0.95, 0.55), vec(px, 0.1, 0.55)]);
      data.contours.push([vec(px, -0.95, -0.55), vec(px, 0.1, -0.55)]);
    });
    data.details.push([vec(-1.15, -0.75, 0.65), vec(0.95, -0.75, 0.65), vec(0.95, -0.75, -0.65), vec(-1.15, -0.75, -0.65), vec(-1.15, -0.75, 0.65)]);

    // Arched Katōmado Windows
    for (let kx of [-0.75, 0.0, 0.6]) {
      const km = [vec(kx - 0.2, -0.6, 0.58), vec(kx - 0.2, -0.3, 0.58), vec(kx, -0.15, 0.58), vec(kx + 0.2, -0.3, 0.58), vec(kx + 0.2, -0.6, 0.58)];
      data.details.push(km);
    }

    // Upper Roof & Phoenix Finial
    const topRoof = [vec(-1.45, 0.25, 0.85), vec(1.25, 0.25, 0.85), vec(1.25, 0.25, -0.85), vec(-1.45, 0.25, -0.85), vec(-1.45, 0.25, 0.85)];
    data.contours.push(topRoof);
    const peak = vec(-0.1, 0.95, 0);
    for (let i = 0; i < 4; i++) {
      data.contours.push([topRoof[i], peak]);
    }
    data.contours.push([peak, vec(-0.1, 1.25, 0.05), vec(-0.1, 1.35, 0)]);

    data.guides.push([vec(-0.1, -2.6, 0), vec(-0.1, 1.8, 0)]);
    return data;
  }

  /** STUDY 30: THE GRAND BUDDHA PALACE HALL (Daibutsuden - 大仏殿) */
  function buildDaibutsudenData() {
    const data = { contours: [], details: [], hatches: [], guides: [] };

    // Monumental Stone Podium
    const podium = [vec(-2.6, -2.5, -1.3), vec(2.6, -2.5, -1.3), vec(2.6, -2.5, 1.3), vec(-2.6, -2.5, 1.3), vec(-2.6, -2.5, -1.3)];
    data.contours.push(podium);

    // 8 Colossal Front & Rear Pillars
    const colsX = [-2.1, -1.5, -0.9, -0.3, 0.3, 0.9, 1.5, 2.1];
    colsX.forEach(cx => {
      data.contours.push([vec(cx, -2.5, 0.9), vec(cx, -0.75, 0.9)]);
      data.contours.push([vec(cx, -2.5, -0.9), vec(cx, -0.75, -0.9)]);
    });

    // Three Grand Entrance Doors
    for (let dx of [-0.6, 0.0, 0.6]) {
      data.details.push([vec(dx - 0.25, -2.5, 0.92), vec(dx - 0.25, -1.1, 0.92), vec(dx + 0.25, -1.1, 0.92), vec(dx + 0.25, -2.5, 0.92)]);
    }

    // Lower Grand Skirt Roof
    const lowRoof = [vec(-2.75, -0.65, 1.35), vec(2.75, -0.65, 1.35), vec(2.75, -0.65, -1.35), vec(-2.75, -0.65, -1.35), vec(-2.75, -0.65, 1.35)];
    data.contours.push(lowRoof);

    // Upper Story Columns
    const upperColsX = [-1.7, -1.0, -0.3, 0.3, 1.0, 1.7];
    upperColsX.forEach(cx => {
      data.contours.push([vec(cx, -0.45, 0.75), vec(cx, 0.65, 0.75)]);
      data.contours.push([vec(cx, -0.45, -0.75), vec(cx, 0.65, -0.75)]);
    });

    // Curved Cusped Gable (Karahafu)
    const karahafu = [vec(-0.65, 0.55, 0.9), vec(-0.35, 0.85, 0.9), vec(0, 0.95, 0.9), vec(0.35, 0.85, 0.9), vec(0.65, 0.55, 0.9)];
    data.contours.push(karahafu);

    // Upper Grand Hipped Roof
    const topRoof = [vec(-2.45, 0.75, 1.25), vec(2.45, 0.75, 1.25), vec(2.45, 0.75, -1.25), vec(-2.45, 0.75, -1.25), vec(-2.45, 0.75, 1.25)];
    data.contours.push(topRoof);
    const ridge = [vec(-1.6, 1.65, 0), vec(1.6, 1.65, 0)];
    data.contours.push(ridge);

    data.details.push([vec(-2.45, 0.75, 1.25), vec(-1.6, 1.65, 0)]);
    data.details.push([vec(2.45, 0.75, 1.25), vec(1.6, 1.65, 0)]);
    data.details.push([vec(-2.45, 0.75, -1.25), vec(-1.6, 1.65, 0)]);
    data.details.push([vec(2.45, 0.75, -1.25), vec(1.6, 1.65, 0)]);

    // Twin Gilded Crescent Horns (Shibi)
    data.contours.push([vec(-1.6, 1.65, 0), vec(-1.8, 1.95, 0.05), vec(-1.65, 2.1, 0)]);
    data.contours.push([vec(1.6, 1.65, 0), vec(1.8, 1.95, -0.05), vec(1.65, 2.1, 0)]);

    data.guides.push([vec(0, -2.7, 0), vec(0, 2.5, 0)]);
    return data;
  }

  // Registry of the 30 Master Studies across Three Curated Volumes
  const EXHIBIT_PLATES = [
    // Volume I: Renaissance Graphite Codex (Studies 01 - 10)
    { id: 'blooming-lily', name: 'Study 01 • Blooming Lily', counter: '01 / 10', volume: 1, builder: buildLilyData },
    { id: 'classic-gt', name: 'Study 02 • Classic GT Coupe', counter: '02 / 10', volume: 1, builder: buildCarData },
    { id: 'earth-astrolabe', name: 'Study 03 • Earth & Astrolabe', counter: '03 / 10', volume: 1, builder: buildEarthData },
    { id: 'ornithopter', name: 'Study 04 • Da Vinci Ornithopter', counter: '04 / 10', volume: 1, builder: buildOrnithopterData },
    { id: 'tourbillon', name: 'Study 05 • Tourbillon Horology', counter: '05 / 10', volume: 1, builder: buildWatchData },
    { id: 'nautilus', name: 'Study 06 • Nautilus Shell', counter: '06 / 10', volume: 1, builder: buildNautilusData },
    { id: 'temple', name: 'Study 07 • Classical Temple', counter: '07 / 10', volume: 1, builder: buildTempleData },
    { id: 'stallion', name: 'Study 08 • Galloping Stallion', counter: '08 / 10', volume: 1, builder: buildStallionData },
    { id: 'biplane', name: 'Study 09 • Vintage Biplane', counter: '09 / 10', volume: 1, builder: buildBiplaneData },
    { id: 'phoenix', name: 'Study 10 • Mythical Phoenix', counter: '10 / 10', volume: 1, builder: buildPhoenixData },

    // Volume II: Sumi-e Zen Ink Codex (Studies 11 - 20)
    { id: 'bonsai-pine', name: 'Study 11 • Ancient Bonsai Pine (松)', counter: '01 / 10 • VOL. II', volume: 2, builder: buildPineData },
    { id: 'nishikigoi', name: 'Study 12 • Swimming Nishikigoi (鯉)', counter: '02 / 10 • VOL. II', volume: 2, builder: buildKoiData },
    { id: 'red-crane', name: 'Study 13 • Red-Crowned Crane (鶴)', counter: '03 / 10 • VOL. II', volume: 2, builder: buildCraneData },
    { id: 'wind-bamboo', name: 'Study 14 • Wind-Blown Bamboo (竹)', counter: '04 / 10 • VOL. II', volume: 2, builder: buildBambooData },
    { id: 'cherry-sakura', name: 'Study 15 • Cherry Blossom Branch (桜)', counter: '05 / 10 • VOL. II', volume: 2, builder: buildSakuraData },
    { id: 'zen-pagoda', name: 'Study 16 • Five-Tiered Pagoda (塔)', counter: '06 / 10 • VOL. II', volume: 2, builder: buildPagodaData },
    { id: 'great-wave', name: 'Study 17 • The Great Wave (波)', counter: '07 / 10 • VOL. II', volume: 2, builder: buildGreatWaveData },
    { id: 'enso-moon', name: 'Study 18 • Ensō Circle & Moon (円)', counter: '08 / 10 • VOL. II', volume: 2, builder: buildEnsoData },
    { id: 'cloud-dragon', name: 'Study 19 • Cloud Dragon (龍)', counter: '09 / 10 • VOL. II', volume: 2, builder: buildDragonData },
    { id: 'mount-fuji', name: 'Study 20 • Mount Fuji & Mist (富士)', counter: '10 / 10 • VOL. II', volume: 2, builder: buildFujiData },

    // Volume III: Sacred Japanese Temple & Pagoda Architecture (Studies 21 - 30)
    { id: 'sanju-pagoda', name: 'Study 21 • Three-Tiered Pagoda (三重塔)', counter: '01 / 10 • VOL. III', volume: 3, builder: buildSanjuNoToData },
    { id: 'golden-pavilion', name: 'Study 22 • The Golden Pavilion (金閣寺)', counter: '02 / 10 • VOL. III', volume: 3, builder: buildKinkakujiData },
    { id: 'grand-torii', name: 'Study 23 • Floating Grand Torii (厳島大鳥居)', counter: '03 / 10 • VOL. III', volume: 3, builder: buildToriiGateData },
    { id: 'tahoto-pagoda', name: 'Study 24 • Multi-Treasure Pagoda (多宝塔)', counter: '04 / 10 • VOL. III', volume: 3, builder: buildTahotoData },
    { id: 'kakezukuri-hall', name: 'Study 25 • Cliffside Stage Hall (懸造り)', counter: '05 / 10 • VOL. III', volume: 3, builder: buildKakezukuriData },
    { id: 'sanmon-gate', name: 'Study 26 • Zen Grand Gate (山門)', counter: '06 / 10 • VOL. III', volume: 3, builder: buildSanmonGateData },
    { id: 'hakkaku-hall', name: 'Study 27 • Octagonal Dream Hall (八角堂)', counter: '07 / 10 • VOL. III', volume: 3, builder: buildHakkakudoData },
    { id: 'temple-belfry', name: 'Study 28 • Temple Bell Tower (鐘楼)', counter: '08 / 10 • VOL. III', volume: 3, builder: buildBelfryData },
    { id: 'silver-pavilion', name: 'Study 29 • Silver Zen Pavilion (銀閣寺)', counter: '09 / 10 • VOL. III', volume: 3, builder: buildGinkakujiData },
    { id: 'daibutsuden-hall', name: 'Study 30 • The Grand Buddha Hall (大仏殿)', counter: '10 / 10 • VOL. III', volume: 3, builder: buildDaibutsudenData }
  ];

  // ==========================================================================
  // THREE.JS INITIALIZATION & SCENE SETUP
  // ==========================================================================
  function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(CONFIG.canvasColor);
    scene.fog = new THREE.FogExp2(CONFIG.canvasColor, 0.026);

    const aspect = (canvasViewport.clientWidth || window.innerWidth) / (canvasViewport.clientHeight || window.innerHeight);
    camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
    updateCameraPosition();

    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    const w = canvasViewport.clientWidth || window.innerWidth;
    const h = canvasViewport.clientHeight || window.innerHeight;
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    artworkRootGroup = new THREE.Group();
    scene.add(artworkRootGroup);

    setupLighting();
    setupShadowReceiver();
    setupGraphiteDust();

    // Check URL search parameters to allow deep linking to any of the 30 studies across all three volumes
    const urlParams = new URLSearchParams(window.location.search);
    const volParam = parseInt(urlParams.get('vol'), 10);
    const plateParam = parseInt(urlParams.get('plate'), 10);
    let initialPlate = 0;
    if (!isNaN(plateParam) && plateParam >= 0 && plateParam < EXHIBIT_PLATES.length) {
      initialPlate = plateParam;
    } else if (volParam === 3) {
      initialPlate = 20;
    } else if (volParam === 2) {
      initialPlate = 10;
    }

    const initVol = initialPlate >= 20 || volParam === 3 ? 3 : initialPlate >= 10 || volParam === 2 ? 2 : 1;
    switchVolume(initVol, initialPlate);

    window.addEventListener('resize', onWindowResize);
  }

  function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xFFF9F2, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xFFFAF2, 0.95);
    keyLight.position.set(5, 8, 9);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.camera.left = -6;
    keyLight.shadow.camera.right = 6;
    keyLight.shadow.camera.top = 6;
    keyLight.shadow.camera.bottom = -6;
    keyLight.shadow.bias = -0.0006;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xE5EDF5, 0.45);
    rimLight.position.set(-6, -4, -5);
    scene.add(rimLight);
  }

  function setupShadowReceiver() {
    const shadowGeo = new THREE.PlaneGeometry(30, 30);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.13 });
    backingShadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    backingShadowPlane.position.set(0, 0, -4.5);
    backingShadowPlane.receiveShadow = true;
    scene.add(backingShadowPlane);
  }

  function setupGraphiteDust() {
    const dustCount = 80;
    const dustGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(dustCount * 3);

    for (let i = 0; i < dustCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 14;
      positions[i + 1] = (Math.random() - 0.5) * 12;
      positions[i + 2] = (Math.random() - 0.5) * 8;
    }

    dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0x8E8A82,
      size: 0.035,
      transparent: true,
      opacity: 0.35
    });

    dustParticles = new THREE.Points(dustGeo, dustMat);
    scene.add(dustParticles);
  }

  function createArtworkGroup(artData, colorHex) {
    const root = new THREE.Group();

    contourLayerGroup = new THREE.Group();
    detailLayerGroup = new THREE.Group();
    hatchLayerGroup = new THREE.Group();
    guideLayerGroup = new THREE.Group();

    if (artData.contours) {
      artData.contours.forEach(stroke => {
        const mesh = createTubeFromPoints(stroke, CONFIG.contourRadius, colorHex, 1.0);
        if (mesh) contourLayerGroup.add(mesh);
      });
    }

    if (artData.details) {
      artData.details.forEach(stroke => {
        const mesh = createTubeFromPoints(stroke, CONFIG.detailRadius, colorHex, 0.88);
        if (mesh) detailLayerGroup.add(mesh);
      });
    }

    if (artData.hatches && artData.hatches.length > 0) {
      const lineMesh = createLineSegments(artData.hatches, colorHex, 0.65);
      if (lineMesh) hatchLayerGroup.add(lineMesh);
    }

    if (artData.guides && artData.guides.length > 0) {
      const guideMesh = createLineSegments(artData.guides, '#B85C38', 0.4);
      if (guideMesh) guideLayerGroup.add(guideMesh);
    }

    hatchLayerGroup.visible = STATE.isHatchEnabled;
    guideLayerGroup.visible = STATE.isGuidesEnabled;

    root.add(guideLayerGroup);
    root.add(hatchLayerGroup);
    root.add(contourLayerGroup);
    root.add(detailLayerGroup);

    return root;
  }

  function syncVolumeUI(volNum) {
    STATE.currentVolume = volNum;
    if (volBtn1) volBtn1.classList.toggle('active', volNum === 1);
    if (volBtn2) volBtn2.classList.toggle('active', volNum === 2);
    if (volBtn3) volBtn3.classList.toggle('active', volNum === 3);

    plateButtons.forEach(btn => {
      const isVol1 = btn.classList.contains('vol-1');
      const isVol2 = btn.classList.contains('vol-2');
      const isVol3 = btn.classList.contains('vol-3');
      if (volNum === 1) {
        btn.classList.toggle('hidden', !isVol1);
      } else if (volNum === 2) {
        btn.classList.toggle('hidden', !isVol2);
      } else {
        btn.classList.toggle('hidden', !isVol3);
      }
    });

    if (atelierApp) {
      atelierApp.classList.toggle('sumie-mode', volNum === 2);
      atelierApp.classList.toggle('temple-mode', volNum === 3);
    }
    if (hankoSeal) hankoSeal.classList.toggle('hidden', volNum !== 2);

    if (galleryEditionBadge) {
      galleryEditionBadge.innerHTML = volNum === 1
        ? 'VOL. I &bull; RENAISSANCE GRAPHITE CODEX'
        : volNum === 2
          ? 'VOL. II &bull; SUMI-E ZEN INK CODEX'
          : 'VOL. III &bull; SACRED TEMPLE &amp; PAGODA ARCHITECTURE';
    }
    if (sidebarSectionLabel) {
      sidebarSectionLabel.textContent = volNum === 1
        ? 'GRAPHITE CODEX'
        : volNum === 2
          ? 'SUMI-E ZEN INK'
          : 'SACRED ARCHITECTURE';
    }

    if (scene) {
      const bgColor = volNum === 2 ? 0xF5EFE6 : volNum === 3 ? 0xF4EDE2 : CONFIG.canvasColor;
      scene.background.setHex(bgColor);
      if (scene.fog) scene.fog.color.setHex(bgColor);
    }
  }

  function switchVolume(volNum, targetPlateIndex = null) {
    syncVolumeUI(volNum);
    let nextPlate = targetPlateIndex;
    if (nextPlate === null) {
      nextPlate = volNum === 1 ? 0 : volNum === 2 ? 10 : 20;
    }
    loadPlate(nextPlate);
  }

  function loadPlate(index, animateLive = false) {
    const plate = EXHIBIT_PLATES[index];
    if (!plate) return;

    const plateVol = plate.volume || (index >= 20 ? 3 : index >= 10 ? 2 : 1);
    if (plateVol !== STATE.currentVolume) {
      syncVolumeUI(plateVol);
    }

    STATE.currentPlateIndex = index;

    plateButtons.forEach((btn, idx) => {
      const isActive = idx === index;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      if (isActive) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    statusText.textContent = plate.name;
    plateCounter.textContent = plate.counter;

    if (activeArtGroup) {
      artworkRootGroup.remove(activeArtGroup);
      activeArtGroup.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      activeArtGroup = null;
    }

    const artData = plate.builder();
    activeArtGroup = createArtworkGroup(artData, STATE.currentColor);
    artworkRootGroup.add(activeArtGroup);

    if (animateLive) {
      playLiveSketchSequence();
    } else {
      activeArtGroup.scale.set(0.01, 0.01, 0.01);
      let s = 0.01;
      const t = setInterval(() => {
        s += (1.0 - s) * 0.22;
        if (activeArtGroup) activeArtGroup.scale.set(s, s, s);
        if (Math.abs(1.0 - s) < 0.01) {
          clearInterval(t);
          if (activeArtGroup) activeArtGroup.scale.set(1, 1, 1);
        }
      }, 16);
      playNoteSound(440 + (index % 5) * 110);
    }
  }

  function playLiveSketchSequence() {
    if (STATE.isAnimatingSketch || !activeArtGroup) return;
    STATE.isAnimatingSketch = true;

    guideLayerGroup.visible = false;
    contourLayerGroup.visible = false;
    detailLayerGroup.visible = false;
    hatchLayerGroup.visible = false;

    playPaperGlideSound();

    setTimeout(() => {
      if (STATE.isGuidesEnabled) guideLayerGroup.visible = true;
      playTactileFrictionSound();
    }, 200);

    setTimeout(() => {
      contourLayerGroup.visible = true;
      contourLayerGroup.scale.set(0.85, 0.85, 0.85);
      let s = 0.85;
      const intv = setInterval(() => {
        s += (1.0 - s) * 0.2;
        if (contourLayerGroup) contourLayerGroup.scale.set(s, s, s);
        if (Math.abs(1.0 - s) < 0.01) {
          clearInterval(intv);
          if (contourLayerGroup) contourLayerGroup.scale.set(1, 1, 1);
        }
      }, 16);
      playTactileFrictionSound();
    }, 600);

    setTimeout(() => {
      detailLayerGroup.visible = true;
      playTactileFrictionSound();
    }, 1100);

    setTimeout(() => {
      if (STATE.isHatchEnabled) hatchLayerGroup.visible = true;
      playPaperGlideSound();
      playNoteSound(659.25);
      STATE.isAnimatingSketch = false;
    }, 1600);
  }

  function updateCameraPosition() {
    camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
    camera.position.y = spherical.radius * Math.cos(spherical.phi);
    camera.position.z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
    camera.lookAt(cameraTarget);
  }

  function updatePerspectiveTelemetry() {
    let azmDeg = ((spherical.theta * 180 / Math.PI) % 360);
    if (azmDeg < 0) azmDeg += 360;
    const altDeg = ((spherical.phi - Math.PI / 2) * -180 / Math.PI);
    const depthM = spherical.radius.toFixed(1);

    coordAzm.textContent = `${azmDeg.toFixed(1)}°`;
    coordAlt.textContent = `${altDeg.toFixed(1)}°`;
    coordDepth.textContent = `${depthM}m`;

    const thetaDist = Math.min(Math.abs(azmDeg), Math.abs(360 - azmDeg));
    const phiDist = Math.abs(altDeg);
    const isAligned = thetaDist < 3.8 && phiDist < 3.8;

    if (isAligned) {
      if (!perspectiveIndicator.classList.contains('aligned')) {
        perspectiveIndicator.classList.add('aligned');
        alignStatus.textContent = '2D Silhouette Aligned';
        playNoteSound(880);
      }
    } else {
      if (perspectiveIndicator.classList.contains('aligned')) {
        perspectiveIndicator.classList.remove('aligned');
        alignStatus.textContent = '3D Spatial View';
      }
    }
  }

  function snapTo2DPerspective() {
    targetSpherical.theta = 0;
    targetSpherical.phi = Math.PI / 2;
    targetSpherical.radius = CONFIG.cameraDistance;
    playPaperGlideSound();
  }

  // ==========================================================================
  // INPUT HANDLERS
  // ==========================================================================
  function onPointerDown(e) {
    if (STATE.isDrawingMode) {
      start3DDrawing(e);
      return;
    }
    isPointerDown = true;
    prevPointerX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    prevPointerY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    pointerVelocityX = 0;
    pointerVelocityY = 0;
  }

  function onPointerMove(e) {
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

    if (STATE.isDrawingMode) {
      if (STATE.isDrawingActive) continue3DDrawing(clientX, clientY);
      return;
    }

    if (!isPointerDown) return;

    const deltaX = clientX - prevPointerX;
    const deltaY = clientY - prevPointerY;

    pointerVelocityX = deltaX * 0.006;
    pointerVelocityY = deltaY * 0.006;

    targetSpherical.theta -= pointerVelocityX;
    targetSpherical.phi -= pointerVelocityY;
    targetSpherical.phi = Math.max(0.12, Math.min(Math.PI - 0.12, targetSpherical.phi));

    prevPointerX = clientX;
    prevPointerY = clientY;

    playTactileFrictionSound();
  }

  function onPointerUp() {
    if (STATE.isDrawingMode && STATE.isDrawingActive) {
      finish3DDrawing();
      return;
    }
    isPointerDown = false;
  }

  function onWheel(e) {
    e.preventDefault();
    const zoomDelta = e.deltaY * 0.004;
    targetSpherical.radius = Math.max(
      CONFIG.cameraMinDist,
      Math.min(CONFIG.cameraMaxDist, targetSpherical.radius + zoomDelta)
    );
  }

  // ==========================================================================
  // FREEHAND 3D DRAWING
  // ==========================================================================
  function toggleDrawingMode() {
    STATE.isDrawingMode = !STATE.isDrawingMode;
    drawModeBtn.classList.toggle('active-drawing', STATE.isDrawingMode);
    canvasViewport.classList.toggle('drawing-mode', STATE.isDrawingMode);
    drawingHint.classList.toggle('hidden', !STATE.isDrawingMode);
    clearDrawingBtn.classList.toggle('hidden', !STATE.isDrawingMode);

    drawModeBtn.querySelector('.btn-text').textContent = STATE.isDrawingMode ? 'Exit Sketch Mode' : 'Freehand Sketch Studio';
  }

  function screenToWorldPoint(clientX, clientY, zDepth = 0) {
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const planeNormal = new THREE.Vector3().subVectors(camera.position, cameraTarget).normalize();
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, new THREE.Vector3(0, 0, zDepth));

    const intersectionPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectionPoint);
    return intersectionPoint;
  }

  function start3DDrawing(e) {
    STATE.isDrawingActive = true;
    STATE.drawnPoints = [];
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    const pt = screenToWorldPoint(clientX, clientY, 0);
    STATE.drawnPoints.push(pt);
    playPaperGlideSound();
  }

  function continue3DDrawing(clientX, clientY) {
    if (STATE.drawnPoints.length === 0) return;
    const strokeIdx = STATE.drawnPoints.length;
    const waveDepth = Math.sin(strokeIdx * 0.18) * 0.45;
    const pt = screenToWorldPoint(clientX, clientY, waveDepth);
    const lastPt = STATE.drawnPoints[STATE.drawnPoints.length - 1];

    if (pt.distanceTo(lastPt) > 0.18) {
      STATE.drawnPoints.push(pt);
      rebuildDrawnMesh();
      playTactileFrictionSound();
    }
  }

  function rebuildDrawnMesh() {
    if (STATE.drawnPoints.length < 3) return;
    if (STATE.drawnMesh) {
      artworkRootGroup.remove(STATE.drawnMesh);
      if (STATE.drawnMesh.geometry) STATE.drawnMesh.geometry.dispose();
      if (STATE.drawnMesh.material) STATE.drawnMesh.material.dispose();
    }
    STATE.drawnMesh = createTubeFromPoints(STATE.drawnPoints, CONFIG.contourRadius, STATE.currentColor, 1.0);
    if (STATE.drawnMesh) artworkRootGroup.add(STATE.drawnMesh);
  }

  function finish3DDrawing() {
    STATE.isDrawingActive = false;
    playNoteSound(587.33);
  }

  function clearDrawing() {
    STATE.drawnPoints = [];
    if (STATE.drawnMesh) {
      artworkRootGroup.remove(STATE.drawnMesh);
      if (STATE.drawnMesh.geometry) STATE.drawnMesh.geometry.dispose();
      if (STATE.drawnMesh.material) STATE.drawnMesh.material.dispose();
      STATE.drawnMesh = null;
    }
    loadPlate(STATE.currentPlateIndex);
  }

  function updatePigmentColor(hexColor) {
    STATE.currentColor = hexColor;
    swatchButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color.toLowerCase() === hexColor.toLowerCase());
    });

    if (activeArtGroup) {
      activeArtGroup.traverse(child => {
        if (child.isMesh && child.material && child.material.color) {
          child.material.color.set(hexColor);
          child.material.metalness = hexColor === '#B8860B' ? 0.85 : 0.05;
          child.material.roughness = hexColor === '#B8860B' ? 0.35 : 0.84;
          child.material.needsUpdate = true;
        } else if (child.isLine && child.material && child.material.color) {
          if (child.parent === hatchLayerGroup) {
            child.material.color.set(hexColor);
            child.material.needsUpdate = true;
          }
        }
      });
    }
    playPaperGlideSound();
  }

  // ==========================================================================
  // AUDIO SYNTHESIS
  // ==========================================================================
  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTactileFrictionSound() {
    if (!STATE.isSoundEnabled) return;
    initAudio();
    if (!audioCtx) return;

    try {
      const bufferSize = audioCtx.sampleRate * 0.035;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.15;
      }
      const whiteNoise = audioCtx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800 + Math.random() * 400;
      filter.Q.value = 3.5;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.035);
      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      whiteNoise.start();
    } catch (err) {}
  }

  function playPaperGlideSound() {
    if (!STATE.isSoundEnabled) return;
    initAudio();
    if (!audioCtx) return;

    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(160, audioCtx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (err) {}
  }

  function playNoteSound(freq = 440) {
    if (!STATE.isSoundEnabled) return;
    initAudio();
    if (!audioCtx) return;

    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.45);
    } catch (err) {}
  }

  // ==========================================================================
  // ANIMATION LOOP
  // ==========================================================================
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    spherical.theta += (targetSpherical.theta - spherical.theta) * 0.085;
    spherical.phi += (targetSpherical.phi - spherical.phi) * 0.085;
    spherical.radius += (targetSpherical.radius - spherical.radius) * 0.085;

    if (STATE.isAutoRotate && !isPointerDown && !STATE.isDrawingMode) {
      targetSpherical.theta += 0.0022;
    }

    updateCameraPosition();
    updatePerspectiveTelemetry();

    if (STATE.isJitterEnabled && activeArtGroup) {
      const timeFactor = elapsedTime * 4.2;
      activeArtGroup.traverse(child => {
        if (child.isMesh && child.geometry && child.geometry.userData.originalPositions) {
          const posAttr = child.geometry.attributes.position;
          const origPos = child.geometry.userData.originalPositions;
          for (let i = 0; i < posAttr.count; i++) {
            const ox = origPos.getX(i);
            const oy = origPos.getY(i);
            const oz = origPos.getZ(i);
            const jitter = Math.sin(timeFactor + i * 0.15) * 0.0035;
            posAttr.setXYZ(i, ox + jitter, oy + jitter * 0.8, oz + jitter * 0.5);
          }
          posAttr.needsUpdate = true;
        }
      });
    }

    if (dustParticles) {
      dustParticles.rotation.y = elapsedTime * 0.015;
    }

    renderer.render(scene, camera);
  }

  // ==========================================================================
  // EVENT LISTENERS
  // ==========================================================================
  function setupEventListeners() {
    canvasViewport.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    canvasViewport.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    canvasViewport.addEventListener('wheel', onWheel, { passive: false });

    if (volBtn1) {
      volBtn1.addEventListener('click', () => {
        if (STATE.currentVolume !== 1) {
          switchVolume(1);
          playPaperGlideSound();
        }
      });
    }

    if (volBtn2) {
      volBtn2.addEventListener('click', () => {
        if (STATE.currentVolume !== 2) {
          switchVolume(2);
          playPaperGlideSound();
        }
      });
    }

    if (volBtn3) {
      volBtn3.addEventListener('click', () => {
        if (STATE.currentVolume !== 3) {
          switchVolume(3);
          playPaperGlideSound();
        }
      });
    }

    plateButtons.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        if (STATE.isDrawingMode) toggleDrawingMode();
        loadPlate(index, false);
      });
    });

    snapPerspectiveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      snapTo2DPerspective();
    });

    resketchBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      loadPlate(STATE.currentPlateIndex, true);
    });

    drawModeBtn.addEventListener('click', toggleDrawingMode);
    clearDrawingBtn.addEventListener('click', clearDrawing);

    swatchButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        updatePigmentColor(btn.dataset.color);
      });
    });

    hatchToggle.addEventListener('click', () => {
      STATE.isHatchEnabled = !STATE.isHatchEnabled;
      hatchToggle.classList.toggle('active', STATE.isHatchEnabled);
      hatchToggle.setAttribute('aria-pressed', STATE.isHatchEnabled ? 'true' : 'false');
      document.getElementById('hatchLabel').textContent = STATE.isHatchEnabled ? 'Volume On' : 'Outlines Only';
      if (hatchLayerGroup) hatchLayerGroup.visible = STATE.isHatchEnabled;
      playPaperGlideSound();
    });

    guidesToggle.addEventListener('click', () => {
      STATE.isGuidesEnabled = !STATE.isGuidesEnabled;
      guidesToggle.classList.toggle('active', STATE.isGuidesEnabled);
      guidesToggle.setAttribute('aria-pressed', STATE.isGuidesEnabled ? 'true' : 'false');
      document.getElementById('guidesLabel').textContent = STATE.isGuidesEnabled ? 'Visible' : 'Hidden';
      if (guideLayerGroup) guideLayerGroup.visible = STATE.isGuidesEnabled;
      playPaperGlideSound();
    });

    jitterToggle.addEventListener('click', () => {
      STATE.isJitterEnabled = !STATE.isJitterEnabled;
      jitterToggle.classList.toggle('active', STATE.isJitterEnabled);
      jitterToggle.setAttribute('aria-pressed', STATE.isJitterEnabled ? 'true' : 'false');
      document.getElementById('jitterLabel').textContent = STATE.isJitterEnabled ? 'Organic Grain' : 'Clean Line';
      playPaperGlideSound();
    });

    autoRotateToggle.addEventListener('click', () => {
      STATE.isAutoRotate = !STATE.isAutoRotate;
      autoRotateToggle.classList.toggle('active', STATE.isAutoRotate);
      autoRotateToggle.setAttribute('aria-pressed', STATE.isAutoRotate ? 'true' : 'false');
      document.getElementById('autoRotateLabel').textContent = STATE.isAutoRotate ? 'Gentle Drift' : 'Static Studio';
      playPaperGlideSound();
    });

    soundToggle.addEventListener('click', () => {
      STATE.isSoundEnabled = !STATE.isSoundEnabled;
      soundToggle.querySelector('.sound-on').classList.toggle('hidden', !STATE.isSoundEnabled);
      soundToggle.querySelector('.sound-off').classList.toggle('hidden', STATE.isSoundEnabled);
      if (STATE.isSoundEnabled) playNoteSound(523.25);
    });

    curatorModalBtn.addEventListener('click', () => {
      curatorModal.classList.remove('hidden');
      playPaperGlideSound();
    });

    closeModalBtn.addEventListener('click', () => {
      curatorModal.classList.add('hidden');
    });

    curatorModal.addEventListener('click', (e) => {
      if (e.target === curatorModal) curatorModal.classList.add('hidden');
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !curatorModal.classList.contains('hidden')) {
        curatorModal.classList.add('hidden');
      }
    });
  }

  function onWindowResize() {
    const width = canvasViewport.clientWidth || window.innerWidth;
    const height = canvasViewport.clientHeight || window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  function startApp() {
    initThree();
    setupEventListeners();
    animate();
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startApp);
  } else {
    startApp();
  }

})();
