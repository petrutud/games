(function () {
  'use strict';

  var CELL_SIZE = 8;
  var GRID_W = 128;
  var GRID_H = 72;
  var WATER = 0;
  var GRASS = 1;
  var SAND = 2;
  var WALL = 3;
  var TERRAIN_COLORS = {};
  TERRAIN_COLORS[WATER] = '#3d5a80';
  TERRAIN_COLORS[GRASS] = '#7caf5e';
  TERRAIN_COLORS[SAND] = '#d4a84b';
  TERRAIN_COLORS[WALL] = '#5a5a5a';

  var BOMB_RADIUS = 4;
  var HEAL_RADIUS = 2;
  var COMBAT_RANGE = 24;
  var COMBAT_DAMAGE = 5;
  var UNIT_SPEED = 45;
  var REPRODUCE_COOLDOWN = 8;
  var REPRODUCE_RADIUS = 20;
  var MAX_UNITS = 200;
  var BUILD_TIME = 4;

  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');
  var hudTool = document.getElementById('hud-tool');
  var hudPop = document.getElementById('hud-pop');
  var hudWar = document.getElementById('hud-war');

  var terrain = [];
  var units = [];
  var camX = 0;
  var camY = 0;
  var currentTool = 'grass';
  var brushRadius = 1;
  var isDragging = false;
  var lastPaintGx = -1;
  var lastPaintGy = -1;
  var animId = null;
  var warMode = false;

  function getTerrain(gx, gy) {
    if (gx < 0 || gx >= GRID_W || gy < 0 || gy >= GRID_H) return WATER;
    return terrain[gy][gx];
  }

  function setTerrain(gx, gy, t) {
    if (gx < 0 || gx >= GRID_W || gy < 0 || gy >= GRID_H) return;
    terrain[gy][gx] = t;
  }

  function isLand(gx, gy) {
    var t = getTerrain(gx, gy);
    return t !== WATER && t !== WALL;
  }

  function initWorld() {
    for (var gy = 0; gy < GRID_H; gy++) {
      terrain[gy] = [];
      for (var gx = 0; gx < GRID_W; gx++) terrain[gy][gx] = GRASS;
    }
  }

  function cellAtScreen(sx, sy) {
    var gx = Math.floor((sx + camX) / CELL_SIZE);
    var gy = Math.floor((sy + camY) / CELL_SIZE);
    return { gx: gx, gy: gy };
  }

  function paintAt(gx, gy, t) {
    if (t === 'grass') setTerrain(gx, gy, GRASS);
    else if (t === 'water') setTerrain(gx, gy, WATER);
    else if (t === 'sand') setTerrain(gx, gy, SAND);
  }

  function applyBrush(scrX, scrY) {
    var c = cellAtScreen(scrX, scrY);
    var r = brushRadius;
    for (var dy = -r; dy <= r; dy++) {
      for (var dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r) {
          var t = currentTool === 'grass' || currentTool === 'erase' ? GRASS : currentTool === 'water' ? WATER : currentTool === 'sand' ? SAND : currentTool === 'wall' ? WALL : null;
          if (t !== null) setTerrain(c.gx + dx, c.gy + dy, t);
        }
      }
    }
  }

  function spawnUnit(gx, gy, faction) {
    if (!isLand(gx, gy)) return;
    if (units.length >= MAX_UNITS) return;
    var px = gx * CELL_SIZE + CELL_SIZE / 2 - 4;
    var py = gy * CELL_SIZE + CELL_SIZE / 2 - 4;
    units.push({
      x: px, y: py, vx: 0, vy: 0,
      faction: faction,
      hp: 100, maxHp: 100,
      reproduceTimer: REPRODUCE_COOLDOWN,
      buildCellGx: -999, buildCellGy: -999, buildTimer: 0
    });
  }

  function unitAtCell(gx, gy) {
    var ux = gx * CELL_SIZE + CELL_SIZE / 2;
    var uy = gy * CELL_SIZE + CELL_SIZE / 2;
    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      if (Math.abs(u.x + 4 - ux) < CELL_SIZE && Math.abs(u.y + 4 - uy) < CELL_SIZE) return units[i];
    }
    return null;
  }

  function unitsInCircle(wx, wy, radius) {
    var out = [];
    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      var cx = u.x + 4;
      var cy = u.y + 4;
      if (Math.hypot(cx - wx, cy - wy) <= radius) out.push(u);
    }
    return out;
  }

  function nearestEnemy(unit) {
    var best = null;
    var bestDist = Infinity;
    var ucx = unit.x + 4;
    var ucy = unit.y + 4;
    for (var i = 0; i < units.length; i++) {
      var o = units[i];
      if (o === unit || o.faction === unit.faction || o.hp <= 0) continue;
      var dx = (o.x + 4) - ucx;
      var dy = (o.y + 4) - ucy;
      var d = Math.hypot(dx, dy);
      if (d < bestDist) { bestDist = d; best = o; }
    }
    return best;
  }

  function updateUnits(dt) {
    for (var i = units.length - 1; i >= 0; i--) {
      var u = units[i];
      if (u.hp <= 0) {
        units.splice(i, 1);
        continue;
      }
      u.reproduceTimer -= dt;
      var ugx = Math.floor(u.x / CELL_SIZE);
      var ugy = Math.floor(u.y / CELL_SIZE);
      if (ugx < 0) ugx = 0;
      if (ugx >= GRID_W) ugx = GRID_W - 1;
      if (ugy < 0) ugy = 0;
      if (ugy >= GRID_H) ugy = GRID_H - 1;
      for (var j = 0; j < units.length; j++) {
        if (i === j) continue;
        var o = units[j];
        if (o.faction !== u.faction && o.hp > 0) {
          var dist = Math.hypot((u.x + 4) - (o.x + 4), (u.y + 4) - (o.y + 4));
          if (dist < COMBAT_RANGE) {
            u.hp -= COMBAT_DAMAGE * dt;
            o.hp -= COMBAT_DAMAGE * dt;
          }
        }
      }
      if (u.reproduceTimer <= 0 && isLand(ugx, ugy) && !warMode) {
        var nearby = 0;
        for (var k = 0; k < units.length; k++) {
          if (k === i) continue;
          var d = Math.hypot(units[k].x - u.x, units[k].y - u.y);
          if (d < REPRODUCE_RADIUS) nearby++;
        }
        if (nearby === 0 && units.length < MAX_UNITS) {
          spawnUnit(ugx, ugy, u.faction);
          u.reproduceTimer = REPRODUCE_COOLDOWN;
        }
      }
      if (!warMode && getTerrain(ugx, ugy) === GRASS && Math.abs(u.vx) < 8 && Math.abs(u.vy) < 8) {
        if (u.buildCellGx === ugx && u.buildCellGy === ugy) {
          u.buildTimer = (u.buildTimer || 0) + dt;
          if (u.buildTimer >= BUILD_TIME) {
            setTerrain(ugx, ugy, WALL);
            u.buildTimer = 0;
          }
        } else {
          u.buildCellGx = ugx;
          u.buildCellGy = ugy;
          u.buildTimer = dt;
        }
      } else {
        u.buildCellGx = -999;
        u.buildCellGy = -999;
        u.buildTimer = 0;
      }
      if (warMode) {
        var target = nearestEnemy(u);
        if (target) {
          var dx = (target.x + 4) - (u.x + 4);
          var dy = (target.y + 4) - (u.y + 4);
          var len = Math.hypot(dx, dy);
          if (len > 2) {
            u.vx = (dx / len) * UNIT_SPEED * 1.2;
            u.vy = (dy / len) * UNIT_SPEED * 1.2;
          }
        } else {
          u.vx *= 0.9;
          u.vy *= 0.9;
        }
      } else {
        var dirs = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];
        var choice = dirs[Math.floor(Math.random() * 4)];
        var nx = ugx + choice.dx;
        var ny = ugy + choice.dy;
        if (isLand(nx, ny)) {
          u.vx = choice.dx * UNIT_SPEED * (0.5 + Math.random() * 0.5);
          u.vy = choice.dy * UNIT_SPEED * (0.5 + Math.random() * 0.5);
        }
      }
      u.x += u.vx * dt;
      u.y += u.vy * dt;
      u.vx *= 0.9;
      u.vy *= 0.9;
      var newGx = Math.floor(u.x / CELL_SIZE);
      var newGy = Math.floor(u.y / CELL_SIZE);
      if (!isLand(newGx, newGy)) {
        u.x = ugx * CELL_SIZE + CELL_SIZE / 2 - 4;
        u.y = ugy * CELL_SIZE + CELL_SIZE / 2 - 4;
        u.vx = u.vy = 0;
      }
      u.x = Math.max(0, Math.min(GRID_W * CELL_SIZE - 8, u.x));
      u.y = Math.max(0, Math.min(GRID_H * CELL_SIZE - 8, u.y));
    }
  }

  function draw() {
    ctx.fillStyle = '#1a1a1f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    var startGx = Math.floor(camX / CELL_SIZE);
    var startGy = Math.floor(camY / CELL_SIZE);
    var endGx = Math.ceil((camX + canvas.width) / CELL_SIZE);
    var endGy = Math.ceil((camY + canvas.height) / CELL_SIZE);
    for (var gy = startGy; gy <= endGy; gy++) {
      for (var gx = startGx; gx <= endGx; gx++) {
        var t = getTerrain(gx, gy);
        var color = TERRAIN_COLORS[t];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(gx * CELL_SIZE - camX, gy * CELL_SIZE - camY, CELL_SIZE + 1, CELL_SIZE + 1);
      }
    }
    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      if (u.hp <= 0) continue;
      ctx.fillStyle = u.faction === 0 ? '#c44' : '#44a';
      ctx.fillRect(u.x - camX, u.y - camY, 8, 8);
      if (u.hp < u.maxHp) {
        ctx.fillStyle = '#333';
        ctx.fillRect(u.x - camX, u.y - camY - 4, 8, 2);
        ctx.fillStyle = '#7caf5e';
        ctx.fillRect(u.x - camX, u.y - camY - 4, 8 * (u.hp / u.maxHp), 2);
      }
    }
  }

  function updateHUD() {
    var toolNames = { spawnRed: 'Spawn Red', spawnBlue: 'Spawn Blue', grass: 'Grass', water: 'Water', sand: 'Sand', wall: 'Wall', erase: 'Erase' };
    if (hudTool) hudTool.textContent = 'Tool: ' + (toolNames[currentTool] || currentTool);
    var red = 0, blue = 0;
    for (var i = 0; i < units.length; i++) {
      if (units[i].faction === 0) red++;
      else blue++;
    }
    if (hudPop) hudPop.textContent = 'Red: ' + red + ', Blue: ' + blue;
    if (hudWar) hudWar.textContent = 'War: ' + (warMode ? 'ON' : 'OFF');
  }

  function handleClick(scrX, scrY) {
    var c = cellAtScreen(scrX, scrY);
    var wx = c.gx * CELL_SIZE + CELL_SIZE / 2;
    var wy = c.gy * CELL_SIZE + CELL_SIZE / 2;
    if (currentTool === 'spawnRed') {
      spawnUnit(c.gx, c.gy, 0);
    } else if (currentTool === 'spawnBlue') {
      spawnUnit(c.gx, c.gy, 1);
    } else if (currentTool === 'bomb') {
      for (var dy = -BOMB_RADIUS; dy <= BOMB_RADIUS; dy++) {
        for (var dx = -BOMB_RADIUS; dx <= BOMB_RADIUS; dx++) {
          if (dx * dx + dy * dy <= BOMB_RADIUS * BOMB_RADIUS) setTerrain(c.gx + dx, c.gy + dy, WATER);
        }
      }
      var hit = unitsInCircle(wx, wy, BOMB_RADIUS * CELL_SIZE);
      for (var i = 0; i < hit.length; i++) hit[i].hp = 0;
    } else if (currentTool === 'heal') {
      var hit = unitsInCircle(wx, wy, HEAL_RADIUS * CELL_SIZE);
      for (var i = 0; i < hit.length; i++) hit[i].hp = hit[i].maxHp;
    } else if (currentTool === 'grass' || currentTool === 'water' || currentTool === 'sand' || currentTool === 'wall' || currentTool === 'erase') {
      applyBrush(scrX, scrY);
    }
    updateHUD();
  }

  function loop(now) {
    var dt = Math.min((now - (loop.last || now)) / 1000, 0.05);
    loop.last = now;
    updateUnits(dt);
    draw();
    updateHUD();
    animId = requestAnimationFrame(loop);
  }

  canvas.addEventListener('mousedown', function (e) {
    if (e.button === 0) {
      isDragging = true;
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width;
      var scaleY = canvas.height / rect.height;
      var sx = (e.clientX - rect.left) * scaleX;
      var sy = (e.clientY - rect.top) * scaleY;
      handleClick(sx, sy);
      lastPaintGx = Math.floor((sx + camX) / CELL_SIZE);
      lastPaintGy = Math.floor((sy + camY) / CELL_SIZE);
    } else if (e.button === 1) {
      var r = canvas.getBoundingClientRect();
      var scX = canvas.width / r.width;
      var scY = canvas.height / r.height;
      canvas._panStart = { camX: camX, camY: camY, clientX: e.clientX, clientY: e.clientY, scaleX: scX, scaleY: scY };
    }
  });
  canvas.addEventListener('mousemove', function (e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var sx = (e.clientX - rect.left) * scaleX;
    var sy = (e.clientY - rect.top) * scaleY;
    if (isDragging && e.buttons === 1) {
      if (currentTool === 'grass' || currentTool === 'water' || currentTool === 'sand' || currentTool === 'wall' || currentTool === 'erase') {
        applyBrush(sx, sy);
      }
    } else if (e.buttons === 4 && canvas._panStart) {
      var ps = canvas._panStart;
      camX = ps.camX + (ps.clientX - e.clientX) * ps.scaleX;
      camY = ps.camY + (ps.clientY - e.clientY) * ps.scaleY;
      camX = Math.max(0, Math.min(GRID_W * CELL_SIZE - canvas.width, camX));
      camY = Math.max(0, Math.min(GRID_H * CELL_SIZE - canvas.height, camY));
    }
  });
  canvas.addEventListener('mouseup', function (e) {
    if (e.button === 0) isDragging = false;
    if (e.button === 1) canvas._panStart = null;
  });
  canvas.addEventListener('mouseleave', function () {
    isDragging = false;
    canvas._panStart = null;
  });
  document.addEventListener('keydown', function (e) {
    var step = 40;
    if (e.code === 'ArrowLeft') { camX = Math.max(0, camX - step); e.preventDefault(); }
    if (e.code === 'ArrowRight') { camX = Math.min(GRID_W * CELL_SIZE - canvas.width, camX + step); e.preventDefault(); }
    if (e.code === 'ArrowUp') { camY = Math.max(0, camY - step); e.preventDefault(); }
    if (e.code === 'ArrowDown') { camY = Math.min(GRID_H * CELL_SIZE - canvas.height, camY + step); e.preventDefault(); }
  });

  document.querySelectorAll('.tool-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.tool-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentTool = btn.dataset.tool;
      updateHUD();
    });
  });

  var btnWar = document.getElementById('btn-war');
  if (btnWar) btnWar.addEventListener('click', function () {
    warMode = !warMode;
    btnWar.textContent = 'War: ' + (warMode ? 'ON' : 'OFF');
    btnWar.classList.toggle('war-on', warMode);
    updateHUD();
  });

  document.getElementById('btn-new').addEventListener('click', function () {
    initWorld();
    units = [];
    updateHUD();
  });

  document.getElementById('btn-save').addEventListener('click', function () {
    var data = { terrain: terrain, units: units.map(function (u) { return { x: u.x, y: u.y, faction: u.faction, hp: u.hp, maxHp: u.maxHp }; }) };
    try { localStorage.setItem('worldbox_save', JSON.stringify(data)); } catch (err) {}
  });

  document.getElementById('btn-load').addEventListener('click', function () {
    try {
      var raw = localStorage.getItem('worldbox_save');
      if (!raw) return;
      var data = JSON.parse(raw);
      terrain = data.terrain || terrain;
      units = (data.units || []).map(function (u) {
        return { x: u.x, y: u.y, vx: 0, vy: 0, faction: u.faction, hp: u.hp, maxHp: u.maxHp || 100, reproduceTimer: REPRODUCE_COOLDOWN, buildCellGx: -999, buildCellGy: -999, buildTimer: 0 };
      });
      updateHUD();
    } catch (err) {}
  });

  initWorld();
  updateHUD();
  draw();
  animId = requestAnimationFrame(loop);
})();
