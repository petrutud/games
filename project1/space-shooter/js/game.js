(function () {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const PLAYER_SPEED = 7;
  const LASER_SPEED = 14;
  const FIRE_COOLDOWN = 8;
  const ENEMY_ROWS = 4;
  const ENEMY_COLS = 6;

  let stars = [];
  let player = { x: W / 2, y: H - 70, w: 40, h: 28 };
  let lasers = [];
  let enemyLasers = [];
  let enemies = [];
  let keys = {};
  let fireCooldown = 0;
  let lives = 3;
  let score = 0;
  let wave = 1;
  let enemyDir = 1;
  let enemyMoveTimer = 0;
  let enemyShootTimer = 0;
  let gameOver = false;

  const livesEl = document.getElementById('lives');
  const scoreEl = document.getElementById('score');
  const waveEl = document.getElementById('wave');
  const overlay = document.getElementById('overlay');
  const overlayMsg = document.getElementById('overlay-msg');

  function initStars() {
    stars = [];
    for (var i = 0; i < 80; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        s: 0.5 + Math.random() * 2,
        sp: 0.5 + Math.random() * 2
      });
    }
  }

  function spawnWave() {
    enemies = [];
    var margin = 40;
    var cellW = (W - margin * 2) / ENEMY_COLS;
    var startY = 80 + wave * 8;
    for (var r = 0; r < ENEMY_ROWS; r++) {
      for (var c = 0; c < ENEMY_COLS; c++) {
        var hp = 1 + Math.floor(wave / 3);
        enemies.push({
          x: margin + c * cellW + cellW / 2,
          y: startY + r * 48,
          w: 32,
          h: 24,
          hp: hp,
          maxHp: hp,
          shootOffset: Math.random() * 120
        });
      }
    }
    enemyDir = 1;
  }

  function resetGame() {
    initStars();
    player.x = W / 2;
    lasers = [];
    enemyLasers = [];
    lives = 3;
    score = 0;
    wave = 1;
    gameOver = false;
    spawnWave();
    overlay.classList.add('hidden');
    updateHud();
  }

  function updateHud() {
    livesEl.textContent = lives;
    scoreEl.textContent = score;
    waveEl.textContent = wave;
  }

  function hitRect(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function update() {
    if (gameOver) return;

    for (var i = 0; i < stars.length; i++) {
      stars[i].y += stars[i].sp;
      if (stars[i].y > H) stars[i].y = 0;
    }

    if (keys.ArrowLeft || keys.a) player.x -= PLAYER_SPEED;
    if (keys.ArrowRight || keys.d) player.x += PLAYER_SPEED;
    player.x = Math.max(player.w / 2, Math.min(W - player.w / 2, player.x));

    if (keys[' '] || keys.Space) {
      fireCooldown--;
      if (fireCooldown <= 0) {
        fireCooldown = FIRE_COOLDOWN;
        lasers.push({
          x: player.x - 3,
          y: player.y - 10,
          w: 6,
          h: 16,
          vy: -LASER_SPEED
        });
      }
    } else {
      fireCooldown = 0;
    }

    for (var i = lasers.length - 1; i >= 0; i--) {
      var L = lasers[i];
      L.y += L.vy;
      if (L.y < -20) {
        lasers.splice(i, 1);
        continue;
      }
      for (var j = enemies.length - 1; j >= 0; j--) {
        var e = enemies[j];
        if (hitRect(L.x, L.y, L.w, L.h, e.x - e.w / 2, e.y - e.h / 2, e.w, e.h)) {
          e.hp--;
          lasers.splice(i, 1);
          if (e.hp <= 0) {
            score += 10 * wave;
            enemies.splice(j, 1);
          }
          break;
        }
      }
    }

    enemyMoveTimer++;
    var moveEvery = Math.max(8, 28 - wave * 2);
    if (enemyMoveTimer >= moveEvery) {
      enemyMoveTimer = 0;
      var stepX = 2 + Math.floor(wave / 4);
      var stepY = 0;
      var minX = 1e9, maxX = -1e9;
      for (var k = 0; k < enemies.length; k++) {
        minX = Math.min(minX, enemies[k].x - enemies[k].w / 2);
        maxX = Math.max(maxX, enemies[k].x + enemies[k].w / 2);
      }
      if (enemies.length) {
        if (maxX + stepX * enemyDir > W - 10 || minX + stepX * enemyDir < 10) {
          enemyDir *= -1;
          stepY = 12;
        }
        for (var k = 0; k < enemies.length; k++) {
          enemies[k].x += stepX * enemyDir;
          if (stepY) enemies[k].y += stepY;
        }
      }
    }

    enemyShootTimer++;
    if (enemyShootTimer > 50 - Math.min(20, wave)) {
      enemyShootTimer = 0;
      var shooters = enemies.filter(function () { return true; });
      if (shooters.length) {
        var e = shooters[Math.floor(Math.random() * shooters.length)];
        enemyLasers.push({
          x: e.x - 3,
          y: e.y + e.h / 2,
          w: 6,
          h: 12,
          vy: 5 + wave * 0.3
        });
      }
    }

    for (var i = enemyLasers.length - 1; i >= 0; i--) {
      var el = enemyLasers[i];
      el.y += el.vy;
      if (el.y > H) {
        enemyLasers.splice(i, 1);
        continue;
      }
      if (hitRect(el.x, el.y, el.w, el.h, player.x - player.w / 2, player.y - player.h / 2, player.w, player.h)) {
        enemyLasers.splice(i, 1);
        lives--;
        if (lives <= 0) {
          lives = 0;
          gameOver = true;
          overlayMsg.textContent = 'Game Over — Score: ' + score;
          overlay.classList.remove('hidden');
        }
      }
    }

    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.y + e.h / 2 >= player.y - 20) {
        gameOver = true;
        overlayMsg.textContent = 'Invaded! Score: ' + score;
        overlay.classList.remove('hidden');
        return;
      }
    }

    if (enemies.length === 0) {
      wave++;
      spawnWave();
    }

    updateHud();
  }

  function drawShip(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -player.h / 2);
    ctx.lineTo(-player.w / 2, player.h / 2);
    ctx.lineTo(0, player.h / 2 - 8);
    ctx.lineTo(player.w / 2, player.h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.beginPath();
    ctx.moveTo(0, player.h / 2);
    ctx.lineTo(-8, player.h / 2 + 12);
    ctx.lineTo(8, player.h / 2 + 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawEnemy(e) {
    var ex = e.x - e.w / 2;
    var ey = e.y - e.h / 2;
    ctx.fillStyle = '#a855f7';
    ctx.strokeStyle = '#c4b5fd';
    ctx.lineWidth = 1;
    ctx.fillRect(ex, ey, e.w, e.h);
    ctx.strokeRect(ex, ey, e.w, e.h);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(e.x - 4, e.y - 4, 8, 8);
    if (e.maxHp > 1) {
      ctx.fillStyle = '#334155';
      ctx.fillRect(e.x - e.w / 2, e.y - e.h / 2 - 6, e.w, 3);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(e.x - e.w / 2, e.y - e.h / 2 - 6, e.w * (e.hp / e.maxHp), 3);
    }
  }

  function draw() {
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + s.s * 0.2) + ')';
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }

    for (var i = 0; i < lasers.length; i++) {
      var L = lasers[i];
      ctx.fillStyle = '#22d3ee';
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 8;
      ctx.fillRect(L.x, L.y, L.w, L.h);
      ctx.shadowBlur = 0;
    }

    for (var i = 0; i < enemyLasers.length; i++) {
      var el = enemyLasers[i];
      ctx.fillStyle = '#f97316';
      ctx.fillRect(el.x, el.y, el.w, el.h);
    }

    for (var i = 0; i < enemies.length; i++) drawEnemy(enemies[i]);
    drawShip(player.x, player.y);

    requestAnimationFrame(draw);
  }

  function loop() {
    update();
    requestAnimationFrame(loop);
  }

  canvas.addEventListener('click', function () {
    if (gameOver) return;
    lasers.push({
      x: player.x - 3,
      y: player.y - 10,
      w: 6,
      h: 16,
      vy: -LASER_SPEED
    });
  });

  document.addEventListener('keydown', function (e) {
    if (['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D', ' '].indexOf(e.key) !== -1)
      e.preventDefault();
    keys[e.key] = true;
    keys[e.key.toLowerCase()] = true;
  });
  document.addEventListener('keyup', function (e) {
    keys[e.key] = false;
    keys[e.key.toLowerCase()] = false;
  });

  document.getElementById('btn-restart').addEventListener('click', resetGame);

  initStars();
  spawnWave();
  updateHud();
  loop();
  draw();
})();
