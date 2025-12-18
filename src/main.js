import { showInfo } from './interaction.js';
import { buildZones } from './zones.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f14);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 45, 65);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
dirLight.position.set(40, 60, 40);
scene.add(dirLight);

// Ground map
const mapTexture = new THREE.TextureLoader().load('./assets/images/gc22-map.jpg');
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshBasicMaterial({ map: mapTexture })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Groups
const equipmentGroup = new THREE.Group();
scene.add(equipmentGroup);

// Clickables
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const clickable = [];

// GLB Loader
const loader = new THREE.GLTFLoader();

// Load Equipment
fetch('./src/data/equipment.json')
  .then(res => res.json())
  .then(data => {
    data.forEach(item => {
      if (item.model) {
        loader.load(item.model, gltf => {
          const model = gltf.scene;
          model.position.set((item.pos2d.x - 0.5) * 100, 0, (item.pos2d.y - 0.5) * 100);
          const s = item.scale || 1;
          model.scale.set(s, s, s);

          model.userData = item;
          clickable.push(model);
          equipmentGroup.add(model);
        });
      } else {
        const marker = new THREE.Mesh(
          new THREE.BoxGeometry(2, 2, 2),
          new THREE.MeshStandardMaterial({ color: 0xff4444 })
        );
        marker.position.set((item.pos2d.x - 0.5) * 100, 1, (item.pos2d.y - 0.5) * 100);

        marker.userData = item;
        clickable.push(marker);
        equipmentGroup.add(marker);
      }
    });
  });

// Load Hazard Zones
let zoneGroups = null;

fetch('./src/data/hazard_zones.json')
  .then(res => res.json())
  .then(zones => {
    zoneGroups = buildZones(scene, zones);
    Object.values(zoneGroups).forEach(g => clickable.push(g));
    applyVisibility(); // apply initial toggles
  });

// UI toggles
const z0 = document.getElementById('z0');
const z1 = document.getElementById('z1');
const z2 = document.getElementById('z2');
const eq = document.getElementById('eq');

function applyVisibility() {
  if (!zoneGroups) return;
  zoneGroups["Zone 0"].visible = !!z0.checked;
  zoneGroups["Zone 1"].visible = !!z1.checked;
  zoneGroups["Zone 2"].visible = !!z2.checked;
  equipmentGroup.visible = !!eq.checked;
}

[z0, z1, z2, eq].forEach(el => el.addEventListener('change', applyVisibility));

// Click handler
window.addEventListener('click', event => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(clickable, true);

  if (hits.length > 0) {
    let obj = hits[0].object;
    while (obj && (!obj.userData || !obj.userData.name) && obj.parent) obj = obj.parent;
    if (obj && obj.userData && obj.userData.name) showInfo(obj.userData);
  }
});

// Render loop
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
