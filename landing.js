/**
 * CONTOUR — Landing Page 3D Interactive Hero Canvas
 * Floating Leonardo Astrolabe kinetic sketch reacting to mouse parallax.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('hero3dCanvas');
  if (!canvas) return;

  const container = canvas.parentElement;

  let scene, camera, renderer;
  let heroArmillaryGroup, dustPoints;

  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

  function initHero3D() {
    scene = new THREE.Scene();

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;

    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0, 8.5);

    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    heroArmillaryGroup = new THREE.Group();
    scene.add(heroArmillaryGroup);

    // Warm gallery light
    const ambientLight = new THREE.AmbientLight(0xFFFAF2, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xFFF0E5, 0.85);
    dirLight.position.set(4, 6, 8);
    scene.add(dirLight);

    buildHeroArmillary();
    buildHeroDust();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onResize);

    animate();
  }

  function createSketchTube(curvePts, radius, colorHex, opacity = 0.9) {
    const vPts = curvePts.map(p => new THREE.Vector3(p[0], p[1], p[2]));
    const curve = new THREE.CatmullRomCurve3(vPts, false, 'centripetal', 0.5);
    const geo = new THREE.TubeGeometry(curve, 100, radius, 8, false);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      roughness: 0.85,
      metalness: 0.08,
      transparent: opacity < 1.0,
      opacity: opacity
    });
    return new THREE.Mesh(geo, mat);
  }

  function buildHeroArmillary() {
    const carbon = '#181716';
    const terracotta = '#B85C38';
    const gold = '#C49B66';

    // 1. Outer Equatorial Horizon Ring (Terracotta)
    const ring1Pts = [];
    for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.15) {
      ring1Pts.push([Math.cos(a) * 2.8, 0, Math.sin(a) * 2.8]);
    }
    heroArmillaryGroup.add(createSketchTube(ring1Pts, 0.024, terracotta, 0.85));

    // 2. Prime Vertical Meridian Ring (Carbon)
    const ring2Pts = [];
    for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.15) {
      ring2Pts.push([0, Math.cos(a) * 2.6, Math.sin(a) * 2.6]);
    }
    heroArmillaryGroup.add(createSketchTube(ring2Pts, 0.024, carbon, 0.9));

    // 3. Tilted Celestial Solstitial Ring (Gold, 23.5 deg tilt)
    const ring3Pts = [];
    const tilt = 23.5 * Math.PI / 180;
    for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.15) {
      const rx = Math.cos(a) * 2.4;
      const ry = Math.sin(a) * Math.sin(tilt) * 2.4;
      const rz = Math.sin(a) * Math.cos(tilt) * 2.4;
      ring3Pts.push([rx, ry, rz]);
    }
    heroArmillaryGroup.add(createSketchTube(ring3Pts, 0.02, gold, 0.85));

    // 4. Polar Axis Spindle
    heroArmillaryGroup.add(createSketchTube([[0, -3.2, 0], [0, 3.2, 0]], 0.028, carbon, 0.95));

    // 5. Inner Concentric Armillary Rings
    const inner1Pts = [];
    for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.2) {
      inner1Pts.push([Math.cos(a) * 1.5, Math.sin(a) * 1.5, 0]);
    }
    heroArmillaryGroup.add(createSketchTube(inner1Pts, 0.016, carbon, 0.75));

    // 6. Central Armillary Solar Core (Sacred Sphere)
    const corePts = [];
    for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.25) {
      corePts.push([Math.cos(a) * 0.45, Math.sin(a) * 0.45, 0]);
    }
    heroArmillaryGroup.add(createSketchTube(corePts, 0.022, terracotta, 1.0));
  }

  function buildHeroDust() {
    const dustCount = 60;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i += 3) {
      pos[i] = (Math.random() - 0.5) * 12;
      pos[i + 1] = (Math.random() - 0.5) * 10;
      pos[i + 2] = (Math.random() - 0.5) * 8;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x8E8A82,
      size: 0.035,
      transparent: true,
      opacity: 0.35
    });
    dustPoints = new THREE.Points(geo, mat);
    scene.add(dustPoints);
  }

  function onMouseMove(e) {
    const normX = (e.clientX / window.innerWidth) * 2 - 1;
    const normY = -(e.clientY / window.innerHeight) * 2 + 1;
    mouse.targetX = normX * 0.45;
    mouse.targetY = normY * 0.35;
  }

  function onResize() {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  let clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    // Damped mouse parallax
    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;

    if (heroArmillaryGroup) {
      heroArmillaryGroup.rotation.y = elapsedTime * 0.18 + mouse.x * 0.8;
      heroArmillaryGroup.rotation.x = Math.sin(elapsedTime * 0.12) * 0.15 - mouse.y * 0.6;
      heroArmillaryGroup.rotation.z = Math.cos(elapsedTime * 0.1) * 0.08;
    }

    if (dustPoints) {
      dustPoints.rotation.y = elapsedTime * 0.02;
    }

    renderer.render(scene, camera);
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initHero3D);
  } else {
    initHero3D();
  }

})();
