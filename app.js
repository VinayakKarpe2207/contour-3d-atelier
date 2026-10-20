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

  // Registry of the 10 Master Studies
  const EXHIBIT_PLATES = [
    { id: 'blooming-lily', name: 'Study 01 • Blooming Lily', counter: '01 / 10', builder: buildLilyData },
    { id: 'classic-gt', name: 'Study 02 • Classic GT Coupe', counter: '02 / 10', builder: buildCarData },
    { id: 'earth-astrolabe', name: 'Study 03 • Earth & Astrolabe', counter: '03 / 10', builder: buildEarthData },
    { id: 'ornithopter', name: 'Study 04 • Da Vinci Ornithopter', counter: '04 / 10', builder: buildOrnithopterData },
    { id: 'tourbillon', name: 'Study 05 • Tourbillon Horology', counter: '05 / 10', builder: buildWatchData },
    { id: 'nautilus', name: 'Study 06 • Nautilus Shell', counter: '06 / 10', builder: buildNautilusData },
    { id: 'temple', name: 'Study 07 • Classical Temple', counter: '07 / 10', builder: buildTempleData },
    { id: 'stallion', name: 'Study 08 • Galloping Stallion', counter: '08 / 10', builder: buildStallionData },
    { id: 'biplane', name: 'Study 09 • Vintage Biplane', counter: '09 / 10', builder: buildBiplaneData },
    { id: 'phoenix', name: 'Study 10 • Mythical Phoenix', counter: '10 / 10', builder: buildPhoenixData }
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

    // Check URL search parameters to allow deep linking to any of the 10 studies
    const urlParams = new URLSearchParams(window.location.search);
    const plateParam = parseInt(urlParams.get('plate'), 10);
    const initialPlate = !isNaN(plateParam) && plateParam >= 0 && plateParam < EXHIBIT_PLATES.length ? plateParam : 0;

    loadPlate(initialPlate);

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

  function loadPlate(index, animateLive = false) {
    const plate = EXHIBIT_PLATES[index];
    if (!plate) return;

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
