(function () {
  'use strict';

  var BLOCK = 16;
  var WORLD_W = 80;
  var WORLD_H = 40;
  var AIR = 0;
  var GRASS = 1;
  var DIRT = 2;
  var STONE = 3;
  var WOOD = 4;

  var BLOCK_COLORS = {};
  BLOCK_COLORS[AIR] = null;
  BLOCK_COLORS[GRASS] = '#7caf5e';
  BLOCK_COLORS[DIRT] = '#8B6914';
  BLOCK_COLORS[STONE] = '#6a6a6a';
  BLOCK_COLORS[WOOD] = '#8B4513';

  var canvas = document.getElementById('game-canvas');
  // #region agent log
  try {
    fetch('http://127.0.0.1:7291/ingest/17efb6af-6216-45cd-a5cd-0eed09fcaf4a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'523830'},body:JSON.stringify({sessionId:'523830',location:'game.js:DOM',message:'DOM elements',data:{hasCanvas:!!canvas,canvasId:canvas?canvas.id:null},timestamp:Date.now(),hypothesisId:'H1'})}).catch(function(){});
  } catch (e) {}
  // #endregion
  var ctx = null;
  try { ctx = canvas ? canvas.getContext('2d') : null; } catch (e) { ctx = null; }
  // #region agent log
  fetch('http://127.0.0.1:7291/ingest/17efb6af-6216-45cd-a5cd-0eed09fcaf4a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'523830'},body:JSON.stringify({sessionId:'523830',location:'game.js:ctx',message:'context',data:{hasCtx:!!ctx},timestamp:Date.now(),hypothesisId:'H1'})}).catch(function(){});
  // #endregion
  var healthEl = document.getElementById('health');
  var healthBarEl = document.getElementById('health-bar');
  var timeLabelEl = document.getElementById('time-label');
  var blockTypeEl = document.getElementById('block-type');
  var overlay = document.getElementById('overlay');
  var overlayMsg = document.getElementById('overlay-msg');
  var btnRespawn = document.getElementById('btn-respawn');

  var world = [];
  var SWORD_RANGE = BLOCK * 3;
  var SWORD_DAMAGE = 25;
  var player = { x: 0, y: 0, vx: 0, vy: 0, w: 14, h: 28, health: 100, maxHealth: 100, selectedBlock: GRASS, onGround: false };
  var enemies = [];
  var gameTime = 0;
  var dayLength = 60;
  var nightLength = 30;
  var lastSpawn = 0;
  var maxEnemies = 8;
  var animId = null;
  var keys = { left: false, right: false, jump: false };
  var playerAttackCooldown = 0;

  function isSolid(type) {
    return type === GRASS || type === DIRT || type === STONE || type === WOOD;
  }

  function getBlock(gx, gy) {
    if (gx < 0 || gx >= WORLD_W || gy < 0 || gy >= WORLD_H) return STONE;
    return world[gy][gx];
  }

  function setBlock(gx, gy, type) {
    if (gx < 0 || gx >= WORLD_W || gy < 0 || gy >= WORLD_H) return;
    world[gy][gx] = type;
  }

  function generateWorld() {
    var gx, gy;
    for (gy = 0; gy < WORLD_H; gy++) {
      world[gy] = [];
      for (gx = 0; gx < WORLD_W; gx++) {
        world[gy][gx] = AIR;
      }
    }
    var ground = WORLD_H - 3;
    for (gx = 0; gx < WORLD_W; gx++) {
      var h = ground + (Math.random() * 2 - 1);
      if (h > WORLD_H - 1) h = WORLD_H - 1;
      for (gy = WORLD_H - 1; gy >= 0; gy--) {
        if (gy > h) world[gy][gx] = AIR;
        else if (gy === h) world[gy][gx] = GRASS;
        else if (gy > h - 4) world[gy][gx] = DIRT;
        else world[gy][gx] = STONE;
      }
    }
    for (var i = 0; i < 5; i++) {
      var tx = 10 + Math.floor(Math.random() * (WORLD_W - 20));
      var ty = ground - 1 - Math.floor(Math.random() * 3);
      if (ty >= 0 && getBlock(tx, ty) === AIR && getBlock(tx, ty + 1) !== AIR) {
        setBlock(tx, ty, WOOD);
      }
    }
  }

  function blockAtPixel(px, py) {
    var gx = Math.floor(px / BLOCK);
    var gy = Math.floor(py / BLOCK);
    return { gx: gx, gy: gy, type: getBlock(gx, gy) };
  }

  function getSurfaceY(gx) {
    for (var gy = 0; gy < WORLD_H; gy++) {
      if (isSolid(getBlock(gx, gy)) && (gy === 0 || !isSolid(getBlock(gx, gy - 1)))) return gy;
    }
    return WORLD_H;
  }

  function pathToPlayer(ex, ey) {
    var egx = Math.floor(ex / BLOCK);
    var pgx = Math.floor((player.x + player.w / 2) / BLOCK);
    if (egx === pgx) return [];
    var surface = [];
    for (var gx = 0; gx < WORLD_W; gx++) surface[gx] = getSurfaceY(gx);
    var queue = [{ gx: egx }];
    var seen = {};
    seen[egx] = true;
    var parent = {};
    while (queue.length) {
      var cur = queue.shift();
      if (cur.gx === pgx) {
        var path = [];
        while (cur) {
          path.push(cur.gx);
          cur = parent[cur.gx];
        }
        return path.reverse();
      }
      for (var d = -1; d <= 1; d += 2) {
        var ngx = cur.gx + d;
        if (ngx < 0 || ngx >= WORLD_W || seen[ngx]) continue;
        var sy = surface[cur.gx];
        var nsy = surface[ngx];
        if (nsy >= WORLD_H) continue;
        if (Math.abs(nsy - sy) > 2) continue;
        seen[ngx] = true;
        parent[ngx] = cur;
        queue.push({ gx: ngx });
      }
    }
    return [];
  }

  function update(dt) {
    if (player.health <= 0) return;
    gameTime += dt;

    var moveSpeed = 180;
    if (keys.left) player.vx = -moveSpeed;
    else if (keys.right) player.vx = moveSpeed;
    else player.vx = 0;
    if (keys.jump && player.onGround) player.vy = -320;

    player.x += player.vx * dt;
    player.y += player.vy * dt;
    player.vy += 600 * dt;
    player.onGround = false;

    var pw = player.w, ph = player.h;
    var gx0 = Math.floor(player.x / BLOCK);
    var gx1 = Math.floor((player.x + pw) / BLOCK);
    var gy0 = Math.floor(player.y / BLOCK);
    var gy1 = Math.floor((player.y + ph) / BLOCK);
    for (var gy = gy0; gy <= gy1; gy++) {
      for (var gx = gx0; gx <= gx1; gx++) {
        if (!isSolid(getBlock(gx, gy))) continue;
        var bx = gx * BLOCK, by = gy * BLOCK;
        var nx = player.x + pw / 2, ny = player.y + ph / 2;
        var dx = Math.abs(nx - (bx + BLOCK / 2));
        var dy = Math.abs(ny - (by + BLOCK / 2));
        if (dx >= pw / 2 + BLOCK / 2 || dy >= ph / 2 + BLOCK / 2) continue;
        var overlapX = pw / 2 + BLOCK / 2 - dx;
        var overlapY = ph / 2 + BLOCK / 2 - dy;
        if (overlapX < overlapY) {
          player.x += (nx < bx + BLOCK / 2 ? -1 : 1) * overlapX;
          player.vx = 0;
        } else {
          player.y += (ny < by + BLOCK / 2 ? -1 : 1) * overlapY;
          if (player.vy > 0) player.onGround = true;
          player.vy = 0;
        }
      }
    }

    if (player.y > WORLD_H * BLOCK) {
      player.health -= 50 * dt;
      if (player.health < 0) player.health = 0;
    }

    playerAttackCooldown -= dt;
    for (var i = enemies.length - 1; i >= 0; i--) {
      var e = enemies[i];
      var egx = Math.floor(e.x / BLOCK);
      var pgx = Math.floor((player.x + player.w / 2) / BLOCK);
      var dist = Math.abs(player.x - e.x);
      var touch = dist < player.w + 20;

      if (e.health <= 0) {
        enemies.splice(i, 1);
        continue;
      }

      var flee = e.health < e.maxHealth * 0.2;
      var path = pathToPlayer(e.x, e.y);
      if (path.length > 1 && !flee) {
        var nextGx = path[1];
        var targetX = nextGx * BLOCK + BLOCK / 2 - 10;
        var sy = getSurfaceY(egx);
        e.targetY = sy * BLOCK - 24;
        if (Math.abs(targetX - e.x) > 5) e.vx = (targetX > e.x ? 1 : -1) * 60;
        else e.vx = 0;
      } else if (flee && path.length > 1) {
        var awayGx = path[0] + (path[0] < pgx ? -2 : 2);
        if (awayGx >= 0 && awayGx < WORLD_W) {
          var awayX = awayGx * BLOCK + BLOCK / 2 - 10;
          e.vx = (awayX > e.x ? 1 : -1) * 80;
        }
      } else e.vx = 0;

      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vy += 600 * dt;
      var esy = getSurfaceY(Math.floor(e.x / BLOCK));
      if (esy < WORLD_H) {
        var footY = e.y + 24;
        var blockTop = esy * BLOCK;
        if (footY > blockTop) {
          e.y = blockTop - 24;
          e.vy = 0;
        }
      }

      if (touch && player.health > 0) {
        player.health -= 15 * dt;
        if (playerAttackCooldown <= 0) {
          e.health -= 25;
          playerAttackCooldown = 0.5;
        }
      }
      if (player.health < 0) player.health = 0;
    }

    var cycle = dayLength + nightLength;
    var phase = gameTime % cycle;
    var isNight = phase >= dayLength;
    if (isNight && enemies.length < maxEnemies && gameTime - lastSpawn > 4) {
      lastSpawn = gameTime;
      var left = Math.random() < 0.5;
      var spawnGx = left ? 2 : WORLD_W - 4;
      var sy = getSurfaceY(spawnGx);
      if (sy < WORLD_H) {
        enemies.push({
          x: spawnGx * BLOCK, y: (sy * BLOCK) - 24, vx: 0, vy: 0,
          health: 50, maxHealth: 50, type: 'zombie'
        });
      }
    }
  }

  function draw() {
    var camX = player.x - canvas.width / 2 + player.w / 2;
    var camY = player.y - canvas.height / 2 + player.h / 2;
    if (camX < 0) camX = 0;
    if (camX > WORLD_W * BLOCK - canvas.width) camX = WORLD_W * BLOCK - canvas.width;
    if (camY < 0) camY = 0;
    if (camY > WORLD_H * BLOCK - canvas.height) camY = WORLD_H * BLOCK - canvas.height;
    var startGx = Math.floor(camX / BLOCK);
    var endGx = Math.ceil((camX + canvas.width) / BLOCK);
    var startGy = Math.floor(camY / BLOCK);
    var endGy = Math.ceil((camY + canvas.height) / BLOCK);

    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (var gy = startGy; gy <= endGy; gy++) {
      for (var gx = startGx; gx <= endGx; gx++) {
        var type = getBlock(gx, gy);
        if (type === AIR) continue;
        var color = BLOCK_COLORS[type];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(gx * BLOCK - camX, gy * BLOCK - camY, BLOCK, BLOCK);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.strokeRect(gx * BLOCK - camX, gy * BLOCK - camY, BLOCK, BLOCK);
      }
    }

    ctx.fillStyle = '#2d2d2d';
    ctx.fillRect(player.x - camX, player.y - camY, player.w, player.h);
    ctx.strokeStyle = '#1a1a1a';
    ctx.strokeRect(player.x - camX, player.y - camY, player.w, player.h);

    for (var j = 0; j < enemies.length; j++) {
      var e = enemies[j];
      ctx.fillStyle = '#4a6a4a';
      ctx.fillRect(e.x - camX, e.y - camY, 20, 24);
      ctx.strokeStyle = '#2d4a2d';
      ctx.strokeRect(e.x - camX, e.y - camY, 20, 24);
    }

    var cycle = dayLength + nightLength;
    var phase = gameTime % cycle;
    var isNight = phase >= dayLength;
    if (isNight) {
      ctx.fillStyle = 'rgba(0,0,30,0.6)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    healthEl.textContent = Math.max(0, Math.ceil(player.health));
    var pct = (player.health / player.maxHealth) * 100;
    healthBarEl.style.width = pct + '%';
    healthBarEl.classList.toggle('low', pct < 30);
    timeLabelEl.textContent = isNight ? 'Night' : 'Day';
    var names = { 1: 'Grass', 2: 'Dirt', 3: 'Stone', 4: 'Wood' };
    blockTypeEl.textContent = names[player.selectedBlock] || 'Grass';

    if (player.health <= 0) {
      overlayMsg.textContent = 'Game Over';
      overlay.classList.remove('hidden');
    }
  }

  var loopFrameCount = 0;
  function loop(now) {
    // #region agent log
    if (loopFrameCount < 2) {
      fetch('http://127.0.0.1:7291/ingest/17efb6af-6216-45cd-a5cd-0eed09fcaf4a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'523830'},body:JSON.stringify({sessionId:'523830',location:'game.js:loop',message:'loop frame',data:{frame:loopFrameCount,hasCtx:!!ctx},timestamp:Date.now(),hypothesisId:'H2'})}).catch(function(){});
      loopFrameCount++;
    }
    // #endregion
    var last = loop.lastTime || now;
    var dt = Math.min((now - last) / 1000, 0.1);
    loop.lastTime = now;
    if (player.health > 0) update(dt);
    if (!ctx) return;
    draw();
    animId = requestAnimationFrame(loop);
  }

  function respawn() {
    player.health = player.maxHealth;
    player.x = BLOCK * 2;
    player.y = (getSurfaceY(2) * BLOCK) - player.h;
    player.vx = 0;
    player.vy = 0;
    overlay.classList.add('hidden');
    enemies = [];
    lastSpawn = gameTime;
  }

  function startGame() {
    // #region agent log
    fetch('http://127.0.0.1:7291/ingest/17efb6af-6216-45cd-a5cd-0eed09fcaf4a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'523830'},body:JSON.stringify({sessionId:'523830',location:'game.js:startGame',message:'startGame called',data:{},timestamp:Date.now(),hypothesisId:'H2'})}).catch(function(){});
    // #endregion
    generateWorld();
    var surfaceY = getSurfaceY(2);
    player.x = BLOCK * 2;
    player.y = (surfaceY * BLOCK) - player.h;
    player.vx = 0;
    player.vy = 0;
    player.health = player.maxHealth;
    gameTime = 0;
    enemies = [];
    lastSpawn = 0;
    loop.lastTime = null;
    if (animId) cancelAnimationFrame(animId);
    // #region agent log
    fetch('http://127.0.0.1:7291/ingest/17efb6af-6216-45cd-a5cd-0eed09fcaf4a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'523830'},body:JSON.stringify({sessionId:'523830',location:'game.js:startGameEnd',message:'after spawn',data:{surfaceY:surfaceY,playerY:player.y,playerX:player.x},timestamp:Date.now(),hypothesisId:'H4'})}).catch(function(){});
    // #endregion
    animId = requestAnimationFrame(loop);
  }

  document.addEventListener('keydown', function (e) {
    // #region agent log
    if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'Space') fetch('http://127.0.0.1:7291/ingest/17efb6af-6216-45cd-a5cd-0eed09fcaf4a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'523830'},body:JSON.stringify({sessionId:'523830',location:'game.js:keydown',message:'keydown',data:{code:e.code},timestamp:Date.now(),hypothesisId:'H5'})}).catch(function(){});
    // #endregion
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = true;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = true;
    if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') { keys.jump = true; e.preventDefault(); }
    if (e.code === 'KeyR') { e.preventDefault(); if (player.health <= 0) respawn(); }
    if (e.code === 'Digit1') player.selectedBlock = GRASS;
    if (e.code === 'Digit2') player.selectedBlock = DIRT;
    if (e.code === 'Digit4') player.selectedBlock = WOOD;
  });
  document.addEventListener('keyup', function (e) {
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = false;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = false;
    if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') keys.jump = false;
  });

  if (canvas) canvas.addEventListener('click', function (e) {
    if (player.health <= 0) return;
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var camX = player.x - canvas.width / 2 + player.w / 2;
    var camY = player.y - canvas.height / 2 + player.h / 2;
    if (camX < 0) camX = 0;
    if (camX > WORLD_W * BLOCK - canvas.width) camX = WORLD_W * BLOCK - canvas.width;
    if (camY < 0) camY = 0;
    if (camY > WORLD_H * BLOCK - canvas.height) camY = WORLD_H * BLOCK - canvas.height;
    var px = (e.clientX - rect.left) * scaleX + camX;
    var py = (e.clientY - rect.top) * scaleY + camY;
    var playerCx = player.x + player.w / 2;
    var playerCy = player.y + player.h / 2;
    if (e.button === 0) {
      var hitEnemy = null;
      for (var i = 0; i < enemies.length; i++) {
        var en = enemies[i];
        if (en.health <= 0) continue;
        var distToEnemy = Math.hypot(playerCx - (en.x + 10), playerCy - (en.y + 12));
        if (distToEnemy > SWORD_RANGE) continue;
        var inRect = px >= en.x - 8 && px <= en.x + 28 && py >= en.y - 8 && py <= en.y + 32;
        if (inRect) { hitEnemy = en; break; }
      }
      if (hitEnemy) {
        hitEnemy.health -= SWORD_DAMAGE;
        if (hitEnemy.health <= 0) hitEnemy.health = 0;
      } else {
        var gx = Math.floor(px / BLOCK);
        var gy = Math.floor(py / BLOCK);
        if (gx >= 0 && gx < WORLD_W && gy >= 0 && gy < WORLD_H) {
          var dist = Math.hypot(playerCx - (gx * BLOCK + BLOCK / 2), playerCy - (gy * BLOCK + BLOCK / 2));
          if (dist <= BLOCK * 5 && isSolid(getBlock(gx, gy))) setBlock(gx, gy, AIR);
        }
      }
    } else if (e.button === 2) {
      var gx = Math.floor(px / BLOCK);
      var gy = Math.floor(py / BLOCK);
      if (gx >= 0 && gx < WORLD_W && gy >= 0 && gy < WORLD_H) {
        var dist = Math.hypot(playerCx - (gx * BLOCK + BLOCK / 2), playerCy - (gy * BLOCK + BLOCK / 2));
        if (dist <= BLOCK * 5 && getBlock(gx, gy) === AIR) {
          var hasNeighbor = isSolid(getBlock(gx + 1, gy)) || isSolid(getBlock(gx - 1, gy)) || isSolid(getBlock(gx, gy + 1)) || isSolid(getBlock(gx, gy - 1));
          if (hasNeighbor) setBlock(gx, gy, player.selectedBlock);
        }
      }
    }
  });
  if (canvas) canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  if (btnRespawn) btnRespawn.addEventListener('click', respawn);

  // #region agent log
  fetch('http://127.0.0.1:7291/ingest/17efb6af-6216-45cd-a5cd-0eed09fcaf4a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'523830'},body:JSON.stringify({sessionId:'523830',location:'game.js:init',message:'calling startGame',data:{hasCanvas:!!canvas,hasCtx:!!ctx},timestamp:Date.now(),hypothesisId:'H2'})}).catch(function(){});
  // #endregion
  if (canvas && ctx) startGame();
})();
