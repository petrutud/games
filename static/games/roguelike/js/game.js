(function () {
  'use strict';

  var TILE = 16;
  var MAP_W = 60;
  var MAP_H = 40;
  var WALL = 0;
  var FLOOR = 1;
  var STAIRS = 2;

  var canvas = document.getElementById('game-canvas');
  var ctx = canvas.getContext('2d');
  var healthEl = document.getElementById('health');
  var maxHealthEl = document.getElementById('max-health');
  var floorEl = document.getElementById('floor');
  var atkEl = document.getElementById('atk');
  var defEl = document.getElementById('def');
  var healthBarEl = document.getElementById('health-bar');
  var msgLogEl = document.getElementById('msg-log');
  var overlay = document.getElementById('overlay');
  var overlayMsg = document.getElementById('overlay-msg');
  var btnRestart = document.getElementById('btn-restart');
  var inventoryPanel = document.getElementById('inventory-panel');
  var inventoryList = document.getElementById('inventory-list');

  var map = [];
  var visible = [];
  var explored = [];
  var player = { gx: 0, gy: 0, hp: 20, maxHp: 20, atk: 2, def: 1, inventory: [], weapon: null, armor: null };
  var enemies = [];
  var items = [];
  var currentFloor = 1;
  var gameOver = false;
  var FOV_RADIUS = 10;

  function getTile(gx, gy) {
    if (gx < 0 || gx >= MAP_W || gy < 0 || gy >= MAP_H) return WALL;
    return map[gy][gx];
  }

  function setTile(gx, gy, t) {
    if (gx < 0 || gx >= MAP_W || gy < 0 || gy >= MAP_H) return;
    map[gy][gx] = t;
  }

  function isPassable(gx, gy) {
    var t = getTile(gx, gy);
    return t === FLOOR || t === STAIRS;
  }

  function blockSolid(gx, gy) {
    return getTile(gx, gy) === WALL;
  }

  // ---- Phase 1: Dungeon generation (room-and-corridor) ----
  function generateDungeon() {
    var y, x;
    for (y = 0; y < MAP_H; y++) {
      map[y] = [];
      visible[y] = [];
      explored[y] = [];
      for (x = 0; x < MAP_W; x++) {
        map[y][x] = WALL;
        visible[y][x] = false;
        explored[y][x] = false;
      }
    }
    var rooms = [];
    var minRoom = 5;
    var maxRoom = 10;
    var attempts = 50;
    while (attempts--) {
      var w = minRoom + Math.floor(Math.random() * (maxRoom - minRoom + 1));
      var h = minRoom + Math.floor(Math.random() * (maxRoom - minRoom + 1));
      var rx = 1 + Math.floor(Math.random() * (MAP_W - w - 2));
      var ry = 1 + Math.floor(Math.random() * (MAP_H - h - 2));
      var overlap = false;
      for (var i = 0; i < rooms.length; i++) {
        var r = rooms[i];
        if (rx <= r.x + r.w + 1 && rx + w + 1 >= r.x && ry <= r.y + r.h + 1 && ry + h + 1 >= r.y) {
          overlap = true;
          break;
        }
      }
      if (!overlap) {
        for (y = ry; y < ry + h; y++)
          for (x = rx; x < rx + w; x++) setTile(x, y, FLOOR);
        rooms.push({ x: rx, y: ry, w: w, h: h, cx: rx + Math.floor(w / 2), cy: ry + Math.floor(h / 2) });
      }
    }
    for (var j = 0; j < rooms.length - 1; j++) {
      var a = rooms[j];
      var b = rooms[j + 1];
      var gx = a.cx;
      var gy = a.cy;
      while (gx !== b.cx) {
        setTile(gx, gy, FLOOR);
        gx += gx < b.cx ? 1 : -1;
      }
      while (gy !== b.cy) {
        setTile(gx, gy, FLOOR);
        gy += gy < b.cy ? 1 : -1;
      }
    }
    var startRoom = rooms[0];
    player.gx = startRoom.cx;
    player.gy = startRoom.cy;
    var stairsRoom = rooms[rooms.length - 1];
    setTile(stairsRoom.cx, stairsRoom.cy, STAIRS);
    enemies = [];
    var enemyCount = 3 + Math.floor(currentFloor * 0.5);
    for (var k = 0; k < enemyCount; k++) {
      var r = rooms[1 + Math.floor(Math.random() * (rooms.length - 2))];
      var ex = r.x + Math.floor(Math.random() * r.w);
      var ey = r.y + Math.floor(Math.random() * r.h);
      if (getTile(ex, ey) === FLOOR && (ex !== player.gx || ey !== player.gy) && getTile(ex, ey) !== STAIRS) {
        enemies.push({
          id: 'e' + k,
          gx: ex,
          gy: ey,
          hp: 5 + currentFloor,
          maxHp: 5 + currentFloor,
          atk: 1 + Math.floor(currentFloor / 2),
          def: 0,
          type: 'goblin'
        });
      }
    }
    items = [];
  }

  // ---- Phase 3: FOV (ray casting) ----
  function inFOV(tx, ty) {
    var dx = tx - player.gx;
    var dy = ty - player.gy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > FOV_RADIUS) return false;
    if (dist < 0.5) return true;
    var steps = Math.ceil(dist * 2);
    var ux = dx / steps;
    var uy = dy / steps;
    for (var s = 1; s < steps; s++) {
      var nx = player.gx + ux * s;
      var ny = player.gy + uy * s;
      var gx = Math.floor(nx);
      var gy = Math.floor(ny);
      if (blockSolid(gx, gy)) return false;
    }
    return true;
  }

  function computeFOV() {
    var y, x;
    for (y = 0; y < MAP_H; y++)
      for (x = 0; x < MAP_W; x++) {
        visible[y][x] = inFOV(x, y);
        if (visible[y][x]) explored[y][x] = true;
      }
  }

  // ---- Phase 4: A* pathfinding ----
  function getPath(fromGx, fromGy, toGx, toGy) {
    function key(gx, gy) { return gx + ',' + gy; }
    var open = [{ gx: fromGx, gy: fromGy, g: 0, h: Math.abs(toGx - fromGx) + Math.abs(toGy - fromGy) }];
    var openSet = {};
    openSet[key(fromGx, fromGy)] = true;
    var closed = {};
    var parent = {};
    var cost = {};
    cost[key(fromGx, fromGy)] = 0;
    while (open.length) {
      open.sort(function (a, b) { return (a.g + a.h) - (b.g + b.h); });
      var cur = open.shift();
      delete openSet[key(cur.gx, cur.gy)];
      if (cur.gx === toGx && cur.gy === toGy) {
        var path = [];
        while (cur) {
          path.unshift({ gx: cur.gx, gy: cur.gy });
          cur = parent[key(cur.gx, cur.gy)];
        }
        return path;
      }
      closed[key(cur.gx, cur.gy)] = true;
      var dirs = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];
      for (var d = 0; d < dirs.length; d++) {
        var nx = cur.gx + dirs[d].dx;
        var ny = cur.gy + dirs[d].dy;
        if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) continue;
        if (!isPassable(nx, ny)) continue;
        var enemyAt = enemyAtCell(nx, ny);
        if (enemyAt && (nx !== toGx || ny !== toGy)) continue;
        var k = key(nx, ny);
        if (closed[k]) continue;
        var g = cost[key(cur.gx, cur.gy)] + 1;
        if (!cost[k] || g < cost[k]) {
          cost[k] = g;
          parent[k] = cur;
          var h = Math.abs(toGx - nx) + Math.abs(toGy - ny);
          if (!openSet[k]) {
            openSet[k] = true;
            open.push({ gx: nx, gy: ny, g: g, h: h });
          }
        }
      }
    }
    return [];
  }

  function enemyAtCell(gx, gy) {
    for (var i = 0; i < enemies.length; i++)
      if (enemies[i].gx === gx && enemies[i].gy === gy) return enemies[i];
    return null;
  }

  function itemAtCell(gx, gy) {
    for (var i = 0; i < items.length; i++)
      if (items[i].gx === gx && items[i].gy === gy) return items[i];
    return null;
  }

  function addMessage(text) {
    if (!msgLogEl) return;
    var p = document.createElement('p');
    p.textContent = text;
    msgLogEl.appendChild(p);
    while (msgLogEl.children.length > 5) msgLogEl.removeChild(msgLogEl.firstChild);
  }

  function playerEffectiveAtk() {
    var a = player.atk;
    if (player.weapon) a += player.weapon.atk || 0;
    return a;
  }

  function playerEffectiveDef() {
    var d = player.def;
    if (player.armor) d += player.armor.def || 0;
    return d;
  }

  function updateHUD() {
    if (healthEl) healthEl.textContent = player.hp;
    if (maxHealthEl) maxHealthEl.textContent = player.maxHp;
    if (floorEl) floorEl.textContent = currentFloor;
    if (atkEl) atkEl.textContent = playerEffectiveAtk();
    if (defEl) defEl.textContent = playerEffectiveDef();
    if (healthBarEl) {
      healthBarEl.style.width = (100 * player.hp / player.maxHp) + '%';
      healthBarEl.classList.toggle('low', player.hp <= player.maxHp * 0.3);
    }
  }

  function tryPlayerMove(dx, dy) {
    if (gameOver) return;
    var nx = player.gx + dx;
    var ny = player.gy + dy;
    if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) return;
    var e = enemyAtCell(nx, ny);
    if (e) {
      var dmg = Math.max(1, playerEffectiveAtk() - e.def);
      e.hp -= dmg;
      addMessage('You hit for ' + dmg);
      if (e.hp <= 0) {
        addMessage('Enemy killed.');
        var drop = { id: 'item' + Date.now(), name: 'Dagger', type: 'weapon', atk: 1, gx: e.gx, gy: e.gy };
        items.push(drop);
        enemies.splice(enemies.indexOf(e), 1);
      }
      computeFOV();
      enemiesTurn();
      updateHUD();
      draw();
      return;
    }
    if (!isPassable(nx, ny)) return;
    if (getTile(nx, ny) === STAIRS) {
      currentFloor++;
      addMessage('Descending to floor ' + currentFloor + '...');
      generateDungeon();
      computeFOV();
      updateHUD();
      draw();
      return;
    }
    var it = itemAtCell(nx, ny);
    if (it) {
      player.inventory.push(it);
      items.splice(items.indexOf(it), 1);
      addMessage('Picked up ' + it.name + '.');
    }
    player.gx = nx;
    player.gy = ny;
    computeFOV();
    enemiesTurn();
    updateHUD();
    draw();
  }

  function enemiesTurn() {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      var dist = Math.abs(e.gx - player.gx) + Math.abs(e.gy - player.gy);
      if (dist <= 1) {
        var dmg = Math.max(1, e.atk - playerEffectiveDef());
        player.hp -= dmg;
        addMessage('Enemy hits for ' + dmg + '.');
        if (player.hp <= 0) {
          gameOver = true;
          if (overlay) overlay.classList.remove('hidden');
          if (overlayMsg) overlayMsg.textContent = 'You died';
          return;
        }
        continue;
      }
      if (!visible[e.gy][e.gx]) continue;
      var path = getPath(e.gx, e.gy, player.gx, player.gy);
      if (path.length > 1) {
        var next = path[1];
        var block = enemyAtCell(next.gx, next.gy);
        if (!block && (next.gx !== player.gx || next.gy !== player.gy)) {
          e.gx = next.gx;
          e.gy = next.gy;
        }
      }
    }
  }

  function draw() {
    if (!ctx) return;
    var cw = canvas.width;
    var ch = canvas.height;
    var tilesW = Math.ceil(cw / TILE);
    var tilesH = Math.ceil(ch / TILE);
    var camGx = player.gx - Math.floor(tilesW / 2);
    var camGy = player.gy - Math.floor(tilesH / 2);
    camGx = Math.max(0, Math.min(MAP_W - tilesW, camGx));
    camGy = Math.max(0, Math.min(MAP_H - tilesH, camGy));
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, cw, ch);
    for (var dy = 0; dy < tilesH; dy++) {
      for (var dx = 0; dx < tilesW; dx++) {
        var gx = camGx + dx;
        var gy = camGy + dy;
        if (gx < 0 || gx >= MAP_W || gy < 0 || gy >= MAP_H) continue;
        var lit = visible[gy][gx];
        var seen = explored[gy][gx];
        if (!lit && !seen) continue;
        var screenX = dx * TILE;
        var screenY = dy * TILE;
        if (getTile(gx, gy) === WALL) {
          ctx.fillStyle = lit ? '#4a4a52' : '#252530';
          ctx.fillRect(screenX, screenY, TILE, TILE);
        } else if (getTile(gx, gy) === FLOOR) {
          ctx.fillStyle = lit ? '#2a2a32' : '#1a1a20';
          ctx.fillRect(screenX, screenY, TILE, TILE);
        } else if (getTile(gx, gy) === STAIRS) {
          ctx.fillStyle = lit ? '#2a2a32' : '#1a1a20';
          ctx.fillRect(screenX, screenY, TILE, TILE);
          ctx.fillStyle = lit ? '#8b7355' : '#4a3d30';
          ctx.fillRect(screenX + 4, screenY + 4, TILE - 8, TILE - 8);
        }
        var e = enemyAtCell(gx, gy);
        if (e && lit) {
          ctx.fillStyle = '#c44';
          ctx.beginPath();
          ctx.arc(screenX + TILE / 2, screenY + TILE / 2, TILE / 2 - 1, 0, Math.PI * 2);
          ctx.fill();
        }
        var it = itemAtCell(gx, gy);
        if (it && lit) {
          ctx.fillStyle = '#daa520';
          ctx.fillRect(screenX + 4, screenY + 4, TILE - 8, TILE - 8);
        }
      }
    }
    var playerScreenX = (player.gx - camGx) * TILE + TILE / 2;
    var playerScreenY = (player.gy - camGy) * TILE + TILE / 2;
    ctx.fillStyle = '#4a9';
    ctx.beginPath();
    ctx.arc(playerScreenX, playerScreenY, TILE / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
  }

  function refreshInventoryList() {
    if (!inventoryList) return;
    inventoryList.innerHTML = '';
    for (var i = 0; i < player.inventory.length; i++) {
      var it = player.inventory[i];
      var li = document.createElement('li');
      var eq = (player.weapon && player.weapon.id === it.id) || (player.armor && player.armor.id === it.id);
      li.textContent = it.name + (it.atk ? ' +' + it.atk + ' atk' : '') + (it.def ? ' +' + it.def + ' def' : '') + (eq ? ' [equipped]' : '');
      li.dataset.index = i;
      li.addEventListener('click', (function (idx) {
        return function () {
          var item = player.inventory[idx];
          if (item.type === 'weapon') player.weapon = item;
          if (item.type === 'armor') player.armor = item;
          refreshInventoryList();
          updateHUD();
        };
      })(i));
      inventoryList.appendChild(li);
    }
  }

  document.addEventListener('keydown', function (e) {
    if (inventoryPanel && !inventoryPanel.classList.contains('hidden')) {
      if (e.code === 'KeyI') {
        inventoryPanel.classList.add('hidden');
        e.preventDefault();
      }
      return;
    }
    if (e.code === 'KeyI') {
      e.preventDefault();
      if (inventoryPanel) {
        inventoryPanel.classList.toggle('hidden');
        refreshInventoryList();
      }
      return;
    }
    var dx = 0, dy = 0;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') dx = -1;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') dx = 1;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') dy = -1;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') dy = 1;
    if (dx !== 0 || dy !== 0) {
      e.preventDefault();
      tryPlayerMove(dx, dy);
    }
  });

  if (btnRestart) btnRestart.addEventListener('click', function () {
    gameOver = false;
    player.hp = player.maxHp;
    player.inventory = [];
    player.weapon = null;
    player.armor = null;
    currentFloor = 1;
    if (overlay) overlay.classList.add('hidden');
    if (msgLogEl) msgLogEl.innerHTML = '';
    generateDungeon();
    computeFOV();
    updateHUD();
    draw();
  });

  generateDungeon();
  computeFOV();
  updateHUD();
  draw();
})();
