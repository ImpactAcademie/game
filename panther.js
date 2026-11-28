import * as THREE from 'three';
import { GLTFLoader } from '/loaders/GLTFLoader.js';
import { setupCamera } from './camera.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color('#c9b691');
scene.fog = new THREE.FogExp2('#c9b691', 0.037);

const groundMaterial = new THREE.MeshStandardMaterial({ color: '#8f7048', roughness: 1 });
groundMaterial.onBeforeCompile = (shader) => {
  shader.vertexShader = 'varying vec2 groundPoint;\n' + shader.vertexShader.replace(
    '#include <begin_vertex>',
    '#include <begin_vertex>\ngroundPoint = (modelMatrix * vec4(position, 1.0)).xz;',
  );
  shader.fragmentShader = 'varying vec2 groundPoint;\n' + shader.fragmentShader.replace(
    '#include <color_fragment>',
    `#include <color_fragment>
    float grain = fract(sin(dot(floor(groundPoint * 52.0), vec2(127.1, 311.7))) * 43758.5453);
    vec2 stones = groundPoint * 3.0;
    vec2 cell = floor(stones);
    vec2 center = vec2(
      fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453),
      fract(sin(dot(cell, vec2(269.5, 183.3))) * 43758.5453)
    ) * 0.65 + 0.175;
    float pebble = 1.0 - smoothstep(0.04, 0.16, length(fract(stones) - center));
    float mottling = sin(groundPoint.x * 1.5 + sin(groundPoint.y * 0.9))
      * cos(groundPoint.y * 1.2 + groundPoint.x);
    float verge = smoothstep(0.95, 2.1, abs(groundPoint.x + 0.17 * sin(groundPoint.y * 1.8)));
    diffuseColor.rgb *= mix(vec3(1.12, 0.99, 0.88), vec3(1.03, 1.13, 0.79), verge);
    diffuseColor.rgb *= 0.86 + 0.12 * grain + 0.13 * mottling + 0.18 * pebble;`,
  );
};
const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const forestLength = 44;
const forest = new THREE.Group();
const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#fff', roughness: 1 });
const foliageMaterial = new THREE.MeshStandardMaterial({ color: '#fff', roughness: 1 });
const treesPerRow = 7;
const treeCount = treesPerRow * 3;
const trunkShape = new THREE.CylinderGeometry(0.35, 1, 1, 14, 6);
const trunkVertices = trunkShape.attributes.position;
for (let i = 0; i < trunkVertices.count; i++) {
  const x = trunkVertices.getX(i);
  const y = trunkVertices.getY(i);
  const z = trunkVertices.getZ(i);
  const angle = Math.atan2(z, x);
  const ridges = 1 + 0.14 * Math.cos(5 * angle + y * 2.5) + 0.07 * Math.sin(9 * angle);
  trunkVertices.setXYZ(i, x * ridges + 0.25 * Math.sin(y * 4), y, z * ridges + 0.15 * Math.cos(y * 6));
}
trunkShape.computeVertexNormals();
const trunks = new THREE.InstancedMesh(trunkShape, trunkMaterial, treeCount);
const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), foliageMaterial, treeCount * 3);
const forestTile = new THREE.Group();
const vineMaterial = new THREE.MeshStandardMaterial({ color: '#62613b', roughness: 1 });
const barkMaterial = new THREE.MeshStandardMaterial({ color: '#5a412a', roughness: 1 });
const treePart = new THREE.Object3D();
const treeColor = new THREE.Color();
const variation = (index, salt) => {
  const value = Math.sin((index + 1) * 83.924 + salt * 127.1) * 43758.5453;
  return value - Math.floor(value);
};

function curvedStem(material, points, radius) {
  const path = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  return new THREE.Mesh(new THREE.TubeGeometry(path, 14, radius, 6), material);
}

for (let i = 0; i < treeCount; i++) {
  const row = Math.floor(i / treesPerRow);
  const x = -4.7 - 6 * row - 2.5 * variation(i, 1);
  const z = ((i % treesPerRow) + variation(i, 2)) * forestLength / treesPerRow;
  const height = 5.8 + variation(i, 3) * 3.1;
  const radius = 0.24 + variation(i, 4) * 0.32;
  const lean = (variation(i, 5) - 0.5) * 0.12;
  treePart.position.set(x, height / 2 - 0.1, z);
  treePart.rotation.set(lean, 0, lean * 0.5);
  treePart.scale.set(radius, height, radius);
  treePart.updateMatrix();
  trunks.setMatrixAt(i, treePart.matrix);
  trunks.setColorAt(i, treeColor.set('#554b40').multiplyScalar(0.75 + variation(i, 6) * 0.42));

  for (let crown = 0; crown < 3; crown++) {
    const spread = crown - 1;
    const canopyX = x - lean * height / 4 + spread * 0.52;
    const canopyZ = z + lean * height / 2 + spread * (1.38 + variation(i, 19) * 0.75);
    const canopyY = height - 0.36 - 0.70 * Math.abs(spread);
    treePart.position.set(canopyX, canopyY, canopyZ);
    treePart.scale.set(1.82 + variation(i, 3), 0.58 + variation(i, 4) * 0.64, 2.05 + variation(i, 7));
    treePart.updateMatrix();
    crowns.setMatrixAt(i * 3 + crown, treePart.matrix);
    crowns.setColorAt(i * 3 + crown, treeColor.set('#4f572d').multiplyScalar(0.82 + variation(i + crown, 8) * 0.40));
    if (spread !== 0 && row === 0) {
      forestTile.add(curvedStem(barkMaterial, [
        [x, height * 0.62, z], [x + spread * 0.21, height * 0.8, z + spread * 0.62],
        [canopyX, canopyY, canopyZ],
      ], radius * 0.49));
    }
  }
  if (row === 0 && i % 2 === 0) {
    for (const side of [-1, 1]) {
      forestTile.add(curvedStem(vineMaterial, [
        [x + 1.1, height - 0.3, z + side * 0.86],
        [x + 1.24, height * 0.79, z + side * 1.05],
        [x + 1.11, height * 0.60, z + side * 0.88],
        [x + 1.3, height * (0.37 + variation(i, 20) * 0.10), z + side * 1.15],
      ], 0.036));
    }
  }
}
const vergeCount = 30;
const bladesPerTuft = 5;
const grasses = new THREE.InstancedMesh(
  new THREE.ConeGeometry(1, 1, 3), foliageMaterial, vergeCount * bladesPerTuft,
);
const rocks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), trunkMaterial, vergeCount);
for (let i = 0; i < vergeCount; i++) {
  const side = i % 2 === 0 ? 1 : -1;
  const x = side * (1.8 + variation(i, 9) * 1.75);
  const z = (i + variation(i, 10)) * forestLength / vergeCount;
  for (let blade = 0; blade < bladesPerTuft; blade++) {
    const index = i * bladesPerTuft + blade;
    const height = 0.16 + variation(index, 11) * 0.33;
    treePart.position.set(x + (variation(index, 12) - 0.5) * 0.38, height * 0.42, z + (blade - 2) * 0.10);
    treePart.rotation.set((blade - 2) * 0.20, variation(index, 13) * Math.PI, (variation(index, 14) - 0.5) * 0.72);
    treePart.scale.set(0.032, height, 0.052);
    treePart.updateMatrix();
    grasses.setMatrixAt(index, treePart.matrix);
    grasses.setColorAt(index, treeColor.set(blade % 2 ? '#958046' : '#ad9252')
      .multiplyScalar(0.74 + variation(index, 15) * 0.48));
  }

  const size = 0.08 + variation(i, 16) * 0.21;
  treePart.position.set(x + side * 0.42, size * 0.26, z + 0.34);
  treePart.rotation.set(0.12, variation(i, 17) * Math.PI, 0.24);
  treePart.scale.set(size, size * 0.45, size * 1.25);
  treePart.updateMatrix();
  rocks.setMatrixAt(i, treePart.matrix);
  rocks.setColorAt(i, treeColor.set('#777364').multiplyScalar(0.72 + variation(i, 18) * 0.42));
}
forestTile.add(trunks, crowns, grasses, rocks);

const river = { kind: 'river', z: 23.5, radius: 1.55, clearance: 0.24 };
const obstacles = [
  { kind: 'rock', z: 8.5, radius: 0.93, clearance: 0.98 },
  { kind: 'branch', z: 16.5, radius: 0.66, clearance: 0.66 },
  river,
  { kind: 'mound', z: 30.5, radius: 0.74, clearance: 0.88 },
  { kind: 'thorns', z: 37.5, radius: 0.83, clearance: 0.81 },
];
const waterTime = { value: 0 };
const waterMaterial = new THREE.MeshStandardMaterial({ color: '#497d7c', roughness: 0.38 });
waterMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.waterTime = waterTime;
  shader.vertexShader = 'varying vec2 currentUV;\n' + shader.vertexShader.replace(
    '#include <begin_vertex>', '#include <begin_vertex>\ncurrentUV = uv;',
  );
  shader.fragmentShader = 'uniform float waterTime;\nvarying vec2 currentUV;\n' + shader.fragmentShader.replace(
    '#include <color_fragment>',
    `#include <color_fragment>
    float current = sin(currentUV.y * 63.0 + sin(currentUV.x * 120.0 - waterTime * 2.4) * 1.5);
    float glint = smoothstep(0.72, 0.98, current)
      * smoothstep(0.35, 0.95, sin(currentUV.x * 230.0 - waterTime * 5.0));
    float edge = min(currentUV.y, 1.0 - currentUV.y);
    diffuseColor.rgb *= 0.86 + 0.12 * current + 0.57 * glint;
    diffuseColor.rgb = mix(vec3(0.24, 0.34, 0.23), diffuseColor.rgb, smoothstep(0.0, 0.13, edge));`,
  );
};

function riverRibbon(material, width, height) {
  const geometry = new THREE.PlaneGeometry(84, width, 84, 1);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const bend = THREE.MathUtils.smoothstep(Math.abs(x), 1.4, 7);
    positions.setY(i, positions.getY(i) + bend * (0.46 * Math.sin(x * 0.38) + 0.25 * Math.sin(x * 0.94)));
  }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, height, river.z);
  mesh.receiveShadow = true;
  return mesh;
}

const bankMaterial = new THREE.MeshStandardMaterial({ color: '#a98c64', roughness: 1 });
forestTile.add(riverRibbon(bankMaterial, river.radius * 2 + 0.82, 0.008));
forestTile.add(riverRibbon(waterMaterial, river.radius * 2, 0.022));

const boulderShape = new THREE.IcosahedronGeometry(1, 1);
const boulderMaterial = new THREE.MeshStandardMaterial({ color: '#817362', roughness: 1, flatShading: true });
const moundMaterial = new THREE.MeshStandardMaterial({ color: '#925b3c', roughness: 1, flatShading: true });
for (const obstacle of obstacles) {
  if (obstacle.kind === 'river') continue;
  const obstacleMesh = new THREE.Group();
  obstacleMesh.position.z = obstacle.z;
  if (obstacle.kind === 'branch') {
    obstacleMesh.add(
      curvedStem(barkMaterial, [[-1.45, 0.19, -0.22], [-0.42, 0.24, -0.12], [0.66, 0.19, 0.05], [1.35, 0.14, 0.35]], 0.17),
      curvedStem(barkMaterial, [[-0.52, 0.24, -0.12], [-0.84, 0.34, 0.26], [-1.13, 0.37, 0.58]], 0.078),
      curvedStem(barkMaterial, [[0.37, 0.21, 0.0], [0.68, 0.31, -0.33], [0.88, 0.42, -0.56]], 0.064),
    );
  } else if (obstacle.kind === 'mound') {
    for (const [x, y, z, width, height] of [[0, 0.37, 0, 0.55, 0.52], [-0.43, 0.21, 0.12, 0.35, 0.36], [0.39, 0.25, -0.14, 0.28, 0.39]]) {
      const mound = new THREE.Mesh(boulderShape, moundMaterial);
      mound.position.set(x, y, z);
      mound.scale.set(width, height, 0.47);
      obstacleMesh.add(mound);
    }
  } else if (obstacle.kind === 'thorns') {
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      const x = Math.cos(angle);
      const z = Math.sin(angle);
      const height = 0.44 + 0.35 * variation(i, 23);
      obstacleMesh.add(curvedStem(barkMaterial, [
        [x * 0.10, 0.03, z * 0.10], [x * 0.47, height * 0.55, z * 0.34], [x * 0.87, height, z * 0.61],
      ], 0.023));
      obstacleMesh.add(curvedStem(vineMaterial, [
        [x * 0.22, height * 0.38, z * 0.17], [x * 0.61 - z * 0.16, height * 0.64, z * 0.43 + x * 0.10],
        [x * 0.72 - z * 0.29, height * 0.88, z * 0.51 + x * 0.20],
      ], 0.016));
    }
  } else {
    const boulder = new THREE.Mesh(boulderShape, boulderMaterial);
    boulder.position.set(0, 0.30, 0);
    boulder.scale.set(0.95, 0.40, 0.71);
    boulder.rotation.y = 0.3;
    const fragment = new THREE.Mesh(boulderShape, boulderMaterial);
    fragment.position.set(-0.69, 0.15, 0.12);
    fragment.scale.set(0.41, 0.24, 0.39);
    obstacleMesh.add(boulder, fragment);
  }
  if (obstacle.kind === 'rock' || obstacle.kind === 'branch') obstacleMesh.scale.set(1.28, 1.46, 1.3);
  for (const part of obstacleMesh.children) {
    part.castShadow = true;
    part.receiveShadow = true;
  }
  forestTile.add(obstacleMesh);
}

for (let tile = -1; tile <= 1; tile++) {
  const trees = tile === 0 ? forestTile : forestTile.clone();
  trees.position.z = tile * forestLength;
  forest.add(trees);
}
scene.add(forest);

const rollingRadius = 2.05;
const rollingRock = new THREE.Group();
const rollingStone = new THREE.Mesh(boulderShape, new THREE.MeshStandardMaterial({
  color: '#65594d', roughness: 1, flatShading: true,
}));
rollingStone.scale.set(2.3, rollingRadius, 2.13);
rollingStone.rotation.set(0.18, 0.37, 0.24);
rollingStone.castShadow = true;
rollingStone.receiveShadow = true;
rollingRock.add(rollingStone);
rollingRock.position.set(0, rollingRadius * 0.96, -5.7);
scene.add(rollingRock);

const shadowSize = 64;
const shadowPixels = new Uint8Array(shadowSize * shadowSize * 4);
for (let y = 0; y < shadowSize; y++) {
  for (let x = 0; x < shadowSize; x++) {
    const radius = Math.hypot((x + 0.5) * 2 / shadowSize - 1, (y + 0.5) * 2 / shadowSize - 1);
    shadowPixels[(y * shadowSize + x) * 4 + 3] = 255 * (1 - THREE.MathUtils.smoothstep(radius, 0.13, 1));
  }
}
const shadowTexture = new THREE.DataTexture(shadowPixels, shadowSize, shadowSize);
shadowTexture.magFilter = THREE.LinearFilter;
shadowTexture.needsUpdate = true;
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 5.3), new THREE.MeshBasicMaterial({
  map: shadowTexture, transparent: true, depthWrite: false, opacity: 0.32,
}));
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = 0.006;
scene.add(shadow);

const panther = new THREE.Group();
panther.rotation.order = 'YXZ';
scene.add(panther);

const hare = new THREE.Group();
const hareBody = new THREE.Group();
hare.add(hareBody);
const hareShape = new THREE.SphereGeometry(1, 16, 12);
const hareFur = new THREE.MeshStandardMaterial({ color: '#927653', roughness: 0.93 });
const hareCream = new THREE.MeshStandardMaterial({ color: '#d5c3a5', roughness: 0.9 });
const hareEar = new THREE.MeshStandardMaterial({ color: '#9b706b', roughness: 0.9 });
const hareEye = new THREE.MeshStandardMaterial({ color: '#241d19', roughness: 0.3 });

function harePart(material, x, y, z, width, height, depth) {
  const mesh = new THREE.Mesh(hareShape, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(width, height, depth);
  mesh.castShadow = true;
  hareBody.add(mesh);
  return mesh;
}

harePart(hareFur, 0, 0.37, -0.05, 0.19, 0.235, 0.41);
harePart(hareCream, 0, 0.24, 0.02, 0.145, 0.115, 0.275);
harePart(hareFur, 0, 0.40, 0.25, 0.16, 0.16, 0.20);
harePart(hareCream, 0, 0.34, 0.38, 0.12, 0.086, 0.12);
harePart(hareCream, 0, 0.32, -0.43, 0.11, 0.11, 0.11);
for (const side of [-1, 1]) {
  harePart(hareFur, side * 0.07, 0.72, 0.16, 0.059, 0.28, 0.048).rotation.x = -0.22;
  harePart(hareEar, side * 0.07, 0.72, 0.205, 0.034, 0.20, 0.021).rotation.x = -0.22;
  harePart(hareEye, side * 0.07, 0.956, 0.107, 0.039, 0.050, 0.035).rotation.x = -0.22;
  harePart(hareEye, side * 0.133, 0.43, 0.318, 0.034, 0.04, 0.035);
  harePart(hareFur, side * 0.14, 0.18, -0.20, 0.096, 0.17, 0.24);
  harePart(hareCream, side * 0.105, 0.12, 0.24, 0.054, 0.115, 0.09);
}
hare.position.set(-0.85, 0, 3.8);
scene.add(hare);
let hareSpeed = 0;
let harePhase = 0;
let hareRespawn = 0;
const hareRunSpeed = 6.1 * 1.8;
const hareSprintDuration = 0.68;
const hareRecoveryDuration = 1.50;
let hareFleeTime = 0;
let hareDirection = 1;

const model = new THREE.Group();
const modelScale = 0.026;
model.scale.setScalar(modelScale);
panther.add(model);
const modelVertex = new THREE.Vector3();
let pantherMesh;
let runClip;
let runPose;
let standingPose;
let runFloor;
let gaitTime = 0;
let gaitWeight = 0;
let breathTime = 0;

scene.add(new THREE.HemisphereLight('#dfeaed', '#5b574c', 1.35));
const key = new THREE.DirectionalLight('#fff0d6', 2.8);
const keyOffset = new THREE.Vector3(4, 6, 3);
key.position.copy(keyOffset);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = -4.5;
key.shadow.camera.right = 4.5;
key.shadow.camera.top = 4.5;
key.shadow.camera.bottom = -4.5;
key.shadow.camera.near = 0.5;
key.shadow.camera.far = 15;
key.shadow.camera.updateProjectionMatrix();
key.shadow.normalBias = 0.025;
key.shadow.bias = -0.0002;
key.shadow.radius = 2.4;
scene.add(key, key.target);
const rim = new THREE.DirectionalLight('#cee4f1', 1.9);
rim.position.set(-4, 4, -4);
scene.add(rim);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);

const keys = new Set();
let state = 'idle';
let facing = 1;
let jumpRequested = false;
let breathRequested = false;
const jumpWindup = 0.09;
const jumpGravity = 20;
const landingDuration = 0.23;
let jumpTime = 0;
let jumpDuration = 0;
let jumpSpeed = 0;
let landingTime = landingDuration;
const recoveryDuration = 1.4;
let recoveryLeft = 0;

for (const type of ['keydown', 'keyup']) {
  window.addEventListener(type, (event) => {
    if (event.target instanceof Element && event.target.closest('button, dialog')) {
      clearGameInput();
      return;
    }
    const key = event.code === 'Space' ? ' ' : event.key.toLowerCase();
    if (key === 'a' || key === ' ' || key === 'd') {
      event.preventDefault();
      if (type === 'keydown' && !event.repeat) {
        if (key === 'd') breathRequested = true;
        else jumpRequested = true;
      }
      return;
    }
    if (!['arrowleft', 'arrowright', 'q', 'b', 'shift'].includes(key)) return;
    event.preventDefault();
    const heldKey = key === 'shift' ? event.code : key;
    if (type === 'keydown') {
      keys.add(heldKey);
    } else {
      keys.delete(heldKey);
    }
  });
}
function clearGameInput() {
  keys.clear();
  jumpRequested = false;
  breathRequested = false;
}
window.addEventListener('blur', clearGameInput);
document.getElementById('credits').addEventListener('focusin', clearGameInput);

const runSpeed = 6.9;

const stateLabel = document.getElementById('character-state');
const huntStatus = document.getElementById('hunt-status');
const lifeCount = document.getElementById('life-count');
const lifeHearts = document.getElementById('life-hearts').children;
const damageFlash = document.getElementById('damage-flash');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const gameOverPanel = document.getElementById('game-over');
const gameOverReason = document.getElementById('game-over-reason');
const distanceLabel = document.getElementById('run-distance');
const finalDistance = document.getElementById('final-distance');
const scoreStatus = document.getElementById('score-status');
const scoreList = document.getElementById('score-list');
const meters = new Intl.NumberFormat('fr-FR', { style: 'unit', unit: 'meter', maximumFractionDigits: 1 });
gameOverPanel.addEventListener('cancel', (event) => event.preventDefault());
document.getElementById('restart-game').addEventListener('click', () => window.location.reload());
const stateNames = { idle: 'Repos', walk: 'Marche', run: 'Course', jump: 'Saut', recover: 'Reprise du souffle', dead: 'Morte' };
let lives = 5;
let distanceTraveled = 0;
let chaseActive = false;
let lastImpact = null;
let deathTime = 0;
let deathHeight = 0;
let deathPitch = 0;

function updateCharacter(delta) {
  if (state === 'dead') {
    deathTime = Math.min(deathTime + delta, 0.42);
    const fall = THREE.MathUtils.smoothstep(deathTime, 0, 0.42);
    panther.rotation.x = deathPitch * (1 - fall);
    panther.rotation.z = -Math.PI * 0.5 * fall;
    panther.position.y = THREE.MathUtils.lerp(deathHeight, 0.52, fall);
    return;
  }
  waterTime.value += delta;
  const previousState = state;
  const left = keys.has('arrowleft') || keys.has('q');
  const right = keys.has('arrowright');
  const direction = left || right ? Number(left) - Number(right)
    : (keys.has('b') ? facing : 0);
  const pace = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 'run' : 'walk';
  const groundState = direction === 0 ? 'idle' : pace;
  const groundSpeed = direction * (pace === 'run' ? runSpeed : 2.3);
  chaseActive ||= direction !== 0;
  landingTime = Math.min(landingTime + delta, landingDuration);

  if (state === 'recover') {
    recoveryLeft = Math.max(0, recoveryLeft - delta);
    if (recoveryLeft === 0) state = groundState;
  } else if (state !== 'jump') {
    if (breathRequested) {
      state = 'recover';
      recoveryLeft = recoveryDuration;
    } else if (jumpRequested) {
      state = 'jump';
      jumpTime = -jumpWindup;
      jumpDuration = pace === 'run' && direction !== 0 ? 0.72 : 0.79;
      jumpSpeed = groundSpeed;
      landingTime = landingDuration;
      if (direction !== 0) facing = direction;
    } else {
      state = groundState;
    }
  }
  jumpRequested = false;
  breathRequested = false;

  if (state === 'jump') {
    const jumpStep = Math.min(delta, jumpDuration - jumpTime);
    jumpTime += jumpStep;
    const airTime = Math.max(0, jumpTime);
    panther.position.y = 0.5 * jumpGravity * airTime * (jumpDuration - airTime);
    advancePanther(jumpSpeed * jumpStep);
    if (state !== 'dead' && jumpTime >= jumpDuration) {
      landingTime = delta - jumpStep;
      state = groundState;
      if (landInRiver()) {
        if (state !== 'dead') state = 'idle';
      } else if (advancePanther(groundSpeed * landingTime) && state !== 'dead') {
        state = 'idle';
      }
    }
  } else if (direction !== 0 && state !== 'recover') {
    facing = direction;
    if (advancePanther(groundSpeed * delta) && state !== 'dead') state = 'idle';
  }
  panther.rotation.y = facing > 0 ? 0 : Math.PI;
  if (state !== previousState) stateLabel.textContent = stateNames[state];
  ground.position.z = panther.position.z;
  forest.position.z = Math.floor(panther.position.z / forestLength) * forestLength;
  shadow.position.z = panther.position.z;
  shadow.scale.setScalar(1 + panther.position.y * 0.23);
  shadow.material.opacity = 0.32 / (1 + 2 * panther.position.y);
  key.target.position.z = panther.position.z;
  key.position.addVectors(key.target.position, keyOffset);

  if (state === 'dead') return;
  if (chaseActive) updateRollingRock(delta);
  if (state === 'dead') return;
  updateModelPose(delta);
  updateHare(delta);
}

function endRun(reason) {
  state = 'dead';
  deathHeight = panther.position.y;
  deathPitch = panther.rotation.x;
  if (lives > 0) showDamage();
  lives = 0;
  updateLives();
  stateLabel.textContent = stateNames.dead;
  gameOverReason.textContent = reason;
  finalDistance.textContent = meters.format(distanceTraveled);
  gameOverPanel.showModal();
  saveScore(distanceTraveled);
}

async function saveScore(distance) {
  try {
    const response = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ distance }),
      keepalive: true,
    });
    if (!response.ok) throw new Error('Échec de l’enregistrement');
    const { scores } = await response.json();
    for (const score of scores) {
      const row = document.createElement('li');
      row.textContent = meters.format(score.distance);
      scoreList.appendChild(row);
    }
    scoreStatus.hidden = true;
  } catch {
    scoreStatus.textContent = 'Classement indisponible. Le score n’a pas pu être confirmé.';
  }
}

function updateLives() {
  lifeCount.textContent = `${lives} ${lives === 1 ? 'vie' : 'vies'} sur 5`;
  for (const [index, heart] of Array.from(lifeHearts).entries()) {
    const lost = index >= lives;
    heart.textContent = lost ? '♡' : '♥';
    heart.classList.toggle('empty', lost);
  }
}

function showDamage() {
  for (const animation of damageFlash.getAnimations()) animation.cancel();
  const pulses = reducedMotion.matches
    ? [{ opacity: 0.42 }, { opacity: 0 }]
    : [
      { opacity: 0, offset: 0 },
      { opacity: 0.85, offset: 0.13 },
      { opacity: 0.24, offset: 0.29 },
      { opacity: 0.69, offset: 0.43 },
      { opacity: 0.15, offset: 0.66 },
      { opacity: 0, offset: 1 },
    ];
  damageFlash.animate(pulses, { duration: reducedMotion.matches ? 350 : 760, easing: 'ease-out' });
}

function updateRollingRock(delta) {
  const gap = panther.position.z - rollingRock.position.z;
  const speed = Math.min(runSpeed, 4.65 + Math.max(0, gap - 5.15) * 1.6);
  const travel = speed * delta;
  rollingRock.position.z += travel;
  rollingRock.rotation.x += travel / rollingRadius;
  if (gap - travel <= rollingRadius + 0.46) endRun('Le rocher a rattrapé la panthère.');
}

function advancePanther(step) {
  if (step === 0) return false;
  const start = panther.position.z;
  const direction = Math.sign(step);
  let end = start + step;
  const tile = Math.floor(start / forestLength);
  for (let offset = tile - 1; offset <= tile + 1; offset++) {
    for (const { z, radius, clearance } of obstacles) {
      if (panther.position.y >= clearance) continue;
      const entry = offset * forestLength + z - direction * (radius + 0.55);
      if ((entry - start) * direction >= 0 && (end - entry) * direction > 0) end = entry;
    }
  }
  panther.position.z = end;
  distanceTraveled += Math.abs(end - start);
  const displayedDistance = meters.format(distanceTraveled);
  if (distanceLabel.textContent !== displayedDistance) distanceLabel.textContent = displayedDistance;
  if (end === start + step) {
    if (lastImpact !== null && Math.abs(end - lastImpact) > 0.35) lastImpact = null;
    return false;
  }
  const takingOff = state === 'jump' && jumpTime <= jumpDuration / 2;
  if (!takingOff) hitObstacle(end);
  return true;
}

function landInRiver() {
  const tile = Math.round((panther.position.z - river.z) / forestLength);
  const center = tile * forestLength + river.z;
  if (Math.abs(panther.position.z - center) >= river.radius) return false;

  const direction = Math.sign(jumpSpeed) || facing;
  const bank = center - direction * (river.radius + 0.55);
  panther.position.z = bank;
  hitObstacle(bank);
  return true;
}

function hitObstacle(position) {
  if (position === lastImpact) return;
  lastImpact = position;
  lives -= 1;
  updateLives();
  showDamage();
  if (lives === 0) endRun('La panthère a perdu ses cinq vies.');
}

function updateHare(delta) {
  const distance = hare.position.z - panther.position.z;
  if (!hare.visible || Math.abs(distance) > 18) {
    hareRespawn = Math.max(0, hareRespawn - delta);
    if (hareRespawn > 0) return;
    const spawnDistance = hare.visible ? 5.1 : 8.5;
    hare.position.z = panther.position.z + facing * spawnDistance;
    hare.position.x = -0.85;
    hare.rotation.y = facing > 0 ? 0 : Math.PI;
    hareBody.position.y = 0;
    hareBody.rotation.x = 0;
    hareSpeed = 0;
    harePhase = 0;
    hareFleeTime = 0;
    hareDirection = facing;
    hare.visible = true;
    huntStatus.textContent = '';
    return;
  }

  if (distance * facing >= 0 && Math.abs(distance) < 1.65 && panther.position.y < 0.72) {
    hare.visible = false;
    hareRespawn = 4;
    huntStatus.textContent = 'Lièvre attrapé !';
    return;
  }

  if (hareFleeTime === 0 && Math.abs(distance) < 5.2) {
    hareFleeTime = hareSprintDuration + hareRecoveryDuration;
    hareDirection = Math.sign(distance) || facing;
  }
  const sprinting = hareFleeTime > hareRecoveryDuration;
  const targetSpeed = sprinting ? hareRunSpeed : hareFleeTime > 0 ? 2.6 : 0;
  hareSpeed = THREE.MathUtils.damp(hareSpeed, hareDirection * targetSpeed, 14, delta);
  hareFleeTime = Math.max(0, hareFleeTime - delta);
  hare.position.z += hareSpeed * delta;
  hare.position.x = THREE.MathUtils.damp(hare.position.x, hareFleeTime > 0 ? -0.22 : -0.85, 5, delta);
  if (Math.abs(hareSpeed) > 0.08) hare.rotation.y = hareSpeed > 0 ? 0 : Math.PI;
  const running = Math.min(1, Math.abs(hareSpeed) / hareRunSpeed);
  harePhase = (harePhase + delta * running * 5.4) % 1;
  const tileZ = THREE.MathUtils.euclideanModulo(hare.position.z, forestLength);
  let obstacleHop = 0;
  for (const { z, radius, clearance } of obstacles) {
    const approach = 1 - THREE.MathUtils.smoothstep(Math.abs(tileZ - z), radius, radius + 0.85);
    obstacleHop = Math.max(obstacleHop, approach * (clearance + 0.08));
  }
  hareBody.position.y = Math.max(obstacleHop, Math.sin(harePhase * Math.PI) ** 2 * 0.34 * running);
  hareBody.rotation.x = Math.sin(harePhase * 2 * Math.PI) * 0.22 * running;
}

function updateModelPose(delta) {
  if (!pantherMesh) return;

  const jumping = state === 'jump';
  const flight = jumping ? Math.max(0, jumpTime / jumpDuration) : 0;
  const windup = jumping && jumpTime < 0 ? Math.sin(Math.PI * (1 + jumpTime / jumpWindup)) : 0;
  const landing = Math.sin(Math.PI * landingTime / landingDuration);
  const targetGait = state === 'run' ? 1 : state === 'walk' ? 0.47 : 0;
  gaitWeight = THREE.MathUtils.damp(gaitWeight, targetGait, 13, delta);
  gaitTime = (gaitTime + delta * (state === 'run' ? 1.12 : 0.64)) % runClip.duration;

  const frames = runClip.tracks[0].times;
  // Le galop fournit une pose repliée et une pose de réception pour le bond.
  const launch = THREE.MathUtils.smoothstep(flight, 0, 0.42);
  const reach = THREE.MathUtils.smoothstep(flight, 0.42, 1);
  const jumpFrame = flight < 0.42
    ? THREE.MathUtils.lerp(frames[0], frames[4], launch)
    : THREE.MathUtils.lerp(frames[4], frames[10], reach);
  const pose = runPose.evaluate(jumping ? jumpFrame : gaitTime);
  const weights = pantherMesh.morphTargetInfluences;
  const strength = jumping ? THREE.MathUtils.smoothstep(flight, 0, 0.16) : gaitWeight;
  for (let i = 0; i < weights.length; i++) {
    const target = THREE.MathUtils.lerp(standingPose[i], pose[i], strength);
    weights[i] = THREE.MathUtils.damp(weights[i], target, jumping ? 24 : 35, delta);
  }

  // Le galop conserve sa suspension d'origine, les autres poses restent calées sur le sol.
  let footHeight = Infinity;
  const positions = pantherMesh.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    pantherMesh.getVertexPosition(i, modelVertex);
    footHeight = Math.min(footHeight, modelVertex.y);
  }
  const suspension = jumping ? 0 : THREE.MathUtils.smoothstep(gaitWeight, 0.47, 1);
  breathTime = (breathTime + delta) % 3.2;
  const breathing = state === 'idle' || state === 'recover' ? 0.007 * Math.sin(breathTime * Math.PI / 1.6) : 0;
  model.scale.y = modelScale * (1 + breathing - 0.075 * windup - 0.065 * landing);
  model.position.y = -THREE.MathUtils.lerp(footHeight, runFloor, suspension) * model.scale.y;
  panther.rotation.x = flight > 0 ? Math.sin(Math.PI * flight) * (flight - 0.5) * 0.95 : 0;
}

async function loadPanther() {
  const gltf = await new GLTFLoader().loadAsync('/internet_assets/black-panther.glb');
  runClip = gltf.animations[0];
  runPose = runClip.tracks[0].createInterpolant();
  gltf.scene.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    if (object.morphTargetInfluences) pantherMesh = object;
  });
  // Le GLB ne contient que le galop. Ces trois poses placent les quatre pattes presque au même niveau.
  const weights = pantherMesh.morphTargetInfluences;
  weights.fill(0);
  weights[1] = 0.05;
  weights[2] = 0.35;
  weights[11] = 0.60;
  standingPose = weights.slice();
  const { position } = pantherMesh.geometry.attributes;
  runFloor = Infinity;
  for (const frame of pantherMesh.geometry.morphAttributes.position) {
    for (let i = 0; i < position.count; i++) {
      runFloor = Math.min(runFloor, position.getY(i) + frame.getY(i));
    }
  }
  model.add(gltf.scene);
  updateModelPose(0);
}

loadPanther().then(() => {
  setupCamera(scene, renderer, panther, updateCharacter);
}).catch((error) => {
  console.error(error);
  stateLabel.textContent = 'Modèle indisponible';
});
