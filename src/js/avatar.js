import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ttsState } from './tts.js';

// DOM elements
let container, canvas, loadingEl;

// Three.js variables
let scene, camera, renderer, clock;
let avatarModel = null;
let headBone = null;
let neckBone = null;
let rightEyeBone = null;
let leftEyeBone = null;
let morphTargetsMesh = null;

// Particle system (Antigravity background)
let particleSystem, particleCount = 1200;
let particleGeometry, particlePositions, particleSpeeds;

// Animation & Mouse tracking state
let targetMouse = new THREE.Vector2(0, 0);
let currentMouse = new THREE.Vector2(0, 0);
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

// Character animation variables
let blinkTimer = 0;
let blinkState = 'idle'; // 'idle', 'closing', 'closed', 'opening'
let blinkVal = 0;
let speechVal = 0;
let smileVal = 0.1; // Slight smile as idle
let speechNoiseTimer = 0;

// Dynamic action trigger states
let actionState = 'none'; // 'none', 'nodding', 'shaking'
let actionTimer = 0;

// Default avatar URL (Ready Player Me default female developer avatar)
// If the user wants to customize, they can input their own RPM GLB link in the config tab.
export const avatarConfig = {
  url: localStorage.getItem('avatar_glb_url') || 'https://raw.githubusercontent.com/met4citizen/TalkingHead/main/public/avatars/avatar.glb'
};

// Initialize the 3D Scene
export function initAvatar(containerId, canvasId, loadingId) {
  container = document.getElementById(containerId);
  canvas = document.getElementById(canvasId);
  loadingEl = document.getElementById(loadingId);
  
  if (!container || !canvas) return;

  clock = new THREE.Clock();

  // 1. Scene Setup
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0a1a, 0.04); // Cyberpunk fog

  // 2. Camera Setup
  const rect = container.getBoundingClientRect();
  camera = new THREE.PerspectiveCamera(40, rect.width / rect.height, 0.1, 100);
  camera.position.set(0, 1.45, 1.85); // Position to focus on chest and head
  
  // 3. Renderer Setup
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setSize(rect.width, rect.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  // 4. Lighting Setup
  setupLighting();

  // 5. Antigravity Space Background Setup
  setupAntigravityBackground();

  // 6. Start load of the GLB
  loadAvatarModel(avatarConfig.url);

  // 7. Event listeners
  window.addEventListener('resize', onWindowResize);
  document.addEventListener('mousemove', onMouseMove);

  // 8. Start loop
  animate();
}

function setupLighting() {
  // Ambient Light
  const ambientLight = new THREE.AmbientLight(0x1a2a4a, 0.8);
  scene.add(ambientLight);

  // Key Light (Main Front Light - White/Warm)
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
  keyLight.position.set(1.5, 3, 2);
  keyLight.castShadow = true;
  keyLight.shadow.bias = -0.001;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  scene.add(keyLight);

  // Fill Light (Side Light - Cool Cyan)
  const fillLight = new THREE.DirectionalLight(0x00ffff, 0.8);
  fillLight.position.set(-2, 1, 1);
  scene.add(fillLight);

  // Rim Light (Back Light - Neon Violet for pop and 3D depth)
  const rimLight = new THREE.DirectionalLight(0xbd00ff, 2.0);
  rimLight.position.set(0, 2, -3);
  scene.add(rimLight);

  // Subtle floor grid
  const gridHelper = new THREE.GridHelper(10, 20, 0xbd00ff, 0x111e38);
  gridHelper.position.y = 0;
  scene.add(gridHelper);
  
  // Neon floating podium under the avatar
  const podiumGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.05, 32);
  const podiumMat = new THREE.MeshStandardMaterial({
    color: 0x00ffff,
    emissive: 0x002244,
    roughness: 0.1,
    metalness: 0.8
  });
  const podium = new THREE.Mesh(podiumGeo, podiumMat);
  podium.position.set(0, 0.025, 0);
  podium.receiveShadow = true;
  scene.add(podium);
}

// Generate the beautiful antigravity floating space backdrop
function setupAntigravityBackground() {
  particleGeometry = new THREE.BufferGeometry();
  particlePositions = new Float32Array(particleCount * 3);
  particleSpeeds = new Float32Array(particleCount);
  
  const colors = new Float32Array(particleCount * 3);
  const color1 = new THREE.Color(0x00ffff); // Cyan
  const color2 = new THREE.Color(0xbd00ff); // Violet
  const color3 = new THREE.Color(0xffffff); // Star white

  for (let i = 0; i < particleCount; i++) {
    // Distribute in a spherical cloud around the scene
    const radius = 3 + Math.random() * 12;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta) + 1.0; // Offset up
    const z = radius * Math.cos(phi) - 3.0; // Shift behind avatar

    particlePositions[i * 3] = x;
    particlePositions[i * 3 + 1] = y;
    particlePositions[i * 3 + 2] = z;

    // Drifting speeds
    particleSpeeds[i] = 0.02 + Math.random() * 0.06;

    // Mixed space colors
    const rand = Math.random();
    let particleColor;
    if (rand < 0.4) {
      particleColor = color1;
    } else if (rand < 0.8) {
      particleColor = color2;
    } else {
      particleColor = color3;
    }

    colors[i * 3] = particleColor.r;
    colors[i * 3 + 1] = particleColor.g;
    colors[i * 3 + 2] = particleColor.b;
  }

  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // Round glowing particle texture
  const particleMaterial = new THREE.PointsMaterial({
    size: 0.08,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  particleSystem = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particleSystem);
}

// Load Ready Player Me Avatar Model
export function loadAvatarModel(glbUrl) {
  if (avatarModel) {
    scene.remove(avatarModel);
    avatarModel = null;
    headBone = null;
    neckBone = null;
    rightEyeBone = null;
    leftEyeBone = null;
    morphTargetsMesh = null;
  }

  showLoading(true);
  avatarConfig.url = glbUrl;
  localStorage.setItem('avatar_glb_url', glbUrl);

  // Skip fetch and load hologram instantly for defunct/default URLs to prevent network timeout delay
  if (!glbUrl || glbUrl === 'default' || glbUrl.includes('readyplayer.me') || glbUrl.trim() === '') {
    setTimeout(() => {
      showLoading(false);
      createHologramFallback();
    }, 500);
    return;
  }

  const loader = new GLTFLoader();
  loader.load(
    glbUrl,
    (gltf) => {
      avatarModel = gltf.scene;
      
      // Position model on top of the podium
      avatarModel.position.set(0, 0.05, 0);
      avatarModel.scale.set(1.0, 1.0, 1.0);
      
      // Traverse to enable shadows and identify tracking bones/blendshapes
      avatarModel.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          
          // Ready Player Me avatars hold morph targets on Wolf3D_Head, Wolf3D_Teeth, Wolf3D_Avatar meshes
          if (node.morphTargetDictionary && node.morphTargetInfluences) {
            // Target the main head mesh for blink & talking
            if (node.name.includes("Head") || node.name === "Wolf3D_Avatar" || node.name.includes("Mesh")) {
              morphTargetsMesh = node;
            }
          }
        }
        
        // Find skeletal tracking bones (Standard RPM bone names)
        if (node.isBone) {
          if (node.name.includes("Head") || node.name === "Head") headBone = node;
          if (node.name.includes("Neck") || node.name === "Neck") neckBone = node;
          if (node.name.includes("EyeRight") || node.name === "RightEye") rightEyeBone = node;
          if (node.name.includes("EyeLeft") || node.name === "LeftEye") leftEyeBone = node;
        }
      });

      // Set model visibility based on initial display mode
      const currentMode = localStorage.getItem('visual_mode') || '2d';
      avatarModel.visible = (currentMode === '3d');

      scene.add(avatarModel);
      showLoading(false);
      triggerNod(); // Nod as a greeting!
    },
    (xhr) => {
      // Progress reporting
      if (xhr.total) {
        const percent = Math.round((xhr.loaded / xhr.total) * 100);
        if (loadingEl) loadingEl.innerText = `Loading Avatar: ${percent}%`;
      }
    },
    (error) => {
      console.error("Failed to load Ready Player Me GLB avatar model:", error);
      showLoading(false);
      
      // Display a beautiful neon geometric hologram fallback
      createHologramFallback();
    }
  );
}

// Fallback model representation in case of RPM loading failure
function createHologramFallback() {
  if (avatarModel) return;

  // Let's build a futuristic 3D wireframe head hologram!
  const hologramGroup = new THREE.Group();
  
  // Glowing orb head
  const headGeo = new THREE.SphereGeometry(0.22, 32, 16);
  const headMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    wireframe: true,
    transparent: true,
    opacity: 0.4
  });
  const fallbackHead = new THREE.Mesh(headGeo, headMat);
  fallbackHead.position.set(0, 1.45, 0);
  hologramGroup.add(fallbackHead);

  // Cylindrical neck
  const neckGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.2, 16);
  const neckMat = new THREE.MeshBasicMaterial({
    color: 0xbd00ff,
    wireframe: true,
    transparent: true,
    opacity: 0.3
  });
  const fallbackNeck = new THREE.Mesh(neckGeo, neckMat);
  fallbackNeck.position.set(0, 1.25, 0);
  hologramGroup.add(fallbackNeck);

  // Torso / Shoulders representation
  const shouldersGeo = new THREE.ConeGeometry(0.4, 0.6, 4, 1, true);
  const shouldersMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    wireframe: true,
    transparent: true,
    opacity: 0.2
  });
  const fallbackShoulders = new THREE.Mesh(shouldersGeo, shouldersMat);
  fallbackShoulders.position.set(0, 0.95, 0);
  fallbackShoulders.rotation.y = Math.PI / 4; // Square/diamond facing
  hologramGroup.add(fallbackShoulders);

  // Eye orbs
  const eyeGeo = new THREE.SphereGeometry(0.03, 8, 8);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.07, 1.48, 0.18);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.07, 1.48, 0.18);
  hologramGroup.add(rightEye);
  hologramGroup.add(leftEye);

  // Smile line
  const torusGeo = new THREE.TorusGeometry(0.06, 0.015, 8, 24, Math.PI);
  const torusMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
  const mouth = new THREE.Mesh(torusGeo, torusMat);
  mouth.position.set(0, 1.38, 0.18);
  mouth.rotation.x = Math.PI; // Face forward curve
  hologramGroup.add(mouth);

  avatarModel = hologramGroup;
  
  // Assign dummy bones to prevent errors during tracking calculations
  headBone = fallbackHead;
  neckBone = fallbackNeck;
  morphTargetsMesh = null; // No morphs, we will simulate speech by bouncing head scale

  const currentMode = localStorage.getItem('visual_mode') || '2d';
  avatarModel.visible = (currentMode === '3d');

  scene.add(avatarModel);
}

function showLoading(show) {
  if (loadingEl) {
    loadingEl.style.display = show ? 'flex' : 'none';
  }
}

// Track mouse position
function onMouseMove(event) {
  targetMouse.x = (event.clientX - windowHalfX) / windowHalfX;
  targetMouse.y = (event.clientY - windowHalfY) / windowHalfY;
}

// Resize scene
function onWindowResize() {
  if (!container) return;
  const rect = container.getBoundingClientRect();
  windowHalfX = rect.width / 2;
  windowHalfY = rect.height / 2;

  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();

  renderer.setSize(rect.width, rect.height);
}

// Triggers an approving nod animation
export function triggerNod() {
  if (actionState === 'none') {
    actionState = 'nodding';
    actionTimer = 0;
  }
}

// Triggers a negating head shake
export function triggerShake() {
  if (actionState === 'none') {
    actionState = 'shaking';
    actionTimer = 0;
  }
}

// Three.js Render / Animation Loop
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  // 1. Animate Antigravity Space Background (Particles drift & swirl)
  if (particleSystem) {
    const positions = particleGeometry.attributes.position.array;
    
    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      
      // Floating motion on Y
      positions[idx + 1] += Math.sin(time + i) * 0.0008; 
      
      // Gentle orbit around the Y center axis
      const speed = particleSpeeds[i] * 0.08 * delta;
      const x = positions[idx];
      const z = positions[idx + 2] + 3; // Orbit offset (shift center pivot)
      
      positions[idx] = x * Math.cos(speed) - z * Math.sin(speed);
      positions[idx + 2] = (x * Math.sin(speed) + z * Math.cos(speed)) - 3;
      
      // Wrap particles if they drift too high/far
      if (positions[idx + 1] > 6) positions[idx + 1] = -1;
    }
    
    particleGeometry.attributes.position.needsUpdate = true;
    // Rotate background system slightly as a whole
    particleSystem.rotation.y = time * 0.01;
  }

  // 2. Animate Avatar
  if (avatarModel) {
    // Breathing Idle Animation (sinusoidal rotation and offset)
    const breathRate = 1.6; // Speed of breath
    const breathScale = 0.015; // Depth of breath
    
    // Breathing moves the body on Y slightly
    avatarModel.position.y = 0.05 + Math.sin(time * breathRate) * breathScale * 0.3;
    
    if (neckBone) {
      neckBone.rotation.x = Math.sin(time * breathRate) * breathScale * 0.2;
    }

    // 3. Eye & Head Look-at-Cursor tracking
    // Smoothly lerp mouse coordinate updates
    currentMouse.x += (targetMouse.x - currentMouse.x) * 0.1;
    currentMouse.y += (targetMouse.y - currentMouse.y) * 0.1;

    // Angle caps to keep it natural (max 25 degrees)
    const angleX = currentMouse.x * 0.35; 
    const angleY = currentMouse.y * 0.25;

    // Apply look rotations to skeleton bones
    if (headBone) {
      // Merge look-at angle with any active nodding/shaking actions
      let actionAngleX = 0;
      let actionAngleY = 0;

      if (actionState === 'nodding') {
        actionTimer += delta * 6; // Speed of nod
        actionAngleY = Math.sin(actionTimer) * 0.15; // Rotates X axis
        if (actionTimer > Math.PI * 2) {
          actionState = 'none';
        }
      } else if (actionState === 'shaking') {
        actionTimer += delta * 6; // Speed of shake
        actionAngleX = Math.sin(actionTimer) * 0.2; // Rotates Y axis
        if (actionTimer > Math.PI * 2) {
          actionState = 'none';
        }
      }

      // Standard bone rotations
      headBone.rotation.y = angleX + actionAngleX; // Left-Right yaw
      headBone.rotation.x = angleY + actionAngleY; // Up-Down pitch
    }

    if (neckBone && headBone) {
      // Share some rotation with the neck bone for a more natural curvature
      neckBone.rotation.y = angleX * 0.4;
      neckBone.rotation.x = (angleY * 0.4) + (Math.sin(time * breathRate) * breathScale * 0.2);
    }

    // Direct eye ball rotations for maximum realism (if bones are present in model)
    if (rightEyeBone && leftEyeBone) {
      rightEyeBone.rotation.y = angleX * 0.2;
      rightEyeBone.rotation.x = angleY * 0.2;
      leftEyeBone.rotation.y = angleX * 0.2;
      leftEyeBone.rotation.x = angleY * 0.2;
    }

    // 4. Procedural Blinking State Machine
    blinkTimer -= delta;
    if (blinkTimer <= 0 && blinkState === 'idle') {
      blinkState = 'closing';
    }

    if (blinkState === 'closing') {
      blinkVal += delta * 15; // blink speed
      if (blinkVal >= 1) {
        blinkVal = 1;
        blinkState = 'closed';
        blinkTimer = 0.06; // Time eyes remain shut
      }
    } else if (blinkState === 'closed') {
      if (blinkTimer <= 0) {
        blinkState = 'opening';
      }
    } else if (blinkState === 'opening') {
      blinkVal -= delta * 15;
      if (blinkVal <= 0) {
        blinkVal = 0;
        blinkState = 'idle';
        blinkTimer = 3.0 + Math.random() * 4.0; // Wait 3-7 seconds to blink again
      }
    }

    // 5. Talking / Lip-Sync Procedural Animation
    if (ttsState.isSpeaking) {
      // Simulate lip movement using trigonometric frequencies combined with random noise
      speechNoiseTimer += delta * 18;
      speechVal = (Math.sin(speechNoiseTimer) * 0.4) + (Math.sin(speechNoiseTimer * 0.5) * 0.3) + 0.3;
      speechVal = Math.max(0, Math.min(speechVal, 0.85)); // Clamp between 0 and 0.85
      
      // Double visual impact on fallback wireframe model
      if (!morphTargetsMesh) {
        // Hologram bounces in scale slightly in rhythm with the speech
        const scaleVal = 1.0 + (speechVal * 0.08);
        headBone.scale.set(scaleVal, scaleVal, scaleVal);
      }
    } else {
      // Settle mouth closed
      speechVal += (0 - speechVal) * 0.2;
      
      if (!morphTargetsMesh && headBone) {
        headBone.scale.set(1, 1, 1);
      }
    }

    // 6. Apply Morph Target Influences (Blendshapes) to Avatar Mesh
    if (morphTargetsMesh) {
      const dict = morphTargetsMesh.morphTargetDictionary;
      const inf = morphTargetsMesh.morphTargetInfluences;

      // Map Ready Player Me standard blendshape indices
      if (dict) {
        // Eye Blinking
        if (dict['eyeBlinkLeft'] !== undefined) inf[dict['eyeBlinkLeft']] = blinkVal;
        if (dict['eyeBlinkRight'] !== undefined) inf[dict['eyeBlinkRight']] = blinkVal;
        
        // Lip Syncing Speech (Ready Player Me shape keys)
        if (dict['jawOpen'] !== undefined) inf[dict['jawOpen']] = speechVal;
        if (dict['mouthOpen'] !== undefined) inf[dict['mouthOpen']] = speechVal * 0.5;
        if (dict['mouthSmile'] !== undefined) inf[dict['mouthSmile']] = smileVal;
        
        // Fallback shapes if specific RPM shape names are absent
        if (dict['viseme_sil'] !== undefined && dict['viseme_Ooo'] !== undefined) {
          // If visemes are present, cycle them randomly when speaking to represent vowels
          inf[dict['viseme_Ooo']] = speechVal * 0.6;
          inf[dict['viseme_jawOpen']] = speechVal * 0.4;
        }
      }
    }
  }

  // 3. Render Camera Pass
  renderer.render(scene, camera);
}

// Controlling the 3D model visibility dynamically (keeps star background active)
export function setAvatar3DVisibility(visible) {
  if (avatarModel) {
    avatarModel.visible = visible;
  }
}
