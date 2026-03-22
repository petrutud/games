(function () {
  'use strict';

  const GRID = 20;
  const CELL = 20;
  const TICK_MS = 110;

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const elScore = document.getElementById('score');
  const elHigh = document.getElementById('high-score');
  const overlay = document.getElementById('overlay');
  const overlayMsg = document.getElementById('overlay-msg');
  const elOverlayScore = document.getElementById('overlay-score');
  const overlayScoreRow = elOverlayScore ? elOverlayScore.closest('.overlay-score') : null;
  const btnRestart = document.getElementById('btn-restart');
  const btnPause = document.getElementById('btn-pause');
  const hint = document.getElementById('hint');

  const HIGH_KEY = 'snake-high-score';

  let snake;
  let dir;
  let nextDir;
  let food;
  let score;
  let highScore;
  let running;
  let paused;
  let tickTimer;
  let started;

  function loadHigh() {
    const n = parseInt(localStorage.getItem(HIGH_KEY) || '0', 10);
    return Number.isFinite(n) ? n : 0;
  }

  function saveHigh(n) {
    localStorage.setItem(HIGH_KEY, String(n));
  }

  function cellKey(r, c) {
    return r * GRID + c;
  }

  function parseKey(k) {
    return { r: (k / GRID) | 0, c: k % GRID };
  }

  function randomFood(occupied) {
    const free = [];
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const k = cellKey(r, c);
        if (!occupied.has(k)) free.push(k);
      }
    }
    if (free.length === 0) return null;
    return free[(Math.random() * free.length) | 0];
  }

  function setOverlayScoreVisible(on) {
    if (overlayScoreRow) overlayScoreRow.style.display = on ? '' : 'none';
  }

  function showTitleScreen() {
    stopTick();
    const mid = (GRID / 2) | 0;
    snake = [cellKey(mid, mid), cellKey(mid, mid - 1), cellKey(mid, mid - 2)];
    dir = { dr: 0, dc: 1 };
    nextDir = { dr: 0, dc: 1 };
    score = 0;
    food = randomFood(new Set(snake));
    running = false;
    paused = false;
    started = false;
    elScore.textContent = '0';
    btnPause.disabled = true;
    btnPause.textContent = 'Pause';
    overlay.classList.remove('hidden');
    overlayMsg.textContent = 'Snake';
    if (elOverlayScore) elOverlayScore.textContent = '0';
    setOverlayScoreVisible(false);
    hint.textContent = 'Press Space or Enter to start · Arrow keys or WASD';
  }

  function newGame() {
    stopTick();
    const mid = (GRID / 2) | 0;
    snake = [cellKey(mid, mid), cellKey(mid, mid - 1), cellKey(mid, mid - 2)];
    dir = { dr: 0, dc: 1 };
    nextDir = { dr: 0, dc: 1 };
    score = 0;
    food = randomFood(new Set(snake));
    elScore.textContent = '0';
    started = true;
    running = true;
    paused = false;
    overlay.classList.add('hidden');
    setOverlayScoreVisible(true);
    btnPause.disabled = false;
    btnPause.textContent = 'Pause';
    hint.textContent = 'Arrow keys or WASD · P to pause';
    draw();
    scheduleTick();
  }

  function scheduleTick() {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(tick, TICK_MS);
  }

  function stopTick() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  }

  function tick() {
    if (!running || paused) return;

    const nd = nextDir;
    if (!(nd.dr === -dir.dr && nd.dc === -dir.dc)) {
      dir = nd;
    }

    const head = snake[0];
    const { r, c } = parseKey(head);
    const nr = r + dir.dr;
    const nc = c + dir.dc;

    if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) {
      gameOver();
      return;
    }

    const nk = cellKey(nr, nc);
    const body = snake.slice(0, -1);
    if (body.indexOf(nk) !== -1) {
      gameOver();
      return;
    }

    snake.unshift(nk);

    if (nk === food) {
      score += 10;
      if (score > highScore) {
        highScore = score;
        saveHigh(highScore);
        elHigh.textContent = String(highScore);
      }
      elScore.textContent = String(score);
      const occ = new Set(snake);
      food = randomFood(occ);
      if (food === null) {
        win();
      }
    } else {
      snake.pop();
    }

    draw();
  }

  function gameOver() {
    running = false;
    started = false;
    stopTick();
    btnPause.disabled = true;
    overlay.classList.remove('hidden');
    overlayMsg.textContent = 'Game over';
    if (elOverlayScore) elOverlayScore.textContent = String(score);
    setOverlayScoreVisible(true);
    hint.textContent = 'Space or Enter to play again';
  }

  function win() {
    running = false;
    started = false;
    stopTick();
    btnPause.disabled = true;
    overlay.classList.remove('hidden');
    overlayMsg.textContent = 'You win!';
    if (elOverlayScore) elOverlayScore.textContent = String(score);
    setOverlayScoreVisible(true);
    hint.textContent = 'Space or Enter to play again';
  }

  function draw() {
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(48, 54, 61, 0.4)';
    for (let i = 0; i <= GRID; i++) {
      const p = i * CELL;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(canvas.width, p);
      ctx.stroke();
    }

    if (food != null) {
      const { r, c } = parseKey(food);
      const pad = 2;
      const g = CELL - pad * 2;
      const gx = c * CELL + pad;
      const gy = r * CELL + pad;
      const rad = g / 2;
      ctx.fillStyle = '#f85149';
      ctx.beginPath();
      ctx.arc(gx + rad, gy + rad, rad - 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(gx + rad * 0.65, gy + rad * 0.55, rad * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < snake.length; i++) {
      const { r, c } = parseKey(snake[i]);
      const pad = i === 0 ? 1 : 2;
      const g = CELL - pad * 2;
      const x = c * CELL + pad;
      const y = r * CELL + pad;
      const hue = 120 + (i / Math.max(snake.length, 1)) * 40;
      ctx.fillStyle = i === 0 ? '#3fb950' : 'hsl(' + hue + ', 65%, ' + (42 - i * 0.4) + '%)';
      roundRect(ctx, x, y, g, g, 4);
      ctx.fill();
      if (i === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        const ex = x + g * 0.5 + dir.dc * g * 0.22;
        const ey = y + g * 0.5 + dir.dr * g * 0.22;
        const px = -dir.dr * g * 0.11;
        const py = dir.dc * g * 0.11;
        ctx.beginPath();
        ctx.arc(ex - px, ey - py, 2.2, 0, Math.PI * 2);
        ctx.arc(ex + px, ey + py, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function roundRect(context, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    context.beginPath();
    context.moveTo(x + rr, y);
    context.arcTo(x + w, y, x + w, y + h, rr);
    context.arcTo(x + w, y + h, x, y + h, rr);
    context.arcTo(x, y + h, x, y, rr);
    context.arcTo(x, y, x + w, y, rr);
    context.closePath();
  }

  function setDirection(dr, dc) {
    if (!started) return;
    nextDir = { dr, dc };
  }

  document.addEventListener('keydown', function (e) {
    if (e.code === 'KeyP') {
      if (!started || !running) return;
      paused = !paused;
      btnPause.textContent = paused ? 'Resume' : 'Pause';
      hint.textContent = paused ? 'Paused — P or Resume to continue' : 'Arrow keys or WASD · P to pause';
      if (paused) {
        stopTick();
      } else {
        scheduleTick();
      }
      e.preventDefault();
      return;
    }

    if (e.code === 'Space' || e.code === 'Enter') {
      if (!running) {
        newGame();
      } else if (paused) {
        paused = false;
        btnPause.textContent = 'Pause';
        scheduleTick();
      }
      e.preventDefault();
      return;
    }

    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        setDirection(-1, 0);
        e.preventDefault();
        break;
      case 'ArrowDown':
      case 'KeyS':
        setDirection(1, 0);
        e.preventDefault();
        break;
      case 'ArrowLeft':
      case 'KeyA':
        setDirection(0, -1);
        e.preventDefault();
        break;
      case 'ArrowRight':
      case 'KeyD':
        setDirection(0, 1);
        e.preventDefault();
        break;
      default:
        break;
    }
  });

  btnRestart.addEventListener('click', newGame);

  btnPause.addEventListener('click', function () {
    if (!started || !running) return;
    paused = !paused;
    btnPause.textContent = paused ? 'Resume' : 'Pause';
    hint.textContent = paused ? 'Paused — click Resume to continue' : 'Arrow keys or WASD · P to pause';
    if (paused) stopTick();
    else scheduleTick();
  });

  highScore = loadHigh();
  elHigh.textContent = String(highScore);
  showTitleScreen();
  draw();
})();
