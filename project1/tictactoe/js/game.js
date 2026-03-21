(function () {
  'use strict';

  const LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  let board = ['', '', '', '', '', '', '', '', ''];
  let current = 'X';
  let vsComputer = false;
  let gameOver = false;

  const modeScreen = document.getElementById('mode-screen');
  const gameScreen = document.getElementById('game-screen');
  const turnMsg = document.getElementById('turn-msg');
  const boardEl = document.getElementById('board');
  const resultEl = document.getElementById('result');
  const againRow = document.getElementById('again-row');

  function getEmptyCells() {
    return board.map(function (c, i) { return c ? -1 : i; }).filter(function (i) { return i >= 0; });
  }

  function checkWinner() {
    for (var i = 0; i < LINES.length; i++) {
      var a = LINES[i][0], b = LINES[i][1], c = LINES[i][2];
      if (board[a] && board[a] === board[b] && board[b] === board[c]) return board[a];
    }
    return null;
  }

  function renderBoard() {
    var cells = boardEl.querySelectorAll('.cell');
    for (var i = 0; i < 9; i++) {
      var cell = cells[i];
      cell.textContent = board[i];
      cell.disabled = !!board[i] || gameOver;
      cell.className = 'cell' + (board[i] ? ' ' + board[i].toLowerCase() : '');
    }
  }

  function updateTurnMsg() {
    if (gameOver) return;
    if (current === 'X') {
      turnMsg.textContent = "Player X's turn";
    } else if (vsComputer) {
      turnMsg.textContent = "Computer (O) is thinking...";
    } else {
      turnMsg.textContent = "Player O's turn";
    }
  }

  function showResult(winner) {
    gameOver = true;
    resultEl.classList.remove('hidden');
    againRow.classList.remove('hidden');
    if (winner) {
      resultEl.textContent = winner + ' wins!';
      resultEl.className = 'result win-' + winner.toLowerCase();
    } else {
      resultEl.textContent = "It's a tie!";
      resultEl.className = 'result tie';
    }
    renderBoard();
  }

  function computerMove() {
    var empty = getEmptyCells();
    if (empty.length === 0) return;
    var idx = empty[Math.floor(Math.random() * empty.length)];
    board[idx] = 'O';
    afterMove();
  }

  function afterMove() {
    var winner = checkWinner();
    var empty = getEmptyCells();
    renderBoard();
    if (winner) {
      showResult(winner);
      return;
    }
    if (empty.length === 0) {
      showResult(null);
      return;
    }
    current = current === 'X' ? 'O' : 'X';
    updateTurnMsg();
    if (vsComputer && current === 'O') {
      setTimeout(computerMove, 400);
    }
  }

  function startGame(mode) {
    vsComputer = mode === 'cpu';
    board = ['', '', '', '', '', '', '', '', ''];
    current = 'X';
    gameOver = false;
    resultEl.classList.add('hidden');
    againRow.classList.add('hidden');
    resultEl.textContent = '';
    resultEl.className = 'result';
    modeScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    updateTurnMsg();
    renderBoard();
  }

  function backToMode() {
    gameScreen.classList.add('hidden');
    modeScreen.classList.remove('hidden');
  }

  modeScreen.querySelectorAll('[data-mode]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      startGame(btn.getAttribute('data-mode'));
    });
  });

  boardEl.addEventListener('click', function (e) {
    var cell = e.target.closest('.cell');
    if (!cell || gameOver) return;
    var idx = parseInt(cell.getAttribute('data-idx'), 10);
    if (board[idx]) return;
    board[idx] = current;
    afterMove();
  });

  document.getElementById('btn-again').addEventListener('click', function () {
    startGame(vsComputer ? 'cpu' : '2p');
  });

  document.getElementById('btn-change-mode').addEventListener('click', backToMode);
})();
