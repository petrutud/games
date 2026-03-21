(function () {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const PLAYER_R = 14;
  const PLAYER_SPEED = 5;
  const BULLET_SPEED = 14;
  const FIRE_RATE = 6;
  const ENEMY_R = 12;
  const ENEMY_SPEED = 1.8;
  const ENEMY_HP = 30;
  const ENEMY_BULLET_SPEED = 7;
  const ENEMY_FIRE = 90;

  let player = { x: W / 2, y: H / 2, hp: 100, angle: 0 };
  let bullets = [];
  let enemyBullets = [];
  let enemies = [];
  let particles = [];
  let keys = {};
  let mouse = { x: W / 2, y: H / 2, down: false };
  let fireCooldown = 0;
  let score = 0;
  let wave = 1;
  let spawnTimer = 0;
  let enemiesToSpawn = 0;
  let gameOver = false;

  const hpEl = document.getElementById('hp');
  const scoreEl = document.getElementById('score');
  const waveEl = document.getElementById('wave');
  const overlay = document.getElementById('overlay');
  const overlayMsg = document.getElementById('overlay-msg');

  function spawnEnemy() {
    var side = Math.floor(Math.random() * 4);
    var x, y;
    if (side === 0) { x = -20; y = Math.random() * H; }
    else if (side === 1) { x = W + 20; y = Math.random() * H; }
    else if (side === 2) { x = Math.random() * W; y = -20; }
    else { x = Math.random() * W; y = H + 20; }
    enemies.push({
      x: x, y: y,
      hp: ENEMY_HP + wave * 8,
      maxHp: ENEMY_HP + wave * 8,
      shootTimer: Math.random() * ENEMY_FIRE,
      r: ENEMY_R
    });
  }

  function addParticles(x, y, color, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var s = 2 + Math.random() * 5;
      particles.push({
        x: x, y: y,
        vx: Math.cos(a) * s * 8,
        vy: Math.sin(a) * s * 8,
        life: 0.5 + Math.random() * 0.3,
        color: color,
        r: 2 + Math.random() * 3
      });
    }
  }

  function update() {
    if (gameOver) return;

    if (keys.a || keys.ArrowLeft) player.x -= PLAYER_SPEED;
    if (keys.d || keys.ArrowRight) player.x += PLAYER_SPEED;
    if (keys.w || keys.ArrowUp) player.y -= PLAYER_SPEED;
    if (keys.s || keys.ArrowDown) player.y += PLAYER_SPEED;
    player.x = Math.max(PLAYER_R, Math.min(W - PLAYER_R, player.x));
    player.y = Math.max(PLAYER_R, Math.min(H - PLAYER_R, player.y));

    player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

    if (mouse.down) {
      fireCooldown--;
      if (fireCooldown <= 0) {
        fireCooldown = FIRE_RATE;
        bullets.push({
          x: player.x + Math.cos(player.angle) * (PLAYER_R + 4),
          y: player.y + Math.sin(player.angle) * (PLAYER_R + 4),
          vx: Math.cos(player.angle) * BULLET_SPEED,
          vy: Math.sin(player.angle) * BULLET_SPEED,
          dmg: 12 + wave
        });
      }
    }

    for (var i = bullets.length - 1; i >= 0; i--) {
      var b = bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      if (b.x < 0 || b.x > W || b.y < 0 || b.y > H) {
        bullets.splice(i, 1);
        continue;
      }
      for (var j = enemies.length - 1; j >= 0; j--) {
        var e = enemies[j];
        var d = Math.hypot(b.x - e.x, b.y - e.y);
        if (d < e.r + 4) {
          e.hp -= b.dmg;
          addParticles(b.x, b.y, '#00f5ff', 3);
          bullets.splice(i, 1);
          if (e.hp <= 0) {
            score += 10 + wave * 2;
            addParticles(e.x, e.y, '#ff4466', 8);
            enemies.splice(j, 1);
          }
          break;
        }
      }
    }

    spawnTimer++;
    if (enemiesToSpawn > 0 && spawnTimer > 35) {
      spawnTimer = 0;
      spawnEnemy();
      enemiesToSpawn--;
    }
    if (enemiesToSpawn === 0 && enemies.length === 0) {
      wave++;
      enemiesToSpawn = 4 + wave * 2;
      spawnTimer = 0;
    }

    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      var dx = player.x - e.x;
      var dy = player.y - e.y;
      var d = Math.hypot(dx, dy) || 1;
      e.x += (dx / d) * ENEMY_SPEED;
      e.y += (dy / d) * ENEMY_SPEED;
      e.shootTimer--;
      if (e.shootTimer <= 0 && d < 400) {
        e.shootTimer = ENEMY_FIRE;
        var ang = Math.atan2(dy, dx);
        enemyBullets.push({
          x: e.x + Math.cos(ang) * e.r,
          y: e.y + Math.sin(ang) * e.r,
          vx: Math.cos(ang) * ENEMY_BULLET_SPEED,
          vy: Math.sin(ang) * ENEMY_BULLET_SPEED,
          dmg: 8 + Math.floor(wave / 2)
        });
      }
    }

    for (var i = enemyBullets.length - 1; i >= 0; i--) {
      var eb = enemyBullets[i];
      eb.x += eb.vx;
      eb.y += eb.vy;
      if (eb.x < 0 || eb.x > W || eb.y < 0 || eb.y > H) {
        enemyBullets.splice(i, 1);
        continue;
      }
      if (Math.hypot(eb.x - player.x, eb.y - player.y) < PLAYER_R + 4) {
        player.hp -= eb.dmg;
        addParticles(player.x, player.y, '#ff4444', 5);
        enemyBullets.splice(i, 1);
        if (player.hp <= 0) {
          player.hp = 0;
          gameOver = true;
          overlayMsg.textContent = 'Game Over — Score: ' + score;
          overlay.classList.remove('hidden');
        }
      }
    }

    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx * 0.08;
      p.y += p.vy * 0.08;
      p.life -= 0.05;
      if (p.life <= 0) particles.splice(i, 1);
    }

    hpEl.textContent = Math.max(0, Math.ceil(player.hp));
    scoreEl.textContent = score;
    waveEl.textContent = wave;
  }

  function draw() {
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(0, 245, 255, 0.06)';
    ctx.lineWidth = 1;
    for (var g = 0; g < W; g += 40) {
      ctx.beginPath();
      ctx.moveTo(g, 0);
      ctx.lineTo(g, H);
      ctx.stroke();
    }
    for (var g = 0; g < H; g += 40) {
      ctx.beginPath();
      ctx.moveTo(0, g);
      ctx.lineTo(W, g);
      ctx.stroke();
    }

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (var i = 0; i < bullets.length; i++) {
      var b = bullets[i];
      ctx.fillStyle = '#00f5ff';
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    for (var i = 0; i < enemyBullets.length; i++) {
      var eb = enemyBullets[i];
      ctx.fillStyle = '#ff6644';
      ctx.beginPath();
      ctx.arc(eb.x, eb.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      ctx.fillStyle = '#e63946';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff8899';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#333';
      ctx.fillRect(e.x - e.r, e.y - e.r - 8, e.r * 2, 4);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(e.x - e.r, e.y - e.r - 8, e.r * 2 * (e.hp / e.maxHp), 4);
    }

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.fillStyle = '#00f5ff';
    ctx.shadowColor = '#00f5ff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0d1117';
    ctx.beginPath();
    ctx.moveTo(PLAYER_R + 2, 0);
    ctx.lineTo(-6, -5);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(player.x - 30, player.y - PLAYER_R - 14, 60, 6);
    ctx.fillStyle = player.hp > 40 ? '#22c55e' : '#ef4444';
    ctx.fillRect(player.x - 30, player.y - PLAYER_R - 14, 60 * (player.hp / 100), 6);

    requestAnimationFrame(draw);
  }

  function loop() {
    update();
    requestAnimationFrame(loop);
  }

  canvas.addEventListener('mousemove', function (e) {
    var rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  });
  canvas.addEventListener('mousedown', function () { mouse.down = true; });
  canvas.addEventListener('mouseup', function () { mouse.down = false; });
  canvas.addEventListener('mouseleave', function () { mouse.down = false; });

  document.addEventListener('keydown', function (e) {
    if (['a', 'd', 'w', 's', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) !== -1)
      e.preventDefault();
    keys[e.key] = true;
  });
  document.addEventListener('keyup', function (e) {
    keys[e.key] = false;
  });

  document.getElementById('btn-restart').addEventListener('click', function () {
    overlay.classList.add('hidden');
    gameOver = false;
    player = { x: W / 2, y: H / 2, hp: 100, angle: 0 };
    bullets = [];
    enemyBullets = [];
    enemies = [];
    particles = [];
    score = 0;
    wave = 1;
    enemiesToSpawn = 6;
    spawnTimer = 0;
  });

  enemiesToSpawn = 6;
  loop();
  draw();
})();
