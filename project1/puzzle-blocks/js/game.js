(function () {
  'use strict';

  const COLS = 10;
  const ROWS = 22;
  const VISIBLE_ROWS = 20;
  const CELL = 30;

  const COLORS = {
    I: '#00d4ff',
    O: '#f0d000',
    T: '#b060ff',
    S: '#50e070',
    Z: '#f05050',
    J: '#4080ff',
    L: '#ff9020',
  };

  const SHAPES = {
    I: [
      [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      [
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
      ],
      [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
      ],
      [
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
      ],
    ],
    O: [
      [
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
    ],
    T: [
      [
        [0, 1, 0, 0],
        [1, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      [
        [0, 1, 0, 0],
        [0, 1, 1, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 0],
      ],
      [
        [0, 0, 0, 0],
        [1, 1, 1, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 0],
      ],
      [
        [0, 1, 0, 0],
        [1, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 0],
      ],
    ],
    S: [
      [
        [0, 1, 1, 0],
        [1, 1, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      [
        [0, 1, 0, 0],
        [0, 1, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 0],
      ],
      [
        [0, 0, 0, 0],
        [0, 1, 1, 0],
        [1, 1, 0, 0],
        [0, 0, 0, 0],
      ],
      [
        [1, 0, 0, 0],
        [1, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 0],
      ],
    ],
    Z: [
      [
        [1, 1, 0, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      [
        [0, 0, 1, 0],
        [0, 1, 1, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 0],
      ],
      [
        [0, 0, 0, 0],
        [1, 1, 0, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
      ],
      [
        [0, 1, 0, 0],
        [1, 1, 0, 0],
        [1, 0, 0, 0],
        [0, 0, 0, 0],
      ],
    ],
    J: [
      [
        [1, 0, 0, 0],
        [1, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      [
        [0, 1, 1, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 0],
      ],
      [
        [0, 0, 0, 0],
        [1, 1, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 0],
      ],
      [
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [1, 1, 0, 0],
        [0, 0, 0, 0],
      ],
    ],
    L: [
      [
        [0, 0, 1, 0],
        [1, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      [
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
      ],
      [
        [0, 0, 0, 0],
        [1, 1, 1, 0],
        [1, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      [
        [1, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 0],
      ],
    ],
  };

  const PIECE_IDS = Object.keys(SHAPES);
  const O_ROT = 0;

  function emptyBoard() {
    const g = [];
    for (let r = 0; r < ROWS; r++) {
      g[r] = [];
      for (let c = 0; c < COLS; c++) g[r][c] = null;
    }
    return g;
  }

  function randomPieceId() {
    return PIECE_IDS[(Math.random() * PIECE_IDS.length) | 0];
  }

  function getMatrix(id, rot) {
    const arr = SHAPES[id];
    if (id === 'O') return arr[O_ROT];
    return arr[rot % 4];
  }

  function cellsFromPiece(id, rot, pr, pc) {
    const m = getMatrix(id, rot);
    const out = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (m[r][c]) out.push({ r: pr + r, c: pc + c });
      }
    }
    return out;
  }

  function validCells(board, cells) {
    for (let i = 0; i < cells.length; i++) {
      const { r, c } = cells[i];
      if (c < 0 || c >= COLS || r >= ROWS) return false;
      if (r >= 0 && board[r][c]) return false;
    }
    return true;
  }

  const KICKS = [
    [0, 0],
    [-1, 0],
    [1, 0],
    [0, -1],
    [-2, 0],
    [2, 0],
    [-1, -1],
    [1, -1],
  ];

  function tryRotate(board, piece) {
    const id = piece.id;
    if (id === 'O') return true;
    const nextRot = (piece.rot + 1) % 4;
    for (let k = 0; k < KICKS.length; k++) {
      const dr = KICKS[k][1];
      const dc = KICKS[k][0];
      const cells = cellsFromPiece(id, nextRot, piece.r + dr, piece.c + dc);
      if (validCells(board, cells)) {
        piece.rot = nextRot;
        piece.r += dr;
        piece.c += dc;
        return true;
      }
    }
    return false;
  }

  function tryMove(board, piece, dR, dC) {
    const cells = cellsFromPiece(piece.id, piece.rot, piece.r + dR, piece.c + dC);
    if (!validCells(board, cells)) return false;
    piece.r += dR;
    piece.c += dC;
    return true;
  }

  function lockPiece(board, piece) {
    const color = COLORS[piece.id];
    const cells = cellsFromPiece(piece.id, piece.rot, piece.r, piece.c);
    for (let i = 0; i < cells.length; i++) {
      const { r, c } = cells[i];
      if (r >= 0) board[r][c] = color;
    }
  }

  function clearLines(board) {
    let cleared = 0;
    let r = ROWS - 1;
    while (r >= 0) {
      let full = true;
      for (let c = 0; c < COLS; c++) {
        if (!board[r][c]) {
          full = false;
          break;
        }
      }
      if (full) {
        cleared++;
        for (let rr = r; rr > 0; rr--) {
          for (let c = 0; c < COLS; c++) board[rr][c] = board[rr - 1][c];
        }
        for (let c = 0; c < COLS; c++) board[0][c] = null;
      } else {
        r--;
      }
    }
    return cleared;
  }

  function spawnPiece(id) {
    const pc = id === 'O' ? 4 : 3;
    return { id, rot: 0, r: 0, c: pc };
  }

  function pieceFits(board, piece) {
    return validCells(board, cellsFromPiece(piece.id, piece.rot, piece.r, piece.c));
  }

  function gameOverCheck(board, piece) {
    return !pieceFits(board, piece);
  }

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const nextCanvas = document.getElementById('next-canvas');
  const nextCtx = nextCanvas.getContext('2d');

  const elScore = document.getElementById('score');
  const elLines = document.getElementById('lines');
  const elLevel = document.getElementById('level');
  const overlay = document.getElementById('overlay');
  const overlayMsg = document.getElementById('overlay-msg');
  const btnRestart = document.getElementById('btn-restart');
  const btnPause = document.getElementById('btn-pause');
  const statusLine = document.getElementById('status-line');

  let board = emptyBoard();
  let current = null;
  let nextId = randomPieceId();
  let score = 0;
  let linesTotal = 0;
  let level = 1;
  let dropMs = 800;
  let lastDrop = 0;
  let paused = false;
  let gameOver = false;
  let animId = null;
  let softDrop = false;

  const LINE_SCORE = [0, 100, 300, 500, 800];

  function setLevelFromLines() {
    level = Math.min(15, 1 + (linesTotal / 10) | 0);
    dropMs = Math.max(80, 800 - (level - 1) * 50);
  }

  function addScoreForLines(n) {
    if (n <= 0) return;
    score += LINE_SCORE[n] * level;
    linesTotal += n;
    setLevelFromLines();
  }

  function drawCell(context, x, y, color, alpha) {
    const pad = 1;
    const s = CELL - pad * 2;
    context.globalAlpha = alpha != null ? alpha : 1;
    context.fillStyle = '#161b22';
    context.fillRect(x * CELL + pad, y * CELL + pad, s, s);
    context.fillStyle = color;
    context.fillRect(x * CELL + pad + 2, y * CELL + pad + 2, s - 4, s - 4);
    context.strokeStyle = 'rgba(255,255,255,0.25)';
    context.lineWidth = 1;
    context.strokeRect(x * CELL + pad + 2, y * CELL + pad + 2, s - 4, s - 4);
    context.globalAlpha = 1;
  }

  function drawBoard() {
    const offsetY = ROWS - VISIBLE_ROWS;
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = offsetY; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const color = board[r][c];
        const vy = r - offsetY;
        if (color) drawCell(ctx, c, vy, color);
        else {
          ctx.strokeStyle = 'rgba(48, 54, 61, 0.35)';
          ctx.strokeRect(c * CELL + 0.5, vy * CELL + 0.5, CELL - 1, CELL - 1);
        }
      }
    }

    if (current) {
      const ghost = { ...current };
      while (tryMove(board, ghost, 1, 0)) {}
      const ghostCells = cellsFromPiece(ghost.id, ghost.rot, ghost.r, ghost.c);
      for (let i = 0; i < ghostCells.length; i++) {
        const { r, c } = ghostCells[i];
        if (r >= offsetY) {
          const vy = r - offsetY;
          drawCell(ctx, c, vy, COLORS[ghost.id], 0.22);
        }
      }

      const liveCells = cellsFromPiece(current.id, current.rot, current.r, current.c);
      for (let i = 0; i < liveCells.length; i++) {
        const { r, c } = liveCells[i];
        if (r >= offsetY) {
          const vy = r - offsetY;
          drawCell(ctx, c, vy, COLORS[current.id]);
        }
      }
    }
  }

  function drawNext() {
    const id = nextId;
    const m = getMatrix(id, 0);
    nextCtx.fillStyle = '#161b22';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    const cell = 24;
    let minR = 4,
      maxR = 0,
      minC = 4,
      maxC = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (m[r][c]) {
          minR = Math.min(minR, r);
          maxR = Math.max(maxR, r);
          minC = Math.min(minC, c);
          maxC = Math.max(maxC, c);
        }
      }
    }
    const h = maxR - minR + 1;
    const w = maxC - minC + 1;
    const ox = (nextCanvas.width - w * cell) / 2 - minC * cell;
    const oy = (nextCanvas.height - h * cell) / 2 - minR * cell;
    const color = COLORS[id];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (m[r][c]) {
          const x = ox + c * cell;
          const y = oy + r * cell;
          nextCtx.fillStyle = '#21262d';
          nextCtx.fillRect(x, y, cell - 2, cell - 2);
          nextCtx.fillStyle = color;
          nextCtx.fillRect(x + 2, y + 2, cell - 6, cell - 6);
        }
      }
    }
  }

  function syncHud() {
    elScore.textContent = String(score);
    elLines.textContent = String(linesTotal);
    elLevel.textContent = String(level);
  }

  function tick(now) {
    if (!gameOver && !paused) {
      const interval = softDrop ? Math.min(50, dropMs) : dropMs;
      if (now - lastDrop >= interval) {
        lastDrop = now;
        if (current) {
          if (!tryMove(board, current, 1, 0)) {
            lockPiece(board, current);
            const n = clearLines(board);
            addScoreForLines(n);
            syncHud();
            current = spawnPiece(nextId);
            nextId = randomPieceId();
            drawNext();
            if (gameOverCheck(board, current)) {
              endGame();
            }
          }
        }
      }
    }
    drawBoard();
    animId = requestAnimationFrame(tick);
  }

  function endGame() {
    gameOver = true;
    overlayMsg.textContent = 'Game over';
    overlay.classList.remove('hidden');
    btnPause.textContent = 'Pause';
    paused = false;
  }

  function resetGame() {
    board = emptyBoard();
    score = 0;
    linesTotal = 0;
    level = 1;
    dropMs = 800;
    lastDrop = performance.now();
    softDrop = false;
    gameOver = false;
    paused = false;
    nextId = randomPieceId();
    current = spawnPiece(nextId);
    nextId = randomPieceId();
    overlay.classList.add('hidden');
    btnPause.textContent = 'Pause';
    syncHud();
    drawNext();
    statusLine.textContent = 'Clear horizontal lines to score. Speed increases every 10 lines.';
  }

  function hardDrop() {
    if (!current || gameOver || paused) return;
    let steps = 0;
    while (tryMove(board, current, 1, 0)) steps++;
    score += steps * 2;
    lockPiece(board, current);
    const n = clearLines(board);
    addScoreForLines(n);
    syncHud();
    current = spawnPiece(nextId);
    nextId = randomPieceId();
    drawNext();
    if (gameOverCheck(board, current)) endGame();
    lastDrop = performance.now();
  }

  document.addEventListener('keydown', function (e) {
    if (e.code === 'KeyP') {
      if (gameOver) return;
      paused = !paused;
      btnPause.textContent = paused ? 'Resume' : 'Pause';
      statusLine.textContent = paused ? 'Paused — press P to resume.' : 'Clear horizontal lines to score. Speed increases every 10 lines.';
      e.preventDefault();
      return;
    }
    if (paused || gameOver) {
      if (e.code === 'Space' && gameOver) {
        resetGame();
        e.preventDefault();
      }
      return;
    }
    if (!current) return;

    switch (e.code) {
      case 'ArrowLeft':
        tryMove(board, current, 0, -1);
        e.preventDefault();
        break;
      case 'ArrowRight':
        tryMove(board, current, 0, 1);
        e.preventDefault();
        break;
      case 'ArrowDown':
        softDrop = true;
        e.preventDefault();
        break;
      case 'ArrowUp':
        tryRotate(board, current);
        e.preventDefault();
        break;
      case 'Space':
        hardDrop();
        e.preventDefault();
        break;
      default:
        break;
    }
  });

  document.addEventListener('keyup', function (e) {
    if (e.code === 'ArrowDown') softDrop = false;
  });

  btnRestart.addEventListener('click', resetGame);
  btnPause.addEventListener('click', function () {
    if (gameOver) return;
    paused = !paused;
    btnPause.textContent = paused ? 'Resume' : 'Pause';
    statusLine.textContent = paused ? 'Paused — press P or Resume.' : 'Clear horizontal lines to score. Speed increases every 10 lines.';
  });

  resetGame();
  requestAnimationFrame(tick);
})();
