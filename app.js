const CIRCUMFERENCE = 2 * Math.PI * 54;
const STORAGE_KEY = "foco-stats-v1";
const SETTINGS_KEY = "foco-settings-v1";

const els = {
  time: document.getElementById("time"),
  phase: document.getElementById("phase"),
  ring: document.getElementById("ring"),
  card: document.querySelector(".timer-card"),
  toggle: document.getElementById("toggle"),
  reset: document.getElementById("reset"),
  focus: document.getElementById("focus"),
  intention: document.getElementById("intention"),
  taskPreview: document.getElementById("task-preview"),
  chips: document.querySelectorAll(".presets-study .chip[data-minutes]"),
  customMin: document.getElementById("custom-min"),
  breakChips: document.querySelectorAll(".presets-break .chip[data-break-minutes]"),
  customBreakMin: document.getElementById("custom-break-min"),
  hint: document.getElementById("hint"),
  alert: document.getElementById("alert"),
  alertKicker: document.getElementById("alert-kicker"),
  alertTitle: document.getElementById("alert-title"),
  alertBody: document.getElementById("alert-body"),
  alertOk: document.getElementById("alert-ok"),
  todayCount: document.getElementById("today-count"),
  todayMin: document.getElementById("today-min"),
};

const state = {
  mode: "idle",
  totalMs: 10 * 60 * 1000,
  remainingMs: 10 * 60 * 1000,
  endsAt: 0,
  tickId: 0,
  alarmId: 0,
  titlePulseId: 0,
  focus: false,
  breakMinutes: 5,
};

function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    if (Number.isFinite(raw.breakMinutes) && raw.breakMinutes > 0) {
      state.breakMinutes = Math.min(30, Math.max(1, raw.breakMinutes));
    }
  } catch {
    state.breakMinutes = 5;
  }
}

function saveSettings() {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ breakMinutes: state.breakMinutes }),
  );
}

function setBreakMinutes(minutes) {
  if (state.mode === "break") return;
  const safe = Math.min(30, Math.max(1, minutes));
  state.breakMinutes = safe;
  els.breakChips.forEach((chip) => {
    chip.classList.toggle(
      "is-active",
      Number(chip.dataset.breakMinutes) === safe,
    );
  });
  saveSettings();
}

function fsElement() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement
  );
}

async function tryFullscreen() {
  const el = document.documentElement;
  const fn =
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.msRequestFullscreen;
  if (!fn) return false;
  try {
    await fn.call(el);
    return true;
  } catch {
    return false;
  }
}

async function tryExitFullscreen() {
  const fn =
    document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.msExitFullscreen;
  if (!fn || !fsElement()) return;
  try {
    await fn.call(document);
  } catch {
    /* el modo foco sigue activo aunque falle */
  }
}

function setFocusMode(on) {
  state.focus = on;
  document.body.classList.toggle("is-focus", on);
  els.focus.textContent = on ? "Salir del foco" : "Modo foco";
  if (on) tryFullscreen();
  else tryExitFullscreen();
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadStats() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (raw.date !== todayKey()) {
      return { date: todayKey(), count: 0, minutes: 0 };
    }
    return raw;
  } catch {
    return { date: todayKey(), count: 0, minutes: 0 };
  }
}

function saveStats(stats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

function renderStats() {
  const stats = loadStats();
  els.todayCount.textContent = String(stats.count);
  els.todayMin.textContent = String(stats.minutes);
}

function format(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function setMinutes(minutes) {
  if (state.mode === "running") return;
  const safe = Math.min(90, Math.max(1, minutes));
  state.totalMs = safe * 60 * 1000;
  state.remainingMs = state.totalMs;
  els.chips.forEach((chip) => {
    chip.classList.toggle("is-active", Number(chip.dataset.minutes) === safe);
  });
  renderClock();
}

function renderClock() {
  els.time.textContent = format(state.remainingMs);
  const progress = state.remainingMs / state.totalMs;
  els.ring.style.strokeDasharray = String(CIRCUMFERENCE);
  els.ring.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - progress));
  document.title =
    state.mode === "idle"
      ? "Foco — temporizador de estudio"
      : `${format(state.remainingMs)} · Foco`;
}

function setPhase() {
  const labels = {
    idle: "Listo",
    running: "En foco",
    paused: "Pausa",
    break: "Descanso",
  };
  els.phase.textContent = labels[state.mode] || "Listo";
  els.card.classList.toggle("is-break", state.mode === "break");
  document.body.classList.toggle("is-running", state.mode === "running");
  document.body.classList.toggle("is-break", state.mode === "break");
  els.toggle.textContent =
    state.mode === "running"
      ? "Pausar"
      : state.mode === "paused"
        ? "Seguir"
        : state.mode === "break"
          ? "Saltar descanso"
          : "Empezar";
}

function playChime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 528;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.stop(ctx.currentTime + 1.2);
  } catch {
    /* el navegador puede bloquear audio sin gesto */
  }
}

function stopNudge() {
  window.clearInterval(state.alarmId);
  window.clearInterval(state.titlePulseId);
  state.alarmId = 0;
  state.titlePulseId = 0;
}

function startNudge(titleFlash) {
  stopNudge();
  playChime();
  state.alarmId = window.setInterval(playChime, 2500);
  let showFlash = true;
  state.titlePulseId = window.setInterval(() => {
    document.title = showFlash ? titleFlash : `${format(state.remainingMs)} · Foco`;
    showFlash = !showFlash;
  }, 900);
}

function hideAlert() {
  els.alert.hidden = true;
  els.alert.classList.remove("is-urgent");
  stopNudge();
  renderClock();
}

function showAlert({ kicker, title, body, action, urgent }) {
  els.alertKicker.textContent = kicker;
  els.alertTitle.textContent = title;
  els.alertBody.textContent = body;
  els.alertOk.textContent = action;
  els.alert.hidden = false;
  els.alert.classList.toggle("is-urgent", Boolean(urgent));
  if (urgent) startNudge(`¡${title}!`);
  else stopNudge();
}

function completeBlock() {
  const minutes = Math.round(state.totalMs / 60000);
  const stats = loadStats();
  stats.count += 1;
  stats.minutes += minutes;
  saveStats(stats);
  renderStats();
  startBreak();
  showAlert({
    kicker: "Bloque cumplido",
    title: "Toca parar un momento",
    body: `El aviso se queda aquí hasta que pulses. El descanso de ${state.breakMinutes} minutos ya está corriendo.`,
    action: "Seguir con el descanso",
    urgent: true,
  });
}

function startBreak() {
  state.mode = "break";
  state.totalMs = state.breakMinutes * 60 * 1000;
  state.remainingMs = state.totalMs;
  state.endsAt = Date.now() + state.remainingMs;
  els.hint.textContent = "Descansa la vista. No abras otra pestaña «solo un segundo».";
  setPhase();
  renderClock();
}

function tick() {
  state.remainingMs = Math.max(0, state.endsAt - Date.now());
  renderClock();
  if (state.remainingMs <= 0) {
    window.clearInterval(state.tickId);
    if (state.mode === "running") {
      completeBlock();
      state.tickId = window.setInterval(tick, 250);
    } else if (state.mode === "break") {
      state.mode = "idle";
      setMinutes(10);
      setPhase();
      els.hint.textContent = "Descanso listo. Elige el siguiente bloque corto.";
      showAlert({
        kicker: "Descanso terminado",
        title: "Vuelve al siguiente bloque",
        body: "Este aviso no se cierra solo. Cuando estés, elige 10 minutos y empieza otra vez.",
        action: "Ya vuelvo",
        urgent: true,
      });
    }
  }
}

function start() {
  const text = els.intention.value.trim();
  els.taskPreview.textContent = text;
  hideAlert();
  state.mode = "running";
  state.endsAt = Date.now() + state.remainingMs;
  window.clearInterval(state.tickId);
  state.tickId = window.setInterval(tick, 250);
  els.hint.textContent = text
    ? `Solo esto: ${text}`
    : "Si aparece otra idea, anótala en papel y sigue. No cambies de pestaña.";
  setPhase();
}

function pause() {
  state.remainingMs = Math.max(0, state.endsAt - Date.now());
  window.clearInterval(state.tickId);
  state.mode = "paused";
  els.hint.textContent = "Pausa breve. El bloque no cuenta hasta que lo termines.";
  setPhase();
  renderClock();
}

function reset() {
  window.clearInterval(state.tickId);
  hideAlert();
  state.mode = "idle";
  const active = document.querySelector(".presets-study .chip.is-active");
  const minutes = active ? Number(active.dataset.minutes) : 10;
  setMinutes(minutes);
  els.taskPreview.textContent = "";
  els.hint.textContent =
    "Espacio inicia o pausa. Modo foco oculta lo demás y deja solo el temporizador.";
  setPhase();
}

els.toggle.addEventListener("click", () => {
  if (state.mode === "running") pause();
  else if (state.mode === "break") reset();
  else start();
});

els.reset.addEventListener("click", reset);

els.focus.addEventListener("click", () => setFocusMode(!state.focus));

els.chips.forEach((chip) => {
  chip.addEventListener("click", () => setMinutes(Number(chip.dataset.minutes)));
});

els.customMin.addEventListener("change", () => {
  const value = Number(els.customMin.value);
  if (Number.isFinite(value) && value > 0) setMinutes(value);
});

els.breakChips.forEach((chip) => {
  chip.addEventListener("click", () =>
    setBreakMinutes(Number(chip.dataset.breakMinutes)),
  );
});

els.customBreakMin.addEventListener("change", () => {
  const value = Number(els.customBreakMin.value);
  if (Number.isFinite(value) && value > 0) setBreakMinutes(value);
});

els.intention.addEventListener("input", () => {
  if (state.mode !== "idle") {
    els.taskPreview.textContent = els.intention.value.trim();
  }
});

els.alertOk.addEventListener("click", hideAlert);

document.addEventListener("visibilitychange", () => {
  if (document.hidden && state.mode === "running" && els.alert.hidden) {
    showAlert({
      kicker: "Sigue el bloque",
      title: "Hey. El temporizador no se ha parado.",
      body: "Vuelve a esta pestaña y termina el bloque. El aviso espera aquí.",
      action: "Volver al bloque",
      urgent: false,
    });
  }
});

window.addEventListener("keydown", (event) => {
  if (event.code === "Escape" && state.focus) {
    setFocusMode(false);
    return;
  }
  if (event.code !== "Space") return;
  if (event.target instanceof HTMLInputElement) return;
  event.preventDefault();
  els.toggle.click();
});

els.ring.style.strokeDasharray = String(CIRCUMFERENCE);
loadSettings();
setBreakMinutes(state.breakMinutes);
renderStats();
renderClock();
setPhase();
