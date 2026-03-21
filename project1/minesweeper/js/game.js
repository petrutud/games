(function () {
  'use strict';

  const boardWrap = document.getElementById('board-wrap');
  const minesCountEl = document.getElementById('mines-count');
  const timerEl = document.getElementById('timer');
  const messageEl = document.getElementById('message');
  const presetSelect = document.getElementById('preset');
  const newGameBtn = document.getElementById('new-game');

  let rows = 16;
  let cols = 16;
  let mineCount = 40;
  let grid = [];
  let revealed = [];
  let flagged = [];
  let gameOver = false;
  let gameStarted = false;
  let timerId = null;
  let seconds = 0;

  function parsePreset(value) {
    var parts = value.split(',').map(Number);
    return { cols: parts[0], rows: parts[1], mines: parts[2] };
  }

  function initBoard() {
    var preset = parsePreset(presetSelect.value);
    cols = preset.cols;
    rows = preset.rows;
    mineCount = Math.min(preset.mines, cols * rows - 1);

    grid = [];
    revealed = [];
    flagged = [];
    for (var r = 0; r < rows; r++) {
      grid[r] = [];
      revealed[r] = [];
      flagged[r] = [];
      for (var c = 0; c < cols; c++) {
        grid[r][c] = 0;
        revealed[r][c] = false;
        flagged[r][c] = false;
      }
    }
    gameOver = false;
    gameStarted = false;
    seconds = 0;
    timerEl.textContent = '0';
    if (timerId) clearInterval(timerId);
    timerId = null;
    messageEl.textContent = '';
    messageEl.classList.remove('win', 'lose');
    minesCountEl.textContent = mineCount;
    render();
  }

  function placeMines(excludeR, excludeC) {
    var placed = 0;
    while (placed < mineCount) {
      var r = Math.floor(Math.random() * rows);
      var c = Math.floor(Math.random() * cols);
      if (grid[r][c] === -1) continue;
      if (r === excludeR && c === excludeC) continue;
      grid[r][c] = -1;
      placed++;
    }
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        if (grid[r][c] === -1) continue;
        var n = 0;
        for (var dr = -1; dr <= 1; dr++) {
          for (var dc = -1; dc <= 1; dc++) {
            var nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === -1) n++;
          }
        }
        grid[r][c] = n;
      }
    }
  }

  function startTimer() {
    if (timerId) return;
    gameStarted = true;
    timerId = setInterval(function () {
      seconds++;
      timerEl.textContent = seconds;
    }, 1000);
  }

  function reveal(r, c) {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    if (revealed[r][c] || flagged[r][c]) return;
    revealed[r][c] = true;
    if (grid[r][c] === -1) {
      gameOver = true;
      messageEl.textContent = 'Game Over — you hit a mine!';
      messageEl.classList.add('lose');
      revealAllMines();
      if (timerId) clearInterval(timerId);
      return;
    }
    if (grid[r][c] === 0) {
      for (var dr = -1; dr <= 1; dr++) {
        for (var dc = -1; dc <= 1; dc++) {
          if (dr !== 0 || dc !== 0) reveal(r + dr, c + dc);
        }
      }
    }
    checkWin();
  }

  function revealAllMines() {
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (grid[r][c] === -1) revealed[r][c] = true;
      }
    }
  }

  function checkWin() {
    var revealedCount = 0;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (revealed[r][c]) revealedCount++;
      }
    }
    var totalCells = rows * cols;
    if (revealedCount === totalCells - mineCount) {
      gameOver = true;
      messageEl.textContent = 'You win! Time: ' + seconds + 's';
      messageEl.classList.add('win');
      if (timerId) clearInterval(timerId);
    }
  }

  function toggleFlag(r, c) {
    if (gameOver || revealed[r][c]) return;
    flagged[r][c] = !flagged[r][c];
    var count = 0;
    for (var i = 0; i < rows; i++) {
      for (var j = 0; j < cols; j++) {
        if (flagged[i][j]) count++;
      }
    }
    minesCountEl.textContent = mineCount - count;
    render();
  }

  function handleClick(r, c) {
    if (gameOver) return;
    if (!gameStarted) {
      placeMines(r, c);
      startTimer();
    }
    if (flagged[r][c]) return;
    reveal(r, c);
    render();
  }

  function handleRightClick(e, r, c) {
    e.preventDefault();
    if (gameOver || revealed[r][c]) return;
    toggleFlag(r, c);
  }

  function render() {
    boardWrap.innerHTML = '';
    var board = document.createElement('div');
    board.className = 'board';
    var cellSize = window.innerWidth < 600 ? 24 : 28;
    board.style.gridTemplateColumns = 'repeat(' + cols + ', ' + cellSize + 'px)';

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var cell = document.createElement('div');
        cell.className = 'cell';
        if (revealed[r][c]) {
          cell.classList.add('revealed');
          if (grid[r][c] === -1) {
            cell.classList.add('mine');
            cell.textContent = '💣';
          } else if (grid[r][c] > 0) {
            cell.textContent = grid[r][c];
            cell.classList.add('num-' + grid[r][c]);
          }
        } else if (flagged[r][c]) {
          cell.classList.add('flagged');
        }
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.addEventListener('click', function () {
          handleClick(Number(this.dataset.r), Number(this.dataset.c));
        });
        cell.addEventListener('contextmenu', function (e) {
          handleRightClick(e, Number(this.dataset.r), Number(this.dataset.c));
        });
        board.appendChild(cell);
      }
    }
    boardWrap.appendChild(board);
  }

  newGameBtn.addEventListener('click', initBoard);
  presetSelect.addEventListener('change', initBoard);
  initBoard();
})();
