(function () {
  'use strict';

  const TILE = 20;
  const COLS = 32;
  const ROWS = 20;
  const W = COLS * TILE;
  const H = ROWS * TILE;

  const COSTS = { conveyor: 15, drill: 20, turret: 40 };
  const CORE_START_HP = 500;
  const CORE_X = 1;
  const CORE_Y = Math.floor(ROWS / 2);
  const DRILL_RATE = 90;
  const TURRET_RANGE = 6;
  const TURRET_DAMAGE = 25;
  const TURRET_COOLDOWN = 20;
  const ENEMY_HP = 40;
  const ENEMY_DAMAGE = 15;
  const ENEMY_SPEED = 0.03;

  const canvas = document.getElementById('map');
  const ctx = canvas.getContext('2d');
  const copperEl = document.getElementById('copper');
  const waveEl = document.getElementById('wave');
  const coreHpEl = document.getElementById('core-hp');
  const overlay = document.getElementById('overlay');
  const overlayMsg = document.getElementById('overlay-msg');

  let grid = [];
  let copper = 50;
  let wave = 1;
  let waveActive = false;
  let core = null;
  let enemies = [];
  let tick = 0;
  let selectedBuild = null;
  let gameOver = false;

  function initMap() {
    grid = [];
    for (var r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (var c = 0; c < COLS; c++) {
        var isOre = Math.random() < 0.22 && (c > 4 || r < CORE_Y - 2 || r > CORE_Y + 2);
        if (c === CORE_X && r === CORE_Y) {
          grid[r][c] = { terrain: 0, building: { type: 'core', hp: CORE_START_HP } };
          core = grid[r][c].building;
        } else {
          grid[r][c] = { terrain: isOre ? 1 : 0, building: null };
        }
      }
    }
    copper = 50;
    wave = 1;
    waveActive = false;
    enemies = [];
    tick = 0;
    gameOver = false;
    overlay.classList.add('hidden');
    updateHud();
  }

  function isConnectedToCore(startR, startC) {
    var seen = {};
    var q = [{ r: CORE_Y, c: CORE_X }];
    seen[CORE_Y + ',' + CORE_X] = true;
    while (q.length) {
      var p = q.shift();
      for (var dr = -1; dr <= 1; dr++) {
        for (var dc = -1; dc <= 1; dc++) {
          if (dr !== 0 && dc !== 0) continue;
          var nr = p.r + dr, nc = p.c + dc;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
          var key = nr + ',' + nc;
          if (seen[key]) continue;
          var t = grid[nr][nc];
          if (t.building && (t.building.type === 'conveyor' || t.building.type === 'drill' || t.building.type === 'core')) {
            seen[key] = true;
            q.push({ r: nr, c: nc });
            if (nr === startR && nc === startC) return true;
          }
        }
      }
    }
    return !!seen[startR + ',' + startC];
  }

  function canPlace(r, c, build) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
    var t = grid[r][c];
    if (t.building) return false;
    if (build === 'drill' && t.terrain !== 1) return false;
    if (build === 'conveyor' || build === 'turret') return true;
    if (build === 'drill') return true;
    return false;
  }

  function place(r, c, build) {
    if (!canPlace(r, c, build) || copper < COSTS[build]) return false;
    copper -= COSTS[build];
    if (build === 'conveyor') {
      var dir = 2;
      if (c > CORE_X) dir = 2;
      else if (c < CORE_X) dir = 0;
      else if (r > CORE_Y) dir = 3;
      else dir = 1;
      grid[r][c].building = { type: 'conveyor', dir: dir };
    } else if (build === 'drill') {
      grid[r][c].building = { type: 'drill', timer: 0 };
    } else if (build === 'turret') {
      grid[r][c].building = { type: 'turret', cooldown: 0 };
    }
    return true;
  }

  function update() {
    if (gameOver) return;
    tick++;

    if (core.hp <= 0) {
      gameOver = true;
      overlayMsg.textContent = 'Core destroyed! Wave reached: ' + wave;
      overlay.classList.remove('hidden');
      coreHpEl.classList.add('low');
      return;
    }

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var t = grid[r][c];
        if (t.building && t.building.type === 'drill' && t.terrain === 1 && isConnectedToCore(r, c)) {
          t.building.timer = (t.building.timer || 0) + 1;
          if (t.building.timer >= DRILL_RATE) {
            t.building.timer = 0;
            copper++;
          }
        }
      }
    }

    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      e.x -= ENEMY_SPEED;
      if (e.x < (CORE_X + 1) * TILE) {
        core.hp -= ENEMY_DAMAGE;
        enemies.splice(i, 1);
        i--;
      }
    }

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var t = grid[r][c];
        if (t.building && t.building.type === 'turret') {
          t.building.cooldown = (t.building.cooldown || 0) - 1;
          if (t.building.cooldown <= 0) {
            var tx = c * TILE + TILE / 2;
            var ty = r * TILE + TILE / 2;
            var best = null;
            var bestD = TURRET_RANGE * TILE + 1;
            for (var j = 0; j < enemies.length; j++) {
              var ex = enemies[j].x;
              var ey = enemies[j].y;
              var d = Math.hypot(ex - tx, ey - ty);
              if (d <= TURRET_RANGE * TILE && d < bestD) {
                bestD = d;
                best = enemies[j];
              }
            }
            if (best) {
              best.hp -= TURRET_DAMAGE;
              t.building.cooldown = TURRET_COOLDOWN;
              if (best.hp <= 0) {
                var idx = enemies.indexOf(best);
                if (idx !== -1) enemies.splice(idx, 1);
              }
            }
          }
        }
      }
    }

    updateHud();
  }

  function spawnWave() {
    if (waveActive) return;
    waveActive = true;
    var count = 2 + wave * 2;
    for (var i = 0; i < count; i++) {
      setTimeout(function () {
        if (gameOver) return;
        var row = Math.floor(Math.random() * ROWS);
        enemies.push({
          x: (COLS - 1) * TILE + Math.random() * TILE,
          y: row * TILE + TILE / 2,
          hp: ENEMY_HP + wave * 5
        });
      }, i * 400);
    }
    setTimeout(function () {
      waveActive = false;
      wave++;
    }, count * 400 + 2000);
  }

  function updateHud() {
    copperEl.textContent = copper;
    waveEl.textContent = wave;
    coreHpEl.textContent = core ? Math.max(0, core.hp) : 0;
    if (core && core.hp < CORE_START_HP * 0.3) coreHpEl.classList.add('low');
    else coreHpEl.classList.remove('low');
  }

  function draw() {
    ctx.fillStyle = '#151a24';
    ctx.fillRect(0, 0, W, H);

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var x = c * TILE;
        var y = r * TILE;
        var t = grid[r][c];
        if (t.terrain === 1) {
          ctx.fillStyle = '#4a5a3a';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#6a7a4a';
          ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        } else {
          ctx.fillStyle = '#1e2433';
          ctx.fillRect(x, y, TILE, TILE);
        }
        ctx.strokeStyle = '#2d3548';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, TILE, TILE);

        if (t.building) {
          if (t.building.type === 'core') {
            ctx.fillStyle = '#5a8eff';
            ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
            ctx.fillStyle = '#3a6ed0';
            ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
          } else if (t.building.type === 'conveyor') {
            ctx.fillStyle = '#4a5568';
            ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
            ctx.fillStyle = '#6b9eff';
            var d = t.building.dir || 2;
            ctx.beginPath();
            if (d === 0) { ctx.moveTo(x + TILE - 6, y + TILE/2); ctx.lineTo(x + 6, y + TILE/2); }
            else if (d === 1) { ctx.moveTo(x + TILE/2, y + 6); ctx.lineTo(x + TILE/2, y + TILE - 6); }
            else if (d === 2) { ctx.moveTo(x + 6, y + TILE/2); ctx.lineTo(x + TILE - 6, y + TILE/2); }
            else { ctx.moveTo(x + TILE/2, y + TILE - 6); ctx.lineTo(x + TILE/2, y + 6); }
            ctx.stroke();
          } else if (t.building.type === 'drill') {
            ctx.fillStyle = '#6a5a4a';
            ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
            ctx.fillStyle = '#e8b84a';
            ctx.fillRect(x + 6, y + 6, TILE - 12, TILE - 12);
          } else if (t.building.type === 'turret') {
            ctx.fillStyle = '#5a4a4a';
            ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
            ctx.fillStyle = '#e85a5a';
            ctx.beginPath();
            ctx.arc(x + TILE/2, y + TILE/2, TILE/3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    ctx.fillStyle = '#e85a5a';
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      ctx.beginPath();
      ctx.arc(e.x, e.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  canvas.addEventListener('click', function (e) {
    if (gameOver) return;
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var cx = (e.clientX - rect.left) * scaleX;
    var cy = (e.clientY - rect.top) * scaleY;
    var col = Math.floor(cx / TILE);
    var row = Math.floor(cy / TILE);
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
    if (selectedBuild && place(row, col, selectedBuild)) {
      document.getElementById('selected').textContent = 'Placed ' + selectedBuild;
    }
  });

  document.querySelectorAll('.build-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.build-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      selectedBuild = btn.dataset.build;
      document.getElementById('selected').textContent = 'Selected: ' + selectedBuild + ' — click tile to place';
    });
  });

  document.getElementById('btn-wave').addEventListener('click', spawnWave);
  document.getElementById('btn-restart').addEventListener('click', function () {
    overlay.classList.add('hidden');
    initMap();
  });

  setInterval(update, 100);
  initMap();
  draw();
})();
