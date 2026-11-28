import * as THREE from 'three';

export function setupCamera(scene, renderer, subject, update) {
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const offset = new THREE.Vector3(8, 2, 0);
  const target = new THREE.Vector3();

  function resize() {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    const aspect = width / height;
    const halfHeight = 3.15 / Math.min(1, aspect);
    const halfWidth = halfHeight * aspect;
    camera.aspect = aspect;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(halfHeight / offset.length()));
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  window.addEventListener('resize', resize);
  resize();

  let previousTime;
  renderer.setAnimationLoop((time) => {
    const delta = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    update(delta);
    subject.getWorldPosition(target);
    target.y = 1.45;
    camera.position.copy(target).add(offset);
    camera.lookAt(target);
    renderer.render(scene, camera);
  });
}
