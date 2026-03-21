(function () {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const GRAVITY = 0.5;
  const JUMP = -12;
  const RUN = 5;
  const SIZE = 28;

  const overlay = document.getElementById('overlay');
  const overlayMsg = document.getElementById('overlay-msg');
  const levelNumEl = document.getElementById('level-num');

  function rect(x, y, w, h) {
    return { x: x, y: y, w: w, h: h };
  }
  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  var levels = [
    {
      platforms: [
        rect(0, H - 24, W, 30),
        rect(200, H - 120, 120, 20),
        rect(450, H - 180, 120, 20),
        rect(650, H - 240, 150, 20),
        rect(350, H - 260, 100, 20),
        rect(100, H - 200, 80, 20)
      ],
      water: [rect(320, H - 24, 80, 30)],
      lava: [rect(550, H - 24, 120, 30)],
      fireboyStart: { x: 50, y: H - 24 - SIZE },
      watergirlStart: { x: 90, y: H - 24 - SIZE },
      fireboyDoor: { x: 720, y: H - 260 },
      watergirlDoor: { x: 760, y: H - 260 }
    },
    {
      platforms: [
        rect(0, H - 24, W, 30),
        rect(0, 0, 20, H),
        rect(W - 20, 0, 20, H),
        rect(150, H - 100, 100, 18),
        rect(350, H - 180, 100, 18),
        rect(550, H - 100, 100, 18),
        rect(250, H - 260, 80, 18),
        rect(450, H - 260, 80, 18),
        rect(650, H - 180, 120, 18)
      ],
      water: [rect(260, H - 24, 70, 30), rect(520, H - 24, 70, 30)],
      lava: [rect(150, H - 24, 90, 30), rect(420, H - 24, 90, 30)],
      fireboyStart: { x: 40, y: H - 24 - SIZE },
      watergirlStart: { x: 80, y: H - 24 - SIZE },
      fireboyDoor: { x: 700, y: H - 200 },
      watergirlDoor: { x: 740, y: H - 200 }
    },
    {
      platforms: [
        rect(0, H - 24, W, 30),
        rect(100, H - 140, 140, 18),
        rect(320, H - 220, 160, 18),
        rect(560, H - 140, 140, 18),
        rect(180, H - 300, 80, 18),
        rect(400, H - 300, 80, 18),
        rect(620, H - 300, 80, 18),
        rect(320, H - 380, 160, 18)
      ],
      water: [rect(280, H - 24, 100, 30), rect(580, H - 24, 100, 30)],
      lava: [rect(100, H - 24, 100, 30), rect(400, H - 24, 100, 30)],
      fireboyStart: { x: 50, y: H - 24 - SIZE },
      watergirlStart: { x: 95, y: H - 24 - SIZE },
      fireboyDoor: { x: 340, y: H - 400 },
      watergirlDoor: { x: 380, y: H - 400 }
    }
  ];

  var fireboy = { x: 0, y: 0, vx: 0, vy: 0, w: SIZE, h: SIZE };
  var watergirl = { x: 0, y: 0, vx: 0, vy: 0, w: SIZE, h: SIZE };
  var keys = {};
  var currentLevel = 0;
  var state = 'playing';
  var fireboyWon = false;
  var watergirlWon = false;

  function loadLevel(i) {
    if (i >= levels.length) {
      overlayMsg.textContent = 'You finished all levels!';
      overlay.classList.remove('hidden');
      document.getElementById('btn-next').textContent = 'Play again';
      document.getElementById('btn-next').onclick = function () {
        currentLevel = 0;
        loadLevel(0);
        overlay.classList.add('hidden');
      };
      return;
    }
    var lvl = levels[i];
    fireboy.x = lvl.fireboyStart.x;
    fireboy.y = lvl.fireboyStart.y;
    fireboy.vx = 0;
    fireboy.vy = 0;
    watergirl.x = lvl.watergirlStart.x;
    watergirl.y = lvl.watergirlStart.y;
    watergirl.vx = 0;
    watergirl.vy = 0;
    currentLevel = i;
    state = 'playing';
    fireboyWon = false;
    watergirlWon = false;
    levelNumEl.textContent = i + 1;
    document.getElementById('btn-next').textContent = 'Next level';
    document.getElementById('btn-next').onclick = nextLevel;
  }

  function nextLevel() {
    overlay.classList.add('hidden');
    loadLevel(currentLevel + 1);
  }

  function onPlatform(c, platforms) {
    var foot = c.y + c.h;
    var v = c.vy;
    for (var i = 0; i < platforms.length; i++) {
      var p = platforms[i];
      if (foot + v <= p.y + 8 && foot + v >= p.y - 4 &&
          c.x + c.w > p.x && c.x < p.x + p.w) {
        return { y: p.y - c.h, platform: p };
      }
    }
    return null;
  }

  function moveChar(c, platforms) {
    if (keys.left) c.vx = -RUN;
    else if (keys.right) c.vx = RUN;
    else c.vx *= 0.7;
    if (keys.jump) {
      var plat = onPlatform(c, platforms);
      if (plat) { c.vy = JUMP; c.y = plat.y - 1; }
    }
    c.vy += GRAVITY;
    c.x += c.vx;
    c.y += c.vy;
    var p = onPlatform(c, platforms);
    if (p) {
      c.y = p.y;
      c.vy = 0;
    }
    if (c.y + c.h >= H - 24) {
      c.y = H - 24 - c.h;
      c.vy = 0;
    }
    if (c.x < 20) c.x = 20;
    if (c.x + c.w > W - 20) c.x = W - 20 - c.w;
  }

  function update() {
    if (state !== 'playing') return;
    var lvl = levels[currentLevel];

    keys.left = keys.ArrowLeft;
    keys.right = keys.ArrowRight;
    keys.jump = keys.ArrowUp;
    moveChar(fireboy, lvl.platforms);

    keys.left = keys.a;
    keys.right = keys.d;
    keys.jump = keys.w || keys[' '];
    moveChar(watergirl, lvl.platforms);

    var fb = rect(fireboy.x, fireboy.y, fireboy.w, fireboy.h);
    var wg = rect(watergirl.x, watergirl.y, watergirl.w, watergirl.h);

    for (var i = 0; i < lvl.water.length; i++) {
      if (overlap(fb, lvl.water[i])) {
        state = 'dead';
        overlayMsg.textContent = 'Fireboy touched water!';
        overlay.classList.remove('hidden');
        return;
      }
    }
    for (var i = 0; i < lvl.lava.length; i++) {
      if (overlap(wg, lvl.lava[i])) {
        state = 'dead';
        overlayMsg.textContent = 'Watergirl touched lava!';
        overlay.classList.remove('hidden');
        return;
      }
    }

    var fd = lvl.fireboyDoor;
    if (overlap(fb, rect(fd.x, fd.y, 36, 44))) fireboyWon = true;
    var wd = lvl.watergirlDoor;
    if (overlap(wg, rect(wd.x, wd.y, 36, 44))) watergirlWon = true;

    if (fireboyWon && watergirlWon) {
      state = 'win';
      overlayMsg.textContent = 'Level complete!';
      overlay.classList.remove('hidden');
    }
  }

  function draw() {
    ctx.fillStyle = '#1a1e2e';
    ctx.fillRect(0, 0, W, H);

    var lvl = levels[currentLevel];
    if (!lvl) return;

    for (var i = 0; i < lvl.platforms.length; i++) {
      var p = lvl.platforms[i];
      ctx.fillStyle = '#3d4a5a';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = '#2d3548';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    }
    for (var i = 0; i < lvl.water.length; i++) {
      var w = lvl.water[i];
      ctx.fillStyle = 'rgba(50, 150, 255, 0.7)';
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeStyle = '#2196f3';
      ctx.strokeRect(w.x, w.y, w.w, w.h);
    }
    for (var i = 0; i < lvl.lava.length; i++) {
      var l = lvl.lava[i];
      ctx.fillStyle = 'rgba(255, 100, 50, 0.8)';
      ctx.fillRect(l.x, l.y, l.w, l.h);
      ctx.strokeStyle = '#ff5722';
      ctx.strokeRect(l.x, l.y, l.w, l.h);
    }

    var fd = lvl.fireboyDoor;
    ctx.fillStyle = '#ff5722';
    ctx.fillRect(fd.x, fd.y, 36, 44);
    ctx.strokeStyle = '#e64a19';
    ctx.strokeRect(fd.x, fd.y, 36, 44);
    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    ctx.fillText('F', fd.x + 12, fd.y + 28);

    var wd = lvl.watergirlDoor;
    ctx.fillStyle = '#2196f3';
    ctx.fillRect(wd.x, wd.y, 36, 44);
    ctx.strokeStyle = '#1976d2';
    ctx.strokeRect(wd.x, wd.y, 36, 44);
    ctx.fillStyle = '#fff';
    ctx.fillText('W', wd.x + 12, wd.y + 28);

    ctx.fillStyle = '#ff6b35';
    ctx.fillRect(fireboy.x, fireboy.y, fireboy.w, fireboy.h);
    ctx.strokeStyle = '#e55a25';
    ctx.strokeRect(fireboy.x, fireboy.y, fireboy.w, fireboy.h);

    ctx.fillStyle = '#4fc3f7';
    ctx.fillRect(watergirl.x, watergirl.y, watergirl.w, watergirl.h);
    ctx.strokeStyle = '#29b6f6';
    ctx.strokeRect(watergirl.x, watergirl.y, watergirl.w, watergirl.h);

    requestAnimationFrame(draw);
  }

  document.addEventListener('keydown', function (e) {
    var k = e.key;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'a', 'd', 'w', ' '].indexOf(k) !== -1) e.preventDefault();
    keys[k] = true;
  });
  document.addEventListener('keyup', function (e) {
    keys[e.key] = false;
  });

  document.getElementById('btn-retry').addEventListener('click', function () {
    overlay.classList.add('hidden');
    loadLevel(currentLevel);
  });
  document.getElementById('btn-next').addEventListener('click', nextLevel);

  setInterval(update, 1000 / 60);
  loadLevel(0);
  draw();
})();
