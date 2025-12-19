const $ = (sel) => document.querySelector(sel);

let DB = {
  facility: null,
  equipment: null,
  tags: null,
  scenarios: null,
  curriculum: null
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
  const res = await fetch(path);
  if(!res.ok) throw new Error(`Failed to load ${path}`);
  return await res.json();
}

function setPill(text, kind="idle"){
  const el = $("#scenarioStatus");
  el.textContent = text;
  el.style.borderColor = "var(--line)";
  el.style.color = "var(--muted)";
  if(kind === "run"){ el.style.borderColor = "rgba(74,163,255,.5)"; el.style.color = "var(--text)"; }
  if(kind === "bad"){ el.style.borderColor = "rgba(255,92,92,.5)"; el.style.color = "var(--text)"; }
}

function renderTags(){
  const list = $("#tagList");
  list.innerHTML = "";
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

function formatValue(v, unit){
  if(unit === "state") return v ? "ACTIVE" : "NORMAL";
  if(typeof v === "number"){
    if(unit === "inWG") return `${v.toFixed(1)} inWG`;
    if(unit === "psig") return `${v.toFixed(0)} psig`;
    if(unit === "F") return `${v.toFixed(0)} °F`;
  }
  return `${v}`;
}

function renderAlarms(){
  const list = $("#alarmList");
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
  const exists = state.alarms.find(x => x.code === code);
  if(!exists) state.alarms.push({code, text, severity});
  renderAlarms();
}

function clearAlarm(code){
  state.alarms = state.alarms.filter(x => x.code !== code);
  renderAlarms();
}

function bindMap(){
  const map = $("#facilityMap");
  map.querySelectorAll(".zone").forEach(z => {
    z.addEventListener("click", () => {
      const areaId = z.getAttribute("data-area");
      const area = DB.facility.areas.find(a => a.id === areaId);
      const info = $("#areaInfo");
      info.querySelector(".info-title").textContent = area.name;
      info.querySelector(".info-body").textContent =
        areaId === "cru"
          ? "CRU: 3-stage compression with scrubbers, exchangers, discharge vessel, and protective trips. Click Start Scenario to train abnormal events."
          : "This area is linked to training modules, tags, and scenarios (expandable).";
    });
  });
}

function renderScenarioBoxIdle(){
  $("#scenarioBox").innerHTML = `<div class="muted">Press “Start Scenario” to begin training event.</div>`;
}

function renderDecision(dp, onPick){
  const box = $("#scenarioBox");
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

function renderResult(opt, bestAnswer){
  const box = $("#scenarioBox");
  const good = opt.id === bestAnswer;
  const cls = good ? "good" : "bad";
  box.innerHTML += `
    <div class="result ${cls}">
      <div style="font-weight:900">${good ? "Correct" : "Not Recommended"}</div>
      <div class="muted" style="margin-top:6px">${opt.impact}</div>
    </div>
  `;
}

async function startScenario(){
  const scn = DB.scenarios.scenarios.find(s => s.id === "SCN_C101_LSHH_TRIP");
  state.runningScenarioId = scn.id;
  setPill(`Running: ${scn.title}`, "run");

  // Trigger timeline event 0 immediately
  const e0 = scn.timeline[0];
  Object.assign(state.tagValues, e0.signals);
  state.tagValues.LSHH_C101 = 1;
  setAlarm("C101_LSHH", "C-101 Level High-High (Trip protection)", "HIGH");

  renderTags();

  // After 30s simulated quickly (2s) apply trip
  setTimeout(() => {
    const e1 = scn.timeline[1];
    Object.assign(state.tagValues, e1.signals);
    setAlarm("CRU_TRIP", "CRU protective trip after C-101 LSHH", "HIGH");
    renderTags();
  }, 2000);

  // Decision point
  const dp1 = scn.decisionPoints[0];
  renderDecision(dp1, (opt) => {
    renderResult(opt, dp1.bestAnswer);

    if(opt.id === dp1.bestAnswer){
      // Show recovery checklist
      $("#scenarioBox").innerHTML += `
        <div class="result good" style="margin-top:12px">
          <div style="font-weight:900">Recovery Checklist</div>
          <ul style="margin:8px 0 0 18px; color: var(--muted); line-height:1.5">
            ${scn.recoveryChecklist.map(x => `<li>${x}</li>`).join("")}
          </ul>
        </div>
      `;
    } else {
      $("#scenarioBox").innerHTML += `
        <div class="result bad" style="margin-top:12px">
          <div style="font-weight:900">Operator Note</div>
          <div class="muted" style="margin-top:6px">
            Do not rush reset. Verify the vessel is free of liquid and the drain path is functioning before attempting restart.
          </div>
        </div>
      `;
    }
  });
}

async function init(){
  try{
    DB.facility = await loadJSON("data/facility.json");
    DB.equipment = await loadJSON("data/equipment.json");
    DB.tags = await loadJSON("data/tags.json");
    DB.scenarios = await loadJSON("data/scenarios.json");
    DB.curriculum = await loadJSON("data/curriculum.json");

    bindMap();
    renderTags();
    renderAlarms();
    renderScenarioBoxIdle();

    $("#btnStartScenario").addEventListener("click", startScenario);
  }catch(err){
    console.error(err);
    $("#scenarioBox").innerHTML = `<div class="result bad">
      <div style="font-weight:900">Load Error</div>
      <div class="muted" style="margin-top:6px">${err.message}</div>
    </div>`;
  }
}

init();
