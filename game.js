const {
  MAX_LEVEL,
  PLAYER_X,
  SIMULATION_DT,
  makeLevel,
  advanceTraffic,
  playerLane,
  collisionAt,
  completeLevel,
  defaultSave
} = PERFECT_CROSSING_CORE;

const SAVE_KEY = "perfect-crossing-save-v1";

function loadSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
    const base = defaultSave();
    return { ...base, ...raw, tasks: { ...base.tasks, ...(raw.tasks || {}) } };
  } catch {
    return defaultSave();
  }
}

let save = loadSave();
let state = {
  level: save.level,
  player: 0,
  running: true,
  hit: false,
  started: false,
  levelData: null,
  last: performance.now(),
  accumulator: 0,
  cars: [],
  renderCars: null,
  renderPlayer: null
};

const board = document.querySelector("#board");
const cashEl = document.querySelector("#cash");
const gemsEl = document.querySelector("#gems");
const levelEl = document.querySelector("#level");
const message = document.querySelector("#message");
const moveButton = document.querySelector("#moveButton");
const modal = document.querySelector("#modal");
const modalTitle = document.querySelector("#modalTitle");
const modalText = document.querySelector("#modalText");
const modalButton = document.querySelector("#modalButton");

function persist() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

function renderHud() {
  cashEl.textContent = "£" + save.cash.toLocaleString("en-GB");
  gemsEl.textContent = save.gems.toLocaleString("en-GB");
  levelEl.textContent = state.level.toLocaleString("en-GB");
}

function showModal(title, text, next) {
  modalTitle.textContent = title;
  modalText.textContent = text;
  modalButton.textContent = next ? "NEXT LEVEL" : "TRY AGAIN";
  modal.classList.remove("hidden");
}

function hideModal() {
  modal.classList.add("hidden");
}

function laneGeometry() {
  const h = board.clientHeight || 500;
  const laneH = h / (state.levelData.lanes + 2);
  return { h, laneH, grassH: laneH };
}

function build() {
  const data = makeLevel(state.level);
  state.levelData = data;
  state.player = 0;
  state.running = true;
  state.hit = false;
  state.started = false;
  state.last = performance.now();
  state.accumulator = 0;
  state.cars = data.cars.map(car => ({ ...car }));
  renderScene();
  updateRenderPositions();
}

function renderScene() {
  board.replaceChildren();
  const { laneH, grassH } = laneGeometry();

  const top = document.createElement("div");
  top.className = "grass";
  top.style.top = "0";
  top.style.height = grassH + "px";
  board.append(top);

  const bottom = document.createElement("div");
  bottom.className = "grass";
  bottom.style.bottom = "0";
  bottom.style.height = grassH + "px";
  board.append(bottom);

  for (let i = 0; i < state.levelData.lanes; i++) {
    const lane = document.createElement("div");
    lane.className = "lane";
    lane.style.top = grassH + i * laneH + "px";
    lane.style.height = laneH + "px";
    board.append(lane);
  }

  state.renderCars = state.cars.map((car, i) => {
    const el = document.createElement("div");
    el.className = "car " + car.kind;
    el.dataset.i = i;
    board.append(el);
    return el;
  });

  const player = document.createElement("div");
  player.className = "player";
  player.setAttribute("aria-label", "Player");
  board.append(player);
  state.renderPlayer = player;
}

function updateRenderPositions() {
  if (!state.levelData || !state.renderCars || !state.renderPlayer) return;
  const { laneH, grassH } = laneGeometry();

  state.cars.forEach((car, index) => {
    const el = state.renderCars[index];
    if (!el) return;
    el.style.width = car.width + "%";
    el.style.height = car.height + "%";
    el.style.left = car.x + "%";
    el.style.top = grassH + car.lane * laneH + laneH * 0.29 + "px";
  });

  state.renderPlayer.style.left = "calc(50% - 19px)";
  state.renderPlayer.style.bottom =
    grassH + state.player * laneH + laneH * 0.31 + "px";
}

function playerRect() {
  const { laneH, grassH } = laneGeometry();
  return {
    left: PLAYER_X - 3.7,
    right: PLAYER_X + 3.7,
    top: grassH + (state.levelData.lanes - state.player) * laneH + laneH * 0.25,
    bottom: grassH + (state.levelData.lanes - state.player) * laneH + laneH * 0.72
  };
}

function carRect(car) {
  return {
    left: car.x,
    right: car.x + car.width,
    lane: car.lane
  };
}

function intersects(a, b) {
  return a.left < b.right && a.right > b.left;
}

function checkCollision() {
  if (state.player <= 0) return false;
  const lane = playerLane(state.levelData.lanes, state.player);
  const p = playerRect();

  for (const car of state.cars) {
    if (car.lane !== lane) continue;
    const rect = carRect(car);
    if (intersects(p, rect)) {
      fail();
      return true;
    }
  }
  return false;
}

function stepSimulation() {
  state.cars = advanceTraffic(state.cars, SIMULATION_DT);
  updateRenderPositions();
  return checkCollision();
}

function move() {
  if (!state.running) return;
  state.started = true;

  if (checkCollision()) return;

  state.player++;
  updateRenderPositions();

  // Reaching the far side is the win condition. Check the destination lane
  // once, then complete immediately; do not require an extra tap from the
  // final lane or leave the player exposed to traffic after visually crossing.
  if (checkCollision()) return;
  if (state.player >= state.levelData.lanes) {
    complete();
    return;
  }

  message.textContent =
    state.player === state.levelData.lanes - 1 ? "One more move!" : "Watch the traffic";
}

function fail() {
  if (!state.running) return;
  state.running = false;
  state.hit = true;
  save.streak = 0;
  persist();
  board.classList.remove("crash");
  void board.offsetWidth;
  board.classList.add("crash");
  message.textContent = "CRASH!";
  setTimeout(
    () => showModal("CRASH!", "You got hit. Try the same deterministic level again.", false),
    260
  );
}

function complete() {
  if (!state.running) return;
  state.running = false;
  const clean = !state.hit;
  save = completeLevel(save, state.level, clean);
  persist();
  renderHud();

  board.classList.remove("complete");
  void board.offsetWidth;
  board.classList.add("complete");
  message.textContent = "Perfect crossing!";

  const reward = save.cash - (save.cash - PERFECT_CROSSING_CORE.rewardCash(state.level));
  const bonus = clean ? " +15 gems for a clean crossing." : "";
  setTimeout(
    () =>
      showModal(
        "LEVEL COMPLETE",
        "Cash +£" + PERFECT_CROSSING_CORE.rewardCash(state.level) + "." + bonus,
        state.level < MAX_LEVEL
      ),
    300
  );
}

function frame(now) {
  const elapsed = Math.min(0.25, Math.max(0, (now - state.last) / 1000));
  state.last = now;

  if (state.running && state.started) {
    state.accumulator += elapsed;
    while (state.accumulator >= SIMULATION_DT && state.running) {
      state.accumulator -= SIMULATION_DT;
      if (stepSimulation()) break;
    }
  }

  requestAnimationFrame(frame);
}

moveButton.addEventListener("click", move);
board.addEventListener("pointerdown", event => {
  if (event.pointerType === "touch" || event.pointerType === "pen") move();
});

modalButton.addEventListener("click", () => {
  hideModal();
  if (state.hit) {
    build();
    return;
  }
  state.level = Math.min(MAX_LEVEL, state.level + 1);
  save.level = state.level;
  persist();
  renderHud();
  build();
});

document.querySelectorAll(".nav-button").forEach(button =>
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-button").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    if (button.dataset.screen === "tasks") {
      message.textContent = "Tasks: every 5 completed levels +10 gems · every 15 +25 · clean crossing +15";
    } else if (button.dataset.screen === "shop") {
      message.textContent = "Shop is coming after the core game loop is proven.";
    } else {
      message.textContent = "Tap the road to move";
    }
  })
);

renderHud();
build();
requestAnimationFrame(frame);
