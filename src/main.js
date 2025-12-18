import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

import { showInfo } from './interaction.js';
import { buildZones } from './zones.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f14);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1500);
camera.position.set(0, 45, 65);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.65));
const dir = new THREE.DirectionalLight(0xffffff, 0.75);
dir.position.set(40, 60, 40);
scene.add(dir);

// Ground map (اسمك الحالي)
const mapTexture = new THREE.TextureLoader().load(
  'assets/images/gc22-map.jpg',
  () => {},
  undefined,
  (e) => console.error('Texture load error', e)
);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshBasicMaterial({ map: mapTexture })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const equipmentGroup = new THREE.Group();
scene.add(equipmentGroup);

const clickable = [];
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const gltf = new GLTFLoader();

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

function addMarker(item, x, z) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2, 2),
    new THREE.MeshStandardMaterial({ color: 0xff4444 })
  );
  m.position.set(x, 1, z);
  m.userData = item;
  equipmentGroup.add(m);
  clickable.push(m);
}

fetch('src/data/equipment.json')
  .then(r => r.json())
  .then(list => {
    list.forEach(item => {
      const x = (item.pos2d.x - 0.5) * 100;
      const z = (item.pos2d.y - 0.5) * 100;

      if (item.model) {
        gltf.load(item.model, (g) => {
          const obj = g.scene;
          obj.position.set(x, 0, z);
          const s = item.scale || 1;
          obj.scale.set(s, s, s);
          obj.userData = item;
          equipmentGroup.add(obj);
          clickable.push(obj);
        }, undefined, () => addMarker(item, x, z));
      } else {
        addMarker(item, x, z);
      }
    });
    applyVisibility();
  })
  .catch(err => console.error('equipment.json error:', err));

fetch('src/data/hazard_zones.json')
  .then(r => r.json())
  .then(zones => {
    zoneGroups = buildZones(THREE, scene, zones);
    Object.values(zoneGroups).forEach(g => clickable.push(g));
    applyVisibility();
  })
  .catch(err => console.error('hazard_zones.json error:', err));

function onPick(event) {
  const cx = event.touches ? event.touches[0].clientX : event.clientX;
  const cy = event.touches ? event.touches[0].clientY : event.clientY;

  pointer.x = (cx / window.innerWidth) * 2 - 1;
  pointer.y = -(cy / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(clickable, true);
  if (!hits.length) return;

  let obj = hits[0].object;
  while (obj && (!obj.userData || !obj.userData.name) && obj.parent) obj = obj.parent;
  if (obj?.userData?.name) showInfo(obj.userData);
}

window.addEventListener('click', onPick, { passive: true });
window.addEventListener('touchstart', onPick, { passive: true });

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
