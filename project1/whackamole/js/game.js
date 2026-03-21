(function () {
  'use strict';

  const ROUND_SEC = 30;
  const MOLE_INTERVAL_MS = 900;
  const HOLE_COUNT = 9;

  const scoreEl = document.getElementById('score');
  const timerEl = document.getElementById('timer');
  const holesEl = document.getElementById('holes');
  const overlay = document.getElementById('overlay');
  const overlayMsg = document.getElementById('overlay-msg');
  const btnAgain = document.getElementById('btn-again');

  let score = 0;
  let timeLeft = ROUND_SEC;
  let currentMoleIdx = -1;
  let roundActive = false;
  let countdownId = null;
  let moleIntervalId = null;
  let lastMoleIdx = -1;

  function renderHoles() {
    var holes = holesEl.querySelectorAll('.hole');
    for (var i = 0; i < HOLE_COUNT; i++) {
      var hole = holes[i];
      hole.disabled = !roundActive;
      hole.classList.remove('mole', 'whacked');
      if (i === currentMoleIdx) hole.classList.add('mole');
    }
  }

  function moveMole() {
    if (!roundActive) return;
    var next;
    do {
      next = Math.floor(Math.random() * HOLE_COUNT);
    } while (HOLE_COUNT > 1 && next === lastMoleIdx);
    lastMoleIdx = next;
    currentMoleIdx = next;
    renderHoles();
  }

  function endRound() {
    roundActive = false;
    currentMoleIdx = -1;
    if (countdownId) clearInterval(countdownId);
    if (moleIntervalId) clearInterval(moleIntervalId);
    countdownId = null;
    moleIntervalId = null;
    renderHoles();
    overlayMsg.textContent = "Time's up! Score: " + score;
    overlay.classList.remove('hidden');
  }

  function tickCountdown() {
    if (!roundActive) return;
    timeLeft -= 1;
    timerEl.textContent = timeLeft;
    if (timeLeft <= 0) endRound();
  }

  function startRound() {
    score = 0;
    timeLeft = ROUND_SEC;
    currentMoleIdx = -1;
    lastMoleIdx = -1;
    roundActive = true;
    scoreEl.textContent = '0';
    timerEl.textContent = String(ROUND_SEC);
    overlay.classList.add('hidden');
    renderHoles();
    moveMole();
    countdownId = setInterval(tickCountdown, 1000);
    moleIntervalId = setInterval(moveMole, MOLE_INTERVAL_MS);
  }

  holesEl.addEventListener('click', function (e) {
    var hole = e.target.closest('.hole');
    if (!hole || !roundActive) return;
    var idx = parseInt(hole.getAttribute('data-idx'), 10);
    if (idx !== currentMoleIdx) return;
    score += 1;
    scoreEl.textContent = score;
    hole.classList.remove('mole');
    hole.classList.add('whacked');
    currentMoleIdx = -1;
    setTimeout(function () {
      hole.classList.remove('whacked');
      if (roundActive) moveMole();
    }, 150);
  });

  btnAgain.addEventListener('click', startRound);

  startRound();
})();
