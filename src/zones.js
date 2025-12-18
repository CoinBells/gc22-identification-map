export function buildZones(THREE, scene, zonesData) {
  const groups = {
    "Zone 0": new THREE.Group(),
    "Zone 1": new THREE.Group(),
    "Zone 2": new THREE.Group()
  };

  for (const z of zonesData) {
    const zoneObj = makeZone(THREE, z);
    zoneObj.position.y = 0.05;

    zoneObj.userData = {
      type: "zone",
      id: z.id,
      name: z.name,
      category: "Hazard Zone",
      purpose: z.purpose,
      hse: z.hse,
      meta: { "Zone": z.zone }
    };

    (groups[z.zone] || groups["Zone 2"]).add(zoneObj);
  }

  Object.values(groups).forEach(g => scene.add(g));
  return groups;
}

function makeZone(THREE, z) {
  const toWorld = (p) => ({ x: (p.x - 0.5) * 100, z: (p.y - 0.5) * 100 });

  const shape = new THREE.Shape();
  z.points.forEach((p, i) => {
    const w = toWorld(p);
    if (i === 0) shape.moveTo(w.x, w.z);
    else shape.lineTo(w.x, w.z);
  });
  shape.closePath();

  const geom = new THREE.ShapeGeometry(shape);
  const mat = new THREE.MeshBasicMaterial({
    color: zoneColor(z.zone),
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const fill = new THREE.Mesh(geom, mat);
  fill.rotation.x = -Math.PI / 2;

  const outline = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(
      z.points.map(p => {
        const w = toWorld(p);
        return new THREE.Vector3(w.x, 0.06, w.z);
      })
    ),
    new THREE.LineBasicMaterial({ color: zoneColor(z.zone) })
  );

  const group = new THREE.Group();
  group.add(fill);
  group.add(outline);
  return group;
}

function zoneColor(name) {
  if (name === "Zone 0") return 0xff2d2d;
  if (name === "Zone 1") return 0xffa500;
  return 0xfff000;
}
