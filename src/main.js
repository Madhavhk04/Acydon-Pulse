import * as THREE from 'three';

// ==========================================
// 1. DATA AND STATES FOR SIMULATION
// ==========================================

const SCENE_PRESETS = {
  focus: {
    name: 'Focus Mode',
    brightness: 82,
    temp: 4100,
    density: 80,
    spread: 38,
    direction: 0,
    colorHex: '#e0f2fe'
  },
  reading: {
    name: 'Reading Mode',
    brightness: 64,
    temp: 3500,
    density: 68,
    spread: 52,
    direction: -10,
    colorHex: '#fdf2e9'
  },
  'wind-down': {
    name: 'Wind Down',
    brightness: 32,
    temp: 2700,
    density: 50,
    spread: 70,
    direction: 15,
    colorHex: '#ffb84d'
  }
};

let currentPresetKey = 'focus';
let lampOn = false;

// Real-time target values mapped from GUI
let currentSettings = {
  brightness: 82,
  temp: 4100,
  density: 68,
  spread: 52,
  direction: 0,
  colorHex: '#e0f2fe'
};

// Render lerp parameters
let lampIntensity = 0;
let lampColor = new THREE.Color('#e0f2fe');
let lampPenumbra = 0.68;
let lampAngle = 0.52;
let lampBaseSwivel = 0;
let explodeFactor = 0; // scroll exploded step offset multiplier

// ==========================================
// 2. DOM ELEMENT REFERENCES
// ==========================================

const btnLampToggle = document.getElementById('btn-lamp-toggle');
const lampStatusText = document.getElementById('lamp-status-text');
const badgePulse = document.querySelector('.badge-pulse');

// Telemetry & readouts
const readoutCoverage = document.getElementById('readout-coverage');

const saveBrightness = document.getElementById('save-brightness');
const saveTemp = document.getElementById('save-temp');
const saveDensity = document.getElementById('save-density');
const saveSpread = document.getElementById('save-spread');
const saveDirection = document.getElementById('save-direction');

// Sliders
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

// Presets
const presetBtns = document.querySelectorAll('.preset-btn');
const presetCards = document.querySelectorAll('.preset-card');

// Signup modal
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

// Exploded text reveal triggers
const explodedItems = document.querySelectorAll('.exploded-item');

// ==========================================
// 3. THREE.JS 3D WORKSPACE SETUP
// ==========================================

const canvas = document.getElementById('luma-webgl-canvas');
let renderer, scene, camera;

// Lamp 3D Hierarchical Joints
let baseGroup, lowerArmGroup, upperArmGroup, headGroup;
let lowerArmMesh, upperArmMesh, headCasingMesh, emitterMesh;
let joint1Mesh, joint2Mesh, joint3Mesh; // pivot capsules

// Workspace procedural items
let desk, laptopBase, laptopScreen, notebook, mug, plantPot, plantLeaves;

// Lights
let ambientLight, spotLight, spotLightTarget;
let targetDeskPoint = new THREE.Vector3(0, -1.9, 0); // initial beam focus coordinate
let lerpedDeskPoint = new THREE.Vector3(0, -1.9, 0);
let mouseRay = new THREE.Vector2(-1000, -1000);
let deskIntersectionPlane;

function init3DScene() {
  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 5, 12);

  // Setup raycasting plane matching desk surface height (y = -1.9)
  deskIntersectionPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1.9);

  // LIGHTS
  ambientLight = new THREE.AmbientLight(0xffffff, 0.03); // very subtle ambient room brightness
  scene.add(ambientLight);

  // Active SpotLight (Light Engine)
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

  // Target object to orient Spotlight cone
  spotLightTarget = new THREE.Object3D();
  scene.add(spotLightTarget);
  spotLight.target = spotLightTarget;

  // PROCEDURAL WORKSPACE ENVIRONMENT
  // 1. Desk Surface
  const deskGeo = new THREE.BoxGeometry(16, 0.2, 10);
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x0f0f11, roughness: 0.7, metalness: 0.15 });
  desk = new THREE.Mesh(deskGeo, deskMat);
  desk.position.y = -2;
  desk.receiveShadow = true;
  scene.add(desk);

  // 2. Procedural Laptop
  const laptopGroup = new THREE.Group();
  laptopGroup.position.set(-1.8, -1.9, -0.5);
  laptopGroup.rotation.y = 0.25;

  const baseGeo = new THREE.BoxGeometry(1.8, 0.04, 1.25);
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x222225, roughness: 0.4, metalness: 0.8 });
  laptopBase = new THREE.Mesh(baseGeo, metalMat);
  laptopBase.castShadow = true;
  laptopBase.receiveShadow = true;
  laptopGroup.add(laptopBase);

  const screenGeo = new THREE.BoxGeometry(1.8, 1.2, 0.04);
  laptopScreen = new THREE.Mesh(screenGeo, metalMat);
  laptopScreen.position.set(0, 0.6, -0.6);
  laptopScreen.rotation.x = -0.25; // open angle
  laptopScreen.castShadow = true;
  laptopScreen.receiveShadow = true;
  laptopGroup.add(laptopScreen);
  scene.add(laptopGroup);

  // 3. Procedural Notebook
  const noteGeo = new THREE.BoxGeometry(1.0, 0.02, 1.3);
  const noteMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
  notebook = new THREE.Mesh(noteGeo, noteMat);
  notebook.position.set(0.2, -1.98, 0.5);
  notebook.rotation.y = -0.4;
  notebook.receiveShadow = true;
  scene.add(notebook);

  // 4. Procedural Coffee Mug
  const mugGroup = new THREE.Group();
  mugGroup.position.set(-1.2, -1.9, 1.4);
  const mugGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 24);
  const mugMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.2, metalness: 0.1 });
  mug = new THREE.Mesh(mugGeo, mugMat);
  mug.castShadow = true;
  mug.receiveShadow = true;
  mugGroup.add(mug);
  scene.add(mugGroup);

  // 5. Procedural Plant Pot & Leaves
  const plantGroup = new THREE.Group();
  plantGroup.position.set(2.8, -1.9, -1.5);
  
  const potGeo = new THREE.CylinderGeometry(0.3, 0.22, 0.6, 24);
  const potMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1f, roughness: 0.6 });
  plantPot = new THREE.Mesh(potGeo, potMat);
  plantPot.castShadow = true;
  plantPot.receiveShadow = true;
  plantGroup.add(plantPot);

  const leafGeo = new THREE.DodecahedronGeometry(0.25, 1);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x1d221d, roughness: 0.8 });
  plantLeaves = new THREE.Mesh(leafGeo, leafMat);
  plantLeaves.position.set(0, 0.45, 0);
  plantLeaves.castShadow = true;
  plantGroup.add(plantLeaves);
  scene.add(plantGroup);

  // DYNAMIC THREE.JS LAMP ASSEMBLY HIERARCHY
  // Base Group (Swivels around Y axis)
  baseGroup = new THREE.Group();
  baseGroup.position.set(1.6, -1.9, 0.4);
  baseGroup.rotation.y = 0.5;
  scene.add(baseGroup);

  const basePlateGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.08, 32);
  const basePlate = new THREE.Mesh(basePlateGeo, metalMat);
  basePlate.receiveShadow = true;
  baseGroup.add(basePlate);

  // Joint 1 Pivot Capsule
  const jointGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.2, 16);
  jointGeo.rotateX(Math.PI * 0.5);
  joint1Mesh = new THREE.Mesh(jointGeo, metalMat);
  joint1Mesh.position.y = 0.15;
  baseGroup.add(joint1Mesh);

  // Lower Arm Link (Parallel Double rods)
  lowerArmGroup = new THREE.Group();
  lowerArmGroup.position.set(0, 0.15, 0);
  lowerArmGroup.rotation.z = -0.55; // default angle
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
  lowerArmMesh = rod1; // placeholder for explode offsets

  // Joint 2 Hinge
  joint2Mesh = new THREE.Mesh(jointGeo, metalMat);
  joint2Mesh.position.set(0, 1.8, 0);
  lowerArmGroup.add(joint2Mesh);

  // Upper Arm Link
  upperArmGroup = new THREE.Group();
  upperArmGroup.position.set(0, 1.8, 0);
  upperArmGroup.rotation.z = 1.15; // default angle
  lowerArmGroup.add(upperArmGroup);

  const upperRodGeo = new THREE.BoxGeometry(0.06, 1.4, 0.06);
  upperArmMesh = new THREE.Mesh(upperRodGeo, metalMat);
  upperArmMesh.position.y = 0.7;
  upperArmMesh.castShadow = true;
  upperArmGroup.add(upperArmMesh);

  // Joint 3 Head Pivot
  joint3Mesh = new THREE.Mesh(jointGeo, metalMat);
  joint3Mesh.position.set(0, 1.4, 0);
  upperArmGroup.add(joint3Mesh);

  // Head Group (Lamp head casing + LEDs)
  headGroup = new THREE.Group();
  headGroup.position.set(0, 1.4, 0);
  headGroup.rotation.z = -0.6; // pointing beam down
  upperArmGroup.add(headGroup);

  const headCasingGeo = new THREE.BoxGeometry(0.18, 0.1, 1.2);
  headCasingMesh = new THREE.Mesh(headCasingGeo, metalMat);
  headCasingMesh.position.set(0.18, 0, 0);
  headCasingMesh.castShadow = true;
  headGroup.add(headCasingMesh);

  // Emissive light strip lens
  const emitterGeo = new THREE.BoxGeometry(0.02, 0.03, 0.9);
  const emitterMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    emissive: 0x000000,
    roughness: 0.1
  });
  emitterMesh = new THREE.Mesh(emitterGeo, emitterMat);
  emitterMesh.position.set(0.18, -0.05, 0);
  headGroup.add(emitterMesh);
}

// ==========================================
// 4. TRIGONOMETRIC POINTING MATHS & RENDER LOOP
// ==========================================

const raycaster = new THREE.Raycaster();

function updateMechanicalPointing() {
  if (mouseRay.x > -100 && mouseRay.y > -100) {
    // Cast cursor coordinates onto desk surface plane
    raycaster.setFromCamera(mouseRay, camera);
    const intersectPoint = new THREE.Vector3();
    
    if (raycaster.ray.intersectPlane(deskIntersectionPlane, intersectPoint)) {
      // Bound pointer limits to active desk surface area
      intersectPoint.x = Math.max(-4.5, Math.min(4.5, intersectPoint.x));
      intersectPoint.z = Math.max(-3.5, Math.min(3.5, intersectPoint.z));
      targetDeskPoint.copy(intersectPoint);
    }
  }

  // Smooth pointer tracking with inertia (Lerp)
  lerpedDeskPoint.lerp(targetDeskPoint, 0.08);

  // Map Y Swivel angle from Base to targetDeskPoint coordinates
  const localTarget = baseGroup.parent.worldToLocal(lerpedDeskPoint.clone());
  const angleY = Math.atan2(baseGroup.position.x - localTarget.x, baseGroup.position.z - localTarget.z);
  
  // Interpolate base rotation combining swivel offsets
  const targetBaseSwivel = (currentSettings.direction * Math.PI) / 180;
  lampBaseSwivel += (targetBaseSwivel - lampBaseSwivel) * 0.15;
  
  baseGroup.rotation.y = angleY + Math.PI * 0.5 + lampBaseSwivel;

  // Compute mechanical hinge limits based on distance to target coordinates
  const worldJoint2 = new THREE.Vector3();
  joint2Mesh.getWorldPosition(worldJoint2);
  const dX = lerpedDeskPoint.x - worldJoint2.x;
  const dY = lerpedDeskPoint.y - worldJoint2.y;
  const dZ = lerpedDeskPoint.z - worldJoint2.z;
  const dist = Math.sqrt(dX * dX + dY * dY + dZ * dZ);

  // Lower arm points back slightly, upper arm points forward to follow
  const targetLowerZ = -0.55 + Math.sin(driftTime * 0.5) * 0.05;
  lowerArmGroup.rotation.z += (targetLowerZ - lowerArmGroup.rotation.z) * 0.1;

  let targetUpperZ = 1.15;
  if (dist < 4) {
    targetUpperZ = 1.5 - (dist * 0.1);
  }
  upperArmGroup.rotation.z += (targetUpperZ - upperArmGroup.rotation.z) * 0.1;

  // Head tilts down perpendicular to target coordinate vectors
  const worldHead = new THREE.Vector3();
  headCasingMesh.getWorldPosition(worldHead);
  const vecX = lerpedDeskPoint.x - worldHead.x;
  const vecY = lerpedDeskPoint.y - worldHead.y;
  const vecZ = lerpedDeskPoint.z - worldHead.z;
  
  const tiltAngle = Math.atan2(vecY, Math.sqrt(vecX*vecX + vecZ*vecZ));
  headGroup.rotation.z += (-tiltAngle - Math.PI * 0.5 - headGroup.rotation.z) * 0.12;

  // Place active spotlight target position at pointer coordinates
  spotLightTarget.position.copy(lerpedDeskPoint);

  // Position source spotlight at lamp head emitter array center
  const worldEmitter = new THREE.Vector3();
  emitterMesh.getWorldPosition(worldEmitter);
  spotLight.position.copy(worldEmitter);
}

let driftTime = 0;

function animateWebGLScene() {
  driftTime += 0.005;

  // 1. Interpolate lighting params (Kelvins and Lux intensity)
  const targetIntensity = lampOn ? (currentSettings.brightness / 100) * 8.5 : 0;
  lampIntensity += (targetIntensity - lampIntensity) * 0.12;

  const presetColor = new THREE.Color(currentSettings.colorHex);
  lampColor.lerp(presetColor, 0.12);

  const targetPenumbra = currentSettings.density / 100;
  lampPenumbra += (targetPenumbra - lampPenumbra) * 0.12;

  const targetAngle = (currentSettings.spread * Math.PI) / 180;
  lampAngle += (targetAngle - lampAngle) * 0.12;

  // Update spotlight settings
  spotLight.intensity = lampIntensity;
  spotLight.color.copy(lampColor);
  spotLight.penumbra = lampPenumbra;
  spotLight.angle = lampAngle;

  // Update head LED emissive glow matching intensity
  if (lampOn) {
    emitterMesh.material.emissive.copy(lampColor).multiplyScalar(lampIntensity * 0.2);
  } else {
    emitterMesh.material.emissive.setHex(0x000000);
  }

  // 2. Adjust joint mechanics
  updateMechanicalPointing();

  // 3. Scroll cinematic camera mapping & exploded coordinates
  handleCinematicScroll();

  // 4. Render frame
  renderer.render(scene, camera);
  animationId = requestAnimationFrame(animateWebGLScene);
}

let animationId = null;

// ==========================================
// 5. CINEMATIC SCROLL TRANSITIONS
// ==========================================

function handleCinematicScroll() {
  const scrollY = window.scrollY;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const pct = scrollY / (maxScroll || 1);

  // A. Camera coordinate interpolation curves
  // Milestones: 
  // 0 - 20% (Hero) -> Camera far, overview
  // 20% - 50% (Playground & Presets) -> Camera moves closer, tilts down to show workspace desk
  // 50% - 75% (Explode section) -> Camera zooms in tight on joints
  // 75% - 100% (Final CTA) -> Camera zooms back out slightly

  let targetCam = new THREE.Vector3(0, 5, 12);
  let targetLook = new THREE.Vector3(0, -1.9, 0);

  if (pct <= 0.2) {
    // Hero Overview
    const ratio = pct / 0.2;
    targetCam.set(0, 5 - ratio * 1, 12 - ratio * 4); // moves closer
  } else if (pct > 0.2 && pct <= 0.5) {
    // Workspace focus
    const ratio = (pct - 0.2) / 0.3;
    targetCam.set(1.5 * ratio, 4 - ratio * 0.8, 8 - ratio * 2.2); // rotates side
    targetLook.set(0.5 * ratio, -1.9, 0);
  } else if (pct > 0.5 && pct <= 0.78) {
    // Explode Focus (tight macro close-up on hinges)
    const ratio = (pct - 0.5) / 0.28;
    targetCam.set(1.5 - ratio * 0.5, 3.2 - ratio * 0.6, 5.8 - ratio * 2.5); // tight zoom
    targetLook.copy(baseGroup.position).add(new THREE.Vector3(0, 1.2, 0)); // look at upper arm
  } else {
    // Final overview
    const ratio = (pct - 0.78) / 0.22;
    targetCam.set(1.0 - ratio * 1.0, 2.6 + ratio * 2.4, 3.3 + ratio * 6.7);
    targetLook.set(0, -1.9, 0);
  }

  camera.position.lerp(targetCam, 0.08);

  // LookAt target interpolation
  const currentLook = new THREE.Vector3(0, -1.9, 0);
  // Using custom matrix calculations to smoothly update camera view vector
  const camMatrix = new THREE.Matrix4();
  camMatrix.lookAt(camera.position, targetLook, new THREE.Vector3(0, 1, 0));
  const targetRotation = new THREE.Quaternion().setFromRotationMatrix(camMatrix);
  camera.quaternion.slerp(targetRotation, 0.08);

  // B. Progressive Exploded View Coordinate Shifts (Hinge disassembly)
  // Exploded view highlights steps between 50% and 78% scroll depth
  let targetExplode = 0;
  if (pct > 0.52 && pct <= 0.76) {
    targetExplode = Math.sin((pct - 0.52) / 0.24 * Math.PI) * 1.15; // smooth expansion bubble
  }
  explodeFactor += (targetExplode - explodeFactor) * 0.12;

  // Apply visual coordinate separation
  if (explodeFactor > 0.01) {
    lowerArmMesh.position.x = -explodeFactor * 0.15; // parallel double rods separate
    upperArmMesh.position.z = explodeFactor * 0.18; // links pull out
    headCasingMesh.position.y = explodeFactor * 0.32; // casing slides up
    emitterMesh.position.y = -explodeFactor * 0.22; // diffuser strip drops down
    joint2Mesh.position.z = explodeFactor * 0.45; // hinge pins pull along Z axis
    joint3Mesh.position.z = -explodeFactor * 0.45;
  } else {
    // Reset structural assembly coordinates
    lowerArmMesh.position.x = 0;
    upperArmMesh.position.z = 0;
    headCasingMesh.position.y = 0;
    emitterMesh.position.y = -0.05;
    joint2Mesh.position.z = 0;
    joint3Mesh.position.z = 0;
  }

  // Update progressive step text markers
  if (pct > 0.5 && pct <= 0.78) {
    const stepCount = explodedItems.length;
    const triggerRatio = (pct - 0.5) / 0.28;
    let activeIdx = Math.floor(triggerRatio * stepCount);
    activeIdx = Math.max(0, Math.min(stepCount - 1, activeIdx));

    explodedItems.forEach((item, index) => {
      if (index === activeIdx) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }
}

// ==========================================
// 6. EVENT ATTACHMENTS & INTERACTIVE SLIDERS
// ==========================================

function updateCoverageHUD() {
  // coverage calculation: spread angle (aperture), distance, density
  const angleRad = (currentSettings.spread * Math.PI) / 180;
  const distance = 1.9 + 2; // base height + offset
  const radius = distance * Math.tan(angleRad * 0.5);
  const area = Math.PI * radius * radius;
  
  // Update UICoverage label
  readoutCoverage.textContent = `${area.toFixed(1)} m²`;
  
  // Sync telemetry card values
  saveBrightness.textContent = `${currentSettings.brightness}%`;
  saveTemp.textContent = `${currentSettings.temp}K`;
  saveDensity.textContent = `${currentSettings.density}%`;
  saveSpread.textContent = `${currentSettings.spread}°`;
  saveDirection.textContent = `${currentSettings.direction}°`;
}

function updateSlidersUI() {
  sliderBrightness.value = currentSettings.brightness;
  valBrightness.textContent = `${currentSettings.brightness}%`;

  sliderTemp.value = currentSettings.temp;
  valTemp.textContent = `${currentSettings.temp}K`;

  sliderDensity.value = currentSettings.density;
  valDensity.textContent = `${currentSettings.density}%`;

  sliderSpread.value = currentSettings.spread;
  valSpread.textContent = `${currentSettings.spread}°`;

  sliderDirection.value = currentSettings.direction;
  valDirection.textContent = `${currentSettings.direction}°`;

  updateCoverageHUD();
}

function setupSliders() {
  sliderBrightness.addEventListener('input', () => {
    currentSettings.brightness = parseInt(sliderBrightness.value, 10);
    valBrightness.textContent = `${currentSettings.brightness}%`;
    updateCoverageHUD();

    if (currentSettings.brightness > 0 && !lampOn && btnLampToggle) {
      btnLampToggle.click();
    }
  });

  sliderTemp.addEventListener('input', () => {
    currentSettings.temp = parseInt(sliderTemp.value, 10);
    valTemp.textContent = `${currentSettings.temp}K`;
    
    // Map Kelvins to Hex color
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
  // Simple kelvin color lookup mapping
  if (kelvin <= 3000) return '#ffb84d'; // Warm Amber
  if (kelvin > 3000 && kelvin <= 3800) return '#fdf2e9'; // Warm Neutral
  if (kelvin > 3800 && kelvin <= 4500) return '#e0f2fe'; // Cool Neutral
  return '#f0f9ff'; // Ice Cool White
}

// Preset Swapping (Playground Selector & Preset Cards)
function initPresetSelectors() {
  function applyPreset(key) {
    currentPresetKey = key;
    const config = SCENE_PRESETS[key];
    
    currentSettings.brightness = config.brightness;
    currentSettings.temp = config.temp;
    currentSettings.density = config.density;
    currentSettings.spread = config.spread;
    currentSettings.direction = config.direction;
    currentSettings.colorHex = config.colorHex;

    // Toggle lamp activation status if currently off
    if (!lampOn && btnLampToggle) {
      btnLampToggle.click();
    }

    updateSlidersUI();

    // Update preset quick toggles active state
    document.querySelectorAll('.preset-btn').forEach(btn => {
      if (btn.getAttribute('data-preset-scene') === key) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update preset card active states
    presetCards.forEach(card => {
      if (card.getAttribute('data-preset') === key) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    // Update timeline checkpoints highlights
    document.querySelectorAll('.timeline-point').forEach(pt => {
      if (pt.getAttribute('data-preset') === key) {
        pt.classList.add('active');
      } else {
        pt.classList.remove('active');
      }
    });

    // Sync modal preset descriptions
    syncingPresetText.textContent = `${config.name} • ${config.brightness}% brightness • ${config.temp}K`;
  }

  // Bind quick toggles
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-preset-scene');
      if (key !== 'custom') {
        applyPreset(key);
      }
    });
  });

  // Bind preset card profiles
  presetCards.forEach(card => {
    card.addEventListener('click', () => {
      const key = card.getAttribute('data-preset');
      applyPreset(key);

      // Sync timeline handles matching card progress percentages
      let progressPct = 10;
      if (key === 'reading') progressPct = 50;
      if (key === 'wind-down') progressPct = 90;
      updateTimelineProgress(progressPct);
    });
  });
}

// ==========================================
// 7. DRAG TIMELINE HANDLER AUTOMATION
// ==========================================

const dragHandle = document.getElementById('timeline-drag-handle');
const progressBar = document.getElementById('timeline-progress-bar');
const timelineContainer = document.querySelector('.timeline-bar');

function updateTimelineProgress(percentage) {
  percentage = Math.max(0, Math.min(100, percentage));
  dragHandle.style.left = `${percentage}%`;
  progressBar.style.width = `${percentage}%`;

  let presetKey = 'focus';
  if (percentage > 35 && percentage <= 75) {
    presetKey = 'reading';
  } else if (percentage > 75) {
    presetKey = 'wind-down';
  }

  if (currentPresetKey !== presetKey) {
    const presetBtn = document.querySelector(`.preset-btn[data-preset-scene="${presetKey}"]`);
    if (presetBtn) presetBtn.click();
  }
}

function setupTimelineDrag() {
  if (!dragHandle || !timelineContainer) return;
  
  let isDragging = false;

  dragHandle.addEventListener('mousedown', (e) => {
    isDragging = true;
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const rect = timelineContainer.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const percentage = (offsetX / rect.width) * 100;
    updateTimelineProgress(percentage);
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Timeline checkpoint clicks
  document.querySelectorAll('.timeline-point').forEach(pt => {
    pt.addEventListener('click', () => {
      const pct = parseInt(pt.getAttribute('data-pct'), 10);
      updateTimelineProgress(pct);
    });
  });

  // Touch support for mobile layouts
  dragHandle.addEventListener('touchstart', () => {
    isDragging = true;
  });

  window.addEventListener('touchmove', (e) => {
    if (!isDragging) return;

    const rect = timelineContainer.getBoundingClientRect();
    const touch = e.touches[0];
    const offsetX = touch.clientX - rect.left;
    const percentage = (offsetX / rect.width) * 100;
    updateTimelineProgress(percentage);
  });

  window.addEventListener('touchend', () => {
    isDragging = false;
  });
}


// ==========================================
// 8. ON/OFF TOGGLE SWITCH EVENT
// ==========================================

function setupToggleSwitch() {
  if (!btnLampToggle) return;

  btnLampToggle.addEventListener('click', () => {
    lampOn = !lampOn;

    if (lampOn) {
      btnLampToggle.textContent = 'Turn LUMA off';
      btnLampToggle.classList.add('active');
      lampStatusText.textContent = 'LUMA • ACTIVE';
      badgePulse.classList.add('active');

      const logoDot = document.getElementById('logo-dot-glow');
      if (logoDot) logoDot.setAttribute('fill', '#00E5C3'); // glowing teal dot

      // Trigger default focus brightness values if slider is zero
      if (currentSettings.brightness === 0) {
        currentSettings.brightness = 82;
        updateSlidersUI();
      }
    } else {
      btnLampToggle.textContent = 'Turn LUMA on';
      btnLampToggle.classList.remove('active');
      lampStatusText.textContent = 'LUMA • OFF';
      badgePulse.classList.remove('active');

      const logoDot = document.getElementById('logo-dot-glow');
      if (logoDot) logoDot.setAttribute('fill', '#D8C39A');
    }
  });
}


// ==========================================
// 9. SIGN UP REGISTRATION MOCK MODAL
// ==========================================

function openSignupModal() {
  signupModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeSignupModal() {
  signupModal.classList.add('hidden');
  document.body.style.overflow = '';
  modalFormView.classList.remove('hidden');
  modalSuccessView.classList.add('hidden');
}

if (btnSavePreset) btnSavePreset.addEventListener('click', openSignupModal);
if (btnCreateAccountHero) btnCreateAccountHero.addEventListener('click', openSignupModal);
if (btnNavSignup) btnNavSignup.addEventListener('click', openSignupModal);
if (btnFinalRegister) btnFinalRegister.addEventListener('click', openSignupModal);
if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeSignupModal);

signupModal.addEventListener('click', (e) => {
  if (e.target === signupModal) {
    closeSignupModal();
  }
});

if (signupForm) {
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    modalFormView.classList.add('hidden');
    modalSuccessView.classList.remove('hidden');
  });
}

if (modalSuccessDoneBtn) {
  modalSuccessDoneBtn.addEventListener('click', closeSignupModal);
}


// ==========================================
// 10. EASTER EGG (LOGO 5-CLICK ENGINEERING HUD)
// ==========================================

const logoLink = document.getElementById('nav-logo-link');
const engineeringConsole = document.getElementById('engineering-console');
const closeEngBtn = document.getElementById('close-eng-btn');

let logoClicks = 0;
let engIntervalId = null;

if (logoLink) {
  logoLink.addEventListener('click', (e) => {
    e.preventDefault();
    logoClicks++;
    if (logoClicks === 5) {
      logoClicks = 0;
      activateEngineeringHUD();
    }
  });
}

function activateEngineeringHUD() {
  engineeringConsole.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  const tempHUD = document.getElementById('eng-temp');
  const powerHUD = document.getElementById('eng-power');
  const voltageHUD = document.getElementById('eng-voltage');
  const voltsList = document.getElementById('eng-volts-list');

  voltsList.innerHTML = '';

  engIntervalId = setInterval(() => {
    // Generate organic minor floating diagnostics
    const temp = (31.1 + Math.random() * 0.6).toFixed(1);
    const power = (lampOn ? (currentSettings.brightness / 100) * 16.5 + 1.2 : 0.8 + Math.random()*0.1).toFixed(1);
    const voltage = (12.02 + Math.random() * 0.04).toFixed(2);

    tempHUD.textContent = `${temp}°C`;
    powerHUD.textContent = `${power}W`;
    voltageHUD.textContent = `${voltage}V`;

    const log = document.createElement('p');
    log.textContent = `[BUS OUT] V_REG: ${voltage}V | PWM_DUTY: ${currentSettings.brightness}% | KELVIN_SENSE: ${currentSettings.temp}K | STATE: 0x${(lampOn ? 1 : 0).toString(16)}`;
    voltsList.insertBefore(log, voltsList.firstChild);

    if (voltsList.children.length > 8) {
      voltsList.removeChild(voltsList.lastChild);
    }
  }, 500);
}

function deactivateEngineeringHUD() {
  engineeringConsole.classList.add('hidden');
  document.body.style.overflow = '';
  
  if (engIntervalId) {
    clearInterval(engIntervalId);
    engIntervalId = null;
  }
}

if (closeEngBtn) {
  closeEngBtn.addEventListener('click', deactivateEngineeringHUD);
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !engineeringConsole.classList.contains('hidden')) {
    deactivateEngineeringHUD();
  }
});


// ==========================================
// 11. INITIALIZATION & RESIZE TRACKING
// ==========================================

window.addEventListener('mousemove', (e) => {
  // Normalize screen coordinates for Three.js raycasting (-1 to +1)
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

// Start loop
init3DScene();
setupToggleSwitch();
setupSliders();
initPresetSelectors();
setupTimelineDrag();
updateSlidersUI();
animateWebGLScene();
