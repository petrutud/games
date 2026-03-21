(function () {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const GRAVITY = 0.5;
  const RUN = 4;
  const JUMP = -11;
  const BODY_R = 22;
  const ARM_LEN = 55;
  const PULL_STRENGTH = 0.4;
  const GRAB_DIST = 18;

  let mouse = { x: 0, y: 0, left: false, right: false };
  let bob = {
    x: 120, y: 200,
    vx: 0, vy: 0,
    leftHand: { x: 0, y: 0, grabX: null, grabY: null },
    rightHand: { x: 0, y: 0, grabX: null, grabY: null }
  };
  let keys = {};
  let platforms = [];
  let goal = null;
  let won = false;

  function initLevel() {
    platforms = [
      { x: 0, y: H - 40, w: W, h: 50 },
      { x: 150, y: H - 180, w: 140, h: 25 },
      { x: 400, y: H - 280, w: 120, h: 25 },
      { x: 600, y: H - 200, w: 150, h: 25 },
      { x: 750, y: H - 320, w: 130, h: 25 },
      { x: 250, y: H - 350, w: 100, h: 25 },
      { x: 500, y: H - 380, w: 180, h: 25 }
    ];
    goal = { x: W - 80, y: H - 420, w: 60, h: 50 };
    bob.x = 80;
    bob.y = H - 40 - BODY_R * 2 - 20;
    bob.vx = 0;
    bob.vy = 0;
    bob.leftHand = { x: bob.x - 25, y: bob.y + BODY_R, grabX: null, grabY: null };
    bob.rightHand = { x: bob.x + 25, y: bob.y + BODY_R, grabX: null, grabY: null };
    won = false;
  }

  function getGrabbablePoint(handX, handY) {
    for (var i = 0; i < platforms.length; i++) {
      var p = platforms[i];
      if (handY >= p.y - GRAB_DIST && handY <= p.y + 15 &&
          handX >= p.x - 5 && handX <= p.x + p.w + 5) {
        return { x: handX, y: p.y };
      }
    }
    return null;
  }

  function updateHand(hand, isHeld) {
    if (hand.grabX !== null && !isHeld) {
      hand.grabX = null;
      hand.grabY = null;
      return;
    }
    if (isHeld) {
    if (hand.grabX !== null) {
      hand.x = hand.grabX;
      hand.y = hand.grabY;
      var dx = hand.x - (bob.x + BODY_R);
      var dy = hand.y - (bob.y + BODY_R);
        var d = Math.hypot(dx, dy) || 1;
        if (d > 5) {
          bob.vx += (dx / d) * PULL_STRENGTH;
          bob.vy += (dy / d) * PULL_STRENGTH;
        }
      } else {
        var targetX = mouse.x;
        var targetY = mouse.y;
        var cx = bob.x + BODY_R;
        var cy = bob.y + BODY_R;
        var dx = targetX - cx;
        var dy = targetY - cy;
        var d = Math.hypot(dx, dy) || 1;
        if (d > ARM_LEN) {
          dx = (dx / d) * ARM_LEN;
          dy = (dy / d) * ARM_LEN;
        }
        hand.x = cx + dx;
        hand.y = cy + dy;
        var g = getGrabbablePoint(hand.x, hand.y);
        if (g) {
          hand.grabX = g.x;
          hand.grabY = g.y;
        }
      }
    } else {
      var cx = bob.x + BODY_R;
      var cy = bob.y + BODY_R;
      hand.x = cx + (hand === bob.leftHand ? -22 : 22);
      hand.y = cy;
    }
  }

  function collidePlatforms() {
    bob.x += bob.vx;
    bob.y += bob.vy;
    for (var i = 0; i < platforms.length; i++) {
      var p = platforms[i];
      if (bob.x + BODY_R > p.x && bob.x - BODY_R < p.x + p.w &&
          bob.y + BODY_R * 2 > p.y && bob.y + BODY_R * 2 < p.y + p.h + 10) {
        bob.y = p.y - BODY_R * 2;
        bob.vy = 0;
      }
      if (bob.y - BODY_R < p.y + p.h && bob.y + BODY_R * 2 > p.y &&
          bob.x + BODY_R > p.x && bob.x - BODY_R < p.x + p.w) {
        if (bob.vx > 0 && bob.x - BODY_R < p.x + 15) { bob.x = p.x - BODY_R; bob.vx = 0; }
        if (bob.vx < 0 && bob.x + BODY_R > p.x + p.w - 15) { bob.x = p.x + p.w + BODY_R; bob.vx = 0; }
      }
    }
    bob.vy += GRAVITY;
    if (bob.x < BODY_R) bob.x = BODY_R;
    if (bob.x > W - BODY_R) bob.x = W - BODY_R;
    if (bob.y > H + 100) {
      bob.y = H - 40 - BODY_R * 2 - 20;
      bob.vy = 0;
      bob.x = 80;
    }
  }

  function update() {
    if (won) return;
    if (keys.a || keys.ArrowLeft) bob.vx = -RUN;
    else if (keys.d || keys.ArrowRight) bob.vx = RUN;
    else bob.vx *= 0.85;
    if ((keys.w || keys.ArrowUp || keys[' ']) && bob.vy >= -1) {
      var onGround = false;
      for (var i = 0; i < platforms.length; i++) {
        var p = platforms[i];
        if (bob.y + BODY_R * 2 >= p.y - 2 && bob.y + BODY_R * 2 <= p.y + 12 &&
            bob.x + BODY_R > p.x && bob.x - BODY_R < p.x + p.w) onGround = true;
      }
      if (onGround) bob.vy = JUMP;
    }
    updateHand(bob.leftHand, mouse.left);
    updateHand(bob.rightHand, mouse.right);
    collidePlatforms();
    if (bob.x > goal.x && bob.x < goal.x + goal.w && bob.y + BODY_R * 2 < goal.y + goal.h && bob.y > goal.y - 20) {
      won = true;
      document.getElementById('overlay-msg').textContent = 'You made it!';
      document.getElementById('overlay').classList.remove('hidden');
    }
  }

  function draw() {
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < platforms.length; i++) {
      var p = platforms[i];
      ctx.fillStyle = '#6b7280';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    }
    ctx.fillStyle = 'rgba(34, 197, 94, 0.6)';
    ctx.fillRect(goal.x, goal.y, goal.w, goal.h);
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 3;
    ctx.strokeRect(goal.x, goal.y, goal.w, goal.h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GOAL', goal.x + goal.w/2, goal.y + goal.h/2 + 7);

    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bob.x + BODY_R, bob.y + BODY_R);
    ctx.lineTo(bob.leftHand.x, bob.leftHand.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bob.x + BODY_R, bob.y + BODY_R);
    ctx.lineTo(bob.rightHand.x, bob.rightHand.y);
    ctx.stroke();
    ctx.fillStyle = '#fcd34d';
    ctx.beginPath();
    ctx.arc(bob.x + BODY_R, bob.y + BODY_R, BODY_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.arc(bob.x + BODY_R - 6, bob.y + BODY_R - 4, 4, 0, Math.PI * 2);
    ctx.arc(bob.x + BODY_R + 8, bob.y + BODY_R - 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(bob.leftHand.x, bob.leftHand.y, 8, 0, Math.PI * 2);
    ctx.arc(bob.rightHand.x, bob.rightHand.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    requestAnimationFrame(draw);
  }

  canvas.addEventListener('mousemove', function (e) {
    var rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  });
  canvas.addEventListener('mousedown', function (e) {
    e.preventDefault();
    if (e.button === 0) mouse.left = true;
    if (e.button === 2) mouse.right = true;
  });
  canvas.addEventListener('mouseup', function (e) {
    if (e.button === 0) mouse.left = false;
    if (e.button === 2) mouse.right = false;
  });
  canvas.addEventListener('mouseleave', function () {
    mouse.left = false;
    mouse.right = false;
  });
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  document.addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    if (['a','d','w',' ','arrowleft','arrowright','arrowup'].indexOf(k) !== -1) e.preventDefault();
    keys[e.key] = true;
    keys[k] = true;
  });
  document.addEventListener('keyup', function (e) {
    keys[e.key] = false;
    keys[e.key.toLowerCase()] = false;
  });

  document.getElementById('btn-again').addEventListener('click', function () {
    document.getElementById('overlay').classList.add('hidden');
    initLevel();
  });

  setInterval(update, 1000 / 60);
  initLevel();
  draw();
})();
