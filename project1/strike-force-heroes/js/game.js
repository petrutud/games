(function () {
  'use strict';

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const menu = document.getElementById('menu');
  const gameEl = document.getElementById('game');
  const overlay = document.getElementById('overlay');
  const overlayMsg = document.getElementById('overlay-msg');
  const hpEl = document.getElementById('hp');
  const waveEl = document.getElementById('wave');
  const killsEl = document.getElementById('kills');
  const hudClass = document.getElementById('hud-class');

  // Classes: hp, speed, damage mult, fire rate mult, regen (hp per sec), label
  const CLASSES = {
    commando: { hp: 100, speed: 280, dmg: 1, fireRate: 1, regen: 0, label: 'Commando' },
    medic:    { hp: 90,  speed: 260, dmg: 0.85, fireRate: 1.1, regen: 2, label: 'Medic' },
    tank:     { hp: 160, speed: 200, dmg: 1.2, fireRate: 0.8, regen: 0, label: 'Tank' },
    assassin: { hp: 70,  speed: 320, dmg: 1.4, fireRate: 1.3, regen: 0, label: 'Assassin' }
  };

  let playerClass = 'commando';
  let player = null;
  let bullets = [];
  let enemies = [];
  let particles = [];
  let keys = {};
  let mouse = { x: W / 2, y: H / 2, down: false };
  const TOTAL_WAVES = 25;
  let wave = 1;
  let kills = 0;
  let spawnTimer = 0;
  let waveKillsNeeded = 6;
  let waveKills = 0;
  let gameState = 'menu'; // menu | playing | win | dead
  let animId = null;

  const overlayTitle = document.getElementById('overlay-title');

  const PLAYER_R = 18;
  const BULLET_SPEED = 520;
  const BULLET_R = 4;
  const ENEMY_R = 14;
  const ENEMY_SPEED = 120;
  const ENEMY_HP = 30;
  const ENEMY_SHOOT_INTERVAL = 1.2;
  const ENEMY_BULLET_SPEED = 280;
  const FIRE_COOLDOWN_BASE = 0.12;

  function getPlayerConfig() {
    return CLASSES[playerClass] || CLASSES.commando;
  }

  function initPlayer() {
    var cfg = getPlayerConfig();
    player = {
      x: W / 2,
      y: H / 2,
      vx: 0,
      vy: 0,
      hp: cfg.hp,
      maxHp: cfg.hp,
      angle: 0,
      fireCooldown: 0,
      invuln: 1.5
    };
  }

  function spawnEnemy() {
    var side = Math.floor(Math.random() * 4);
    var x, y;
    if (side === 0) { x = -ENEMY_R - 10; y = Math.random() * H; }
    else if (side === 1) { x = W + ENEMY_R + 10; y = Math.random() * H; }
    else if (side === 2) { y = -ENEMY_R - 10; x = Math.random() * W; }
    else { y = H + ENEMY_R + 10; x = Math.random() * W; }
    enemies.push({
      x: x, y: y,
      hp: ENEMY_HP + wave * 4,
      maxHp: ENEMY_HP + wave * 4,
      shootTimer: Math.random() * ENEMY_SHOOT_INTERVAL,
      radius: ENEMY_R
    });
  }

  function angleToward(ax, ay, bx, by) {
    return Math.atan2(by - ay, bx - ax);
  }

  function dist(ax, ay, bx, by) {
    return Math.hypot(bx - ax, by - ay);
  }

  function fireBullet(fromX, fromY, angle, isPlayer, damageMult) {
    var dmg = isPlayer ? 15 * (getPlayerConfig().dmg || 1) : 12;
    if (damageMult) dmg *= damageMult;
    bullets.push({
      x: fromX,
      y: fromY,
      vx: Math.cos(angle) * (isPlayer ? BULLET_SPEED : ENEMY_BULLET_SPEED),
      vy: Math.sin(angle) * (isPlayer ? BULLET_SPEED : ENEMY_BULLET_SPEED),
      isPlayer: isPlayer,
      damage: dmg,
      r: BULLET_R
    });
  }

  function addParticles(x, y, color, count) {
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2;
      var s = 40 + Math.random() * 80;
      particles.push({
        x: x, y: y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.4 + Math.random() * 0.3,
        color: color,
        r: 3 + Math.random() * 4
      });
    }
  }

  function update(dt) {
    if (gameState !== 'playing') return;

    var cfg = getPlayerConfig();
    spawnTimer += dt;
    var spawnRate = Math.max(0.4, 1.2 - wave * 0.06);
    while (spawnTimer >= spawnRate) {
      spawnTimer -= spawnRate;
      if (enemies.length < 5 + wave * 2) spawnEnemy();
    }

    // Player
    if (player.invuln > 0) player.invuln -= dt;
    player.vx = 0;
    player.vy = 0;
    if (keys.a || keys.ArrowLeft) player.vx -= cfg.speed;
    if (keys.d || keys.ArrowRight) player.vx += cfg.speed;
    if (keys.w || keys.ArrowUp) player.vy -= cfg.speed;
    if (keys.s || keys.ArrowDown) player.vy += cfg.speed;
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    player.x = Math.max(PLAYER_R, Math.min(W - PLAYER_R, player.x));
    player.y = Math.max(PLAYER_R, Math.min(H - PLAYER_R, player.y));
    player.angle = angleToward(player.x, player.y, mouse.x, mouse.y);

    if (cfg.regen && player.hp < player.maxHp) {
      player.hp = Math.min(player.maxHp, player.hp + cfg.regen * dt);
    }

    if (player.fireCooldown > 0) player.fireCooldown -= dt;
    if (mouse.down && player.fireCooldown <= 0) {
      var cd = FIRE_COOLDOWN_BASE / (cfg.fireRate || 1);
      player.fireCooldown = cd;
      fireBullet(player.x, player.y, player.angle, true);
    }

    // Bullets
    for (var i = bullets.length - 1; i >= 0; i--) {
      var b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) {
        bullets.splice(i, 1);
        continue;
      }
      if (b.isPlayer) {
        for (var j = enemies.length - 1; j >= 0; j--) {
          var e = enemies[j];
          if (dist(b.x, b.y, e.x, e.y) < e.radius + b.r) {
            e.hp -= b.damage;
            addParticles(b.x, b.y, '#ff6b35', 4);
            bullets.splice(i, 1);
            if (e.hp <= 0) {
              kills++;
              waveKills++;
              addParticles(e.x, e.y, '#ff4444', 10);
              enemies.splice(j, 1);
            }
            break;
          }
        }
      } else {
        if (player.invuln <= 0 && dist(b.x, b.y, player.x, player.y) < PLAYER_R + b.r) {
          player.hp -= b.damage;
          addParticles(player.x, player.y, '#ff4444', 6);
          bullets.splice(i, 1);
          if (player.hp <= 0) {
            player.hp = 0;
            gameState = 'dead';
            overlay.classList.remove('victory');
            overlayTitle.textContent = 'KIA';
            overlayTitle.style.color = '#e44';
            overlayMsg.textContent = 'Kills: ' + kills + ' — Wave ' + wave + ' of ' + TOTAL_WAVES;
            overlay.classList.remove('hidden');
          }
        }
      }
    }

    // Enemies
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      var dx = player.x - e.x;
      var dy = player.y - e.y;
      var d = Math.hypot(dx, dy) || 1;
      if (d < 400) {
        e.x += (dx / d) * ENEMY_SPEED * dt;
        e.y += (dy / d) * ENEMY_SPEED * dt;
      }
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && dist(e.x, e.y, player.x, player.y) < 420) {
        e.shootTimer = ENEMY_SHOOT_INTERVAL;
        var ang = angleToward(e.x, e.y, player.x, player.y);
        fireBullet(e.x, e.y, ang, false);
      }
    }

    // Wave complete
    if (waveKills >= waveKillsNeeded) {
      wave++;
      waveKills = 0;
      waveKillsNeeded = 5 + wave * 2;
      if (wave > TOTAL_WAVES) {
        gameState = 'win';
        overlay.classList.add('victory');
        overlayTitle.textContent = 'YOU WON!';
        overlayTitle.style.color = '#4ade80';
        overlayMsg.textContent = 'All ' + TOTAL_WAVES + ' waves cleared! Total kills: ' + kills;
        overlay.classList.remove('hidden');
      }
    }

    // Particles
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    hpEl.textContent = Math.max(0, Math.ceil(player.hp));
    waveEl.textContent = wave + ' / ' + TOTAL_WAVES;
    killsEl.textContent = kills;
  }

  function draw() {
    ctx.fillStyle = '#0f1118';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    var grid = 48;
    for (var gx = 0; gx <= W; gx += grid) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, H);
      ctx.stroke();
    }
    for (var gy = 0; gy <= H; gy += grid) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(W, gy);
      ctx.stroke();
    }

    // Particles
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Enemies
    ctx.fillStyle = '#c44';
    ctx.strokeStyle = '#a22';
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.x < -50 || e.x > W + 50 || e.y < -50 || e.y > H + 50) continue;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.stroke();
      var barW = e.radius * 2;
      var barH = 4;
      ctx.fillStyle = '#333';
      ctx.fillRect(e.x - barW / 2, e.y - e.radius - 8, barW, barH);
      ctx.fillStyle = '#4a4';
      ctx.fillRect(e.x - barW / 2, e.y - e.radius - 8, barW * (e.hp / e.maxHp), barH);
    }

    // Bullets
    for (var i = 0; i < bullets.length; i++) {
      var b = bullets[i];
      ctx.fillStyle = b.isPlayer ? '#ff8c5a' : '#f66';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player
    if (!player) return;
    if (player.invuln > 0 && Math.floor(player.invuln * 10) % 2 === 0) ctx.globalAlpha = 0.6;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.fillStyle = '#ff6b35';
    ctx.strokeStyle = '#e85a28';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1a1a24';
    ctx.beginPath();
    ctx.moveTo(PLAYER_R + 4, 0);
    ctx.lineTo(-6, -6);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;

    // HP bar
    var barW = 120;
    var barH = 8;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(player.x - barW / 2, player.y - PLAYER_R - 16, barW, barH);
    ctx.fillStyle = player.hp > player.maxHp * 0.4 ? '#4a4' : '#c44';
    ctx.fillRect(player.x - barW / 2, player.y - PLAYER_R - 16, barW * (player.hp / player.maxHp), barH);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(player.x - barW / 2, player.y - PLAYER_R - 16, barW, barH);
  }

  function loop(t) {
    loop.last = loop.last || t;
    var dt = Math.min(0.05, (t - loop.last) / 1000);
    loop.last = t;
    update(dt);
    draw();
    animId = requestAnimationFrame(loop);
  }

  function startGame() {
    menu.classList.add('hidden');
    gameEl.classList.remove('hidden');
    overlay.classList.add('hidden');
    overlay.classList.remove('victory');
    overlayTitle.textContent = '';
    overlayMsg.textContent = '';
    playerClass = document.querySelector('.class-btn.active')?.dataset.class || 'commando';
    hudClass.textContent = (CLASSES[playerClass] && CLASSES[playerClass].label) || playerClass;
    wave = 1;
    kills = 0;
    waveKills = 0;
    waveKillsNeeded = 6;
    bullets = [];
    enemies = [];
    particles = [];
    gameState = 'playing';
    initPlayer();
    spawnTimer = 0;
    if (animId) cancelAnimationFrame(animId);
    loop.last = null;
    requestAnimationFrame(loop);
  }

  document.querySelectorAll('.class-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.class-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
  });

  document.getElementById('start-btn').addEventListener('click', startGame);

  document.getElementById('btn-retry').addEventListener('click', function () {
    overlay.classList.add('hidden');
    startGame();
  });
  document.getElementById('btn-menu').addEventListener('click', function () {
    overlay.classList.add('hidden');
    gameEl.classList.add('hidden');
    menu.classList.remove('hidden');
    if (animId) cancelAnimationFrame(animId);
  });

  document.addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    if (k === 'a' || k === 'd' || k === 'w' || k === 's' ||
        e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      keys[e.key] = true;
      e.preventDefault();
    }
  });
  document.addEventListener('keyup', function (e) {
    keys[e.key] = false;
  });

  canvas.addEventListener('mousemove', function (e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    mouse.x = (e.clientX - rect.left) * scaleX;
    mouse.y = (e.clientY - rect.top) * scaleY;
  });
  canvas.addEventListener('mousedown', function () { mouse.down = true; });
  canvas.addEventListener('mouseup', function () { mouse.down = false; });
  canvas.addEventListener('mouseleave', function () { mouse.down = false; });
})();
