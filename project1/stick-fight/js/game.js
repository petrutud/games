(function () {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const GRAVITY = 0.6;
  const JUMP = -13;
  const RUN = 5;
  const HEAD_R = 12;
  const BODY_H = 28;
  const PUNCH_RANGE = 45;
  const PUNCH_DAMAGE = 12;
  const PUNCH_KNOCKBACK = 8;
  const PUNCH_COOLDOWN = 35;
  const GROUND_Y = H - 50;
  const PLATFORM_Y = H - 120;
  const PLATFORM_W = 200;

  const p1HpEl = document.getElementById('p1-hp');
  const p2HpEl = document.getElementById('p2-hp');
  const overlay = document.getElementById('overlay');
  const overlayMsg = document.getElementById('overlay-msg');

  let p1 = {
    x: 150, y: GROUND_Y - BODY_H - HEAD_R * 2,
    vx: 0, vy: 0, facing: 1, hp: 100,
    cooldown: 0, punchFrame: 0
  };
  let p2 = {
    x: W - 150, y: GROUND_Y - BODY_H - HEAD_R * 2,
    vx: 0, vy: 0, facing: -1, hp: 100,
    cooldown: 0, punchFrame: 0
  };
  let keys = {};
  let gameOver = false;

  function onGround(p) {
    if (p.y + BODY_H + HEAD_R * 2 >= GROUND_Y - 2) return true;
    if (p.x >= W/2 - PLATFORM_W/2 && p.x <= W/2 + PLATFORM_W/2 &&
        p.y + BODY_H + HEAD_R * 2 >= PLATFORM_Y - 2 && p.y + BODY_H + HEAD_R * 2 <= PLATFORM_Y + 10)
      return true;
    return false;
  }

  function move(p, left, right, jump, punch) {
    if (gameOver) return;
    if (left) { p.vx = -RUN; p.facing = -1; }
    else if (right) { p.vx = RUN; p.facing = 1; }
    else p.vx *= 0.8;
    if (jump && onGround(p)) p.vy = JUMP;
    p.vy += GRAVITY;
    p.x += p.vx;
    p.y += p.vy;
    if (onGround(p)) {
      p.y = p.y + BODY_H + HEAD_R * 2 >= GROUND_Y ? GROUND_Y - BODY_H - HEAD_R * 2 : PLATFORM_Y - BODY_H - HEAD_R * 2;
      p.vy = 0;
    }
    if (p.x < HEAD_R) p.x = HEAD_R;
    if (p.x > W - HEAD_R) p.x = W - HEAD_R;
    if (p.y < 0) p.y = 0;

    if (p.cooldown > 0) p.cooldown--;
    if (punch && p.cooldown <= 0) {
      p.cooldown = PUNCH_COOLDOWN;
      p.punchFrame = 8;
    }
    if (p.punchFrame > 0) p.punchFrame--;
  }

  function hitCheck(attacker, defender) {
    if (attacker.punchFrame <= 0) return;
    var ax = attacker.x + (attacker.facing > 0 ? HEAD_R + PUNCH_RANGE : -PUNCH_RANGE);
    var ay = attacker.y + HEAD_R * 2 + BODY_H / 2;
    var hitW = PUNCH_RANGE * 1.2;
    var hitH = 40;
    var dx = attacker.facing > 0 ? attacker.x + HEAD_R : attacker.x - hitW;
    if (defender.x + HEAD_R * 2 > dx && defender.x - HEAD_R * 2 < dx + hitW &&
        defender.y + BODY_H + HEAD_R * 2 > ay - hitH/2 && defender.y < ay + hitH/2) {
      defender.hp -= PUNCH_DAMAGE;
      defender.vx = attacker.facing * PUNCH_KNOCKBACK;
      defender.vy = -4;
    }
  }

  function update() {
    if (gameOver) return;
    move(p1, keys.a, keys.d, keys.w, keys.g);
    move(p2, keys.ArrowLeft, keys.ArrowRight, keys.ArrowUp, keys.l);
    hitCheck(p1, p2);
    hitCheck(p2, p1);

    if (p1.y > H + 50 || p1.hp <= 0 || p2.y > H + 50 || p2.hp <= 0) {
      gameOver = true;
      overlay.classList.remove('hidden');
      if (p1.hp <= 0 || p1.y > H) overlayMsg.textContent = 'P2 wins!';
      else overlayMsg.textContent = 'P1 wins!';
    }
    p1HpEl.textContent = Math.max(0, p1.hp);
    p2HpEl.textContent = Math.max(0, p2.hp);
  }

  function drawStick(x, y, facing, color, punchFrame) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    var headY = y + HEAD_R;
    ctx.beginPath();
    ctx.arc(x, headY, HEAD_R, 0, Math.PI * 2);
    ctx.stroke();
    var bodyTop = headY + HEAD_R;
    var bodyBottom = bodyTop + BODY_H;
    ctx.beginPath();
    ctx.moveTo(x, bodyTop);
    ctx.lineTo(x, bodyBottom);
    ctx.stroke();
    var armY = bodyTop + 10;
    var punchExt = punchFrame > 0 ? (8 - punchFrame) * 6 : 0;
    ctx.beginPath();
    ctx.moveTo(x, armY);
    ctx.lineTo(x + (facing > 0 ? 20 + punchExt : -20 - punchExt), armY - 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, armY);
    ctx.lineTo(x + (facing > 0 ? -15 : 15), armY - 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, bodyBottom);
    ctx.lineTo(x - 10, bodyBottom + 18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, bodyBottom);
    ctx.lineTo(x + 10, bodyBottom + 18);
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#2a2a38';
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.strokeStyle = '#3a3a48';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, GROUND_Y, W, H - GROUND_Y);
    var platX = W/2 - PLATFORM_W/2;
    ctx.fillStyle = '#3d3d4a';
    ctx.fillRect(platX, PLATFORM_Y, PLATFORM_W, 16);
    ctx.strokeStyle = '#4a4a58';
    ctx.strokeRect(platX, PLATFORM_Y, PLATFORM_W, 16);

    if (p1.hp > 0 && p1.y < H + 30) drawStick(p1.x, p1.y, p1.facing, '#4fc3f7', p1.punchFrame);
    if (p2.hp > 0 && p2.y < H + 30) drawStick(p2.x, p2.y, p2.facing, '#ff6b6b', p2.punchFrame);

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(p1.x - 25, p1.y - 8, 50, 6);
    ctx.fillStyle = '#4fc3f7';
    ctx.fillRect(p1.x - 25, p1.y - 8, 50 * (p1.hp / 100), 6);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(p2.x - 25, p2.y - 8, 50, 6);
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(p2.x - 25, p2.y - 8, 50 * (p2.hp / 100), 6);
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  document.addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    if (['a','d','w','g','arrowleft','arrowright','arrowup','l'].indexOf(k) !== -1) e.preventDefault();
    keys[e.key] = true;
    keys[k] = true;
  });
  document.addEventListener('keyup', function (e) {
    keys[e.key] = false;
    keys[e.key.toLowerCase()] = false;
  });

  document.getElementById('btn-again').addEventListener('click', function () {
    overlay.classList.add('hidden');
    gameOver = false;
    p1 = { x: 150, y: GROUND_Y - BODY_H - HEAD_R * 2, vx: 0, vy: 0, facing: 1, hp: 100, cooldown: 0, punchFrame: 0 };
    p2 = { x: W - 150, y: GROUND_Y - BODY_H - HEAD_R * 2, vx: 0, vy: 0, facing: -1, hp: 100, cooldown: 0, punchFrame: 0 };
  });

  loop();
})();
