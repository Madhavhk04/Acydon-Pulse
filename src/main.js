import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ==========================================
// 1. DATA AND STATES
// ==========================================

const SCENE_PRESETS = {
  focus:      { name: 'Focus Mode',  brightness: 82, temp: 4100, density: 80, spread: 24, direction:   0, colorHex: '#e0f2fe' },
  reading:    { name: 'Reading Mode', brightness: 64, temp: 3500, density: 68, spread: 32, direction: -10, colorHex: '#fdf2e9' },
  'wind-down':{ name: 'Wind Down',   brightness: 32, temp: 2700, density: 50, spread: 44, direction:  15, colorHex: '#ffb84d' }
};

const CHAPTERS = [
  { num: '01', label: 'DISCOVER' },
  { num: '02', label: 'ILLUMINATE' },
  { num: '03', label: 'SHAPE' },
  { num: '04', label: 'EXPLORE' },
  { num: '05', label: 'PERSONALIZE' },
  { num: '06', label: 'SAVE' }
];

let currentPresetKey = 'focus';
let lampOn = false;

let currentSettings = {
  brightness: 82, temp: 4100, density: 68, spread: 24, direction: 0, colorHex: '#e0f2fe'
};

// Render lerp parameters
let lampIntensity = 0;
let lampColor = new THREE.Color('#e0f2fe');
let lampPenumbra = 0.68;
let lampAngle = 0.42; // ~24 degrees — tight desk-lamp beam
let lampBaseSwivel = 0;
let explodeFactor = 0;

// Spring physics state for lamp arm joints
let lowerArmVel = 0;
let upperArmVel = 0;
let lowerArmCurrent = -0.55;
let upperArmCurrent = 1.15;

// Mouse parallax
let mouseParallax = { x: 0, y: 0 };
let mouseParallaxTarget = { x: 0, y: 0 };

// Camera baseline (GSAP writes here, render loop lerps toward it)
let targetCamPos = new THREE.Vector3(0, 5, 12);
let targetLookAt = new THREE.Vector3(0, -1.9, 0);
let currentLookAt = new THREE.Vector3(0, -1.9, 0);

// Light sweep state
let lightSweepActive = false;
let lightSweepProgress = 0; // 0..1 set by ScrollTrigger
let ambientBaseIntensity = 0.15;

// Preloader complete flag
let preloaderDone = false;

// ==========================================
// 2. DOM ELEMENT REFERENCES
// ==========================================

const btnLampToggle = document.getElementById('btn-lamp-toggle');
const lampStatusText = document.getElementById('lamp-status-text');
const badgePulse = document.querySelector('.badge-pulse');

const readoutCoverage = document.getElementById('readout-coverage');
const saveBrightness = document.getElementById('save-brightness');
const saveTemp = document.getElementById('save-temp');
const saveDensity = document.getElementById('save-density');
const saveSpread = document.getElementById('save-spread');
const saveDirection = document.getElementById('save-direction');

const sliderBrightness = document.getElementById('slider-brightness');
const sliderTemp = document.getElementById('slider-temp');
const sliderDensity = document.getElementById('slider-density');
const sliderSpread = document.getElementById('slider-spread');
const sliderDirection = document.getElementById('slider-direction');

const valBrightness = document.getElementById('val-brightness');
const valTemp = document.getElementById('val-temp');
const valDensity = document.getElementById('val-density');
const valSpread = document.getElementById('val-spread');
const valDirection = document.getElementById('val-direction');

const presetBtns = document.querySelectorAll('.preset-btn');
const presetCards = document.querySelectorAll('.preset-card');

const signupModal = document.getElementById('signup-modal');
const syncingPresetText = document.getElementById('syncing-preset-text');
const btnSavePreset = document.getElementById('cta-save-preset');
const btnCreateAccountHero = document.getElementById('cta-create-account-hero');
const btnNavSignup = document.getElementById('nav-signup-btn');
const btnFinalRegister = document.getElementById('cta-final-register');
const modalCloseBtn = document.getElementById('modal-close-btn');
const signupForm = document.getElementById('signup-form');
const modalFormView = document.getElementById('modal-form-view');
const modalSuccessView = document.getElementById('modal-success-view');
const modalSuccessDoneBtn = document.getElementById('modal-success-done-btn');

const explodedItems = document.querySelectorAll('.exploded-item');

// ==========================================
// 3. THREE.JS 3D SCENE SETUP
// ==========================================

const canvas = document.getElementById('lumos-webgl-canvas');
let renderer, scene, camera;

let baseGroup, lowerArmGroup, upperArmGroup, headGroup;
let lowerArmMesh, upperArmMesh, headCasingMesh, emitterMesh;
let joint1Mesh, joint2Mesh, joint3Mesh;
let desk, laptopBase, laptopScreen, notebook, mug, plantPot, plantLeaves;
let ambientLight, spotLight, spotLightTarget;
let volumetricCone;
let dustParticles = [];

let targetDeskPoint = new THREE.Vector3(0, -1.9, 0);
let lerpedDeskPoint = new THREE.Vector3(0, -1.9, 0);
let mouseRay = new THREE.Vector2(-1000, -1000);
let deskIntersectionPlane;

function init3DScene() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 5, 12);

  deskIntersectionPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1.9);

  // LIGHTS
  ambientLight = new THREE.AmbientLight(0xffffff, ambientBaseIntensity);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.5);
  keyLight.position.set(-6, 8, 6);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.2);
  fillLight.position.set(6, 4, 3);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 0.35);
  rimLight.position.set(0, 6, -8);
  scene.add(rimLight);

  spotLight = new THREE.SpotLight(0xffffff, 0);
  spotLight.castShadow = true;
  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;
  spotLight.shadow.camera.near = 0.5;
  spotLight.shadow.camera.far = 12;
  spotLight.shadow.bias = -0.0005;
  spotLight.decay = 1.5;
  spotLight.distance = 15;
  scene.add(spotLight);

  spotLightTarget = new THREE.Object3D();
  scene.add(spotLightTarget);
  spotLight.target = spotLightTarget;

  // DESK
  const deskGeo = new THREE.BoxGeometry(16, 0.2, 10);
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1f, roughness: 0.5, metalness: 0.2 });
  desk = new THREE.Mesh(deskGeo, deskMat);
  desk.position.y = -2;
  desk.receiveShadow = true;
  scene.add(desk);

  const metalMat = new THREE.MeshStandardMaterial({ color: 0x222225, roughness: 0.4, metalness: 0.8 });

  // LAPTOP
  const laptopGroup = new THREE.Group();
  laptopGroup.position.set(-1.8, -1.9, -0.5);
  laptopGroup.rotation.y = 0.25;
  laptopBase = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 1.25), metalMat);
  laptopBase.castShadow = true;
  laptopBase.receiveShadow = true;
  laptopGroup.add(laptopBase);
  laptopScreen = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 0.04), metalMat);
  laptopScreen.position.set(0, 0.6, -0.6);
  laptopScreen.rotation.x = -0.25;
  laptopScreen.castShadow = true;
  laptopScreen.receiveShadow = true;
  laptopGroup.add(laptopScreen);
  scene.add(laptopGroup);

  // NOTEBOOK
  const noteMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
  notebook = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.02, 1.3), noteMat);
  notebook.position.set(0.2, -1.98, 0.5);
  notebook.rotation.y = -0.4;
  notebook.receiveShadow = true;
  scene.add(notebook);

  // MUG
  const mugGroup = new THREE.Group();
  mugGroup.position.set(-1.2, -1.9, 1.4);
  mug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.5, 24),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.2, metalness: 0.1 })
  );
  mug.castShadow = true;
  mug.receiveShadow = true;
  mugGroup.add(mug);
  scene.add(mugGroup);

  // PLANT
  const plantGroup = new THREE.Group();
  plantGroup.position.set(2.8, -1.9, -1.5);
  plantPot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.22, 0.6, 24),
    new THREE.MeshStandardMaterial({ color: 0x1c1c1f, roughness: 0.6 })
  );
  plantPot.castShadow = true;
  plantPot.receiveShadow = true;
  plantGroup.add(plantPot);
  plantLeaves = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.25, 1),
    new THREE.MeshStandardMaterial({ color: 0x1d221d, roughness: 0.8 })
  );
  plantLeaves.position.set(0, 0.45, 0);
  plantLeaves.castShadow = true;
  plantGroup.add(plantLeaves);
  scene.add(plantGroup);

  // LAMP HIERARCHY
  baseGroup = new THREE.Group();
  baseGroup.position.set(1.6, -1.9, 0.4);
  baseGroup.rotation.y = 0.5;
  scene.add(baseGroup);

  const basePlate = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.08, 32), metalMat);
  basePlate.receiveShadow = true;
  baseGroup.add(basePlate);

  const jointGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.2, 16);
  jointGeo.rotateX(Math.PI * 0.5);
  joint1Mesh = new THREE.Mesh(jointGeo, metalMat);
  joint1Mesh.position.y = 0.15;
  baseGroup.add(joint1Mesh);

  lowerArmGroup = new THREE.Group();
  lowerArmGroup.position.set(0, 0.15, 0);
  lowerArmGroup.rotation.z = -0.55;
  baseGroup.add(lowerArmGroup);

  const rodGeo = new THREE.BoxGeometry(0.03, 1.8, 0.03);
  const rod1 = new THREE.Mesh(rodGeo, metalMat);
  rod1.position.set(0, 0.9, -0.06);
  rod1.castShadow = true;
  const rod2 = new THREE.Mesh(rodGeo, metalMat);
  rod2.position.set(0, 0.9, 0.06);
  rod2.castShadow = true;
  lowerArmGroup.add(rod1);
  lowerArmGroup.add(rod2);
  lowerArmMesh = rod1;

  joint2Mesh = new THREE.Mesh(jointGeo, metalMat);
  joint2Mesh.position.set(0, 1.8, 0);
  lowerArmGroup.add(joint2Mesh);

  upperArmGroup = new THREE.Group();
  upperArmGroup.position.set(0, 1.8, 0);
  upperArmGroup.rotation.z = 1.15;
  lowerArmGroup.add(upperArmGroup);

  upperArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 0.06), metalMat);
  upperArmMesh.position.y = 0.7;
  upperArmMesh.castShadow = true;
  upperArmGroup.add(upperArmMesh);

  joint3Mesh = new THREE.Mesh(jointGeo, metalMat);
  joint3Mesh.position.set(0, 1.4, 0);
  upperArmGroup.add(joint3Mesh);

  headGroup = new THREE.Group();
  headGroup.position.set(0, 1.4, 0);
  headGroup.rotation.z = -0.6;
  upperArmGroup.add(headGroup);

  headCasingMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 1.2), metalMat);
  headCasingMesh.position.set(0.18, 0, 0);
  headCasingMesh.castShadow = true;
  headGroup.add(headCasingMesh);

  const emitterMat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x000000, roughness: 0.1 });
  emitterMesh = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.9), emitterMat);
  emitterMesh.position.set(0.18, -0.05, 0);
  headGroup.add(emitterMesh);

  // VOLUMETRIC CONE — stops at desk surface (~3.5 units from head to desk)
  const coneGeo = new THREE.CylinderGeometry(0.02, 0.75, 3.5, 32, 1, true);
  coneGeo.translate(0, -1.75, 0);
  volumetricCone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  }));
  volumetricCone.position.set(0.18, -0.05, 0);
  headGroup.add(volumetricCone);

  // DUST PARTICLES — sparse spheres inside cone volume
  const isMobile = window.innerWidth < 768;
  const particleCount = isMobile ? 0 : 10;
  const particleMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  for (let i = 0; i < particleCount; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.012, 4, 4), particleMat.clone());
    // Random position within approximate cone volume
    const t = Math.random();       // 0 = near head, 1 = far
    const angle = Math.random() * Math.PI * 2;
    const radius = t * 1.4 * Math.random(); // gets wider farther down
    p.position.set(
      Math.cos(angle) * radius * 0.2,
      -t * 3.5,                   // downward along beam
      Math.sin(angle) * radius * 0.2
    );
    p.userData = {
      baseY: p.position.y,
      speed: 0.003 + Math.random() * 0.004,
      drift: (Math.random() - 0.5) * 0.0008,
      phase: Math.random() * Math.PI * 2
    };
    headGroup.add(p);
    dustParticles.push(p);
  }
}

// ==========================================
// 4. POINTING PHYSICS & RENDER LOOP
// ==========================================

const raycaster = new THREE.Raycaster();
let driftTime = 0;

function updateMechanicalPointing() {
  if (mouseRay.x > -100 && mouseRay.y > -100) {
    raycaster.setFromCamera(mouseRay, camera);
    const intersectPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(deskIntersectionPlane, intersectPoint)) {
      intersectPoint.x = Math.max(-4.5, Math.min(4.5, intersectPoint.x));
      intersectPoint.z = Math.max(-3.5, Math.min(3.5, intersectPoint.z));
      targetDeskPoint.copy(intersectPoint);
    }
  }

  lerpedDeskPoint.lerp(targetDeskPoint, 0.08);

  const localTarget = baseGroup.parent.worldToLocal(lerpedDeskPoint.clone());
  const angleY = Math.atan2(baseGroup.position.x - localTarget.x, baseGroup.position.z - localTarget.z);
  const targetBaseSwivel = (currentSettings.direction * Math.PI) / 180;
  lampBaseSwivel += (targetBaseSwivel - lampBaseSwivel) * 0.15;
  baseGroup.rotation.y = angleY + Math.PI * 0.5 + lampBaseSwivel;

  // SPRING PHYSICS for arm joints (replaces simple lerp)
  const STIFFNESS = 0.065;
  const DAMPING = 0.74;

  const targetLowerZ = -0.55 + Math.sin(driftTime * 0.5) * 0.04;
  lowerArmVel += (targetLowerZ - lowerArmCurrent) * STIFFNESS;
  lowerArmVel *= DAMPING;
  lowerArmCurrent += lowerArmVel;
  lowerArmGroup.rotation.z = lowerArmCurrent;

  const worldJoint2 = new THREE.Vector3();
  joint2Mesh.getWorldPosition(worldJoint2);
  const dX = lerpedDeskPoint.x - worldJoint2.x;
  const dY = lerpedDeskPoint.y - worldJoint2.y;
  const dZ = lerpedDeskPoint.z - worldJoint2.z;
  const dist = Math.sqrt(dX * dX + dY * dY + dZ * dZ);

  let targetUpperZ = 1.15;
  if (dist < 4) targetUpperZ = 1.5 - (dist * 0.1);

  upperArmVel += (targetUpperZ - upperArmCurrent) * STIFFNESS;
  upperArmVel *= DAMPING;
  upperArmCurrent += upperArmVel;
  upperArmGroup.rotation.z = upperArmCurrent;

  const worldHead = new THREE.Vector3();
  headCasingMesh.getWorldPosition(worldHead);
  const vecX = lerpedDeskPoint.x - worldHead.x;
  const vecY = lerpedDeskPoint.y - worldHead.y;
  const vecZ = lerpedDeskPoint.z - worldHead.z;
  const tiltAngle = Math.atan2(vecY, Math.sqrt(vecX * vecX + vecZ * vecZ));
  headGroup.rotation.z += (-tiltAngle - Math.PI * 0.5 - headGroup.rotation.z) * 0.12;

  spotLightTarget.position.copy(lerpedDeskPoint);
  const worldEmitter = new THREE.Vector3();
  emitterMesh.getWorldPosition(worldEmitter);
  spotLight.position.copy(worldEmitter);
}

let animationId = null;

function animateWebGLScene() {
  driftTime += 0.005;

  // Lighting interpolation
  const targetIntensity = lampOn ? (currentSettings.brightness / 100) * 8.5 : 0;
  lampIntensity += (targetIntensity - lampIntensity) * 0.12;

  const presetColor = new THREE.Color(currentSettings.colorHex);
  lampColor.lerp(presetColor, 0.12);

  const targetPenumbra = currentSettings.density / 100;
  lampPenumbra += (targetPenumbra - lampPenumbra) * 0.12;

  const targetAngle = (currentSettings.spread * Math.PI) / 180;
  lampAngle += (targetAngle - lampAngle) * 0.12;

  spotLight.intensity = lampIntensity;
  spotLight.color.copy(lampColor);
  spotLight.penumbra = lampPenumbra;
  spotLight.angle = lampAngle;

  // Light Sweep: fade ambient to near-black, then restore
  if (lightSweepActive) {
    const sweepAmbient = ambientBaseIntensity * (1 - lightSweepProgress * 0.88);
    ambientLight.intensity += (sweepAmbient - ambientLight.intensity) * 0.08;
  } else {
    ambientLight.intensity += (ambientBaseIntensity - ambientLight.intensity) * 0.05;
  }

  // Emitter glow
  if (lampOn) {
    emitterMesh.material.emissive.copy(lampColor).multiplyScalar(lampIntensity * 0.2);
    if (volumetricCone) {
      volumetricCone.material.color.copy(lampColor);
      volumetricCone.material.opacity = lampIntensity * 0.012 * (0.9 - lampPenumbra * 0.5);
      const scaleX = Math.tan(lampAngle) * 10;
      volumetricCone.scale.set(scaleX, 1, scaleX);
    }
    // Dust particles
    dustParticles.forEach((p, i) => {
      p.material.opacity = Math.min(lampIntensity * 0.06, 0.12);
      p.userData.phase += p.userData.speed;
      p.position.y = p.userData.baseY + Math.sin(p.userData.phase) * 0.15;
      p.position.x += p.userData.drift;
      // Reset drifted particles
      if (Math.abs(p.position.x) > 0.5) p.userData.drift *= -1;
    });
  } else {
    emitterMesh.material.emissive.setHex(0x000000);
    if (volumetricCone) volumetricCone.material.opacity = 0;
    dustParticles.forEach(p => { p.material.opacity = 0; });
  }

  updateMechanicalPointing();

  // Mouse parallax on camera (subtle cinematic offset)
  mouseParallax.x += (mouseParallaxTarget.x - mouseParallax.x) * 0.05;
  mouseParallax.y += (mouseParallaxTarget.y - mouseParallax.y) * 0.05;

  // Camera: GSAP target + mouse parallax offset
  const finalCamX = targetCamPos.x + mouseParallax.x * 0.4;
  const finalCamY = targetCamPos.y + mouseParallax.y * 0.2;
  const finalCamZ = targetCamPos.z;

  camera.position.x += (finalCamX - camera.position.x) * 0.08;
  camera.position.y += (finalCamY - camera.position.y) * 0.08;
  camera.position.z += (finalCamZ - camera.position.z) * 0.08;

  currentLookAt.lerp(targetLookAt, 0.08);

  const camMatrix = new THREE.Matrix4();
  camMatrix.lookAt(camera.position, currentLookAt, new THREE.Vector3(0, 1, 0));
  camera.quaternion.slerp(new THREE.Quaternion().setFromRotationMatrix(camMatrix), 0.08);

  renderer.render(scene, camera);
  animationId = requestAnimationFrame(animateWebGLScene);
}

// ==========================================
// 5. CINEMATIC PRELOADER
// ==========================================

function initPreloader() {
  const tl = gsap.timeline({
    onComplete: () => {
      preloaderDone = true;
      document.getElementById('chapter-indicator').classList.add('visible');
      document.getElementById('scroll-indicator').classList.add('visible');
      document.querySelector('.navbar').classList.add('visible');
      // Auto-turn lamp on after preloader
      if (btnLampToggle && !lampOn) btnLampToggle.click();
    }
  });

  // Title slides up from clip
  tl.to('.preloader-title', {
    y: '0%', opacity: 1,
    duration: 1.0, ease: 'power4.out'
  }, 0.3);

  // Subtitle fades in
  tl.to('.preloader-subtitle', {
    opacity: 1, y: 0,
    duration: 0.8, ease: 'power3.out'
  }, 0.9);

  // Progress wrap fades in
  tl.to('.preloader-progress-wrap', {
    opacity: 1,
    duration: 0.5, ease: 'power2.out'
  }, 1.1);

  // Counter + progress line animate
  const counter = { val: 0 };
  tl.to(counter, {
    val: 100,
    duration: 1.4,
    ease: 'power2.inOut',
    onUpdate: () => {
      const v = Math.floor(counter.val);
      const el = document.querySelector('.preloader-counter');
      if (el) el.textContent = v.toString().padStart(2, '0');
      const fill = document.getElementById('preloader-progress-fill');
      if (fill) fill.style.width = `${v}%`;
    }
  }, 1.2);

  // Preloader panel slides UP (cinematic exit)
  tl.to('.preloader', {
    yPercent: -100,
    duration: 1.1,
    ease: 'power4.inOut',
    delay: 0.2
  }, 2.8);

  // Hero badge
  tl.to('.badge-wrapper', {
    opacity: 1, y: 0,
    duration: 0.7, ease: 'power3.out'
  }, 3.3);

  // Hero title lines reveal
  tl.to('.hero-title .line-text', {
    y: '0%',
    duration: 1.1,
    stagger: 0.12,
    ease: 'power4.out'
  }, 3.5);

  // Hero subtitle + CTA + toggle
  tl.to('.hero-subtitle', {
    opacity: 1, y: 0,
    duration: 0.9, ease: 'power3.out'
  }, 3.85);

  tl.to('.hero-cta-group', {
    opacity: 1, y: 0,
    duration: 0.9, ease: 'power3.out'
  }, 4.05);

  tl.to('.lamp-toggle-container', {
    opacity: 1, y: 0,
    duration: 0.8, ease: 'power3.out'
  }, 4.2);
}

// ==========================================
// 6. SCROLL ANIMATIONS — 6-CHAPTER TIMELINE
// ==========================================

function initScrollAnimations() {
  const isMobile = window.innerWidth < 768;

  // Master camera scrub timeline
  const masterTL = gsap.timeline({
    scrollTrigger: {
      trigger: 'main',
      start: 'top top',
      end: 'bottom bottom',
      scrub: isMobile ? 1 : 1.8,
    }
  });

  // Chapter 01: DISCOVER (Hero) — default camera
  masterTL.to(targetCamPos, { x: 0, y: 5, z: 12, ease: 'none' }, 0);
  masterTL.to(targetLookAt, { x: 0, y: -1.9, z: 0, ease: 'none' }, 0);

  // Hero exit: content drifts up + blurs
  masterTL.to('.hero-content', {
    y: -80, opacity: 0, filter: 'blur(8px)',
    ease: 'power2.in'
  }, 0);

  // Chapter 02: ILLUMINATE — camera approaches
  masterTL.to(targetCamPos, { x: 1.5, y: 4, z: 8.5, ease: 'power1.inOut' }, 0.15);
  masterTL.to(targetLookAt, { x: 0.5, y: -1.5, z: 0, ease: 'power1.inOut' }, 0.15);

  // Spatial typography opacity reveal
  masterTL.fromTo('.spatial-word', 
    { opacity: 0.15, y: 15 },
    { opacity: 1, y: 0, stagger: 0.08, ease: 'power3.out', duration: 0.3 },
    0.18
  );

  // Chapter 03: SHAPE — pan
  masterTL.to(targetCamPos, { x: 0, y: 4.5, z: 9.5, ease: 'power2.inOut' }, 0.34);
  masterTL.to(targetLookAt, { x: 0, y: -1.5, z: 0, ease: 'power2.inOut' }, 0.34);

  // Chapter 04: EXPLORE / Explode
  masterTL.to(targetCamPos, { x: 1.0, y: 3.2, z: 5.8, ease: 'power2.inOut' }, 0.50);
  masterTL.to(targetLookAt, { x: 1.6, y: -0.5, z: 0.4, ease: 'power2.inOut' }, 0.50);

  // Explode factor up
  const explodeProxy = { val: 0 };
  function applyExplode(v) {
    explodeFactor = v;
    if (v > 0.01) {
      lowerArmMesh.position.x = -v * 0.15;
      upperArmMesh.position.z = v * 0.18;
      headCasingMesh.position.y = v * 0.32;
      emitterMesh.position.y = -0.05 - v * 0.22;
      joint2Mesh.position.z = v * 0.45;
      joint3Mesh.position.z = -v * 0.45;
    } else {
      lowerArmMesh.position.x = 0;
      upperArmMesh.position.z = 0;
      headCasingMesh.position.y = 0;
      emitterMesh.position.y = -0.05;
      joint2Mesh.position.z = 0;
      joint3Mesh.position.z = 0;
    }
  }

  masterTL.to(explodeProxy, {
    val: 1.1,
    ease: 'power1.inOut',
    onUpdate: () => applyExplode(explodeProxy.val)
  }, 0.55);

  // Light sweep: fade ambient (via lightSweepProgress)
  const sweepProxy = { val: 0 };
  masterTL.to(sweepProxy, {
    val: 1,
    ease: 'power1.inOut',
    onStart: () => { lightSweepActive = true; },
    onUpdate: () => { lightSweepProgress = sweepProxy.val; },
    onComplete: () => {
      // Reveal sweep text
      gsap.to('#light-sweep-text', { opacity: 1, duration: 0.8, ease: 'power3.out' });
      gsap.to('#light-sweep-text .line-text', {
        y: '0%', duration: 1.0, stagger: 0.1, ease: 'power4.out'
      });
    }
  }, 0.56);

  // Lamp sweeps during explode view (rotate base)
  masterTL.to(baseGroup.rotation, { y: baseGroup.rotation.y + Math.PI * 0.5, ease: 'power1.inOut' }, 0.56);

  // Reassemble
  masterTL.to(explodeProxy, {
    val: 0,
    ease: 'power1.inOut',
    onUpdate: () => applyExplode(explodeProxy.val)
  }, 0.72);

  // Sweep out: restore ambient
  masterTL.to(sweepProxy, {
    val: 0,
    ease: 'power2.inOut',
    onUpdate: () => { lightSweepProgress = sweepProxy.val; },
    onComplete: () => { lightSweepActive = false; }
  }, 0.73);

  // Chapter 05: PERSONALIZE — pull back
  masterTL.to(targetCamPos, { x: 0, y: 5, z: 10, ease: 'power2.inOut' }, 0.80);
  masterTL.to(targetLookAt, { x: 0, y: -1.9, z: 0, ease: 'power2.inOut' }, 0.80);

  // Chapter 06: SAVE — slight push forward
  masterTL.to(targetCamPos, { x: -0.5, y: 4.2, z: 9.2, ease: 'power2.inOut' }, 0.90);

  // Scroll progress line
  gsap.to('#scroll-line-progress', {
    width: '100%',
    ease: 'none',
    scrollTrigger: {
      trigger: 'main',
      start: 'top top',
      end: 'bottom bottom',
      scrub: true
    }
  });

  // ---- PER-SECTION CONTENT REVEALS (non-hero) ----
  initSectionReveals();

  // ---- CHAPTER INDICATOR UPDATES ----
  initChapterSystem();
}

// ==========================================
// 7. SECTION CONTENT REVEALS
// ==========================================

function initSectionReveals() {
  // For every section (except hero), reveal line-text on scroll enter
  const sections = document.querySelectorAll('section:not(.hero-section)');

  sections.forEach(sec => {
    // Title line reveals
    const lineTexts = sec.querySelectorAll('.line-text');
    if (lineTexts.length > 0) {
      gsap.fromTo(lineTexts,
        { y: '110%' },
        {
          y: '0%',
          duration: 1.0,
          stagger: 0.1,
          ease: 'power4.out',
          scrollTrigger: {
            trigger: sec,
            start: 'top 78%',
            once: true
          }
        }
      );
    }

    // Reveal items (badge, description, card, etc.)
    const revealItems = sec.querySelectorAll('.reveal-item');
    revealItems.forEach(item => {
      const delay = parseFloat(item.dataset.delay || 0);
      gsap.fromTo(item,
        { y: 28, opacity: 0, filter: 'blur(4px)' },
        {
          y: 0, opacity: 1, filter: 'blur(0px)',
          duration: 0.9,
          delay,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: item.closest('section') || item,
            start: 'top 78%',
            once: true
          }
        }
      );
    });
  });

  // Spatial typography parallax (subtle drift on scroll)
  const spatialTypo = document.querySelector('.spatial-typography');
  if (spatialTypo) {
    gsap.to(spatialTypo, {
      y: -60,
      ease: 'none',
      scrollTrigger: {
        trigger: '.playground-section',
        start: 'top bottom',
        end: 'bottom top',
        scrub: true
      }
    });
  }

  // Exploded items: activate on scroll proximity
  const explodedItemEls = document.querySelectorAll('.exploded-item');
  explodedItemEls.forEach((item, i) => {
    ScrollTrigger.create({
      trigger: item,
      start: 'top 65%',
      onEnter: () => {
        explodedItemEls.forEach(el => el.classList.remove('active'));
        item.classList.add('active');
      },
      onEnterBack: () => {
        explodedItemEls.forEach(el => el.classList.remove('active'));
        item.classList.add('active');
      }
    });
  });
}

// ==========================================
// 8. CHAPTER INDICATOR SYSTEM
// ==========================================

function initChapterSystem() {
  const chapterCurrentEl = document.getElementById('chapter-current');
  const chapterLabelEl = document.getElementById('chapter-label');

  const sectionIds = [
    '#hero-section',
    '#playground-section',
    '#presets-section',
    '#reveal-section',
    '#automation-section',
    '.account-cta-section'
  ];

  sectionIds.forEach((selector, i) => {
    const el = document.querySelector(selector);
    if (!el) return;

    ScrollTrigger.create({
      trigger: el,
      start: 'top 55%',
      onEnter: () => updateChapter(i),
      onEnterBack: () => updateChapter(i)
    });
  });

  function updateChapter(index) {
    const chapter = CHAPTERS[index];
    if (!chapter) return;

    // Animate out, swap text, animate in
    gsap.to(chapterCurrentEl, {
      y: -10, opacity: 0, duration: 0.2, ease: 'power2.in',
      onComplete: () => {
        chapterCurrentEl.textContent = chapter.num;
        gsap.to(chapterCurrentEl, { y: 0, opacity: 1, duration: 0.35, ease: 'power3.out' });
      }
    });
    gsap.to(chapterLabelEl, {
      opacity: 0, duration: 0.2,
      onComplete: () => {
        chapterLabelEl.textContent = chapter.label;
        gsap.to(chapterLabelEl, { opacity: 1, duration: 0.35 });
      }
    });
  }
}

// ==========================================
// 9. CUSTOM CURSOR
// ==========================================

function initCustomCursor() {
  const cursor = document.getElementById('custom-cursor');
  if (!cursor || window.innerWidth < 768) return;

  let curX = window.innerWidth / 2;
  let curY = window.innerHeight / 2;

  window.addEventListener('mousemove', e => {
    curX = e.clientX;
    curY = e.clientY;

    // Smooth follow
    gsap.to(cursor, {
      x: curX,
      y: curY,
      duration: 0.12,
      ease: 'power2.out'
    });

    // Mouse parallax target (normalized -1..1)
    mouseParallaxTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseParallaxTarget.y = -((e.clientY / window.innerHeight) * 2 - 1);
  });

  // Hover states
  const interactiveEls = document.querySelectorAll('a, button, input, .preset-card, .timeline-handle, .timeline-point');
  interactiveEls.forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.remove('state-explore', 'state-cta');
      cursor.classList.add('state-hover');
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('state-hover', 'state-cta');
    });
  });

  // CTA buttons: directional arrow state
  document.querySelectorAll('.btn-primary').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('state-cta');
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('state-cta');
    });
  });

  // Canvas: explore state
  const canvasEl = document.getElementById('canvas-container');
  if (canvasEl) {
    canvasEl.addEventListener('mouseenter', () => {
      cursor.classList.remove('state-hover', 'state-cta');
      cursor.classList.add('state-explore');
    });
    canvasEl.addEventListener('mouseleave', () => {
      cursor.classList.remove('state-explore');
    });
  }
}

// ==========================================
// 10. EVENT ATTACHMENTS & SLIDERS
// ==========================================

function updateCoverageHUD() {
  const angleRad = (currentSettings.spread * Math.PI) / 180;
  const distance = 1.9 + 2;
  const radius = distance * Math.tan(angleRad * 0.5);
  const area = Math.PI * radius * radius;
  if (readoutCoverage) readoutCoverage.textContent = `${area.toFixed(1)} m²`;

  if (saveBrightness) saveBrightness.textContent = `${currentSettings.brightness}%`;
  if (saveTemp)       saveTemp.textContent       = `${currentSettings.temp}K`;
  if (saveDensity)    saveDensity.textContent    = `${currentSettings.density}%`;
  if (saveSpread)     saveSpread.textContent     = `${currentSettings.spread}°`;
  if (saveDirection)  saveDirection.textContent  = `${currentSettings.direction}°`;
}

function updateSlidersUI() {
  if (sliderBrightness) sliderBrightness.value = currentSettings.brightness;
  if (valBrightness)    valBrightness.textContent = `${currentSettings.brightness}%`;
  if (sliderTemp)       sliderTemp.value = currentSettings.temp;
  if (valTemp)          valTemp.textContent = `${currentSettings.temp}K`;
  if (sliderDensity)    sliderDensity.value = currentSettings.density;
  if (valDensity)       valDensity.textContent = `${currentSettings.density}%`;
  if (sliderSpread)     sliderSpread.value = currentSettings.spread;
  if (valSpread)        valSpread.textContent = `${currentSettings.spread}°`;
  if (sliderDirection)  sliderDirection.value = currentSettings.direction;
  if (valDirection)     valDirection.textContent = `${currentSettings.direction}°`;
  updateCoverageHUD();
}

function setupSliders() {
  if (!sliderBrightness) return;

  sliderBrightness.addEventListener('input', () => {
    currentSettings.brightness = parseInt(sliderBrightness.value, 10);
    valBrightness.textContent = `${currentSettings.brightness}%`;
    updateCoverageHUD();
    if (currentSettings.brightness > 0 && !lampOn && btnLampToggle) btnLampToggle.click();
  });

  sliderTemp.addEventListener('input', () => {
    currentSettings.temp = parseInt(sliderTemp.value, 10);
    valTemp.textContent = `${currentSettings.temp}K`;
    currentSettings.colorHex = kelvinToHex(currentSettings.temp);
    updateCoverageHUD();
  });

  sliderDensity.addEventListener('input', () => {
    currentSettings.density = parseInt(sliderDensity.value, 10);
    valDensity.textContent = `${currentSettings.density}%`;
    updateCoverageHUD();
  });

  sliderSpread.addEventListener('input', () => {
    currentSettings.spread = parseInt(sliderSpread.value, 10);
    valSpread.textContent = `${currentSettings.spread}°`;
    updateCoverageHUD();
  });

  sliderDirection.addEventListener('input', () => {
    currentSettings.direction = parseInt(sliderDirection.value, 10);
    valDirection.textContent = `${currentSettings.direction}°`;
    updateCoverageHUD();
  });
}

function kelvinToHex(kelvin) {
  if (kelvin <= 3000) return '#ffb84d';
  if (kelvin > 3000 && kelvin <= 3800) return '#fdf2e9';
  if (kelvin > 3800 && kelvin <= 4500) return '#e0f2fe';
  return '#f0f9ff';
}

// ==========================================
// 11. PRESET SELECTORS
// ==========================================

function initPresetSelectors() {
  function applyPreset(key) {
    currentPresetKey = key;
    const config = SCENE_PRESETS[key];
    if (!config) return;

    currentSettings.brightness = config.brightness;
    currentSettings.temp = config.temp;
    currentSettings.density = config.density;
    currentSettings.spread = config.spread;
    currentSettings.direction = config.direction;
    currentSettings.colorHex = config.colorHex;

    if (!lampOn && btnLampToggle) btnLampToggle.click();
    updateSlidersUI();

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-preset-scene') === key);
    });

    presetCards.forEach(card => {
      card.classList.toggle('active', card.getAttribute('data-preset') === key);
    });

    document.querySelectorAll('.timeline-point').forEach(pt => {
      pt.classList.toggle('active', pt.getAttribute('data-preset') === key);
    });

    if (syncingPresetText) {
      syncingPresetText.textContent = `${config.name} • ${config.brightness}% brightness • ${config.temp}K`;
    }
  }

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-preset-scene');
      if (key !== 'custom') applyPreset(key);
    });
  });

  presetCards.forEach(card => {
    card.addEventListener('click', () => {
      const key = card.getAttribute('data-preset');
      applyPreset(key);
      let pct = 10;
      if (key === 'reading') pct = 50;
      if (key === 'wind-down') pct = 90;
      updateTimelineProgress(pct);
    });
  });
}

// ==========================================
// 12. TIMELINE DRAG
// ==========================================

const dragHandle = document.getElementById('timeline-drag-handle');
const progressBar = document.getElementById('timeline-progress-bar');
const timelineContainer = document.querySelector('.timeline-bar');

function updateTimelineProgress(percentage) {
  percentage = Math.max(0, Math.min(100, percentage));
  if (dragHandle) dragHandle.style.left = `${percentage}%`;
  if (progressBar) progressBar.style.width = `${percentage}%`;

  let presetKey = 'focus';
  if (percentage > 35 && percentage <= 75) presetKey = 'reading';
  else if (percentage > 75) presetKey = 'wind-down';

  if (currentPresetKey !== presetKey) {
    const presetBtn = document.querySelector(`.preset-btn[data-preset-scene="${presetKey}"]`);
    if (presetBtn) presetBtn.click();
  }
}

function setupTimelineDrag() {
  if (!dragHandle || !timelineContainer) return;
  let isDragging = false;

  dragHandle.addEventListener('mousedown', e => { isDragging = true; e.preventDefault(); });
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const rect = timelineContainer.getBoundingClientRect();
    updateTimelineProgress(((e.clientX - rect.left) / rect.width) * 100);
  });
  window.addEventListener('mouseup', () => { isDragging = false; });

  document.querySelectorAll('.timeline-point').forEach(pt => {
    pt.addEventListener('click', () => updateTimelineProgress(parseInt(pt.getAttribute('data-pct'), 10)));
  });

  dragHandle.addEventListener('touchstart', () => { isDragging = true; });
  window.addEventListener('touchmove', e => {
    if (!isDragging) return;
    const rect = timelineContainer.getBoundingClientRect();
    const touch = e.touches[0];
    updateTimelineProgress(((touch.clientX - rect.left) / rect.width) * 100);
  });
  window.addEventListener('touchend', () => { isDragging = false; });
}

// ==========================================
// 13. LAMP TOGGLE
// ==========================================

function setupToggleSwitch() {
  if (!btnLampToggle) return;
  btnLampToggle.addEventListener('click', () => {
    lampOn = !lampOn;
    if (lampOn) {
      btnLampToggle.textContent = 'Turn LUMOS off';
      btnLampToggle.classList.add('active');
      document.body.classList.add('lamp-active');
      if (lampStatusText) lampStatusText.textContent = 'LUMOS • ACTIVE';
      if (badgePulse) badgePulse.classList.add('active');
      const logoDot = document.getElementById('logo-dot-glow');
      if (logoDot) logoDot.setAttribute('fill', '#00E5C3');
      if (currentSettings.brightness === 0) {
        currentSettings.brightness = 82;
        updateSlidersUI();
      }
    } else {
      btnLampToggle.textContent = 'Turn LUMOS on';
      btnLampToggle.classList.remove('active');
      document.body.classList.remove('lamp-active');
      if (lampStatusText) lampStatusText.textContent = 'LUMOS • OFF';
      if (badgePulse) badgePulse.classList.remove('active');
      const logoDot = document.getElementById('logo-dot-glow');
      if (logoDot) logoDot.setAttribute('fill', '#D8C39A');
    }
  });
}

// ==========================================
// 14. SIGNUP MODAL
// ==========================================

function openSignupModal() {
  if (signupModal) {
    signupModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

function closeSignupModal() {
  if (signupModal) {
    signupModal.classList.add('hidden');
    document.body.style.overflow = '';
  }
  if (modalFormView) modalFormView.classList.remove('hidden');
  if (modalSuccessView) modalSuccessView.classList.add('hidden');
}

if (btnSavePreset)          btnSavePreset.addEventListener('click', openSignupModal);
if (btnCreateAccountHero)   btnCreateAccountHero.addEventListener('click', openSignupModal);
if (btnNavSignup)           btnNavSignup.addEventListener('click', openSignupModal);
if (btnFinalRegister)       btnFinalRegister.addEventListener('click', openSignupModal);
if (modalCloseBtn)          modalCloseBtn.addEventListener('click', closeSignupModal);

if (signupModal) {
  signupModal.addEventListener('click', e => {
    if (e.target === signupModal) closeSignupModal();
  });
}

if (signupForm) {
  signupForm.addEventListener('submit', e => {
    e.preventDefault();
    if (modalFormView) modalFormView.classList.add('hidden');
    if (modalSuccessView) modalSuccessView.classList.remove('hidden');
  });
}

if (modalSuccessDoneBtn) {
  modalSuccessDoneBtn.addEventListener('click', closeSignupModal);
}

// ==========================================
// 15. EASTER EGG ENGINEERING HUD
// ==========================================

const logoLink = document.getElementById('nav-logo-link');
const engineeringConsole = document.getElementById('engineering-console');
const closeEngBtn = document.getElementById('close-eng-btn');

let logoClicks = 0;
let engIntervalId = null;

if (logoLink) {
  logoLink.addEventListener('click', e => {
    e.preventDefault();
    logoClicks++;
    if (logoClicks === 5) {
      logoClicks = 0;
      activateEngineeringHUD();
    }
  });
}

function activateEngineeringHUD() {
  if (!engineeringConsole) return;
  engineeringConsole.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  const tempHUD    = document.getElementById('eng-temp');
  const powerHUD   = document.getElementById('eng-power');
  const voltageHUD = document.getElementById('eng-voltage');
  const voltsList  = document.getElementById('eng-volts-list');
  if (voltsList) voltsList.innerHTML = '';

  engIntervalId = setInterval(() => {
    const temp    = (31.1 + Math.random() * 0.6).toFixed(1);
    const power   = (lampOn ? (currentSettings.brightness / 100) * 16.5 + 1.2 : 0.8 + Math.random() * 0.1).toFixed(1);
    const voltage = (12.02 + Math.random() * 0.04).toFixed(2);
    if (tempHUD)    tempHUD.textContent    = `${temp}°C`;
    if (powerHUD)   powerHUD.textContent   = `${power}W`;
    if (voltageHUD) voltageHUD.textContent = `${voltage}V`;

    if (voltsList) {
      const log = document.createElement('p');
      log.style.color = '#555';
      log.style.fontFamily = 'var(--font-mono)';
      log.style.fontSize = '0.72rem';
      log.textContent = `[BUS OUT] V_REG: ${voltage}V | PWM_DUTY: ${currentSettings.brightness}% | KELVIN_SENSE: ${currentSettings.temp}K`;
      voltsList.insertBefore(log, voltsList.firstChild);
      if (voltsList.children.length > 8) voltsList.removeChild(voltsList.lastChild);
    }
  }, 500);
}

function deactivateEngineeringHUD() {
  if (engineeringConsole) engineeringConsole.classList.add('hidden');
  document.body.style.overflow = '';
  if (engIntervalId) { clearInterval(engIntervalId); engIntervalId = null; }
}

if (closeEngBtn) closeEngBtn.addEventListener('click', deactivateEngineeringHUD);

window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && engineeringConsole && !engineeringConsole.classList.contains('hidden')) {
    deactivateEngineeringHUD();
  }
});

// ==========================================
// 16. GLOBAL MOUSE + RESIZE
// ==========================================

window.addEventListener('mousemove', e => {
  mouseRay.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouseRay.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('resize', () => {
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
});

// ==========================================
// 17. BOOT SEQUENCE
// ==========================================

init3DScene();
setupToggleSwitch();
setupSliders();
initPresetSelectors();
setupTimelineDrag();
updateSlidersUI();
initCustomCursor();
initScrollAnimations();
initPreloader();
animateWebGLScene();

// ==========================================
// 18. MAGNETIC BUTTONS
// ==========================================
function initMagneticButtons() {
  const RADIUS = 110;
  const STRENGTH = 0.38;

  const btns = document.querySelectorAll('.btn-primary, .btn-secondary, .btn-lamp-toggle');

  document.addEventListener('mousemove', e => {
    btns.forEach(btn => {
      const rect = btn.getBoundingClientRect();
      const bX = rect.left + rect.width / 2;
      const bY = rect.top + rect.height / 2;
      const dX = e.clientX - bX;
      const dY = e.clientY - bY;
      const dist = Math.sqrt(dX * dX + dY * dY);

      if (dist < RADIUS) {
        const pull = (1 - dist / RADIUS) * STRENGTH;
        gsap.to(btn, {
          x: dX * pull,
          y: dY * pull,
          duration: 0.45,
          ease: 'power3.out',
          overwrite: 'auto'
        });
      } else {
        gsap.to(btn, {
          x: 0, y: 0,
          duration: 0.7,
          ease: 'elastic.out(1, 0.55)',
          overwrite: 'auto'
        });
      }
    });
  });
}

// ==========================================
// 19. TEMPERATURE COLOUR CAST
// ==========================================
const tempCastOverlay = document.getElementById('temp-cast-overlay');

function updateTemperatureCast(kelvin) {
  if (!tempCastOverlay) return;
  let r = 0, g = 0, b = 0, a = 0;

  if (kelvin <= 3200) {
    // Warm amber glow — the room tints orange
    const t = Math.min((3200 - kelvin) / 500, 1);
    r = 255; g = 130; b = 20;
    a = t * 0.07;
  } else if (kelvin >= 5600) {
    // Cool blue — clinical precision feeling
    const t = Math.min((kelvin - 5600) / 900, 1);
    r = 60; g = 100; b = 255;
    a = t * 0.055;
  }
  // 3200–5600K: neutral — overlay invisible

  gsap.to(tempCastOverlay, {
    backgroundColor: `rgba(${r},${g},${b},${a})`,
    duration: 0.9,
    ease: 'power2.out'
  });
}

// ==========================================
// 20. TYPED TERMINAL TEXT
// ==========================================
function typeText(element, text, speed = 52) {
  if (!element) return;
  element.textContent = '';
  let i = 0;
  const id = setInterval(() => {
    element.textContent += text[i];
    i++;
    if (i >= text.length) clearInterval(id);
  }, speed);
}

// ==========================================
// 21. SMOOTH GSAP COUNTER
// ==========================================
function animateValue(element, from, to, suffix = '', duration = 0.45) {
  if (!element) return;
  const obj = { val: from };
  gsap.to(obj, {
    val: to,
    duration,
    ease: 'power2.out',
    onUpdate: () => {
      element.textContent = `${Math.round(obj.val)}${suffix}`;
    }
  });
}

// ==========================================
// 22. PRESET CARD HOVER PREVIEW
// ==========================================
function initPresetHoverPreview() {
  if (!presetCards.length) return;

  presetCards.forEach(card => {
    const key = card.getAttribute('data-preset');
    const config = SCENE_PRESETS[key];
    if (!config) return;

    card.addEventListener('mouseenter', () => {
      if (!readoutCoverage) return;
      // Preview this preset's coverage without changing settings
      const angleRad = (config.spread * Math.PI) / 180;
      const dist = 3.9;
      const radius = dist * Math.tan(angleRad * 0.5);
      const area = Math.PI * radius * radius;
      gsap.to(readoutCoverage, { opacity: 0.5, duration: 0.15, onComplete: () => {
        readoutCoverage.textContent = `${area.toFixed(1)} m²`;
        gsap.to(readoutCoverage, { opacity: 1, duration: 0.2 });
      }});
    });

    card.addEventListener('mouseleave', () => {
      updateCoverageHUD();
    });
  });
}

// ==========================================
// 23. LIVE TICKER UPDATES
// ==========================================
function updateTickerValues() {
  const tickTemp       = document.querySelectorAll('.tick-val[id="tick-temp"], .ticker-track .tick-val:nth-child(4)');
  const tickBrightness = document.querySelectorAll('.tick-val[id="tick-brightness"]');
  const tickCoverage   = document.querySelectorAll('.tick-val[id="tick-coverage"]');

  // Update all .tick-val elements (primary + duplicate)
  document.querySelectorAll('.tick-val').forEach((el, i) => {
    const idx = i % 3; // 0=temp, 1=brightness, 2=coverage (groups of 3 in each half)
  });

  // Simpler: update by id first, then propagate to duplicates
  const tTemp = document.getElementById('tick-temp');
  const tBright = document.getElementById('tick-brightness');
  const tCov = document.getElementById('tick-coverage');

  if (tTemp) tTemp.textContent = `${currentSettings.temp}K`;
  if (tBright) tBright.textContent = `${currentSettings.brightness}%`;

  const angleRad = (currentSettings.spread * Math.PI) / 180;
  const dist = 3.9;
  const radius = dist * Math.tan(angleRad * 0.5);
  const area = (Math.PI * radius * radius).toFixed(1);
  if (tCov) tCov.textContent = `${area}m²`;
}

// Show ticker after preloader
function showTicker() {
  const ticker = document.getElementById('hero-ticker');
  if (ticker) ticker.classList.add('visible');
}

// ==========================================
// WIRE UP NEW SYSTEMS INTO EXISTING HANDLERS
// ==========================================

// Patch slider handlers to also: smooth counter + temp cast + ticker update
const originalSliders = [
  { el: sliderBrightness, valEl: valBrightness, suffix: '%', key: 'brightness', min: 0 },
  { el: sliderTemp,       valEl: valTemp,       suffix: 'K', key: 'temp',       min: 2700 },
  { el: sliderDensity,    valEl: valDensity,    suffix: '%', key: 'density',    min: 0 },
  { el: sliderSpread,     valEl: valSpread,     suffix: '°', key: 'spread',     min: 12 },
  { el: sliderDirection,  valEl: valDirection,  suffix: '°', key: 'direction',  min: -45 }
];

originalSliders.forEach(({ el, valEl, suffix, key }) => {
  if (!el) return;
  el.addEventListener('input', () => {
    const val = parseInt(el.value, 10);
    const prev = currentSettings[key];
    animateValue(valEl, prev, val, suffix, 0.3);

    if (key === 'temp') updateTemperatureCast(val);
    updateTickerValues();
  });
});

// Patch lamp toggle typed text
if (btnLampToggle) {
  const origHandler = btnLampToggle.onclick;
  btnLampToggle.addEventListener('click', () => {
    // Typed text fires after the lampOn state flips (see setupToggleSwitch)
    setTimeout(() => {
      if (lampOn && lampStatusText) {
        typeText(lampStatusText, 'LUMOS • ACTIVE', 48);
      }
    }, 80);
    showTicker();
  }, { passive: true });
}

// ==========================================
// BOOT — call all new systems
// ==========================================
initMagneticButtons();
initPresetHoverPreview();
// Trigger initial temp cast (neutral at 4100K → invisible)
updateTemperatureCast(currentSettings.temp);
// Show ticker on load after brief delay
setTimeout(showTicker, 4500);

