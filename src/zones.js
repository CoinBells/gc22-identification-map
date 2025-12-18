export function buildZones(scene, zonesData) {
  const groups = {
    "Zone 0": new THREE.Group(),
    "Zone 1": new THREE.Group(),
    "Zone 2": new THREE.Group()
  };

  for (const z of zonesData) {
    const grp = polygonMeshFromPoints(z.points, z);
    grp.position.y = 0.05;

    grp.userData = {
      type: "zone",
      id: z.id,
      name: z.name,
      category: "Hazard Zone",
      purpose: z.purpose,
      hse: z.hse,
      meta: { "Zone": z.zone }
    };

    (groups[z.zone] || groups["Zone 2"]).add(grp);
  }

  Object.values(groups).forEach(g => scene.add(g));
  return groups;
}

function polygonMeshFromPoints(points01, zone) {
  const toWorld = (p) => ({
    x: (p.x - 0.5) * 100,
    z: (p.y - 0.5) * 100
  });

  const shape = new THREE.Shape();
  points01.forEach((p, i) => {
    const w = toWorld(p);
    if (i === 0) shape.moveTo(w.x, w.z);
    else shape.lineTo(w.x, w.z);
  });
  shape.closePath();

  const geom = new THREE.ShapeGeometry(shape);

  const mat = new THREE.MeshBasicMaterial({
    color: zoneColor(zone.zone),
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const mesh = new THREE.Mesh(geom, mat);
  mesh.rotation.x = -Math.PI / 2;

  const outline = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(
      points01.map(p => {
        const w = toWorld(p);
        return new THREE.Vector3(w.x, 0.06, w.z);
      })
    ),
    new THREE.LineBasicMaterial({ color: zoneColor(zone.zone) })
  );

  const group = new THREE.Group();
  group.add(mesh);
  group.add(outline);
  return group;
}

function zoneColor(zoneName) {
  if (zoneName === "Zone 0") return 0xff2d2d;
  if (zoneName === "Zone 1") return 0xffa500;
  return 0xfff000;
}
