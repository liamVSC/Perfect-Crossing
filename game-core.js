const PERFECT_CROSSING_CORE = (() => {
  const MAX_LEVEL = 5000;
  const PLAYER_X = 50;
  const PLAYER_HALF_WIDTH = 3.7;
  const SIMULATION_DT = 1 / 60;
  const SOLVER_MAX_TICKS = 3600;

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  function hashSeed(n) {
    let x = (n | 0) ^ 0x9e3779b9;
    x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
    return (x ^ (x >>> 16)) >>> 0;
  }

  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function difficulty(level) {
    const t = Math.min(1, (level - 1) / 4999);
    return {
      lanes: clamp(2 + Math.floor(t * 7), 2, 9),
      speed: 70 + t * 170,
      density: 0.2 + t * 0.52,
      gap: Math.max(0.16, 0.62 - t * 0.38),
      vehicleScale: 1 + t * 0.45,
      pattern: Math.min(5, Math.floor(level / 1000))
    };
  }

  function buildTraffic(level, attempt = 0) {
    const d = difficulty(level);
    const seed = hashSeed(Math.imul(level, 0x45d9f3b) + attempt * 0x27d4eb2d);
    const random = rng(seed);
    const cars = [];

    for (let lane = 0; lane < d.lanes; lane++) {
      const direction = (lane % 2 === 0 ? 1 : -1) * (random() > 0.25 ? -1 : 1);
      const count = 1 + Math.floor(d.density * 3 + (random() > 0.58 ? 1 : 0));
      const spacing = 100 / count;

      for (let i = 0; i < count; i++) {
        const width = (7 + random() * 8) * d.vehicleScale;
        const x = (i * spacing + random() * spacing * 0.65) % 100;
        const speed = d.speed * (0.72 + random() * 0.65) * direction;
        const kind = random() > 0.82 && level >= 1000 ? "truck" : "car";
        const height = kind === "truck" ? 48 : 36;
        cars.push({ lane, x, width, speed, kind, height });
      }
    }

    return cars;
  }

  function wrapCarX(car, x) {
    if (car.speed > 0 && x > 105) return -car.width;
    if (car.speed < 0 && x < -car.width) return 105;
    return x;
  }

  function advanceTraffic(cars, dt = SIMULATION_DT) {
    return cars.map(car => ({
      ...car,
      x: wrapCarX(car, car.x + (car.speed / 100) * dt * 100)
    }));
  }

  function playerLane(lanes, player) {
    return lanes - player;
  }

  function carHorizontalRect(car, x = car.x) {
    return { left: x, right: x + car.width };
  }

  function collisionAt(cars, lanes, player, time) {
    if (player <= 0) return false;
    const lane = playerLane(lanes, player);
    const left = PLAYER_X - PLAYER_HALF_WIDTH;
    const right = PLAYER_X + PLAYER_HALF_WIDTH;

    for (const car of cars) {
      if (car.lane !== lane) continue;
      const x = wrapCarX(car, car.x + (car.speed / 100) * time * 100);
      const rect = carHorizontalRect(car, x);
      if (left < rect.right && right > rect.left) return true;
    }
    return false;
  }

  function laneSafeAt(cars, lanes, player, time) {
    return !collisionAt(cars, lanes, player, time);
  }

  function authoritativeSolve(level, cars) {
    const lanes = difficulty(level).lanes;
    if (cars.some(car => car.lane < 0 || car.lane >= lanes || car.width <= 0)) return false;

    // The real game starts traffic on the first tap. The first move therefore
    // happens at t=0, and every later decision occurs on the same fixed 60 Hz
    // simulation clock used by the live game.
    if (!laneSafeAt(cars, lanes, 1, 0)) return false;

    let reachable = new Set([1]);

    for (let tick = 0; tick < SOLVER_MAX_TICKS; tick++) {
      const time = (tick + 1) * SIMULATION_DT;
      const next = new Set();

      for (const player of reachable) {
        if (!laneSafeAt(cars, lanes, player, time)) continue;

        if (player >= lanes) return true;

        // Wait in the current lane for another simulation tick.
        next.add(player);

        // Or tap immediately at this tick to enter the next lane.
        const moved = player + 1;
        if (laneSafeAt(cars, lanes, moved, time)) {
          if (moved >= lanes) return true;
          next.add(moved);
        }
      }

      reachable = next;
      if (!reachable.size) return false;
    }

    return false;
  }

  function simulateSolvability(level, cars) {
    return authoritativeSolve(level, cars);
  }

  function emergencyTraffic(level) {
    const d = difficulty(level);
    return Array.from({ length: d.lanes }, (_, lane) => ({
      lane,
      x: lane % 2 === 0 ? 8 : 72,
      width: Math.min(10, 7 * d.vehicleScale),
      speed: (lane % 2 === 0 ? 1 : -1) * Math.max(65, d.speed * 0.7),
      kind: "car",
      height: 36
    }));
  }

  function makeLevel(level) {
    if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) {
      throw new RangeError("level must be between 1 and " + MAX_LEVEL);
    }

    for (let attempt = 0; attempt < 80; attempt++) {
      const d = difficulty(level);
      const cars = buildTraffic(level, attempt);
      if (authoritativeSolve(level, cars)) {
        return { level, lanes: d.lanes, cars };
      }
    }

    // Deterministic fallback. It is also validated rather than merely assumed
    // to be playable.
    for (let attempt = 0; attempt < 80; attempt++) {
      const d = difficulty(level);
      const cars = emergencyTraffic(level).map((car, index) => ({
        ...car,
        x: ((car.x + attempt * (9 + index * 3)) % 100)
      }));
      if (authoritativeSolve(level, cars)) return { level, lanes: d.lanes, cars };
    }

    throw new Error("Unable to generate a playable deterministic level " + level);
  }

  function rewardCash(level) {
    return Math.round(10 + Math.sqrt(level) * 6.8);
  }

  function defaultSave() {
    return {
      level: 1,
      cash: 0,
      gems: 0,
      completed: 0,
      noHit: 0,
      streak: 0,
      tasks: { five: 0, fifteen: 0, clean: 0, fifty: 0, hundred: 0 }
    };
  }

  function completeLevel(save, level, clean = true) {
    const next = {
      ...defaultSave(),
      ...save,
      tasks: { ...defaultSave().tasks, ...(save && save.tasks ? save.tasks : {}) }
    };
    const reward = rewardCash(level);
    next.cash += reward;
    next.completed += 1;
    next.streak += 1;
    next.tasks.five = next.completed;
    if (clean) {
      next.noHit += 1;
      next.gems += 15;
      next.tasks.clean = next.noHit;
    }
    if (next.completed % 5 === 0) next.gems += 10;
    if (next.completed % 15 === 0) next.gems += 25;
    if (next.completed % 50 === 0) next.gems += 50;
    if (next.completed % 100 === 0) next.gems += 100;
    next.level = Math.min(MAX_LEVEL, level + 1);
    return next;
  }

  return {
    MAX_LEVEL,
    PLAYER_X,
    PLAYER_HALF_WIDTH,
    SIMULATION_DT,
    SOLVER_MAX_TICKS,
    clamp,
    hashSeed,
    rng,
    difficulty,
    buildTraffic,
    wrapCarX,
    advanceTraffic,
    playerLane,
    carHorizontalRect,
    collisionAt,
    laneSafeAt,
    authoritativeSolve,
    simulateSolvability,
    makeLevel,
    rewardCash,
    defaultSave,
    completeLevel
  };
})();

globalThis.PERFECT_CROSSING_CORE = PERFECT_CROSSING_CORE;
