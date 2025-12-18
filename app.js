const overlay = document.getElementById('overlay');
const tip = document.getElementById('tip');

const infoTitle = document.getElementById('info-title');
const infoSub = document.getElementById('info-sub');
const infoBody = document.getElementById('info-body');
const closeBtn = document.getElementById('close');

const listEl = document.getElementById('list');
const searchEl = document.getElementById('search');
const resetBtn = document.getElementById('reset');

const layerEq = document.getElementById('layer-eq');
const layerZ0 = document.getElementById('layer-z0');
const layerZ1 = document.getElementById('layer-z1');
const layerZ2 = document.getElementById('layer-z2');

let ZONES = [];
let EQUIPMENT = [];

function esc(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }

function zoneColor(z){
  if (z === "Zone 0") return { fill:"rgba(255,45,45,.22)", stroke:"rgba(255,45,45,.85)" };
  if (z === "Zone 1") return { fill:"rgba(255,165,0,.20)", stroke:"rgba(255,165,0,.85)" };
  return { fill:"rgba(255,240,0,.18)", stroke:"rgba(255,240,0,.75)" };
}

function clearOverlay(){
  while (overlay.firstChild) overlay.removeChild(overlay.firstChild);
}

function drawZones(){
  ZONES.forEach(z => {
    const { fill, stroke } = zoneColor(z.zone);
    const g = document.createElementNS("http://www.w3.org/2000/svg","g");
    g.dataset.type = "zone";
    g.dataset.id = z.id;
    g.classList.add("zone");

    let shapeEl;

    if (z.shape.type === "rect"){
      shapeEl = document.createElementNS("http://www.w3.org/2000/svg","rect");
      shapeEl.setAttribute("x", z.shape.x);
      shapeEl.setAttribute("y", z.shape.y);
      shapeEl.setAttribute("width", z.shape.w);
      shapeEl.setAttribute("height", z.shape.h);
      shapeEl.setAttribute("rx", 10);
    } else if (z.shape.type === "circle"){
      shapeEl = document.createElementNS("http://www.w3.org/2000/svg","circle");
      shapeEl.setAttribute("cx", z.shape.cx);
      shapeEl.setAttribute("cy", z.shape.cy);
      shapeEl.setAttribute("r", z.shape.r);
    }

    shapeEl.setAttribute("fill", fill);
    shapeEl.setAttribute("stroke", stroke);
    shapeEl.setAttribute("stroke-width", 3);
    shapeEl.style.cursor = "pointer";

    g.appendChild(shapeEl);
    overlay.appendChild(g);
  });
}

function drawEquipmentPins(){
  EQUIPMENT.forEach(eq => {
    const g = document.createElementNS("http://www.w3.org/2000/svg","g");
    g.dataset.type = "eq";
    g.dataset.id = eq.id;
    g.classList.add("eq");

    const c = document.createElementNS("http://www.w3.org/2000/svg","circle");
    c.setAttribute("cx", eq.pin.x);
    c.setAttribute("cy", eq.pin.y);
    c.setAttribute("r", 10);
    c.setAttribute("fill", "#4fc3f7");
    c.setAttribute("stroke", "rgba(0,0,0,.55)");
    c.setAttribute("stroke-width", 3);
    c.style.cursor = "pointer";

    const dot = document.createElementNS("http://www.w3.org/2000/svg","circle");
    dot.setAttribute("cx", eq.pin.x);
    dot.setAttribute("cy", eq.pin.y);
    dot.setAttribute("r", 4);
    dot.setAttribute("fill", "#0b0f14");

    g.appendChild(c);
    g.appendChild(dot);
    overlay.appendChild(g);
  });
}

function render(){
  clearOverlay();
  overlay.setAttribute("viewBox", "0 0 1000 600");

  // Zones by layer
  if (layerZ0.checked) ZONES.filter(z => z.zone==="Zone 0").forEach(z => {});
  if (layerZ1.checked) ZONES.filter(z => z.zone==="Zone 1").forEach(z => {});
  if (layerZ2.checked) ZONES.filter(z => z.zone==="Zone 2").forEach(z => {});

  // draw zones in order 2 -> 1 -> 0 (so 0 is top)
  if (layerZ2.checked) ZONES.filter(z => z.zone==="Zone 2").forEach(z=>{});
  drawZonesFiltered();

  // equipment
  if (layerEq.checked) drawEquipmentPins();
}

function drawZonesFiltered(){
  const order = ["Zone 2","Zone 1","Zone 0"];
  order.forEach(zn=>{
    if ((zn==="Zone 0" && !layerZ0.checked) || (zn==="Zone 1" && !layerZ1.checked) || (zn==="Zone 2" && !layerZ2.checked)) return;
    ZONES.filter(z=>z.zone===zn).forEach(z=>{
      const { fill, stroke } = zoneColor(z.zone);

      const g = document.createElementNS("http://www.w3.org/2000/svg","g");
      g.dataset.type="zone"; g.dataset.id=z.id;

      let shapeEl;
      if (z.shape.type==="rect"){
        shapeEl=document.createElementNS("http://www.w3.org/2000/svg","rect");
        shapeEl.setAttribute("x", z.shape.x);
        shapeEl.setAttribute("y", z.shape.y);
        shapeEl.setAttribute("width", z.shape.w);
        shapeEl.setAttribute("height", z.shape.h);
        shapeEl.setAttribute("rx", 10);
      } else {
        shapeEl=document.createElementNS("http://www.w3.org/2000/svg","circle");
        shapeEl.setAttribute("cx", z.shape.cx);
        shapeEl.setAttribute("cy", z.shape.cy);
        shapeEl.setAttribute("r", z.shape.r);
      }
      shapeEl.setAttribute("fill", fill);
      shapeEl.setAttribute("stroke", stroke);
      shapeEl.setAttribute("stroke-width", 3);
      shapeEl.style.cursor="pointer";
      g.appendChild(shapeEl);
      overlay.appendChild(g);
    });
  });
}

function showTooltip(x,y,html){
  tip.innerHTML = html;
  tip.hidden = false;
  tip.style.left = Math.min(x+12, window.innerWidth-280) + "px";
  tip.style.top  = Math.max(y-10, 12) + "px";
}

function hideTooltip(){
  tip.hidden = true;
}

function setInfoTitle(title, sub){
  infoTitle.textContent = title || "—";
  infoSub.textContent = sub || "";
}

function setInfoBody(html){
  infoBody.innerHTML = html || "";
}

function openInfo(data, type){
  if (type === "zone"){
    setInfoTitle(data.name, `${data.zone} • Hazardous Area Classification`);
    setInfoBody(`
      <div class="k">Purpose</div>
      <div>${esc(data.purpose || "-")}</div>
      <div class="k">HSE</div>
      <ul>${(data.hse||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
    `);
  } else {
    setInfoTitle(data.name, `${data.category || "Equipment"} • ${data.zone || ""}`);
    setInfoBody(`
      <div class="k">Purpose</div>
      <div>${esc(data.purpose || "-")}</div>
      <div class="k">HSE</div>
      <ul>${(data.hse||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
      <div class="k">ID</div>
      <div>${esc(data.id)}</div>
    `);
  }
}

closeBtn.addEventListener('click', () => {
  setInfoTitle("اختر عنصرًا من الخريطة", "سيظهر هنا شرح المعدّة أو المنطقة وتصنيف HSE");
  setInfoBody("");
});

function rebuildList(filterText=""){
  const q = filterText.trim().toLowerCase();
  const items = EQUIPMENT.filter(e => !q || (e.name||"").toLowerCase().includes(q) || (e.category||"").toLowerCase().includes(q));
  listEl.innerHTML = items.map(e => `
    <div class="item" data-id="${esc(e.id)}">
      <div class="name">${esc(e.name)}</div>
      <div class="meta">${esc(e.category||"")} • ${esc(e.zone||"")}</div>
    </div>
  `).join("");

  listEl.querySelectorAll('.item').forEach(el=>{
    el.addEventListener('click', ()=>{
      const id = el.dataset.id;
      const data = EQUIPMENT.find(x=>x.id===id);
      if (data) openInfo(data,"eq");
    });
  });
}

overlay.addEventListener('mousemove', (ev)=>{
  const target = ev.target.closest("g");
  if (!target) return hideTooltip();

  const type = target.dataset.type;
  const id = target.dataset.id;

  if (type === "zone"){
    const z = ZONES.find(x=>x.id===id);
    if (!z) return hideTooltip();
    showTooltip(ev.clientX, ev.clientY, `<b>${esc(z.name)}</b><br><span style="opacity:.8">${esc(z.zone)}</span>`);
  } else if (type === "eq"){
    const e = EQUIPMENT.find(x=>x.id===id);
    if (!e) return hideTooltip();
    showTooltip(ev.clientX, ev.clientY, `<b>${esc(e.name)}</b><br><span style="opacity:.8">${esc(e.category||"")}</span>`);
  }
});

overlay.addEventListener('mouseleave', hideTooltip);

overlay.addEventListener('click', (ev)=>{
  const target = ev.target.closest("g");
  if (!target) return;

  const type = target.dataset.type;
  const id = target.dataset.id;

  if (type === "zone"){
    const z = ZONES.find(x=>x.id===id);
    if (z) openInfo(z, "zone");
  } else if (type === "eq"){
    const e = EQUIPMENT.find(x=>x.id===id);
    if (e) openInfo(e, "eq");
  }
});

searchEl.addEventListener('input', ()=>{
  rebuildList(searchEl.value);
});

resetBtn.addEventListener('click', ()=>{
  searchEl.value = "";
  layerEq.checked = true;
  layerZ0.checked = true;
  layerZ1.checked = true;
  layerZ2.checked = true;
  render();
  rebuildList("");
});

[layerEq, layerZ0, layerZ1, layerZ2].forEach(el => el.addEventListener('change', render));

Promise.all([
  fetch('./data/zones.json').then(r=>r.json()),
  fetch('./data/equipment.json').then(r=>r.json())
]).then(([zones, equipment])=>{
  ZONES = zones;
  EQUIPMENT = equipment;

  render();
  rebuildList("");
}).catch(err=>{
  console.error(err);
  setInfoTitle("خطأ تحميل البيانات", "تحقق من مجلد data واسم الملفات");
  setInfoBody(`<pre style="white-space:pre-wrap">${esc(err?.message || err)}</pre>`);
});
