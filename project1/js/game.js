(function () {
  'use strict';

  const TICK_RATE_MS = 2000;
  const STORAGE_KEY_PREFIX = 'businessTycoonSave_';
  const MAX_LOG_ENTRIES = 60;
  const SAVE_VERSION = 3;
  const SELL_REFUND_RATIO = 0.5;
  const OFFLINE_CAP_MS = 24 * 60 * 60 * 1000;
  const HIGH_SCORE_KEY = 'businessTycoonHighScore';

  const BUILDING_SPECS = {
    Office: { cost: 100, income: 12, unlockLevel: 0 },
    Factory: { cost: 50000, income: 55, unlockLevel: 1 },
    Warehouse: { cost: 120000, income: 130, unlockLevel: 2 },
    Store: { cost: 300000, income: 280, unlockLevel: 3 },
    HQ: { cost: 1500000, income: 1200, unlockLevel: 5 },
    ResearchLab: { cost: 800000, income: 400, unlockLevel: 4 },
  };

  const EMPLOYEE_SPECS = {
    Worker: { cost: 800, salary: 2, incomePercent: 5, unlockLevel: 0 },
    Manager: { cost: 3500, salary: 10, incomePercent: 15, unlockLevel: 1 },
    Analyst: { cost: 12000, salary: 25, incomePercent: 25, unlockLevel: 3 },
    Executive: { cost: 500000, salary: 80, incomePercent: 50, unlockLevel: 5 },
    Intern: { cost: 50000, salary: 0, incomePercent: 1, unlockLevel: 0 },
  };

  const UPGRADE_SPECS = [
    { id: 'efficiency1', name: 'Efficiency I', cost: 50000, incomePercent: 10 },
    { id: 'efficiency2', name: 'Efficiency II', cost: 250000, incomePercent: 10 },
    { id: 'efficiency3', name: 'Efficiency III', cost: 1000000, incomePercent: 10 },
  ];

  const MILESTONES = [
    { id: 'first_office', name: 'First Office', check: s => (s.buildings.Office || 0) >= 1, rep: 10 },
    { id: '1k', name: 'Reach $1,000', check: s => s.money >= 1000, rep: 20 },
    { id: '5_buildings', name: '5 Buildings', check: s => totalBuildings(s) >= 5, rep: 30 },
    { id: '10k', name: 'Reach $10,000', check: s => s.money >= 10000, rep: 50 },
    { id: 'first_prestige', name: 'First Prestige', check: s => (s.prestigeCount || 0) >= 1, rep: 100 },
    { id: '100k', name: 'Reach $100,000', check: s => s.money >= 100000, rep: 80 },
    { id: '50_buildings', name: '50 Buildings', check: s => totalBuildings(s) >= 50, rep: 100 },
    { id: 'prestige5', name: 'Prestige 5', check: s => (s.prestigeCount || 0) >= 5, rep: 200 },
  ];

  const CONTRACTS = [
    { id: 'earn500', name: 'Earn $500 in one tick', check: s => false, reward: 200, trigger: (s, income) => income >= 500 },
    { id: 'earn2k', name: 'Earn $2,000 in one tick', check: s => false, reward: 800, trigger: (s, income) => income >= 2000 },
    { id: '10_workers', name: 'Have 10 Workers', check: s => (s.employees.Worker || 0) >= 10, reward: 500 },
    { id: '5_factories', name: 'Have 5 Factories', check: s => (s.buildings.Factory || 0) >= 5, reward: 1000 },
  ];

  const EVENTS = [
    { id: 'boom', name: 'Market boom!', incomeMult: 1.2, duration: 3 },
    { id: 'recession', name: 'Recession...', incomeMult: 0.85, duration: 3 },
    { id: 'strike', name: 'Strike!', incomeMult: 0.5, duration: 2 },
    { id: 'bonus', name: 'Big contract!', incomeMult: 1.5, duration: 2 },
    { id: 'tax_refund', name: 'Tax refund!', cashBonus: 500, duration: 0 },
    { id: 'lucky', name: 'Lucky deal!', incomeMult: 1.3, duration: 2 },
    { id: 'broken', name: 'Broken machine...', incomeMult: 0.7, duration: 2 },
  ];

  const EVENT_CHANCE = 0.15;
  const EVENT_MIN_TICKS = 8;

  const INITIAL_MONEY = 150;
  const REVERT_BASE_COST = 100000;
  const REVERT_COST_MULTIPLIER = 1.15;
  const REVERT_INCOME_MULT = 3;

  function totalBuildings(s) {
    return Object.values(s.buildings).reduce((a, b) => a + b, 0);
  }

  function totalEmployees(s) {
    return Object.values(s.employees).reduce((a, b) => a + b, 0);
  }

  const MAP_W = 360;
  const MAP_H = 220;
  const MAP_CELL = 16;
  const MAP_COLS = Math.floor(MAP_W / MAP_CELL);
  const MAP_ROWS = Math.floor(MAP_H / MAP_CELL);
  const MAP_MAX_SLOTS = MAP_COLS * MAP_ROWS;
  const BUILDING_COLORS = {
    Office: '#6b8cce',
    Factory: '#8c6b6b',
    Warehouse: '#7caf5e',
    Store: '#e8c547',
    HQ: '#a78bfa',
    ResearchLab: '#5ec4c4',
  };

  const THEMES = {
    default: { bg: '#1a1d29', surface: '#252936', surfaceHover: '#2e3344', text: '#e8eaed', textMuted: '#9aa0a6', accent: '#7caf5e', accentHover: '#8fc76a', danger: '#d9655c', gold: '#e8c547' },
    warm: { bg: '#2d2318', surface: '#3d3225', surfaceHover: '#4a3d2e', text: '#f0e6d8', textMuted: '#b8a890', accent: '#c49a6c', accentHover: '#d4aa7c', danger: '#c45c4c', gold: '#e8b84a' },
    ocean: { bg: '#0f1f2e', surface: '#1a2f42', surfaceHover: '#243d52', text: '#d8e8f0', textMuted: '#8aa8b8', accent: '#5eb4c4', accentHover: '#7dd3fc', danger: '#e07868', gold: '#7dd3fc' },
    forest: { bg: '#0f1a14', surface: '#1a2a20', surfaceHover: '#243d2e', text: '#d8f0e0', textMuted: '#8ab89a', accent: '#5ec47c', accentHover: '#7ce89a', danger: '#d9655c', gold: '#b8d84a' },
    sunset: { bg: '#1a1418', surface: '#2a2028', surfaceHover: '#3d2e38', text: '#f0e0e8', textMuted: '#b8a0b0', accent: '#e87888', accentHover: '#f098a8', danger: '#d05060', gold: '#f0c060' },
    midnight: { bg: '#0a0a12', surface: '#12121e', surfaceHover: '#1e1e2e', text: '#c8c8e0', textMuted: '#7878a0', accent: '#8888e0', accentHover: '#a0a0f0', danger: '#e06070', gold: '#c0a0f0' },
    paper: { bg: '#e8e4dc', surface: '#f4f0e8', surfaceHover: '#e0dcd4', text: '#2a2620', textMuted: '#6a6560', accent: '#4a7c5c', accentHover: '#5a9c6c', danger: '#b05050', gold: '#b89030' },
    rainbow: { bg: '#1a1520', surface: 'rgba(40,30,50,0.92)', surfaceHover: '#35304a', text: '#f0e8f8', textMuted: '#b0a0c8', accent: '#50e080', accentHover: '#70f0a0', danger: '#f06080', gold: '#f0c040' },
    purple: { bg: '#1a1424', surface: '#2a1e38', surfaceHover: '#382a48', text: '#e8e0f0', textMuted: '#a090b8', accent: '#a078e0', accentHover: '#b890f0', danger: '#e06070', gold: '#d0a8f0' },
    red: { bg: '#1a1214', surface: '#2a1a1e', surfaceHover: '#3d2628', text: '#f0e0e0', textMuted: '#b8a0a0', accent: '#e06060', accentHover: '#f08080', danger: '#e05050', gold: '#e8a050' },
  };
  const THEME_UNLOCK_REP = 0;
  const MAX_WORKERS_VISIBLE = 80;

  let workerPositions = [];
  let mapAnimId = null;

  function getBuildingSlots() {
    const list = [];
    for (const [type, count] of Object.entries(state.buildings)) {
      for (let i = 0; i < count; i++) list.push(type);
    }
    return list.slice(0, MAP_MAX_SLOTS);
  }

  function brightenColor(hex, amount) {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((num >> 16) & 0xff) + 255 * amount);
    const g = Math.min(255, ((num >> 8) & 0xff) + 255 * amount);
    const b = Math.min(255, (num & 0xff) + 255 * amount);
    return '#' + (0x1000000 + (r << 16) + (g << 8) + (b | 0)).toString(16).slice(1);
  }

  function ensureWorkerPositions() {
    const n = Math.min(totalEmployees(state), MAX_WORKERS_VISIBLE);
    while (workerPositions.length < n) {
      workerPositions.push({
        x: MAP_CELL * 2 + Math.random() * (MAP_W - MAP_CELL * 4),
        y: MAP_CELL * 2 + Math.random() * (MAP_H - MAP_CELL * 4),
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
      });
    }
    workerPositions.length = n;
  }

  function renderMinimap() {
    const canvas = $('minimap');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ensureWorkerPositions();

    ctx.fillStyle = '#1e2233';
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    const slots = getBuildingSlots();
    const padding = 2;
    for (let i = 0; i < slots.length; i++) {
      const row = Math.floor(i / MAP_COLS);
      const col = i % MAP_COLS;
      const x = col * MAP_CELL + padding;
      const y = row * MAP_CELL + padding;
      const size = MAP_CELL - padding * 2;
      const buildingType = slots[i];
      const level = getBuildingLevel(buildingType);
      const baseColor = BUILDING_COLORS[buildingType] || '#555';
      if (level > 1) {
        ctx.fillStyle = brightenColor(baseColor, 0.2);
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = '#e8c547';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, size, size);
        ctx.font = 'bold 8px sans-serif';
        ctx.fillStyle = '#1a1a1a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('' + level, x + size / 2, y + size / 2);
      } else {
        ctx.fillStyle = baseColor;
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, size, size);
      }
    }

    const workerRadius = 3;
    for (let i = 0; i < workerPositions.length; i++) {
      const w = workerPositions[i];
      w.x += w.vx;
      w.y += w.vy;
      if (w.x < workerRadius || w.x > MAP_W - workerRadius) w.vx *= -1;
      if (w.y < workerRadius || w.y > MAP_H - workerRadius) w.vy *= -1;
      w.x = Math.max(workerRadius, Math.min(MAP_W - workerRadius, w.x));
      w.y = Math.max(workerRadius, Math.min(MAP_H - workerRadius, w.y));
      w.vx += (Math.random() - 0.5) * 0.3;
      w.vy += (Math.random() - 0.5) * 0.3;
      w.vx = Math.max(-1.5, Math.min(1.5, w.vx));
      w.vy = Math.max(-1.5, Math.min(1.5, w.vy));

      ctx.fillStyle = '#e8eaed';
      ctx.beginPath();
      ctx.arc(w.x, w.y, workerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    mapAnimId = requestAnimationFrame(renderMinimap);
  }

  function getLevel(s) {
    const rep = s.reputation || 0;
    return Math.floor(Math.sqrt(rep / 10)) || 0;
  }

  let state = {
    money: INITIAL_MONEY,
    buildings: { Office: 0, Factory: 0, Warehouse: 0, Store: 0, HQ: 0, ResearchLab: 0 },
    buildingLevels: { Office: 1, Factory: 1, Warehouse: 1, Store: 1, HQ: 1, ResearchLab: 1 },
    employees: { Worker: 0, Manager: 0, Analyst: 0, Executive: 0, Intern: 0 },
    upgrades: { efficiency1: false, efficiency2: false, efficiency3: false },
    reputation: 0,
    totalEarned: 0,
    prestigeCount: 0,
    tickCount: 0,
    log: [],
    currentEvent: null,
    completedMilestones: [],
    completedContracts: [],
    activeContractIndex: 0,
    tutorialStep: 0,
    lastTickTime: null,
    stats: { buildingsBought: 0, bestIncomeTick: 0, firstPlayed: null },
    speed: 1,
    currentSlot: 1,
    theme: 'default',
    unlockedThemes: ['default', 'warm', 'ocean', 'forest', 'sunset', 'midnight', 'paper', 'rainbow', 'purple', 'red'],
    muted: false,
    soundTick: true,
    soundBuy: true,
    soundMilestone: true,
    lastAction: null,
    revertCount: 0,
  };

  let tickTimer = null;
  const $ = (id) => document.getElementById(id);

  function formatMoney(n) {
    return '$' + Math.round(n).toLocaleString();
  }

  function addLog(message) {
    state.log.unshift({ t: Date.now(), msg: message });
    if (state.log.length > MAX_LOG_ENTRIES) state.log.pop();
  }

  function getIncomeMultiplier() {
    let mult = 1 + (state.prestigeCount || 0) * 0.05;
    mult *= 1 + REVERT_INCOME_MULT * (state.revertCount || 0);
    if (state.currentEvent && state.currentEvent.incomeMult) mult *= state.currentEvent.incomeMult;
    const up = state.upgrades || {};
    UPGRADE_SPECS.forEach((u, i) => {
      const key = u.id;
      if (up[key]) mult *= 1 + u.incomePercent / 100;
    });
    return mult;
  }

  function getBuildingLevel(type) {
    return Math.max(1, (state.buildingLevels && state.buildingLevels[type]) || 1);
  }

  function computeIncome() {
    let base = 0;
    const lvl = getLevel(state);
    for (const [type, count] of Object.entries(state.buildings)) {
      const spec = BUILDING_SPECS[type];
      if (!spec || count <= 0) continue;
      if ((spec.unlockLevel || 0) > lvl) continue;
      const levelMult = getBuildingLevel(type);
      base += count * (spec.income || 0) * levelMult;
    }
    let empMult = 1;
    for (const [type, count] of Object.entries(state.employees)) {
      const spec = EMPLOYEE_SPECS[type];
      if (!spec || count <= 0) continue;
      if ((spec.unlockLevel || 0) > lvl) continue;
      empMult += (count * (spec.incomePercent || 0)) / 100;
    }
    return base * empMult * getIncomeMultiplier();
  }

  function computeCosts() {
    let total = 0;
    const lvl = getLevel(state);
    for (const [type, count] of Object.entries(state.employees)) {
      const spec = EMPLOYEE_SPECS[type];
      if (!spec || count <= 0) continue;
      if ((spec.unlockLevel || 0) > lvl) continue;
      total += count * (spec.salary || 0);
    }
    return total;
  }

  function runTick() {
    if (!state.stats.firstPlayed) state.stats.firstPlayed = Date.now();
    const income = computeIncome();
    const costs = computeCosts();
    let net = income - costs;
    if (state.currentEvent && state.currentEvent.cashBonus) {
      net += state.currentEvent.cashBonus;
      addLog('Event: ' + state.currentEvent.name + ' +' + formatMoney(state.currentEvent.cashBonus));
      state.currentEvent = null;
    }
    state.money += net;
    state.tickCount += 1;
    if (state.money < 0) state.money = 0;
    state.totalEarned = (state.totalEarned || 0) + Math.max(0, income);
    state.reputation = (state.reputation || 0) + Math.max(0, income) / 100;
    if (state.stats && income > (state.stats.bestIncomeTick || 0)) state.stats.bestIncomeTick = income;
    state.lastTickTime = Date.now();

    if (state.currentEvent && state.currentEvent.ticksLeft !== undefined) {
      state.currentEvent.ticksLeft--;
      if (state.currentEvent.ticksLeft <= 0) state.currentEvent = null;
    } else if (state.tickCount >= EVENT_MIN_TICKS && state.tickCount % 6 === 0 && Math.random() < EVENT_CHANCE) {
      const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
      if (ev.cashBonus) {
        state.currentEvent = { name: ev.name, cashBonus: ev.cashBonus };
      } else {
        state.currentEvent = { name: ev.name, incomeMult: ev.incomeMult, ticksLeft: ev.duration };
      }
      addLog('Event: ' + ev.name);
    }

    checkMilestones();
    checkContracts(income);
    updateHighScore();
    save();
    updateUI();
    showTickFeedback(net);
    playSound('tick');
  }

  function checkContracts(incomeThisTick) {
    if (!CONTRACTS.length) return;
    const idx = state.activeContractIndex % CONTRACTS.length;
    const c = CONTRACTS[idx];
    if (state.completedContracts.indexOf(c.id) >= 0) return;
    let done = false;
    if (c.trigger) done = c.trigger(state, incomeThisTick);
    else if (c.check) done = c.check(state);
    if (done) {
      state.completedContracts.push(c.id);
      state.money += c.reward;
      addLog('Contract: ' + c.name + ' +' + formatMoney(c.reward));
      playSound('contract');
      state.activeContractIndex = (state.activeContractIndex + 1) % CONTRACTS.length;
    }
  }

  function getActiveContract() {
    if (!CONTRACTS.length) return null;
    for (let i = 0; i < CONTRACTS.length; i++) {
      const c = CONTRACTS[(state.activeContractIndex + i) % CONTRACTS.length];
      if (state.completedContracts.indexOf(c.id) < 0) return c;
    }
    return null;
  }

  function updateHighScore() {
    try {
      const current = parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10);
      if (state.money > current) localStorage.setItem(HIGH_SCORE_KEY, String(Math.round(state.money)));
    } catch (e) {}
  }

  function getHighScore() {
    try {
      return parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10);
    } catch (e) { return 0; }
  }

  function checkMilestones() {
    MILESTONES.forEach(m => {
      if (state.completedMilestones.indexOf(m.id) >= 0) return;
      if (m.check(state)) {
        state.completedMilestones.push(m.id);
        state.reputation = (state.reputation || 0) + m.rep;
        addLog('Milestone: ' + m.name + ' (+' + m.rep + ' rep)');
        playSound('milestone');
      }
    });
  }

  function showTickFeedback(net) {
    const el = $('tick-feedback');
    if (!el) return;
    el.textContent = '';
    el.className = 'tick-feedback';
    const span = document.createElement('span');
    if (net >= 0) {
      span.className = 'gain popup-gain';
      span.textContent = '+' + formatMoney(net) + ' this tick';
    } else {
      span.className = 'loss';
      span.textContent = formatMoney(net) + ' this tick';
    }
    el.appendChild(span);
  }

  function canUnlockBuilding(type) {
    const spec = BUILDING_SPECS[type];
    if (!spec) return false;
    return getLevel(state) >= (spec.unlockLevel || 0);
  }

  function buyBuilding(type) {
    const spec = BUILDING_SPECS[type];
    if (!spec || !canUnlockBuilding(type) || state.money < spec.cost) return;
    state.money -= spec.cost;
    state.buildings[type] = (state.buildings[type] || 0) + 1;
    if (state.stats) state.stats.buildingsBought = (state.stats.buildingsBought || 0) + 1;
    state.lastAction = { type: 'buyBuilding', buildingType: type, cost: spec.cost };
    addLog('Bought ' + type);
    playSound('buy');
    save();
    updateUI();
  }

  function sellBuilding(type) {
    const count = state.buildings[type] || 0;
    if (count <= 0) return;
    const spec = BUILDING_SPECS[type];
    const refund = Math.floor(spec.cost * SELL_REFUND_RATIO);
    state.money += refund;
    state.buildings[type] = count - 1;
    state.lastAction = { type: 'sellBuilding', buildingType: type, refund: refund };
    addLog('Sold ' + type + ' for ' + formatMoney(refund));
    playSound('sell');
    save();
    updateUI();
  }

  function upgradeBuildingLevel(type) {
    const spec = BUILDING_SPECS[type];
    if (!spec) return;
    const curLevel = getBuildingLevel(type);
    const cost = Math.floor(spec.cost * Math.pow(1.5, curLevel - 1));
    if (state.money < cost || (state.buildings[type] || 0) < 1) return;
    state.money -= cost;
    if (!state.buildingLevels) state.buildingLevels = {};
    state.buildingLevels[type] = curLevel + 1;
    state.lastAction = { type: 'upgradeBuilding', buildingType: type, cost: cost, levelBefore: curLevel };
    addLog(type + ' upgraded to level ' + (curLevel + 1));
    playSound('upgrade');
    save();
    updateUI();
  }

  function canUnlockEmployee(type) {
    const spec = EMPLOYEE_SPECS[type];
    if (!spec) return false;
    return getLevel(state) >= (spec.unlockLevel || 0);
  }

  function hireEmployee(type) {
    const spec = EMPLOYEE_SPECS[type];
    if (!spec || !canUnlockEmployee(type) || state.money < spec.cost) return;
    state.money -= spec.cost;
    state.employees[type] = (state.employees[type] || 0) + 1;
    state.lastAction = { type: 'hireEmployee', employeeType: type, cost: spec.cost };
    addLog('Hired ' + type);
    playSound('buy');
    save();
    updateUI();
  }

  function fireEmployee(type) {
    const count = state.employees[type] || 0;
    if (count <= 0) return;
    state.employees[type] = count - 1;
    state.lastAction = { type: 'fireEmployee', employeeType: type };
    addLog('Fired 1 ' + type);
    save();
    updateUI();
  }

  function getRevertCost() {
    return Math.floor(REVERT_BASE_COST * Math.pow(REVERT_COST_MULTIPLIER, state.revertCount || 0));
  }

  function canRevert() {
    return state.money >= getRevertCost();
  }

  function doRevertProgress() {
    const cost = getRevertCost();
    if (state.money < cost) return;
    state.money = INITIAL_MONEY;
    state.buildings = { Office: 0, Factory: 0, Warehouse: 0, Store: 0, HQ: 0, ResearchLab: 0 };
    state.buildingLevels = { Office: 1, Factory: 1, Warehouse: 1, Store: 1, HQ: 1, ResearchLab: 1 };
    state.employees = { Worker: 0, Manager: 0, Analyst: 0, Executive: 0, Intern: 0 };
    state.upgrades = { efficiency1: false, efficiency2: false, efficiency3: false };
    state.currentEvent = null;
    state.completedContracts = [];
    state.activeContractIndex = 0;
    state.lastAction = null;
    state.revertCount = (state.revertCount || 0) + 1;
    addLog('Revert #' + state.revertCount + '! Progress reset, income now ' + (1 + REVERT_INCOME_MULT * state.revertCount) + 'x faster.');
    playSound('revert');
    save();
    updateUI();
  }

  function undoLastAction() {
    const a = state.lastAction;
    if (!a) return;
    if (a.type === 'buyBuilding') {
      if ((state.buildings[a.buildingType] || 0) < 1) return;
      state.buildings[a.buildingType]--;
      state.money += a.cost;
      if (state.stats) state.stats.buildingsBought = Math.max(0, (state.stats.buildingsBought || 0) - 1);
    } else if (a.type === 'sellBuilding') {
      if (state.money < a.refund) return;
      state.money -= a.refund;
      state.buildings[a.buildingType] = (state.buildings[a.buildingType] || 0) + 1;
    } else if (a.type === 'upgradeBuilding') {
      if (!state.buildingLevels || state.buildingLevels[a.buildingType] <= 1) return;
      state.buildingLevels[a.buildingType]--;
      state.money += a.cost;
    } else if (a.type === 'hireEmployee') {
      if ((state.employees[a.employeeType] || 0) < 1) return;
      state.employees[a.employeeType]--;
      state.money += a.cost;
    } else if (a.type === 'fireEmployee') {
      state.employees[a.employeeType] = (state.employees[a.employeeType] || 0) + 1;
    }
    state.lastAction = null;
    addLog('Undid last action');
    playSound('revert');
    save();
    updateUI();
  }

  function buyUpgrade(upgradeId) {
    const spec = UPGRADE_SPECS.find(u => u.id === upgradeId);
    if (!spec || state.upgrades[upgradeId] || state.money < spec.cost) return;
    state.money -= spec.cost;
    state.upgrades[upgradeId] = true;
    addLog('Upgrade: ' + spec.name);
    playSound('buy');
    save();
    updateUI();
  }

  function prestige() {
    const total = totalBuildings(state);
    if (total < 3 || state.money < 5000) return;
    state.prestigeCount = (state.prestigeCount || 0) + 1;
    state.money = INITIAL_MONEY;
    state.buildings = { Office: 0, Factory: 0, Warehouse: 0, Store: 0, HQ: 0, ResearchLab: 0 };
    state.buildingLevels = { Office: 1, Factory: 1, Warehouse: 1, Store: 1, HQ: 1, ResearchLab: 1 };
    state.employees = { Worker: 0, Manager: 0, Analyst: 0, Executive: 0, Intern: 0 };
    state.upgrades = { efficiency1: false, efficiency2: false, efficiency3: false };
    state.currentEvent = null;
    state.completedContracts = [];
    state.activeContractIndex = 0;
    addLog('Prestige! Level ' + state.prestigeCount + ' – +5% income forever.');
    playSound('milestone');
    save();
    updateUI();
  }

  function canPrestige() {
    return totalBuildings(state) >= 3 && state.money >= 5000;
  }

  function nextTutorialStep() {
    if (state.tutorialStep === 'done' || typeof state.tutorialStep !== 'number') return;
    state.tutorialStep++;
    if (state.tutorialStep >= 4) state.tutorialStep = 'done';
    save();
    updateUI();
  }

  function playSound(kind) {
    if (state.muted) return;
    if (kind === 'tick' && !state.soundTick) return;
    if ((kind === 'buy' || kind === 'hire' || kind === 'upgrade' || kind === 'sell' || kind === 'revert') && !state.soundBuy) return;
    if ((kind === 'milestone' || kind === 'contract') && !state.soundMilestone) return;
    try {
      const ctx = window.tycoonAudioContext || (window.tycoonAudioContext = new (window.AudioContext || window.webkitAudioContext)());
      const now = ctx.currentTime;

      function beep(freq, start, duration, gain) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = freq >= 400 ? 'sine' : 'sine';
        o.frequency.setValueAtTime(freq, start);
        o.connect(g);
        g.connect(ctx.destination);
        g.gain.setValueAtTime(gain || 0.06, start);
        g.gain.exponentialRampToValueAtTime(0.001, start + (duration || 0.08));
        o.start(start);
        o.stop(start + (duration || 0.08) + 0.02);
      }

      if (kind === 'tick') {
        beep(280, 0, 0.04, 0.04);
      } else if (kind === 'buy' || kind === 'hire' || kind === 'upgrade') {
        beep(523, 0, 0.06, 0.07);
        beep(659, 0.06, 0.08, 0.06);
      } else if (kind === 'sell') {
        beep(440, 0, 0.05, 0.06);
        beep(349, 0.06, 0.07, 0.05);
      } else if (kind === 'revert') {
        beep(400, 0, 0.04, 0.05);
        beep(300, 0.05, 0.04, 0.04);
        beep(200, 0.1, 0.06, 0.04);
      } else if (kind === 'milestone' || kind === 'contract') {
        beep(523, 0, 0.1, 0.07);
        beep(659, 0.08, 0.1, 0.06);
        beep(784, 0.16, 0.12, 0.06);
      }
    } catch (e) {}
  }

  function updateUI() {
    const income = computeIncome();
    const costs = computeCosts();
    const level = getLevel(state);

    const moneyEl = $('money');
    const incomeEl = $('income-display');
    const costsEl = $('costs-display');
    const levelEl = $('level-display');
    const prestigeEl = $('prestige-display');
    if (moneyEl) moneyEl.textContent = formatMoney(state.money);
    if (incomeEl) incomeEl.textContent = formatMoney(income);
    if (costsEl) costsEl.textContent = formatMoney(costs);
    if (levelEl) levelEl.textContent = 'Level ' + level;
    if (prestigeEl) prestigeEl.textContent = state.prestigeCount || '0';

    const eventBanner = $('event-banner');
    if (eventBanner) {
      if (state.currentEvent) {
        eventBanner.textContent = state.currentEvent.name;
        eventBanner.className = 'event-banner visible';
      } else {
        eventBanner.className = 'event-banner';
      }
    }

    const buildingsList = $('buildings-list');
    const buildingPurchases = $('building-purchases');
    if (buildingsList) {
      buildingsList.innerHTML = '';
      for (const [type, count] of Object.entries(state.buildings)) {
        if (count <= 0) continue;
        const div = document.createElement('div');
        div.className = 'list-item list-item-building';
        const lvl = getBuildingLevel(type);
        div.innerHTML = '<span class="name">' + type + (lvl > 1 ? ' Lv.' + lvl : '') + '</span><span class="count">' + count + '</span>';
        const sellBtn = document.createElement('button');
        sellBtn.className = 'btn btn-fire';
        sellBtn.textContent = 'Sell 1';
        sellBtn.addEventListener('click', () => sellBuilding(type));
        div.appendChild(sellBtn);
        const spec = BUILDING_SPECS[type];
        const upgradeCost = Math.floor(spec.cost * Math.pow(1.5, lvl - 1));
        if (state.money >= upgradeCost) {
          const upBtn = document.createElement('button');
          upBtn.className = 'btn btn-upgrade';
          upBtn.textContent = 'Upgrade';
          upBtn.addEventListener('click', () => upgradeBuildingLevel(type));
          div.appendChild(upBtn);
        }
        buildingsList.appendChild(div);
      }
    }
    if (buildingPurchases) {
      buildingPurchases.innerHTML = '';
      for (const type of Object.keys(BUILDING_SPECS)) {
        const spec = BUILDING_SPECS[type];
        const unlocked = canUnlockBuilding(type);
        const btn = document.createElement('button');
        btn.className = 'btn btn-buy';
        btn.textContent = type + ' (' + formatMoney(spec.cost) + ')';
        btn.title = spec.income + '/tick' + (spec.unlockLevel > 0 ? ' — Unlocks at level ' + spec.unlockLevel : '');
        btn.disabled = !unlocked || state.money < spec.cost;
        if (!unlocked) btn.title = (btn.title ? btn.title + '\n' : '') + 'Unlocks at level ' + spec.unlockLevel;
        btn.addEventListener('click', () => buyBuilding(type));
        buildingPurchases.appendChild(btn);
      }
    }

    const employeesList = $('employees-list');
    const employeePurchases = $('employee-purchases');
    if (employeesList) {
      employeesList.innerHTML = '';
      for (const [type, count] of Object.entries(state.employees)) {
        if (count <= 0) continue;
        const div = document.createElement('div');
        div.className = 'list-item list-item-employee';
        div.innerHTML = '<span class="name">' + type + '</span><span class="count">' + count + '</span>';
        const fireBtn = document.createElement('button');
        fireBtn.className = 'btn btn-fire';
        fireBtn.textContent = 'Fire 1';
        fireBtn.title = 'Fire one ' + type + ' to reduce costs';
        fireBtn.addEventListener('click', () => fireEmployee(type));
        div.appendChild(fireBtn);
        employeesList.appendChild(div);
      }
    }
    if (employeePurchases) {
      employeePurchases.innerHTML = '';
      for (const type of Object.keys(EMPLOYEE_SPECS)) {
        const spec = EMPLOYEE_SPECS[type];
        const unlocked = canUnlockEmployee(type);
        const btn = document.createElement('button');
        btn.className = 'btn btn-hire';
        btn.textContent = 'Hire ' + type + ' (' + formatMoney(spec.cost) + ')';
        btn.title = '+' + spec.incomePercent + '% income, ' + formatMoney(spec.salary) + '/tick salary' + (spec.unlockLevel > 0 ? ' — Unlocks at level ' + spec.unlockLevel : '');
        btn.disabled = !unlocked || state.money < spec.cost;
        if (!unlocked) btn.title = (btn.title ? btn.title + '\n' : '') + 'Unlocks at level ' + spec.unlockLevel;
        btn.addEventListener('click', () => hireEmployee(type));
        employeePurchases.appendChild(btn);
      }
    }

    const upgradesEl = $('upgrades-list');
    if (upgradesEl) {
      upgradesEl.innerHTML = '';
      UPGRADE_SPECS.forEach(u => {
        if (state.upgrades[u.id]) return;
        const btn = document.createElement('button');
        btn.className = 'btn btn-upgrade';
        btn.textContent = u.name + ' ' + formatMoney(u.cost);
        btn.title = '+' + u.incomePercent + '% income (permanent)';
        btn.disabled = state.money < u.cost;
        btn.addEventListener('click', () => buyUpgrade(u.id));
        upgradesEl.appendChild(btn);
      });
    }

    const prestigeBtn = $('prestige-btn');
    if (prestigeBtn) {
      prestigeBtn.disabled = !canPrestige();
      prestigeBtn.title = 'Reset progress for +5% income per prestige. Need 3+ buildings and $5,000.';
    }
    const revertBtn = $('revert-btn');
    if (revertBtn) {
      revertBtn.disabled = !canRevert();
      revertBtn.textContent = 'Revert (' + formatMoney(getRevertCost()) + ')';
      revertBtn.title = 'Reset all progress for ' + (1 + REVERT_INCOME_MULT * ((state.revertCount || 0) + 1)) + 'x income. Cost increases 15% each time. You keep your revert count.';
    }
    const revertCountEl = $('revert-count-display');
    if (revertCountEl) revertCountEl.textContent = state.revertCount || '0';
    const undoBtn = $('undo-btn');
    if (undoBtn) undoBtn.disabled = !state.lastAction;

    const muteBtn = $('mute-btn');
    if (muteBtn) muteBtn.textContent = state.muted ? 'Unmute' : 'Mute';

    const contractEl = $('contract-text');
    const contract = getActiveContract();
    if (contractEl) contractEl.textContent = contract ? contract.name + ' → ' + formatMoney(contract.reward) : 'No contract';

    const highScoreEl = $('high-score-display');
    if (highScoreEl) highScoreEl.textContent = formatMoney(getHighScore());

    const speedEl = $('speed-display');
    if (speedEl) speedEl.textContent = state.speed + 'x';
    [1, 2, 3].forEach(slot => {
      const btn = $('slot' + slot);
      if (btn) btn.classList.toggle('active', state.currentSlot === slot);
    });

    const statsEl = $('stats-body');
    if (statsEl) {
      const s = state.stats || {};
      const first = s.firstPlayed ? new Date(s.firstPlayed).toLocaleDateString() : '—';
      statsEl.innerHTML = '<p>Buildings bought: ' + (s.buildingsBought || 0) + '</p><p>Best income/tick: ' + formatMoney(s.bestIncomeTick || 0) + '</p><p>Total earned: ' + formatMoney(state.totalEarned || 0) + '</p><p>First played: ' + first + '</p>';
    }

    const themeSelect = $('theme-select');
    if (themeSelect) {
      if (themeSelect.options.length !== (state.unlockedThemes || []).length) {
        themeSelect.innerHTML = '';
        (state.unlockedThemes || ['default']).forEach(t => {
          const opt = document.createElement('option');
          opt.value = t;
          opt.textContent = t;
          themeSelect.appendChild(opt);
        });
      }
      themeSelect.value = state.theme || 'default';
    }
    applyTheme();

    const logEl = $('log');
    if (logEl) {
      logEl.innerHTML = '';
      const entries = state.log.slice(0, 20);
      if (entries.length === 0) {
        const div = document.createElement('div');
        div.className = 'log-entry';
        div.textContent = 'No activity yet. Buy buildings and hire employees!';
        logEl.appendChild(div);
      } else {
        entries.forEach(function (entry) {
          const div = document.createElement('div');
          div.className = 'log-entry';
          div.textContent = entry.msg;
          logEl.appendChild(div);
        });
      }
    }

    const tutorialEl = $('tutorial-overlay');
    if (tutorialEl) {
      const steps = [
        'Welcome! Buy an Office to start earning money every few seconds.',
        'Hire Workers to boost your income. Managers give a bigger boost.',
        'Reach level 1 by earning (reputation). New buildings and employees unlock.',
        'Buy upgrades for permanent +income. Prestige later for a permanent multiplier!',
      ];
      if (state.tutorialStep !== 'done' && typeof state.tutorialStep === 'number' && steps[state.tutorialStep]) {
        tutorialEl.className = 'tutorial-overlay visible';
        const textEl = $('tutorial-text');
        if (textEl) textEl.textContent = steps[state.tutorialStep];
      } else {
        tutorialEl.className = 'tutorial-overlay';
      }
    }
  }

  function getStorageKey() {
    return STORAGE_KEY_PREFIX + (state.currentSlot || 1);
  }

  function save() {
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify({
        v: SAVE_VERSION,
        money: state.money,
        buildings: state.buildings,
        buildingLevels: state.buildingLevels,
        employees: state.employees,
        upgrades: state.upgrades,
        reputation: state.reputation,
        totalEarned: state.totalEarned,
        prestigeCount: state.prestigeCount,
        revertCount: state.revertCount,
        tickCount: state.tickCount,
        log: state.log,
        currentEvent: state.currentEvent,
        completedMilestones: state.completedMilestones,
        completedContracts: state.completedContracts,
        activeContractIndex: state.activeContractIndex,
        tutorialStep: state.tutorialStep,
        lastTickTime: state.lastTickTime,
        stats: state.stats,
        speed: state.speed,
        currentSlot: state.currentSlot,
        theme: state.theme,
        unlockedThemes: state.unlockedThemes,
        muted: state.muted,
        soundTick: state.soundTick,
        soundBuy: state.soundBuy,
        soundMilestone: state.soundMilestone,
      }));
    } catch (e) {
      console.warn('Save failed', e);
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(getStorageKey());
      if (!raw) return;
      const data = JSON.parse(raw);
      state.money = typeof data.money === 'number' ? data.money : state.money;
      state.buildings = data.buildings && typeof data.buildings === 'object' ? { ...state.buildings, ...data.buildings } : state.buildings;
      state.buildingLevels = data.buildingLevels && typeof data.buildingLevels === 'object' ? { ...state.buildingLevels, ...data.buildingLevels } : state.buildingLevels;
      state.employees = data.employees && typeof data.employees === 'object' ? { ...state.employees, ...data.employees } : state.employees;
      state.upgrades = data.upgrades && typeof data.upgrades === 'object' ? { ...state.upgrades, ...data.upgrades } : state.upgrades;
      state.reputation = typeof data.reputation === 'number' ? data.reputation : state.reputation;
      state.totalEarned = typeof data.totalEarned === 'number' ? data.totalEarned : state.totalEarned;
      state.prestigeCount = typeof data.prestigeCount === 'number' ? data.prestigeCount : state.prestigeCount;
      state.revertCount = typeof data.revertCount === 'number' ? data.revertCount : state.revertCount;
      state.tickCount = typeof data.tickCount === 'number' ? data.tickCount : state.tickCount;
      state.log = Array.isArray(data.log) ? data.log : state.log;
      state.currentEvent = data.currentEvent && (data.currentEvent.ticksLeft > 0 || data.currentEvent.cashBonus) ? data.currentEvent : null;
      state.completedMilestones = Array.isArray(data.completedMilestones) ? data.completedMilestones : state.completedMilestones;
      state.completedContracts = Array.isArray(data.completedContracts) ? data.completedContracts : state.completedContracts;
      state.activeContractIndex = typeof data.activeContractIndex === 'number' ? data.activeContractIndex : state.activeContractIndex;
      state.tutorialStep = data.tutorialStep !== undefined ? data.tutorialStep : state.tutorialStep;
      state.lastTickTime = data.lastTickTime || state.lastTickTime;
      state.stats = data.stats && typeof data.stats === 'object' ? { ...state.stats, ...data.stats } : state.stats;
      state.speed = typeof data.speed === 'number' ? data.speed : state.speed;
      state.currentSlot = typeof data.currentSlot === 'number' ? data.currentSlot : state.currentSlot;
      state.theme = data.theme && THEMES[data.theme] ? data.theme : state.theme;
      state.unlockedThemes = Array.isArray(data.unlockedThemes) ? data.unlockedThemes : state.unlockedThemes;
      Object.keys(THEMES).forEach(key => {
        if (state.unlockedThemes.indexOf(key) < 0) state.unlockedThemes.push(key);
      });
      state.muted = !!data.muted;
      state.soundTick = data.soundTick !== false;
      state.soundBuy = data.soundBuy !== false;
      state.soundMilestone = data.soundMilestone !== false;
    } catch (e) {
      console.warn('Load failed', e);
    }
  }

  function runOfflineProgress() {
    if (!state.lastTickTime) return;
    const elapsed = Math.min(Date.now() - state.lastTickTime, OFFLINE_CAP_MS);
    const ticks = Math.floor(elapsed / TICK_RATE_MS);
    if (ticks <= 0) return;
    const incomePerTick = computeIncome();
    const costsPerTick = computeCosts();
    const netPerTick = incomePerTick - costsPerTick;
    state.money += netPerTick * ticks;
    if (state.money < 0) state.money = 0;
    state.tickCount += ticks;
    state.totalEarned = (state.totalEarned || 0) + Math.max(0, incomePerTick) * ticks;
    state.reputation = (state.reputation || 0) + Math.max(0, incomePerTick) / 100 * ticks;
    const mins = Math.floor(elapsed / 60000);
    addLog('Offline: ' + mins + ' min away, +' + formatMoney(netPerTick * ticks));
  }

  function switchSlot(slot) {
    save();
    state.currentSlot = slot;
    load();
    updateUI();
  }

  function exportSave() {
    try {
      save();
      return btoa(unescape(encodeURIComponent(JSON.stringify({ key: getStorageKey(), data: localStorage.getItem(getStorageKey()) }))));
    } catch (e) { return ''; }
  }

  function importSave(str) {
    try {
      const raw = decodeURIComponent(escape(atob(str)));
      const obj = JSON.parse(raw);
      if (obj.data) localStorage.setItem(getStorageKey(), obj.data);
      load();
      updateUI();
      addLog('Save imported.');
    } catch (e) {
      addLog('Import failed.');
    }
  }

  function startTickLoop() {
    if (tickTimer) clearInterval(tickTimer);
    const rate = Math.max(200, TICK_RATE_MS / (state.speed || 1));
    tickTimer = setInterval(runTick, rate);
  }

  function applyTheme() {
    document.body.dataset.theme = state.theme || 'default';
    const t = THEMES[state.theme] || THEMES.default;
    const root = document.documentElement.style;
    root.setProperty('--bg', t.bg || THEMES.default.bg);
    root.setProperty('--surface', t.surface || THEMES.default.surface);
    root.setProperty('--surface-hover', t.surfaceHover || t.surface || THEMES.default.surfaceHover);
    root.setProperty('--text', t.text || THEMES.default.text);
    root.setProperty('--text-muted', t.textMuted || THEMES.default.textMuted);
    root.setProperty('--accent', t.accent || THEMES.default.accent);
    root.setProperty('--accent-hover', t.accentHover || t.accent || THEMES.default.accentHover);
    root.setProperty('--danger', t.danger || THEMES.default.danger);
    root.setProperty('--gold', t.gold || THEMES.default.gold);
  }

  function init() {
    load();
    runOfflineProgress();
    updateUI();
    startTickLoop();
    if ($('minimap')) renderMinimap();

    var revertBtnEl = document.getElementById('revert-btn');
    if (revertBtnEl) {
      revertBtnEl.addEventListener('click', function () {
        if (canRevert()) doRevertProgress();
      });
    }

    document.addEventListener('click', function (e) {
      if (e.target.id === 'tutorial-next') nextTutorialStep();
      if (e.target.id === 'tutorial-skip') { state.tutorialStep = 'done'; save(); updateUI(); }
      if (e.target.id === 'mute-btn') { state.muted = !state.muted; save(); updateUI(); }
      if (e.target.id === 'prestige-btn' && canPrestige()) prestige();
      if (e.target.id === 'undo-btn') undoLastAction();
      if (e.target.id === 'speed-05') { state.speed = 0.5; startTickLoop(); save(); updateUI(); }
      if (e.target.id === 'speed-1') { state.speed = 1; startTickLoop(); save(); updateUI(); }
      if (e.target.id === 'speed-2') { state.speed = 2; startTickLoop(); save(); updateUI(); }
      if (e.target.id === 'slot1') switchSlot(1);
      if (e.target.id === 'slot2') switchSlot(2);
      if (e.target.id === 'slot3') switchSlot(3);
      if (e.target.id === 'export-btn') { const s = exportSave(); if (s) { navigator.clipboard.writeText(s); addLog('Save copied to clipboard'); updateUI(); } }
      if (e.target.id === 'import-btn') { const s = window.prompt('Paste save data:'); if (s) importSave(s); }
      if (e.target.id === 'stats-btn') { $('stats-panel').classList.add('visible'); updateUI(); }
      if (e.target.id === 'stats-close') { $('stats-panel').classList.remove('visible'); }
    });

    document.addEventListener('change', function (e) {
      if (e.target.id === 'theme-select') { state.theme = e.target.value; save(); applyTheme(); }
    });

    const soundTickCb = $('sound-tick');
    const soundBuyCb = $('sound-buy');
    const soundMilestoneCb = $('sound-milestone');
    if (soundTickCb) soundTickCb.checked = state.soundTick;
    if (soundBuyCb) soundBuyCb.checked = state.soundBuy;
    if (soundMilestoneCb) soundMilestoneCb.checked = state.soundMilestone;
    document.addEventListener('change', function (e) {
      if (e.target.id === 'sound-tick') { state.soundTick = e.target.checked; save(); }
      if (e.target.id === 'sound-buy') { state.soundBuy = e.target.checked; save(); }
      if (e.target.id === 'sound-milestone') { state.soundMilestone = e.target.checked; save(); }
    });
  }

  init();
})();
