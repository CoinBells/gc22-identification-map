import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

import { showInfo } from './interaction.js';
import { buildZones } from './zones.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f14);

// Camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1500
);
camera.position.set(0, 45, 65);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.65));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.75);
dirLight.position.set(40, 60, 40);
scene.add(dirLight);

// Ground Map (must exist at: assets/images/gc22-map.jpg)
const mapTexture = new THREE.TextureLoader().load(
  'assets/images/gc22-map.jpg',
  () => {},
  undefined,
  (err) => console.error('Failed to load map texture:', err)
);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshBasicMaterial({ map: mapTexture })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Groups
const equipmentGroup = new THREE.Group();
scene.add(equipmentGroup);

// Raycasting
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clickable = [];

// Loader
const gltfLoader = new GLTFLoader();

// UI toggles
const z0 = document.getElementById('z0');
const z1 = document.getElementById('z1');
const z2 = document.getElementById('z2');
const eq = document.getElementById('eq');

let zoneGroups = null;

function applyVisibility() {
  if (zoneGroups) {
    zoneGroups["Zone 0"].visible = !!z0.checked;
    zoneGroups["Zone 1"].visible = !!z1.checked;
    zoneGroups["Zone 2"].visible = !!z2.checked;
  }
  equipmentGroup.visible = !!eq.checked;
}

[z0, z1, z2, eq].forEach(el => el.addEventListener('change', applyVisibility));

// Load Equipment
fetch('src/data/equipment.json')
  .then(r => r.json())
  .then(list => {
    list.forEach(item => {
      const x = (item.pos2d.x - 0.5) * 100;
      const z = (item.pos2d.y - 0.5) * 100;

      if (item.model) {
        gltfLoader.load(
          item.model,
          (gltf) => {
            const obj = gltf.scene;
            obj.position.set(x, 0, z);
            const s = item.scale || 1;
            obj.scale.set(s, s, s);

            obj.userData = item;
            equipmentGroup.add(obj);
            clickable.push(obj);
          },
          undefined,
          (err) => {
            console.warn('Failed to load GLB, fallback marker:', item.id, err);
            addMarker(item, x, z);
          }
        );
      } else {
        addMarker(item, x, z);
      }
    });

    applyVisibility();
  })
  .catch(err => console.error('equipment.json load error:', err));

function addMarker(item, x, z) {
  const marker = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2, 2),
    new THREE.MeshStandardMaterial({ color: 0xff4444 })
  );
  marker.position.set(x, 1, z);
  marker.userData = item;
  equipmentGroup.add(marker);
  clickable.push(marker);
}

// Load Hazard Zones
fetch('src/data/hazard_zones.json')
  .then(r => r.json())
  .then(zones => {
    zoneGroups = buildZones(THREE, scene, zones);
    Object.values(zoneGroups).forEach(g => clickable.push(g));
    applyVisibility();
  })
  .catch(err => console.error('hazard_zones.json load error:', err));

// Click handler
function onPointer(event) {
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;

  pointer.x = (clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(clickable, true);

  if (!hits.length) return;

  let obj = hits[0].object;
  while (obj && (!obj.userData || !obj.userData.name) && obj.parent) obj = obj.parent;

  if (obj?.userData?.name) showInfo(obj.userData);
}

window.addEventListener('click', onPointer, { passive: true });
window.addEventListener('touchstart', onPointer, { passive: true });

// Animate
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
