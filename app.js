// ===== Utilities =====
function qs(sel){ return document.querySelector(sel); }
function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

let DB = {
  facility: null,
  tags: null,
  scenarios: null
};

let state = {
  runningScenarioId: null,
  tagValues: {
    PT_C101: 2.7,
    LSHH_C101: 0,
    TT_E101_OUT: 120,
    PT_C104: 470
  },
  alarms: []
};

async function loadJSON(path){
  const res = await fetch(path, { cache: "no-store" });
  if(!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  return await res.json();
}

function setPill(text, kind="idle"){
  const el = qs("#scenarioStatus");
  if(!el) return;
  el.textContent = text;
  el.style.borderColor = "var(--line)";
  el.style.color = "var(--muted)";
  if(kind === "run"){ el.style.borderColor = "rgba(74,163,255,.5)"; el.style.color = "var(--text)"; }
  if(kind === "bad"){ el.style.borderColor = "rgba(255,92,92,.5)"; el.style.color = "var(--text)"; }
}

function formatValue(v, unit){
  if(unit === "state") return v ? "ACTIVE" : "NORMAL";
  if(typeof v === "number"){
    if(unit === "inWG") return `${v.toFixed(1)} inWG`;
    if(unit === "psig") return `${v.toFixed(0)} psig`;
    if(unit === "F") return `${v.toFixed(0)} °F`;
  }
  return `${v}`;
}

function renderTags(){
  const list = qs("#tagList");
  if(!list) return;
  list.innerHTML = "";

  if(!DB.tags || !DB.tags.tags || DB.tags.tags.length === 0){
    list.innerHTML = `<div class="muted">No tags loaded.</div>`;
    return;
  }

  DB.tags.tags.forEach(t => {
    const val = state.tagValues[t.tag];
    const div = document.createElement("div");
    div.className = "tag";
    div.innerHTML = `
      <div>
        <div style="font-weight:800">${t.tag}</div>
        <div class="name">${t.name}</div>
      </div>
      <div class="value">${formatValue(val, t.unit)}</div>
    `;
    list.appendChild(div);
  });
}

function renderAlarms(){
  const list = qs("#alarmList");
  if(!list) return;

  list.innerHTML = "";
  if(state.alarms.length === 0){
    list.innerHTML = `<div class="muted">No active alarms.</div>`;
    return;
  }

  state.alarms.forEach(a => {
    const div = document.createElement("div");
    div.className = `alarm ${a.severity === "HIGH" ? "bad" : ""}`;
    div.innerHTML = `
      <div class="title">${a.code}</div>
      <div class="desc">${a.text}</div>
    `;
    list.appendChild(div);
  });
}

function setAlarm(code, text, severity="MED"){
  if(!state.alarms.find(x => x.code === code)){
    state.alarms.push({code, text, severity});
  }
  renderAlarms();
}

function clearAlarm(code){
  state.alarms = state.alarms.filter(x => x.code !== code);
  renderAlarms();
}

function renderScenarioBoxIdle(){
  const box = qs("#scenarioBox");
  if(!box) return;
  box.innerHTML = `<div class="muted">Press “Start Scenario” to begin training event.</div>`;
}

function renderDecision(dp, onPick){
  const box = qs("#scenarioBox");
  if(!box) return;

  box.innerHTML = `
    <div style="font-weight:900; font-size:14px">${dp.question}</div>
    <div class="muted" style="margin-top:6px">Choose the safest and most technically correct action.</div>
  `;

  dp.options.forEach(opt => {
    const div = document.createElement("div");
    div.className = "option";
    div.innerHTML = `<div style="font-weight:800">${opt.id}) ${opt.text}</div>`;
    div.addEventListener("click", () => onPick(opt));
    box.appendChild(div);
  });
}

function renderResult(opt, bestAnswer, checklist){
  const box = qs("#scenarioBox");
  if(!box) return;

  const good = opt.id === bestAnswer;
  const cls = good ? "good" : "bad";
  box.innerHTML += `
    <div class="result ${cls}">
      <div style="font-weight:900">${good ? "Correct" : "Not Recommended"}</div>
      <div class="muted" style="margin-top:6px">${opt.impact}</div>
    </div>
  `;

  if(good && Array.isArray(checklist)){
    box.innerHTML += `
      <div class="result good" style="margin-top:12px">
        <div style="font-weight:900">Recovery Checklist</div>
        <ul style="margin:8px 0 0 18px; color: var(--muted); line-height:1.5">
          ${checklist.map(x => `<li>${x}</li>`).join("")}
        </ul>
      </div>
    `;
  }
}

function bindMap(){
  const map = qs("#facilityMap");
  const info = qs("#areaInfo");
  if(!map || !info) return;

  map.querySelectorAll(".zone").forEach(z => {
    z.addEventListener("click", () => {
      const areaId = z.getAttribute("data-area");
      const area = DB.facility?.areas?.find(a => a.id === areaId);

      const titleEl = info.querySelector(".info-title");
      const bodyEl = info.querySelector(".info-body");

      if(!area){
        titleEl.textContent = "Unknown area";
        bodyEl.textContent = "Area data not loaded.";
        return;
      }

      titleEl.textContent = area.name;

      if(areaId === "cru"){
        bodyEl.textContent =
          "CRU: 3-stage compression with scrubbers, exchangers, discharge vessel, and protective trips. Use Start Scenario to train abnormal events.";
      } else if(areaId === "tanks"){
        bodyEl.textContent =
          "Tanks/TV: Wet/Dual/Dry tank behavior affects TV header stability, which directly impacts CRU suction conditions.";
      } else {
        bodyEl.textContent =
          "This area is linked to modules, tags, and scenarios (expandable).";
      }
    });
  });
}

// ===== Scenario =====
async function startScenario(){
  try{
    // Basic guard
    if(!DB.scenarios?.scenarios?.length){
      throw new Error("Scenarios not loaded. Check /data/scenarios.json");
    }

    const scn = DB.scenarios.scenarios.find(s => s.id === "SCN_C101_LSHH_TRIP");
    if(!scn) throw new Error("Scenario SCN_C101_LSHH_TRIP not found in scenarios.json");

    // Reset state for clean run
    state.alarms = [];
    renderAlarms();

    state.runningScenarioId = scn.id;
    setPill(`Running: ${scn.title}`, "run");

    // Timeline event 0
    const e0 = scn.timeline[0];
    Object.assign(state.tagValues, e0.signals);
    state.tagValues.LSHH_C101 = 1;
    setAlarm("C101_LSHH", "C-101 Level High-High (Trip protection)", "HIGH");
    renderTags();

    // Timeline event 1 after 2 seconds (simulation)
    setTimeout(() => {
      const e1 = scn.timeline[1];
      Object.assign(state.tagValues, e1.signals);
      setAlarm("CRU_TRIP", "CRU protective trip after C-101 LSHH", "HIGH");
      renderTags();
    }, 2000);

    // Decision point
    const dp1 = scn.decisionPoints[0];
    renderDecision(dp1, (opt) => {
      renderResult(opt, dp1.bestAnswer, scn.recoveryChecklist);
    });

  }catch(err){
    console.error(err);
    setPill("Error", "bad");
    const box = qs("#scenarioBox");
    if(box){
      box.innerHTML = `
        <div class="result bad">
          <div style="font-weight:900">Scenario Error</div>
          <div class="muted" style="margin-top:6px">${err.message}</div>
          <div class="muted" style="margin-top:6px">
            Tip: Ensure the data files exist under <b>/data</b> and paths are correct (case-sensitive).
          </div>
        </div>
      `;
    }
  }
}

// ===== Init =====
async function init(){
  // Ensure the DOM exists (extra safety)
  const btn = qs("#btnStartScenario");
  if(!btn){
    console.error("Start button not found: #btnStartScenario");
    return;
  }

  // IMPORTANT: bind click reliably
  btn.addEventListener("click", startScenario);

  try{
    // Load DB
    DB.facility = await loadJSON("./data/facility.json");
    DB.tags = await loadJSON("./data/tags.json");
    DB.scenarios = await loadJSON("./data/scenarios.json");

    bindMap();
    renderTags();
    renderAlarms();
    renderScenarioBoxIdle();

    // Optional: show loaded status in console
    console.log("DB loaded OK", DB);

  }catch(err){
    console.error(err);
    setPill("Load Error", "bad");
    const box = qs("#scenarioBox");
    if(box){
      box.innerHTML = `
        <div class="result bad">
          <div style="font-weight:900">Load Error</div>
          <div class="muted" style="margin-top:6px">${err.message}</div>
          <div class="muted" style="margin-top:6px">
            Check that folder <b>data</b> exists and file names match exactly.
          </div>
        </div>
      `;
    }
  }
}

// Run after DOM is ready
document.addEventListener("DOMContentLoaded", init);
