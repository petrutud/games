(function () {
  'use strict';

  const COLS = 20;
  const ROWS = 15;
  const CELL = 20;
  const TICK_MS = 160;

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const overlay = document.getElementById('overlay');
  const overlayMsg = document.getElementById('overlay-msg');
  const btnAgain = document.getElementById('btn-again');

  let snake = [];
  let dx = 1;
  let dy = 0;
  let nextDx = 1;
  let nextDy = 0;
  let food = { x: 0, y: 0 };
  let score = 0;
  let gameOver = false;
  let started = false;
  let intervalId = null;

  function randomCell() {
    return { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  }

  function cellInSnake(x, y) {
    for (var i = 0; i < snake.length; i++) {
      if (snake[i].x === x && snake[i].y === y) return true;
    }
    return false;
  }

  function spawnFood() {
    var empty = [];
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        if (!cellInSnake(x, y)) empty.push({ x: x, y: y });
      }
    }
    if (empty.length === 0) return;
    food = empty[Math.floor(Math.random() * empty.length)];
  }

  function initGame() {
    var cx = Math.floor(COLS / 2);
    var cy = Math.floor(ROWS / 2);
    snake = [
      { x: cx, y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy }
    ];
    dx = 1;
    dy = 0;
    nextDx = 1;
    nextDy = 0;
    score = 0;
    gameOver = false;
    spawnFood();
    scoreEl.textContent = '0';
    overlay.classList.add('hidden');
  }

  function tick() {
    if (gameOver || !started) return;

    dx = nextDx;
    dy = nextDy;
    var head = snake[0];
    var nx = head.x + dx;
    var ny = head.y + dy;

    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
      gameOver = true;
      showOverlay('Game over! Score: ' + score);
      return;
    }
    if (cellInSnake(nx, ny)) {
      gameOver = true;
      showOverlay('Game over! Score: ' + score);
      return;
    }

    snake.unshift({ x: nx, y: ny });
    if (nx === food.x && ny === food.y) {
      score += 1;
      scoreEl.textContent = score;
      spawnFood();
    } else {
      snake.pop();
    }

    draw();
  }

  function draw() {
    ctx.fillStyle = '#1e2433';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var gridColor = 'rgba(255,255,255,0.06)';
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (var x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, ROWS * CELL);
      ctx.stroke();
    }
    for (var y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(COLS * CELL, y * CELL);
      ctx.stroke();
    }

    for (var i = 0; i < snake.length; i++) {
      var seg = snake[i];
      if (i === 0) {
        ctx.fillStyle = '#7caf5e';
      } else {
        ctx.fillStyle = '#5a8a45';
      }
      ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
    }

    ctx.fillStyle = '#e8c547';
    ctx.beginPath();
    var fx = food.x * CELL + CELL / 2;
    var fy = food.y * CELL + CELL / 2;
    ctx.arc(fx, fy, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function showOverlay(msg) {
    overlayMsg.textContent = msg;
    overlay.classList.remove('hidden');
  }

  function startLoop() {
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(tick, TICK_MS);
  }

  document.addEventListener('keydown', function (e) {
    if (!started) {
      if (e.code === 'Space') {
        e.preventDefault();
        started = true;
        overlay.classList.add('hidden');
        startLoop();
      }
      return;
    }
    if (gameOver) return;

    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      if (dy !== 1) { nextDx = 0; nextDy = -1; }
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      e.preventDefault();
      if (dy !== -1) { nextDx = 0; nextDy = 1; }
    } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      e.preventDefault();
      if (dx !== 1) { nextDx = -1; nextDy = 0; }
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      e.preventDefault();
      if (dx !== -1) { nextDx = 1; nextDy = 0; }
    }
  });

  btnAgain.addEventListener('click', function () {
    initGame();
    started = true;
    overlay.classList.add('hidden');
    draw();
    startLoop();
  });

  initGame();
  draw();
  showOverlay('Press space to start');
})();
