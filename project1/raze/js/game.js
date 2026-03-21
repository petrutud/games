(function () {
  'use strict';

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const WORLD_W = 3200;
  const GROUND_Y = H - 48;
  const GRAVITY = 0.6;
  const JUMP_VEL = -14;
  const RUN_SPEED = 320;
  const PLAYER_W = 28;
  const PLAYER_H = 42;
  const BULLET_SPEED = 580;
  const BULLET_R = 3;
  const ENEMY_W = 24;
  const ENEMY_H = 36;
  const ENEMY_SPEED = 140;
  const ENEMY_HP = 25;
  const ENEMY_SHOOT_COOLDOWN = 1.1;
  const ENEMY_BULLET_SPEED = 320;
  const TOTAL_WAVES = 20;

  const menu = document.getElementById('menu');
  const gameEl = document.getElementById('game');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayMsg = document.getElementById('overlay-msg');
  const hpEl = document.getElementById('hp');
  const waveEl = document.getElementById('wave');
  const killsEl = document.getElementById('kills');

  let player = null;
  let bullets = [];
  let enemies = [];
  let particles = [];
  let keys = {};
  let mouse = { screenX: 0, screenY: 0, down: false };
  let cameraX = 0;
  let wave = 1;
  let kills = 0;
  let waveKills = 0;
  let waveKillsNeeded = 8;
  let spawnTimer = 0;
  let gameState = 'menu';
  let animId = null;

  // Simple platform layout: [x, y, w, h] in tiles (32px)
  const TILE = 32;
  const platforms = [];

  function buildLevel() {
    platforms.length = 0;
    for (var x = 0; x < WORLD_W; x += TILE * 8) {
      if (Math.random() < 0.4 && x > 400 && x < WORLD_W - 400) {
        platforms.push({
          x: x + Math.random() * TILE * 4,
          y: GROUND_Y - 80 - Math.random() * 120,
          w: TILE * (2 + Math.floor(Math.random() * 3)),
          h: TILE / 2
        });
      }
    }
  }

  function initPlayer() {
    player = {
      x: 120,
      y: GROUND_Y - PLAYER_H,
      vx: 0,
      vy: 0,
      hp: 100,
      maxHp: 100,
      onGround: false,
      aimAngle: 0,
      fireCooldown: 0,
      invuln: 1.2
    };
  }

  function spawnEnemy() {
    var side = Math.random() < 0.5 ? 0 : 1;
    var x = side === 0 ? player.x - 80 - Math.random() * 200 : player.x + 80 + Math.random() * 200;
    x = Math.max(60, Math.min(WORLD_W - 60, x));
    enemies.push({
      x: x,
      y: GROUND_Y - ENEMY_H,
      vx: 0,
      hp: ENEMY_HP + wave * 3,
      maxHp: ENEMY_HP + wave * 3,
      shootTimer: Math.random() * ENEMY_SHOOT_COOLDOWN,
      w: ENEMY_W,
      h: ENEMY_H
    });
  }

  function fireBullet(fromX, fromY, angle, isPlayer) {
    var dmg = isPlayer ? 14 + wave : 10;
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

  function addParticles(x, y, color, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var s = 30 + Math.random() * 60;
      particles.push({
        x: x, y: y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 20,
        life: 0.35 + Math.random() * 0.25,
        color: color,
        r: 2 + Math.random() * 3
      });
    }
  }

  function isOnPlatform(ent, entH) {
    var foot = ent.y + entH;
    var left = ent.x + 2;
    var right = ent.x + (ent.w || PLAYER_W) - 2;
    for (var i = 0; i < platforms.length; i++) {
      var p = platforms[i];
      if (foot + ent.vy <= p.y + p.h && foot + ent.vy >= p.y - 4 &&
          right > p.x && left < p.x + p.w) {
        return { y: p.y - entH, platform: p };
      }
    }
    return null;
  }

  function rectOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function update(dt) {
    if (gameState !== 'playing') return;

    // Spawn
    spawnTimer += dt;
    var rate = Math.max(0.5, 1.4 - wave * 0.04);
    if (spawnTimer >= rate) {
      spawnTimer = 0;
      if (enemies.length < 4 + wave) spawnEnemy();
    }

    // Player
    if (player.invuln > 0) player.invuln -= dt;
    player.vx = 0;
    if (keys.a || keys.ArrowLeft) player.vx -= RUN_SPEED;
    if (keys.d || keys.ArrowRight) player.vx += RUN_SPEED;
    if ((keys.w || keys.ArrowUp || keys[' ']) && player.onGround) {
      player.vy = JUMP_VEL;
      player.onGround = false;
    }
    player.vy += GRAVITY;
    player.x += player.vx * dt;
    player.y += player.vy * dt;

    var plat = isOnPlatform(player, PLAYER_H);
    if (plat) {
      player.y = plat.y;
      player.vy = 0;
      player.onGround = true;
    } else if (player.y >= GROUND_Y - PLAYER_H) {
      player.y = GROUND_Y - PLAYER_H;
      player.vy = 0;
      player.onGround = true;
    } else {
      player.onGround = false;
    }
    if (player.y < 0) player.y = 0;
    player.x = Math.max(20, Math.min(WORLD_W - 20 - PLAYER_W, player.x));

    // Aim: mouse screen pos + camera = world target
    var targetX = mouse.screenX + cameraX;
    var targetY = mouse.screenY;
    player.aimAngle = Math.atan2(targetY - (player.y + PLAYER_H / 2), targetX - (player.x + PLAYER_W / 2));

    if (player.fireCooldown > 0) player.fireCooldown -= dt;
    if (mouse.down && player.fireCooldown <= 0) {
      player.fireCooldown = 0.1;
      fireBullet(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, player.aimAngle, true);
    }

    // Bullets
    for (var i = bullets.length - 1; i >= 0; i--) {
      var b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < cameraX - 50 || b.x > cameraX + W + 50 || b.y < -50 || b.y > H + 50) {
        bullets.splice(i, 1);
        continue;
      }
      if (b.isPlayer) {
        for (var j = enemies.length - 1; j >= 0; j--) {
          var e = enemies[j];
          if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
            e.hp -= b.damage;
            addParticles(b.x, b.y, '#00d4ff', 3);
            bullets.splice(i, 1);
            if (e.hp <= 0) {
              kills++;
              waveKills++;
              addParticles(e.x + e.w / 2, e.y + e.h / 2, '#ff4466', 8);
              enemies.splice(j, 1);
            }
            break;
          }
        }
      } else {
        if (player.invuln <= 0 && rectOverlap(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2,
            player.x, player.y, PLAYER_W, PLAYER_H)) {
          player.hp -= b.damage;
          addParticles(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, '#ff4466', 5);
          bullets.splice(i, 1);
          if (player.hp <= 0) {
            player.hp = 0;
            gameState = 'dead';
            overlay.classList.remove('victory');
            overlayTitle.textContent = 'KIA';
            overlayTitle.style.color = '#f44';
            overlayMsg.textContent = 'Kills: ' + kills + ' — Wave ' + wave + ' of ' + TOTAL_WAVES;
            overlay.classList.remove('hidden');
          }
        }
      }
    }

    // Enemies
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      var dx = player.x - (e.x + e.w / 2);
      if (Math.abs(dx) < 30) e.vx = 0;
      else e.vx = dx > 0 ? ENEMY_SPEED : -ENEMY_SPEED;
      e.x += e.vx * dt;
      e.x = Math.max(20, Math.min(WORLD_W - 20 - e.w, e.x));
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && Math.abs(e.x - player.x) < 400) {
        e.shootTimer = ENEMY_SHOOT_COOLDOWN;
        var ang = Math.atan2(
          (player.y + PLAYER_H / 2) - (e.y + e.h / 2),
          (player.x + PLAYER_W / 2) - (e.x + e.w / 2)
        );
        fireBullet(e.x + e.w / 2, e.y + e.h / 2, ang, false);
      }
    }

    // Wave complete
    if (waveKills >= waveKillsNeeded) {
      wave++;
      waveKills = 0;
      waveKillsNeeded = 6 + wave * 2;
      if (wave > TOTAL_WAVES) {
        gameState = 'win';
        overlay.classList.add('victory');
        overlayTitle.textContent = 'MISSION COMPLETE';
        overlayTitle.style.color = '#0f8';
        overlayMsg.textContent = 'All ' + TOTAL_WAVES + ' waves cleared. Total kills: ' + kills;
        overlay.classList.remove('hidden');
      }
    }

    // Particles
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    cameraX = player.x - W / 3;
    if (cameraX < 0) cameraX = 0;
    if (cameraX > WORLD_W - W) cameraX = WORLD_W - W;

    hpEl.textContent = Math.max(0, Math.ceil(player.hp));
    waveEl.textContent = wave + ' / ' + TOTAL_WAVES;
    killsEl.textContent = kills;
  }

  function draw() {
    ctx.save();
    ctx.translate(-cameraX, 0);

    // Sky / background
    ctx.fillStyle = '#0d121a';
    ctx.fillRect(cameraX, 0, W + 200, H);
    ctx.fillStyle = '#141c28';
    ctx.fillRect(cameraX, GROUND_Y, W + 200, H - GROUND_Y);

    // Grid
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.04)';
    ctx.lineWidth = 1;
    for (var gx = Math.floor(cameraX / TILE) * TILE; gx < cameraX + W + TILE; gx += TILE) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, H);
      ctx.stroke();
    }

    // Ground line
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cameraX, GROUND_Y);
    ctx.lineTo(cameraX + W + 100, GROUND_Y);
    ctx.stroke();

    // Platforms
    ctx.fillStyle = '#1e2a3a';
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.25)';
    for (var i = 0; i < platforms.length; i++) {
      var p = platforms[i];
      if (p.x + p.w < cameraX || p.x > cameraX + W) continue;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    }

    // Particles
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      if (p.x < cameraX - 20 || p.x > cameraX + W + 20) continue;
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Enemies
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.x + e.w < cameraX || e.x > cameraX + W) continue;
      ctx.fillStyle = '#c44';
      ctx.fillRect(e.x, e.y, e.w, e.h);
      ctx.strokeStyle = '#a22';
      ctx.strokeRect(e.x, e.y, e.w, e.h);
      ctx.fillStyle = '#333';
      ctx.fillRect(e.x, e.y - 8, e.w, 4);
      ctx.fillStyle = '#4a4';
      ctx.fillRect(e.x, e.y - 8, e.w * (e.hp / e.maxHp), 4);
    }

    // Bullets
    for (var i = 0; i < bullets.length; i++) {
      var b = bullets[i];
      if (b.x < cameraX - 10 || b.x > cameraX + W + 10) continue;
      ctx.fillStyle = b.isPlayer ? '#00d4ff' : '#f66';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player
    if (!player) { ctx.restore(); return; }
    if (player.invuln > 0 && Math.floor(player.invuln * 12) % 2 === 0) ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#00d4ff';
    ctx.strokeStyle = '#0088cc';
    ctx.fillRect(player.x, player.y, PLAYER_W, PLAYER_H);
    ctx.strokeRect(player.x, player.y, PLAYER_W, PLAYER_H);
    ctx.fillStyle = '#0d1018';
    var ax = player.x + PLAYER_W / 2 + Math.cos(player.aimAngle) * 20;
    var ay = player.y + PLAYER_H / 2 + Math.sin(player.aimAngle) * 20;
    ctx.beginPath();
    ctx.moveTo(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2);
    ctx.lineTo(ax, ay);
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;

    // Player HP bar
    var barW = 60;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(player.x + PLAYER_W / 2 - barW / 2, player.y - 14, barW, 6);
    ctx.fillStyle = player.hp > player.maxHp * 0.4 ? '#0f8' : '#f44';
    ctx.fillRect(player.x + PLAYER_W / 2 - barW / 2, player.y - 14, barW * (player.hp / player.maxHp), 6);

    ctx.restore();
  }

  function loop(t) {
    loop.last = loop.last || t;
    var dt = Math.min(0.04, (t - loop.last) / 1000);
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
    wave = 1;
    kills = 0;
    waveKills = 0;
    waveKillsNeeded = 8;
    bullets = [];
    enemies = [];
    particles = [];
    gameState = 'playing';
    buildLevel();
    initPlayer();
    spawnTimer = 0;
    cameraX = 0;
    if (animId) cancelAnimationFrame(animId);
    loop.last = null;
    requestAnimationFrame(loop);
  }

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
    var k = e.key;
    if (k === 'a' || k === 'd' || k === 'w' || k === 's' || k === ' ' ||
        e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      keys[k] = true;
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
    mouse.screenX = (e.clientX - rect.left) * scaleX;
    mouse.screenY = (e.clientY - rect.top) * scaleY;
  });
  canvas.addEventListener('mousedown', function () { mouse.down = true; });
  canvas.addEventListener('mouseup', function () { mouse.down = false; });
  canvas.addEventListener('mouseleave', function () { mouse.down = false; });
})();
