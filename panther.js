import * as THREE from 'three';
import { MarchingCubes } from '/MarchingCubes.js';
import { setupCamera } from './camera.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color('#242830');

const gridSize = 21;
scene.add(new THREE.GridHelper(gridSize, gridSize, '#404955', '#404955'));

const edge = gridSize / 2;
const axisGeometry = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(-edge, 0, 0), new THREE.Vector3(edge, 0, 0),
  new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 2.8, 0),
  new THREE.Vector3(0, 0, -edge), new THREE.Vector3(0, 0, edge),
]);
const axisColors = ['#db7575', '#80c499', '#729bed'].flatMap((hex) => {
  const color = new THREE.Color(hex).toArray();
  return [...color, ...color];
});
axisGeometry.setAttribute('color', new THREE.Float32BufferAttribute(axisColors, 3));
scene.add(new THREE.LineSegments(axisGeometry, new THREE.LineBasicMaterial({ vertexColors: true })));

const panther = new THREE.Group();
scene.add(panther);

const sphere = new THREE.SphereGeometry(1, 16, 10);
const material = (color, roughness = 0.85) => new THREE.MeshStandardMaterial({
  color, roughness, flatShading: true,
});
const fur = material('#fffaf3');
const muzzle = material('#fffdf9');
const pink = material('#dda6ad');
const nose = material('#c98391', 0.5);
const iris = material('#35adff', 0.35);
const pupil = material('#102130', 0.4);
const whisker = material('#f7ebdf');
const mouth = material('#a46978');

const volumes = [];

function sculpt(position, radii, pitch = 0) {
  volumes.push({
    position,
    radii,
    minRadius: Math.min(...radii),
    reach: Math.max(...radii) + 0.15,
    cosine: Math.cos(pitch),
    sine: Math.sin(pitch),
  });
}

function buildCoat() {
  const resolution = 38;
  const coat = new MarchingCubes(resolution, fur, false, false, 10000);
  coat.position.set(0, 1.25, 0.25);
  coat.scale.set(0.95, 1.65, 2.25);
  coat.isolation = 0;
  const blend = 0.075;

  for (let z = 0; z < resolution; z++) {
    const pz = coat.position.z + (z * coat.delta - 1) * coat.scale.z;
    for (let y = 0; y < resolution; y++) {
      const py = coat.position.y + (y * coat.delta - 1) * coat.scale.y;
      for (let x = 0; x < resolution; x++) {
        const px = (x * coat.delta - 1) * coat.scale.x;
        let distance = 0.15;
        for (const volume of volumes) {
          const dx = px - volume.position[0];
          const dy = py - volume.position[1];
          const dz = pz - volume.position[2];
          if (Math.abs(dx) > volume.reach || Math.abs(dy) > volume.reach || Math.abs(dz) > volume.reach) continue;

          const nx = dx / volume.radii[0];
          const ny = (volume.cosine * dy + volume.sine * dz) / volume.radii[1];
          const nz = (volume.cosine * dz - volume.sine * dy) / volume.radii[2];
          const part = (Math.sqrt(nx * nx + ny * ny + nz * nz) - 1) * volume.minRadius;
          const overlap = Math.max(0, blend - Math.abs(part - distance));
          distance = Math.min(part, distance) - overlap * overlap / (4 * blend);
        }
        coat.setCell(x, y, z, -distance);
      }
    }
  }

  coat.update();
  panther.add(coat);
  return coat;
}

function ellipsoid(surface, position, scale, pitch = 0) {
  const mesh = new THREE.Mesh(sphere, surface);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.rotation.x = pitch;
  panther.add(mesh);
  return mesh;
}

function curve(surface, points, startRadius, endRadius = startRadius) {
  const path = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  const segments = 16;
  const sides = 6;
  const geometry = new THREE.TubeGeometry(path, segments, startRadius, sides);
  const positions = geometry.attributes.position;
  const offset = new THREE.Vector3();

  for (let ring = 0; ring <= segments; ring++) {
    const t = ring / segments;
    const center = path.getPointAt(t);
    const scale = THREE.MathUtils.lerp(1, endRadius / startRadius, t);
    for (let side = 0; side <= sides; side++) {
      const index = ring * (sides + 1) + side;
      offset.fromBufferAttribute(positions, index).sub(center).multiplyScalar(scale).add(center);
      positions.setXYZ(index, offset.x, offset.y, offset.z);
    }
  }

  panther.add(new THREE.Mesh(geometry, surface));
}

// Silhouette féline, des omoplates aux jarrets.
sculpt([0, 1.50, -0.20], [0.40, 0.43, 1.19], 0.06);
sculpt([0, 1.51, 0.50], [0.47, 0.55, 0.69], -0.18);
sculpt([0, 1.58, -1.04], [0.43, 0.44, 0.53]);
sculpt([0, 1.74, 0.95], [0.36, 0.44, 0.67], -0.35);

for (const side of [-1, 1]) {
  const x = side * 0.33;
  const stride = side * 0.14;
  sculpt([x, 1.24, 0.58 + stride], [0.21, 0.53, 0.28], -0.21);
  sculpt([x, 0.79, 0.68 + stride], [0.137, 0.45, 0.16], 0.05);
  sculpt([x, 0.39, 0.73 + stride], [0.108, 0.32, 0.126], 0.10);
  sculpt([x, 0.13, 0.83 + stride], [0.16, 0.104, 0.225]);

  sculpt([x, 1.30, -1.03 - stride], [0.23, 0.48, 0.32], 0.48);
  sculpt([x, 0.84, -1.01 - stride], [0.146, 0.37, 0.18], -0.52);
  sculpt([x, 0.40, -1.14 - stride], [0.101, 0.33, 0.118], 0.24);
  sculpt([x, 0.13, -0.99 - stride], [0.148, 0.104, 0.205]);
}

curve(fur, [[0, 1.65, -1.32], [-0.07, 1.42, -1.95], [-0.12, 0.88, -2.42],
  [0.04, 0.53, -2.85], [0.32, 0.56, -3.13], [0.42, 0.76, -3.22]], 0.16, 0.045);
ellipsoid(fur, [0.42, 0.76, -3.22], [0.045, 0.045, 0.045]);

// Crâne, mâchoire et chanfrein.
sculpt([0, 1.99, 1.37], [0.42, 0.33, 0.43]);
sculpt([0, 1.79, 1.62], [0.31, 0.19, 0.364]);
sculpt([0, 1.92, 1.75], [0.195, 0.14, 0.26], 0.22);

for (const side of [-1, 1]) {
  sculpt([side * 0.29, 2.25, 1.22], [0.165, 0.182, 0.125]);
  sculpt([side * 0.27, 1.92, 1.56], [0.15, 0.18, 0.25], -0.20);
  ellipsoid(pink, [side * 0.30, 2.29, 1.327], [0.101, 0.102, 0.027]).rotation.z = -side * 0.28;
  sculpt([side * 0.123, 1.82, 1.87], [0.164, 0.108, 0.171]);

  const eye = new THREE.Vector3(side * 0.278, 2.049, 1.685);
  const normal = new THREE.Vector3(side * 0.62, 0, 0.78).normalize();
  const eyeLayer = (surface, depth, scale, height = 0) => {
    const position = eye.clone().addScaledVector(normal, depth);
    position.y += height;
    const mesh = ellipsoid(surface, position.toArray(), scale);
    mesh.rotation.y = Math.atan2(normal.x, normal.z);
  };
  eyeLayer(mouth, 0, [0.099, 0.092, 0.065]);
  eyeLayer(iris, 0.033, [0.082, 0.080, 0.047]);
  eyeLayer(pupil, 0.074, [0.021, 0.060, 0.016]);
  eyeLayer(muzzle, 0.086, [0.012, 0.012, 0.006], 0.032);

  curve(mouth, [[0, 1.77, 2.015], [side * 0.11, 1.73, 2.009],
    [side * 0.24, 1.75, 1.97]], 0.012, 0.007);

  for (let row = 0; row < 3; row++) {
    const y = 1.84 + row * 0.027;
    ellipsoid(pink, [side * (0.22 + row * 0.025), y, 2.017 - row * 0.015], [0.015, 0.012, 0.01]);
    curve(whisker, [[side * 0.23, y, 2.02], [side * 0.47, y + 0.035, 2.04],
      [side * 0.71, y + (row - 1) * 0.075, 1.91]], 0.008, 0.001);
  }
}

const noseMesh = ellipsoid(nose, [0, 1.913, 2.007], [0.129, 0.061, 0.065]);
noseMesh.geometry = sphere.clone();
const noseVertices = noseMesh.geometry.attributes.position;
for (let i = 0; i < noseVertices.count; i++) {
  const width = THREE.MathUtils.lerp(0.48, 1.15, (noseVertices.getY(i) + 1) / 2);
  noseVertices.setX(i, noseVertices.getX(i) * width);
}
const coat = buildCoat();
curve(mouth, [[0, 1.89, 2.063], [0, 1.83, 2.058], [0, 1.77, 2.015]], 0.011);

scene.add(new THREE.HemisphereLight('#fff9f3', '#bbc7e4', 2.1));
const key = new THREE.DirectionalLight('#fff4e7', 2.5);
key.position.set(3, 6, 5);
scene.add(key);
const rim = new THREE.DirectionalLight('#e0e9ff', 1.4);
rim.position.set(-4, 4, -4);
scene.add(rim);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const keys = new Set();
let state = 'idle';
let pace = 'walk';
let facing = 1;
let jumpRequested = false;
let breathRequested = false;
let jumpVelocity = 0;
const recoveryDuration = 1.4;
let recoveryLeft = 0;

for (const type of ['keydown', 'keyup']) {
  window.addEventListener(type, (event) => {
    const key = event.code === 'Space' ? ' ' : event.key.toLowerCase();
    if (key === 'a' || key === 'd') {
      event.preventDefault();
      if (type === 'keydown' && !event.repeat) {
        if (key === 'd') breathRequested = true;
        else jumpRequested = true;
      }
      return;
    }
    if (!['arrowleft', 'arrowright', 'q', 'b', ' '].includes(key)) return;
    event.preventDefault();
    if (type === 'keydown') {
      keys.add(key);
      if (!event.repeat && (key === 'b' || key === ' ')) pace = key === 'b' ? 'walk' : 'run';
    } else {
      keys.delete(key);
    }
  });
}
window.addEventListener('blur', () => {
  keys.clear();
  jumpRequested = false;
  breathRequested = false;
});

const coatPositions = coat.geometry.getAttribute('position');
const restingPositions = coatPositions.array.slice(0, coat.geometry.drawRange.count * 3);
const animatedVertices = [];
for (let i = 0; i < restingPositions.length; i += 3) {
  const y = restingPositions[i + 1] * coat.scale.y + coat.position.y;
  const z = restingPositions[i + 2] * coat.scale.z + coat.position.z;
  const chestWeight = THREE.MathUtils.smoothstep(y, 1.25, 1.65)
    * (1 - THREE.MathUtils.smoothstep(Math.abs(z - 0.25), 0.15, 0.75));
  const bellyWeight = THREE.MathUtils.smoothstep(y, 0.85, 1.05)
    * (1 - THREE.MathUtils.smoothstep(y, 1.15, 1.5))
    * (1 - THREE.MathUtils.smoothstep(Math.abs(z + 0.28), 0.16, 0.62));
  const legWeight = Math.abs(z) >= 0.2 ? 1 - THREE.MathUtils.smoothstep(y, 0.16, 1.25) : 0;
  const diagonal = (z > 0) === (restingPositions[i] > 0) ? 1 : -1;
  if (chestWeight || bellyWeight || legWeight) {
    animatedVertices.push({ i, chestWeight, bellyWeight, legWeight, diagonal });
  }
}

const stateLabel = document.getElementById('character-state');
const stateNames = { idle: 'Repos', walk: 'Marche', run: 'Course', jump: 'Saut', recover: 'Reprise du souffle' };
let walkPhase = 0;
let walkBlend = 0;
let breathAmount = 0;
let idleBreathTime = 0;

function updateCharacter(delta) {
  const previousState = state;
  const left = keys.has('arrowleft') || keys.has('q');
  const right = keys.has('arrowright');
  const direction = left || right ? Number(left) - Number(right)
    : (keys.has('b') || keys.has(' ') ? facing : 0);
  const groundState = direction === 0 ? 'idle' : pace;

  if (state === 'recover') {
    recoveryLeft = Math.max(0, recoveryLeft - delta);
    if (recoveryLeft === 0) state = groundState;
  } else if (state !== 'jump') {
    if (breathRequested) {
      state = 'recover';
      recoveryLeft = recoveryDuration;
    } else if (jumpRequested) {
      state = 'jump';
      jumpVelocity = 5.8;
    } else {
      state = groundState;
    }
  }
  jumpRequested = false;
  breathRequested = false;

  if (direction !== 0 && state !== 'recover') {
    facing = direction;
    panther.rotation.y = facing > 0 ? 0 : Math.PI;
    panther.position.z += direction * (pace === 'run' ? 4.6 : 2.3) * delta;
  }
  if (state === 'jump') {
    const gravity = 14;
    panther.position.y += (jumpVelocity - 0.5 * gravity * delta) * delta;
    jumpVelocity -= gravity * delta;
    if (panther.position.y <= 0 && jumpVelocity <= 0) {
      panther.position.y = 0;
      jumpVelocity = 0;
      state = groundState;
    }
  }
  if (state !== previousState) stateLabel.textContent = stateNames[state];

  let nextBreath = 0;
  if (state === 'idle') {
    const period = 3.2;
    idleBreathTime = (idleBreathTime + delta) % period;
    nextBreath = 0.055 * (1 - Math.cos(2 * Math.PI * idleBreathTime / period)) / 2;
  } else {
    idleBreathTime = 0;
    if (state === 'recover') {
      nextBreath = 0.12 * Math.sin(2 * Math.PI * recoveryLeft / recoveryDuration) ** 2;
    }
  }
  const walking = state === 'walk' || state === 'run';
  if (!walking && walkBlend === 0 && nextBreath === 0 && breathAmount === 0) return;
  breathAmount = THREE.MathUtils.damp(breathAmount, nextBreath, 18, delta);
  if (nextBreath === 0 && breathAmount < 0.0001) breathAmount = 0;
  const running = state === 'run';
  walkBlend = THREE.MathUtils.damp(walkBlend, running ? 1.4 : Number(walking), 16, delta);
  if (walkBlend < 0.001 && !walking) walkBlend = 0;
  walkPhase = walkBlend > 0 ? (walkPhase + delta * (running ? 17 : 12)) % (2 * Math.PI) : 0;

  const stridePhase = Math.sin(walkPhase);
  const liftPhase = Math.cos(walkPhase);
  for (const { i, chestWeight, bellyWeight, legWeight, diagonal } of animatedVertices) {
    const amount = legWeight * walkBlend;
    const stride = stridePhase * diagonal * 0.29 * amount;
    const lift = Math.max(0, liftPhase * diagonal) * 0.14 * amount;
    const bellyDrop = 0.8 * bellyWeight * breathAmount;
    const expansion = (chestWeight + bellyWeight) * breathAmount;
    coatPositions.array[i] = restingPositions[i] * (1 + expansion);
    coatPositions.array[i + 1] = restingPositions[i + 1] + (lift - bellyDrop) / coat.scale.y;
    coatPositions.array[i + 2] = restingPositions[i + 2] + stride / coat.scale.z;
  }
  coatPositions.needsUpdate = true;
}

setupCamera(scene, renderer, panther, updateCharacter);
