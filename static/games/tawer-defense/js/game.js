(function () {
  'use strict';

  const CELL_SIZE = 56;
  const START_GOLD = 150;
  const START_LIVES = 20;
  const SELL_REFUND = 0.5;
  const STORAGE_KEY = 'td_unlocked';
  const THEME_STORAGE_KEY = 'td_theme';
  const SOUND_STORAGE_KEY = 'td_sound';
  const SUPER_COOLDOWN_MS = 60 * 1000;
  const SUPER_DAMAGE = 500;

  const SHOP_ITEMS = [
    { id: 'damage', name: 'Damage +10%', cost: 100, buff: 'damage', value: 10, max: 3 },
    { id: 'speed', name: 'Fire rate +10%', cost: 100, buff: 'speed', value: 10, max: 3 },
    { id: 'range', name: 'Range +5%', cost: 80, buff: 'range', value: 5, max: 2 },
    { id: 'life', name: '+1 Life', cost: 80, instant: 'life', value: 1 },
    { id: 'gold', name: '+50 Gold', cost: 40, instant: 'gold', value: 50 },
  ];

  let canvas, ctx;
  let state = {
    gold: START_GOLD,
    lives: START_LIVES,
    score: 0,
    levelIndex: 0,
    waveIndex: 0,
    wavePhase: 'waiting',
    enemies: [],
    towers: [],
    projectiles: [],
    minions: [],
    particles: [],
    selectedTowerType: null,
    selectedCell: null,
    phase: 'menu',
    speed: 1,
    paused: false,
    waveStartTime: 0,
    spawnQueue: [],
    unlockedLevels: [1],
    autoWave: false,
    superLastUsed: 0,
    shopBuffs: { damage: 0, speed: 0, range: 0 },
    anglesMod: false,
  };

  let lastTime = 0;
  let animId = null;

  function getLevel() {
    const levels = window.TD_LEVELS.LEVELS;
    return levels[state.levelIndex] || levels[0];
  }

  function pathToPixels(path) {
    if (!path || !path.length) return [];
    return path.map(function (p) {
      return { x: p[0] * CELL_SIZE + CELL_SIZE / 2, y: p[1] * CELL_SIZE + CELL_SIZE / 2 };
    });
  }

  function isMultiPath(level) {
    const w = level.waypoints;
    return w && w.length > 0 && Array.isArray(w[0]) && w[0].length > 0 && Array.isArray(w[0][0]);
  }

  function getWaypointsPixels(level, pathIndex) {
    const w = level.waypoints;
    if (!w || !w.length) return [];
    if (isMultiPath(level)) {
      const path = w[pathIndex >= 0 ? pathIndex : 0];
      return path ? pathToPixels(path) : [];
    }
    return pathToPixels(w);
  }

  function getSpawnPixel(level) {
    const all = getSpawnPixels(level);
    return all.length ? all[0] : { x: CELL_SIZE / 2, y: CELL_SIZE / 2 };
  }

  function getNearestPathPoint(level, tx, ty, maxDist) {
    let best = null;
    let bestDist = maxDist;
    if (isMultiPath(level) && level.waypoints) {
      level.waypoints.forEach(function (path) {
        if (!path || !path.length) return;
        const wp = pathToPixels(path);
        wp.forEach(function (p) {
          const d = Math.hypot(p.x - tx, p.y - ty);
          if (d < bestDist) { bestDist = d; best = p; }
        });
      });
    } else if (level.waypoints && level.waypoints.length) {
      const wp = pathToPixels(level.waypoints);
      wp.forEach(function (p) {
        const d = Math.hypot(p.x - tx, p.y - ty);
        if (d < bestDist) { bestDist = d; best = p; }
      });
    }
    return best;
  }

  function getSpawnPixels(level) {
    const grid = level.grid;
    const CELL = window.TD_LEVELS.CELL;
    const out = [];
    for (let gy = 0; gy < grid.length; gy++) {
      for (let gx = 0; gx < grid[gy].length; gx++) {
        if (getCell(level, gx, gy) === CELL.SPAWN) {
          out.push(gridToPixel(gx, gy));
        }
      }
    }
    return out;
  }

  function gridToPixel(gx, gy) {
    return { x: gx * CELL_SIZE + CELL_SIZE / 2, y: gy * CELL_SIZE + CELL_SIZE / 2 };
  }

  function pixelToGrid(px, py) {
    const gx = Math.floor(px / CELL_SIZE);
    const gy = Math.floor(py / CELL_SIZE);
    return { gx, gy };
  }

  function getCell(level, gx, gy) {
    const grid = level.grid;
    if (gy < 0 || gy >= grid.length) return -1;
    const row = grid[gy];
    if (gx < 0 || gx >= row.length) return -1;
    return row[gx];
  }

  function canBuild(level, gx, gy) {
    return getCell(level, gx, gy) === window.TD_LEVELS.CELL.BUILDABLE;
  }

  function isPathOrSpawnOrBase(level, gx, gy) {
    const c = getCell(level, gx, gy);
    return c === 1 || c === 2 || c === 3;
  }

  function hasTower(gx, gy) {
    return state.towers.some(function (t) { return t.gx === gx && t.gy === gy; });
  }

  function getTowerAt(gx, gy) {
    return state.towers.find(function (t) { return t.gx === gx && t.gy === gy; });
  }

  function startLevel(index) {
    state.levelIndex = index;
    state.waveIndex = 0;
    state.wavePhase = 'waiting';
    state.enemies = [];
    state.towers = [];
    state.projectiles = [];
    state.minions = [];
    state.particles = [];
    state.gold = START_GOLD;
    state.lives = START_LIVES;
    state.score = 0;
    state.selectedCell = null;
    state.selectedTowerType = null;
    state.phase = 'playing';
    state.paused = false;
    state.spawnQueue = [];
    state.superLastUsed = 0;
    state.spawnCounter = 0;
    state.shopBuffs = { damage: 0, speed: 0, range: 0 };
    state.anglesMod = false;
    resizeCanvas();
    updateHUD();
    updateTowerPanel();
    updateLevelButtons();
    hideScreen();
  }

  function resizeCanvas() {
    const level = getLevel();
    const grid = level.grid;
    if (!grid || !grid.length) return;
    const cols = grid[0].length;
    const rows = grid.length;
    canvas.width = cols * CELL_SIZE;
    canvas.height = rows * CELL_SIZE;
  }

  function spawnEnemy(type) {
    const types = window.TD_ENEMIES.ENEMY_TYPES;
    const def = types[type] || types.normal;
    state.enemies.push({
      type: type,
      x: 0, y: 0,
      waypointIndex: 0,
      hp: def.hp,
      maxHp: def.hp,
      gold: def.gold,
      score: def.score,
      color: def.color,
      radius: def.radius,
      speed: def.speed,
      slowUntil: 0,
      flying: def.flying || false,
    });
  }

  function spawnEnemyAt(x, y, waypointIndex, pathIndex, type) {
    const types = window.TD_ENEMIES.ENEMY_TYPES;
    const def = types[type] || types.normal;
    state.enemies.push({
      type: type,
      x: x, y: y,
      waypointIndex: waypointIndex,
      pathIndex: pathIndex != null ? pathIndex : 0,
      hp: def.hp,
      maxHp: def.hp,
      gold: def.gold,
      score: def.score,
      color: def.color,
      radius: def.radius,
      speed: def.speed,
      slowUntil: 0,
      flying: def.flying || false,
    });
  }

  function onEnemyKilled(e) {
    const types = window.TD_ENEMIES.ENEMY_TYPES;
    const def = types[e.type];
    if (def && def.splitsInto && def.splitCount) {
      for (let i = 0; i < def.splitCount; i++) {
        spawnEnemyAt(e.x, e.y, e.waypointIndex, e.pathIndex, def.splitsInto);
      }
    }
    spawnParticles(e.x, e.y, e.color || '#e8c547', 8);
  }

  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 40 + Math.random() * 60;
      state.particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.35 + Math.random() * 0.2,
        maxLife: 0.5,
        color: color,
        radius: 3 + Math.random() * 3,
      });
    }
  }

  function startWave() {
    const level = getLevel();
    const waves = level.waves;
    if (!waves || !waves.length || state.waveIndex >= waves.length) return;
    state.wavePhase = 'active';
    state.spawnQueue = [];
    state.waveStartTime = performance.now();
    const wave = waves[state.waveIndex];
    let delay = 0;
    wave.forEach(function (g) {
      const type = g.type || 'normal';
      const count = g.count || 1;
      const d = g.delay !== undefined ? g.delay : 600;
      for (let i = 0; i < count; i++) {
        state.spawnQueue.push({ type: type, at: delay });
        delay += d;
      }
    });
    document.getElementById('btn-wave').disabled = true;
    playSound('wave');
  }

  function processSpawnQueue(now) {
    const level = getLevel();
    const spawnPixels = getSpawnPixels(level);
    const spawnPx = spawnPixels.length ? spawnPixels[0] : getSpawnPixel(level);
    const multi = isMultiPath(level);
    while (state.spawnQueue.length && now >= state.waveStartTime + state.spawnQueue[0].at) {
      const first = state.spawnQueue.shift();
      spawnEnemy(first.type);
      const e = state.enemies[state.enemies.length - 1];
      if (e) {
        const spawnIndex = spawnPixels.length ? (state.spawnCounter++ % spawnPixels.length) : 0;
        const pos = spawnPixels[spawnIndex] || spawnPx;
        e.x = pos.x;
        e.y = pos.y;
        e.waypointIndex = 1;
        e.pathIndex = multi ? spawnIndex : 0;
      }
    }
  }

  function updateEnemies(dt, level) {
    const now = performance.now() / 1000;
    state.enemies.forEach(function (e) {
      if (e.poisonUntil > now && e.poisonDps) {
        e.hp -= e.poisonDps * dt;
        if (e.hp <= 0) {
          onEnemyKilled(e);
          e.dead = true;
          state.gold += e.gold;
          state.score += e.score;
          playSound('kill');
        }
      }
      const pathIndex = e.pathIndex != null ? e.pathIndex : 0;
      const waypoints = getWaypointsPixels(level, pathIndex);
      if (waypoints.length === 0) return;
      if (e.waypointIndex >= waypoints.length) {
        state.lives--;
        playSound('lifeLost');
        e.dead = true;
        return;
      }
      const target = waypoints[e.waypointIndex];
      const dx = target.x - e.x;
      const dy = target.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = e.speed * CELL_SIZE * (e.slowUntil > now ? 0.5 : 1);
      const move = speed * dt * 60;
      if (dist <= move) {
        e.x = target.x;
        e.y = target.y;
        e.waypointIndex++;
        if (e.waypointIndex >= waypoints.length) {
          state.lives--;
          playSound('lifeLost');
          e.dead = true;
        }
      } else {
        e.x += (dx / dist) * move;
        e.y += (dy / dist) * move;
      }
    });
    state.enemies = state.enemies.filter(function (e) { return !e.dead; });
  }

  function updateMinions() {
    state.minions = state.minions.filter(function (m) {
      let hit = false;
      state.enemies.forEach(function (e) {
        if (e.dead) return;
        const d = Math.hypot(e.x - m.x, e.y - m.y);
        if (d <= m.radius + (e.radius || 10)) {
          e.hp -= m.damage;
          hit = true;
          if (e.hp <= 0) {
            onEnemyKilled(e);
            e.dead = true;
            state.gold += e.gold;
            state.score += e.score;
            playSound('kill');
          }
        }
      });
      return !hit;
    });
    state.enemies = state.enemies.filter(function (e) { return !e.dead; });
  }

  function updateTowers(dt, waypointsPx) {
    const types = window.TD_TOWERS.TOWER_TYPES;
    const now = performance.now();
    const level = getLevel();
    state.towers.forEach(function (t) {
      const def = types[t.type];
      if (!def) return;
      if (def.supportRange != null) return;
      if (def.spawnCooldownMs != null) {
        const tier = def.upgrades ? def.upgrades[t.tier] : null;
        let cooldown = tier ? tier.spawnCooldownMs : def.spawnCooldownMs;
        cooldown /= (1 + (state.shopBuffs.speed || 0) / 100);
        const minionDamage = tier ? tier.minionDamage : def.minionDamage;
        const minionRadius = tier ? tier.minionRadius : def.minionRadius;
        const spawnRange = tier && tier.spawnRange != null ? tier.spawnRange : def.spawnRange;
        const maxMinions = tier && tier.maxMinions != null ? tier.maxMinions : def.maxMinions;
        const countFromThis = state.minions.filter(function (m) { return m.towerId === t.gx + ',' + t.gy; }).length;
        if (countFromThis >= maxMinions) return;
        if (state.minions.length >= 20) return;
        if ((t.lastSpawn || 0) + cooldown > now) return;
        const tx = t.gx * CELL_SIZE + CELL_SIZE / 2;
        const ty = t.gy * CELL_SIZE + CELL_SIZE / 2;
        const pt = getNearestPathPoint(level, tx, ty, spawnRange);
        if (pt) {
          t.lastSpawn = now;
          state.minions.push({
            x: pt.x, y: pt.y, damage: minionDamage, radius: minionRadius,
            towerId: t.gx + ',' + t.gy,
          });
          playSound('shoot');
        }
        return;
      }
      let tier = def.upgrades ? def.upgrades[t.tier] : null;
      let damage = tier ? tier.damage : def.damage;
      let range = tier ? tier.range : def.range;
      let cooldown = tier ? tier.cooldownMs : def.cooldownMs;
      const splashRadius = (tier && tier.splashRadius != null) ? tier.splashRadius : def.splashRadius;
      const tx = t.gx * CELL_SIZE + CELL_SIZE / 2;
      const ty = t.gy * CELL_SIZE + CELL_SIZE / 2;
      let bonusDamage = 0;
      let bonusSpeed = 0;
      state.towers.forEach(function (s) {
        const sDef = types[s.type];
        if (!sDef || sDef.supportRange == null) return;
        const sTier = sDef.upgrades ? sDef.upgrades[s.tier] : null;
        const sRange = sTier && sTier.supportRange != null ? sTier.supportRange : sDef.supportRange;
        const dist = Math.hypot((s.gx - t.gx) * CELL_SIZE, (s.gy - t.gy) * CELL_SIZE);
        if (dist <= sRange) {
          bonusDamage += (sTier && sTier.supportDamagePercent != null ? sTier.supportDamagePercent : sDef.supportDamagePercent) || 0;
          bonusSpeed += (sTier && sTier.supportSpeedPercent != null ? sTier.supportSpeedPercent : sDef.supportSpeedPercent) || 0;
        }
      });
      damage *= (1 + bonusDamage / 100);
      cooldown /= (1 + bonusSpeed / 100);
      damage *= (1 + (state.shopBuffs.damage || 0) / 100);
      cooldown /= (1 + (state.shopBuffs.speed || 0) / 100);
      range *= (1 + (state.shopBuffs.range || 0) / 100);
      let target = null;
      let bestDist = range;
      const canHitFlying = def.canHitFlying || false;
      const onlyFlying = def.onlyFlying || false;
      state.enemies.forEach(function (e) {
        if (e.flying && !canHitFlying) return;
        if (onlyFlying && !e.flying) return;
        const d = Math.hypot(e.x - tx, e.y - ty);
        if (d <= range && d < bestDist) {
          bestDist = d;
          target = e;
        }
      });
      if (target && (t.lastShot || 0) + cooldown <= now) {
        t.lastShot = now;
        playSound('shoot');
        const poisonDps = (tier && tier.poisonDps != null) ? tier.poisonDps : def.poisonDps;
        const poisonDuration = (tier && tier.poisonDuration != null) ? tier.poisonDuration : def.poisonDuration;
        if (splashRadius) {
          state.projectiles.push({
            x: tx, y: ty, tx: target.x, ty: target.y,
            damage: damage, towerType: t.type, splashRadius: splashRadius,
            poisonDps: poisonDps, poisonDuration: poisonDuration,
          });
        } else {
          state.projectiles.push({
            x: tx, y: ty, target: target, damage: damage, towerType: t.type,
            slowPercent: def.slowPercent || tier && tier.slowPercent,
            poisonDps: poisonDps, poisonDuration: poisonDuration,
          });
        }
      }
    });
  }

  function updateProjectiles(dt) {
    const now = performance.now() / 1000;
    const types = window.TD_ENEMIES.ENEMY_TYPES;
    state.projectiles = state.projectiles.filter(function (p) {
      if (p.target) {
        if (p.target.dead) return false;
        const dx = p.target.x - p.x;
        const dy = p.target.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = 400 * dt;
        if (dist <= speed) {
          p.target.hp -= p.damage;
          if (p.slowPercent) p.target.slowUntil = now + 1;
          if (p.poisonDps && p.poisonDuration) {
            p.target.poisonUntil = now + p.poisonDuration;
            p.target.poisonDps = p.poisonDps;
          }
          if (p.target.hp <= 0) {
            onEnemyKilled(p.target);
            p.target.dead = true;
            state.gold += p.target.gold;
            state.score += p.target.score;
            playSound('kill');
          }
          return false;
        }
        p.x += (dx / dist) * speed;
        p.y += (dy / dist) * speed;
        return true;
      } else {
        const dx = p.tx - p.x;
        const dy = p.ty - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = 400 * dt;
        const arrived = dist <= speed || dist < 1;
        if (arrived && p.splashRadius) {
          state.enemies.forEach(function (e) {
            const d = Math.hypot(e.x - p.tx, e.y - p.ty);
            if (d <= p.splashRadius) {
              e.hp -= p.damage;
              if (p.poisonDps && p.poisonDuration) {
                e.poisonUntil = now + p.poisonDuration;
                e.poisonDps = p.poisonDps;
              }
              if (e.hp <= 0) {
                onEnemyKilled(e);
                e.dead = true;
                state.gold += e.gold;
                state.score += e.score;
                playSound('kill');
              }
            }
          });
          return false;
        }
        if (dist > 1e-6) {
          p.x += (dx / dist) * speed;
          p.y += (dy / dist) * speed;
        }
        return true;
      }
    });
    state.enemies = state.enemies.filter(function (e) { return !e.dead; });
  }

  function updateParticles(dt) {
    state.particles = state.particles.filter(function (p) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      return p.life > 0;
    });
  }

  function gameLoop(now) {
    now = now || performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1) * state.speed;
    lastTime = now;

    if (state.phase === 'playing' && !state.paused) {
      const level = getLevel();
      let waypointsForDraw;
      if (isMultiPath(level)) {
        waypointsForDraw = level.waypoints.map(function (_, i) { return getWaypointsPixels(level, i); });
      } else {
        waypointsForDraw = [ getWaypointsPixels(level, 0) ];
      }

      processSpawnQueue(now);
      updateEnemies(dt, level);
      updateMinions();
      updateTowers(dt, waypointsForDraw[0] || []);
      updateProjectiles(dt);
      updateParticles(dt);

      if (state.spawnQueue.length === 0 && state.enemies.length === 0 && state.wavePhase === 'active') {
        state.wavePhase = 'waiting';
        state.waveIndex++;
        if (state.waveIndex >= level.waves.length) {
          state.phase = 'won';
          playSound('win');
          showScreen('Victory!', 'Level complete.', 'Next level', function () {
            const next = state.levelIndex + 1;
            const levels = window.TD_LEVELS.LEVELS;
            if (next < levels.length) {
              if (state.unlockedLevels.indexOf(levels[next].id) < 0) state.unlockedLevels.push(levels[next].id);
              saveUnlocked();
              startLevel(next);
            } else showScreen('You won!', 'All levels complete.', 'Play again', function () {
              state.unlockedLevels = [1];
              saveUnlocked();
              startLevel(0);
            });
          });
        } else {
          if (state.autoWave && state.waveIndex < level.waves.length) {
            startWave();
          } else {
            document.getElementById('btn-wave').disabled = false;
            document.getElementById('btn-wave').textContent = 'Next wave';
          }
        }
      }

      if (state.lives <= 0) {
        state.phase = 'lost';
        playSound('lose');
        showScreen('Game Over', 'No lives left.', 'Retry', function () { startLevel(state.levelIndex); });
      }
    }

    const level = getLevel();
    let waypointsForDraw = [ getWaypointsPixels(level, 0) ];
    if (isMultiPath(level)) {
      waypointsForDraw = level.waypoints.map(function (_, i) { return getWaypointsPixels(level, i); });
    }
    draw(waypointsForDraw);
    updateHUD();
    animId = requestAnimationFrame(gameLoop);
  }

  function waypointsPx() {
    return getWaypointsPixels(getLevel());
  }

  function draw(waypointsList) {
    const level = getLevel();
    const grid = level.grid;
    if (!grid || !grid.length) return;
    const cols = grid[0].length;
    const rows = grid.length;
    const CELL = window.TD_LEVELS.CELL;

    ctx.fillStyle = '#0f1118';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const cell = getCell(level, gx, gy);
        const x = gx * CELL_SIZE;
        const y = gy * CELL_SIZE;
        if (cell === CELL.PATH || cell === CELL.SPAWN || cell === CELL.BASE) {
          ctx.fillStyle = '#2a3040';
          ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          if (cell === CELL.SPAWN) ctx.fillStyle = '#5eb4c4';
          else if (cell === CELL.BASE) ctx.fillStyle = '#d9655c';
          else ctx.fillStyle = '#3d4252';
          ctx.fillRect(x + 3, y + 3, CELL_SIZE - 6, CELL_SIZE - 6);
        } else {
          ctx.fillStyle = '#1e2433';
          ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          if (state.selectedCell && state.selectedCell.gx === gx && state.selectedCell.gy === gy) {
            ctx.shadowColor = 'rgba(232, 197, 71, 0.6)';
            ctx.shadowBlur = 12;
            ctx.strokeStyle = '#e8c547';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
            ctx.shadowBlur = 0;
          }
        }
      }
    }

    const list = waypointsList && waypointsList.length ? waypointsList : [ getWaypointsPixels(level, 0) ];
    list.forEach(function (waypointsPx) {
      if (waypointsPx && waypointsPx.length >= 2) {
        ctx.strokeStyle = 'rgba(80,140,220,0.25)';
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(waypointsPx[0].x, waypointsPx[0].y);
        for (let i = 1; i < waypointsPx.length; i++) ctx.lineTo(waypointsPx[i].x, waypointsPx[i].y);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(100,160,240,0.5)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(waypointsPx[0].x, waypointsPx[0].y);
        for (let i = 1; i < waypointsPx.length; i++) ctx.lineTo(waypointsPx[i].x, waypointsPx[i].y);
        ctx.stroke();
      }
    });

    state.towers.forEach(function (t) {
      const def = window.TD_TOWERS.TOWER_TYPES[t.type];
      if (!def) return;
      const tier = def.upgrades && def.upgrades[t.tier];
      const range = tier ? tier.range : def.range;
      const x = t.gx * CELL_SIZE + CELL_SIZE / 2;
      const y = t.gy * CELL_SIZE + CELL_SIZE / 2;
      const r = CELL_SIZE / 2 - 4;
      ctx.shadowColor = def.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y - 2, r - 4, -0.4 * Math.PI, 0.4 * Math.PI);
      ctx.stroke();
      if (t.tier > 0) {
        ctx.fillStyle = '#1a1a1a';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(t.tier.toString(), x, y - 2);
      }
    });

    if (state.anglesMod) {
      state.towers.forEach(function (t) {
        const def = window.TD_TOWERS.TOWER_TYPES[t.type];
        if (!def || def.range == null) return;
        const tier = def.upgrades && def.upgrades[t.tier];
        let range = tier ? tier.range : def.range;
        range *= (1 + (state.shopBuffs.range || 0) / 100);
        const tx = t.gx * CELL_SIZE + CELL_SIZE / 2;
        const ty = t.gy * CELL_SIZE + CELL_SIZE / 2;
        const canHitFlying = def.canHitFlying || false;
        const onlyFlying = def.onlyFlying || false;
        let target = null;
        let bestDist = range;
        state.enemies.forEach(function (e) {
          if (e.flying && !canHitFlying) return;
          if (onlyFlying && !e.flying) return;
          const d = Math.hypot(e.x - tx, e.y - ty);
          if (d <= range && d < bestDist) {
            bestDist = d;
            target = e;
          }
        });
        if (target) {
          ctx.strokeStyle = 'rgba(232, 197, 71, 0.7)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
        }
      });
    }

    state.minions.forEach(function (m) {
      ctx.fillStyle = '#d08040';
      ctx.strokeStyle = '#8a5520';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    state.enemies.forEach(function (e) {
      const barW = e.radius * 2.4;
      const barH = 5;
      const barY = e.y - e.radius - 12;
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(e.x - barW / 2 - 1, barY - 1, barW + 2, barH + 2);
      ctx.fillStyle = '#444';
      ctx.fillRect(e.x - barW / 2, barY, barW, barH);
      ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#7caf5e' : e.hp / e.maxHp > 0.25 ? '#e8c547' : '#d9655c';
      ctx.fillRect(e.x - barW / 2, barY, barW * Math.max(0, e.hp / e.maxHp), barH);
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      ctx.strokeRect(e.x - barW / 2, barY, barW, barH);
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    state.projectiles.forEach(function (p) {
      const towerTypes = window.TD_TOWERS.TOWER_TYPES;
      const def = towerTypes[p.towerType];
      const c = def && def.color ? def.color : '#e8eaed';
      ctx.shadowColor = c;
      ctx.shadowBlur = 8;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    state.particles.forEach(function (p) {
      const a = p.life / p.maxLife;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * a, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  function fireSuperAttack() {
    const now = performance.now();
    if (now - state.superLastUsed < SUPER_COOLDOWN_MS) return;
    state.superLastUsed = now;
    playSound('super');
    let anyKill = false;
    state.enemies.forEach(function (e) {
      e.hp -= SUPER_DAMAGE;
      if (e.hp <= 0) {
        onEnemyKilled(e);
        e.dead = true;
        state.gold += e.gold;
        state.score += e.score;
        anyKill = true;
      }
    });
    if (anyKill) playSound('kill');
    state.enemies = state.enemies.filter(function (e) { return !e.dead; });
  }

  function updateHUD() {
    document.getElementById('gold').textContent = state.gold;
    document.getElementById('lives').textContent = state.lives;
    const anglesBtn = document.getElementById('btn-angles-mod');
    if (anglesBtn) anglesBtn.textContent = 'Angles mod: ' + (state.anglesMod ? 'ON' : 'OFF');
    document.getElementById('score').textContent = state.score;
    const level = getLevel();
    document.getElementById('wave').textContent = state.waveIndex + 1;
    document.getElementById('wave-total').textContent = level.waves ? level.waves.length : 0;
    const wbtn = document.getElementById('btn-wave');
    const wavesLeft = level.waves && state.waveIndex < level.waves.length;
    const canStartWave = state.wavePhase === 'waiting' && wavesLeft && !state.autoWave;
    wbtn.disabled = !canStartWave;
    wbtn.classList.toggle('ready', canStartWave);
    if (canStartWave) {
      wbtn.textContent = state.waveIndex === 0 ? 'Start wave' : 'Next wave';
    }
    const autoBtn = document.getElementById('btn-auto-wave');
    if (autoBtn) autoBtn.textContent = 'Auto wave: ' + (state.autoWave ? 'ON' : 'OFF');
    const superBtn = document.getElementById('btn-super');
    if (superBtn) {
      const elapsed = performance.now() - state.superLastUsed;
      if (elapsed >= SUPER_COOLDOWN_MS) {
        superBtn.disabled = false;
        superBtn.textContent = 'Super (ready)';
      } else {
        superBtn.disabled = true;
        const secLeft = Math.ceil((SUPER_COOLDOWN_MS - elapsed) / 1000);
        superBtn.textContent = 'Super (' + secLeft + 's)';
      }
    }
    const shopBtn = document.getElementById('btn-shop');
    if (shopBtn) {
      const level = getLevel();
      shopBtn.disabled = state.wavePhase !== 'waiting' || state.waveIndex >= (level.waves ? level.waves.length : 0);
    }
  }

  function updateTowerPanel() {
    const list = document.getElementById('tower-list');
    list.innerHTML = '';
    const types = window.TD_TOWERS.TOWER_TYPES;
    Object.keys(types).forEach(function (key) {
      const def = types[key];
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = key + ' (' + def.cost + 'g)';
      btn.addEventListener('click', function () {
        state.selectedTowerType = state.selectedTowerType === key ? null : key;
        state.selectedCell = null;
        updateTowerPanel();
      });
      if (state.selectedTowerType === key) btn.style.background = '#7caf5e';
      list.appendChild(btn);
    });
    const info = document.getElementById('tower-info');
    if (state.selectedTowerType) {
      const def = types[state.selectedTowerType];
      if (def.supportRange != null) {
        info.textContent = 'Buff range: ' + def.supportRange + ' | +' + (def.supportDamagePercent || 0) + '% dmg, +' + (def.supportSpeedPercent || 0) + '% speed to nearby | Click map to place';
      } else if (def.spawnCooldownMs != null) {
        info.textContent = 'Spawns mini-tower on path. Enemy hits it = takes ' + def.minionDamage + ' dmg, mini breaks | Click map to place';
      } else {
        let txt = 'Range: ' + def.range + ' | Dmg: ' + def.damage;
        if (def.canHitFlying) txt += ' | Hits flyers';
        if (def.onlyFlying) txt = 'Flying only. ' + txt;
        if (def.poisonDps) txt += ' | Poison ' + def.poisonDps + '/s';
        info.textContent = txt + ' | Click map to place';
      }
      info.classList.remove('hidden');
    } else info.classList.add('hidden');
    const sel = document.getElementById('selected-cell');
    if (state.selectedCell && getTowerAt(state.selectedCell.gx, state.selectedCell.gy)) {
      sel.classList.remove('hidden');
    } else sel.classList.add('hidden');
  }

  function placeTower(gx, gy) {
    if (!state.selectedTowerType) return;
    const level = getLevel();
    if (!canBuild(level, gx, gy) || hasTower(gx, gy)) return;
    const def = window.TD_TOWERS.TOWER_TYPES[state.selectedTowerType];
    if (state.gold < def.cost) return;
    state.gold -= def.cost;
    state.towers.push({ gx: gx, gy: gy, type: state.selectedTowerType, tier: 0, lastShot: 0 });
    state.selectedTowerType = null;
    updateTowerPanel();
    playSound('place');
  }

  function sellTower(gx, gy) {
    const t = getTowerAt(gx, gy);
    if (!t) return;
    const def = window.TD_TOWERS.TOWER_TYPES[t.type];
    let refund = def.cost;
    if (def.upgrades) for (let i = 0; i < t.tier; i++) refund += def.upgrades[i].cost;
    state.gold += Math.floor(refund * SELL_REFUND);
    state.towers = state.towers.filter(function (x) { return x !== t; });
    state.selectedCell = null;
    document.getElementById('selected-cell').classList.add('hidden');
    updateTowerPanel();
    playSound('sell');
  }

  function upgradeTower(gx, gy) {
    const t = getTowerAt(gx, gy);
    if (!t) return;
    const def = window.TD_TOWERS.TOWER_TYPES[t.type];
    if (!def.upgrades || t.tier >= def.upgrades.length) return;
    const up = def.upgrades[t.tier];
    if (state.gold < up.cost) return;
    state.gold -= up.cost;
    t.tier++;
    updateTowerPanel();
    playSound('upgrade');
  }

  function showScreen(title, text, btnText, btnCb) {
    const overlay = document.getElementById('screen-overlay');
    const content = document.getElementById('screen-content');
    content.innerHTML = '<h3>' + title + '</h3><p>' + text + '</p><button id="screen-btn" class="btn btn-wave" type="button">' + btnText + '</button>';
    overlay.classList.remove('hidden');
    document.getElementById('screen-btn').addEventListener('click', function () {
      hideScreen();
      if (btnCb) btnCb();
    });
  }

  function hideScreen() {
    document.getElementById('screen-overlay').classList.add('hidden');
  }

  function openShop() {
    document.getElementById('shop-overlay').classList.remove('hidden');
    updateShopPanel();
  }

  function closeShop() {
    document.getElementById('shop-overlay').classList.add('hidden');
  }

  function updateShopPanel() {
    document.getElementById('shop-gold').textContent = state.gold;
    const container = document.getElementById('shop-items');
    container.innerHTML = '';
    SHOP_ITEMS.forEach(function (item) {
      const div = document.createElement('div');
      div.className = 'shop-item';
      let current = 0;
      if (item.buff) current = Math.min((state.shopBuffs[item.buff] || 0) / item.value, item.max);
      const canBuy = item.instant ? true : current < item.max;
      const afford = state.gold >= item.cost;
      const btn = document.createElement('button');
      btn.className = 'btn shop-btn';
      btn.textContent = item.name + ' (' + item.cost + 'g)' + (item.buff && current > 0 ? ' [' + current + '/' + item.max + ']' : '');
      btn.disabled = !afford || !canBuy;
      btn.dataset.id = item.id;
      btn.addEventListener('click', function () { buyShopItem(item.id); });
      div.appendChild(btn);
      container.appendChild(div);
    });
  }

  function buyShopItem(id) {
    const item = SHOP_ITEMS.find(function (i) { return i.id === id; });
    if (!item || state.gold < item.cost) return;
    if (item.instant) {
      if (item.instant === 'life') state.lives += item.value;
      if (item.instant === 'gold') state.gold += item.value;
      state.gold -= item.cost;
    } else {
      const current = (state.shopBuffs[item.buff] || 0) + item.value;
      if (current > item.value * item.max) return;
      state.shopBuffs[item.buff] = current;
      state.gold -= item.cost;
    }
    updateShopPanel();
    updateHUD();
  }

  function updateLevelButtons() {
    const wrap = document.getElementById('level-buttons');
    wrap.innerHTML = '';
    const levels = window.TD_LEVELS.LEVELS;
    levels.forEach(function (level, i) {
      const btn = document.createElement('button');
      btn.className = 'btn ' + (state.unlockedLevels.indexOf(level.id) >= 0 ? 'unlocked' : 'locked');
      btn.textContent = level.id + ': ' + level.name;
      btn.disabled = state.unlockedLevels.indexOf(level.id) < 0;
      btn.addEventListener('click', function () {
        startLevel(i);
      });
      wrap.appendChild(btn);
    });
  }

  function saveUnlocked() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.unlockedLevels)); } catch (e) {}
  }

  function loadUnlocked() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.indexOf(1) >= 0) {
          state.unlockedLevels = parsed;
        }
      }
    } catch (e) {}
  }

  function applyTheme(themeId) {
    const id = themeId || 'default';
    document.body.setAttribute('data-theme', id === 'default' ? 'default' : id);
    try { localStorage.setItem(THEME_STORAGE_KEY, id); } catch (e) {}
    document.querySelectorAll('.theme-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-theme') === id);
    });
  }

  function loadTheme() {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved) applyTheme(saved);
    } catch (e) {}
  }

  function isSoundEnabled() {
    try {
      return localStorage.getItem(SOUND_STORAGE_KEY) !== 'off';
    } catch (e) { return true; }
  }

  function playSound(kind) {
    if (!isSoundEnabled()) return;
    try {
      const ctx = window.tdAudioContext || (window.tdAudioContext = new (window.AudioContext || window.webkitAudioContext)());
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      var duration = 0.2;
      if (kind === 'shoot') { o.type = 'square'; o.frequency.setValueAtTime(400, 0); }
      else if (kind === 'kill') { o.type = 'square'; o.frequency.setValueAtTime(600, 0); }
      else if (kind === 'wave') { o.type = 'sine'; o.frequency.setValueAtTime(523, 0); o.frequency.setValueAtTime(659, 0.05); }
      else if (kind === 'win') {
        o.type = 'sine';
        o.frequency.setValueAtTime(523, 0); o.frequency.setValueAtTime(659, 0.08); o.frequency.setValueAtTime(784, 0.15);
        duration = 0.25;
      }
      else if (kind === 'lose') { o.type = 'sine'; o.frequency.setValueAtTime(200, 0); duration = 0.3; }
      else if (kind === 'super') { o.type = 'square'; o.frequency.setValueAtTime(150, 0); o.frequency.setValueAtTime(80, 0.05); o.frequency.setValueAtTime(200, 0.1); duration = 0.22; }
      else if (kind === 'place') { o.type = 'sine'; o.frequency.setValueAtTime(440, 0); o.frequency.setValueAtTime(554, 0.06); }
      else if (kind === 'upgrade') { o.type = 'sine'; o.frequency.setValueAtTime(523, 0); o.frequency.setValueAtTime(659, 0.07); }
      else if (kind === 'sell') { o.type = 'sine'; o.frequency.setValueAtTime(220, 0); duration = 0.12; }
      else if (kind === 'lifeLost') { o.type = 'sine'; o.frequency.setValueAtTime(180, 0); duration = 0.12; }
      else return;
      g.gain.setValueAtTime(0.09, 0);
      g.gain.exponentialRampToValueAtTime(0.001, duration);
      o.start(0);
      o.stop(duration + 0.02);
    } catch (e) {}
  }

  function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    loadUnlocked();
    loadTheme();

    var soundBtn = document.getElementById('btn-sound');
    if (soundBtn) {
      soundBtn.textContent = isSoundEnabled() ? 'Sound: ON' : 'Sound: OFF';
      soundBtn.addEventListener('click', function () {
        try {
          var on = isSoundEnabled();
          localStorage.setItem(SOUND_STORAGE_KEY, on ? 'off' : 'on');
        } catch (e) {}
        this.textContent = isSoundEnabled() ? 'Sound: ON' : 'Sound: OFF';
      });
    }

    document.querySelectorAll('.theme-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyTheme(this.getAttribute('data-theme'));
      });
    });

    canvas.addEventListener('click', function (e) {
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const gx = Math.floor((px * scaleX) / CELL_SIZE);
      const gy = Math.floor((py * scaleY) / CELL_SIZE);
      const level = getLevel();
      const tower = getTowerAt(gx, gy);
      if (tower) {
        state.selectedCell = { gx: gx, gy: gy };
        state.selectedTowerType = null;
        document.getElementById('selected-cell').classList.remove('hidden');
        document.getElementById('btn-upgrade').onclick = function () { upgradeTower(gx, gy); };
        document.getElementById('btn-sell').onclick = function () { sellTower(gx, gy); };
        const def = window.TD_TOWERS.TOWER_TYPES[tower.type];
        const tier = def.upgrades && def.upgrades[tower.tier];
        let cost = '—';
        if (tier) cost = tier.cost + 'g';
        document.getElementById('btn-upgrade').textContent = 'Upgrade (' + cost + ')';
        document.getElementById('btn-upgrade').disabled = !tier || state.gold < (tier ? tier.cost : 0);
        updateTowerPanel();
        return;
      }
      if (state.selectedTowerType && canBuild(level, gx, gy)) {
        placeTower(gx, gy);
      }
      state.selectedCell = null;
      document.getElementById('selected-cell').classList.add('hidden');
    });

    document.getElementById('btn-wave').addEventListener('click', startWave);
    document.getElementById('btn-angles-mod').addEventListener('click', function () {
      state.anglesMod = !state.anglesMod;
      this.textContent = 'Angles mod: ' + (state.anglesMod ? 'ON' : 'OFF');
    });
    document.getElementById('btn-auto-wave').addEventListener('click', function () {
      state.autoWave = !state.autoWave;
      this.textContent = 'Auto wave: ' + (state.autoWave ? 'ON' : 'OFF');
    });
    document.getElementById('btn-pause').addEventListener('click', function () {
      state.paused = !state.paused;
      this.textContent = state.paused ? 'Resume' : 'Pause';
    });
    document.getElementById('btn-speed').addEventListener('click', function () {
      state.speed = state.speed === 1 ? 2 : 1;
      this.textContent = state.speed + 'x';
    });
    document.getElementById('btn-super').addEventListener('click', fireSuperAttack);
    document.getElementById('btn-shop').addEventListener('click', openShop);
    document.getElementById('btn-shop-close').addEventListener('click', closeShop);

    resizeCanvas();
    updateLevelButtons();
    updateTowerPanel();
    if (state.phase === 'menu') {
      showScreen('Tower Defense', 'Select a level to start.', 'OK', function () { hideScreen(); });
    }
    lastTime = performance.now();
    gameLoop(lastTime);
  }

  init();
})();
