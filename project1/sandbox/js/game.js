(function () {
  'use strict';

  var CELL_SIZE = 4;
  var GRID_W = 160;  // 640 / 4
  var GRID_H = 120;  // 480 / 4
  var CHUNK_SIZE = 16;
  var EMPTY = 0;
  var SAND = 1;

  var COLORS = {};
  COLORS[EMPTY] = null;
  COLORS[SAND] = '#d4a84b';

  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');
  var btnClear = document.getElementById('btn-clear');

  var grid = [];
  var chunkRows = Math.ceil(GRID_H / CHUNK_SIZE);
  var chunkCols = Math.ceil(GRID_W / CHUNK_SIZE);
  var chunkActive = [];
  var scanRight = true;
  var animId = null;

  function initGrid() {
    for (var y = 0; y < GRID_H; y++) {
      grid[y] = [];
      for (var x = 0; x < GRID_W; x++) grid[y][x] = EMPTY;
    }
    for (var cy = 0; cy < chunkRows; cy++) {
      chunkActive[cy] = [];
      for (var cx = 0; cx < chunkCols; cx++) chunkActive[cy][cx] = true;
    }
  }

  function getCell(x, y) {
    if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return -1;
    return grid[y][x];
  }

  function setCell(x, y, type) {
    if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return;
    grid[y][x] = type;
    var cx = Math.floor(x / CHUNK_SIZE);
    var cy = Math.floor(y / CHUNK_SIZE);
    if (cy >= 0 && cy < chunkRows && cx >= 0 && cx < chunkCols) chunkActive[cy][cx] = true;
  }

  function updateSand() {
    var anyActive = false;
    for (var cy = 0; cy < chunkRows; cy++)
      for (var cx = 0; cx < chunkCols; cx++) { if (chunkActive[cy][cx]) { anyActive = true; break; } }
    if (!anyActive) {
      for (var cy = 0; cy < chunkRows; cy++)
        for (var cx = 0; cx < chunkCols; cx++) {
          var y0 = cy * CHUNK_SIZE, y1 = Math.min(y0 + CHUNK_SIZE, GRID_H);
          var x0 = cx * CHUNK_SIZE, x1 = Math.min(x0 + CHUNK_SIZE, GRID_W);
          for (var y = y0; y < y1; y++)
            for (var x = x0; x < x1; x++)
              if (getCell(x, y) !== EMPTY) { chunkActive[cy][cx] = true; break; }
        }
    }
    var anyMoved = false;
    for (var cy = 0; cy < chunkRows; cy++) {
      for (var cx = 0; cx < chunkCols; cx++) {
        if (!chunkActive[cy][cx]) continue;
        var y0 = cy * CHUNK_SIZE;
        var y1 = Math.min(y0 + CHUNK_SIZE, GRID_H);
        var x0 = cx * CHUNK_SIZE;
        var x1 = Math.min(x0 + CHUNK_SIZE, GRID_W);
        for (var y = y1 - 1; y >= y0; y--) {
          var start = scanRight ? x0 : x1 - 1;
          var end = scanRight ? x1 : x0 - 1;
          var step = scanRight ? 1 : -1;
          for (var x = start; x !== end; x += step) {
            if (getCell(x, y) !== SAND) continue;
            var below = getCell(x, y + 1);
            if (below === EMPTY) {
              setCell(x, y + 1, SAND);
              setCell(x, y, EMPTY);
              anyMoved = true;
            } else if (below === SAND) {
              var dl = getCell(x - 1, y + 1);
              var dr = getCell(x + 1, y + 1);
              var canLeft = dl === EMPTY;
              var canRight = dr === EMPTY;
              if (canLeft && canRight) {
                if (Math.random() < 0.5) { setCell(x - 1, y + 1, SAND); setCell(x, y, EMPTY); anyMoved = true; }
                else { setCell(x + 1, y + 1, SAND); setCell(x, y, EMPTY); anyMoved = true; }
              } else if (canLeft) { setCell(x - 1, y + 1, SAND); setCell(x, y, EMPTY); anyMoved = true; }
              else if (canRight) { setCell(x + 1, y + 1, SAND); setCell(x, y, EMPTY); anyMoved = true; }
            }
          }
        }
      }
    }
    scanRight = !scanRight;
    if (!anyMoved) {
      for (var i = 0; i < chunkRows; i++)
        for (var j = 0; j < chunkCols; j++) chunkActive[i][j] = false;
    }
  }

  function draw() {
    ctx.fillStyle = '#1a1a1f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (var y = 0; y < GRID_H; y++) {
      for (var x = 0; x < GRID_W; x++) {
        var t = grid[y][x];
        if (t === EMPTY) continue;
        if (COLORS[t]) {
          ctx.fillStyle = COLORS[t];
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      }
    }
  }

  function loop() {
    updateSand();
    draw();
    animId = requestAnimationFrame(loop);
  }

  function cellAtClient(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var px = (clientX - rect.left) * scaleX;
    var py = (clientY - rect.top) * scaleY;
    var gx = Math.floor(px / CELL_SIZE);
    var gy = Math.floor(py / CELL_SIZE);
    return { x: gx, y: gy };
  }

  function placeSand(x, y) {
    if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H && getCell(x, y) === EMPTY)
      setCell(x, y, SAND);
  }

  canvas.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    var c = cellAtClient(e.clientX, e.clientY);
    placeSand(c.x, c.y);
    function onMove(ev) {
      var c2 = cellAtClient(ev.clientX, ev.clientY);
      placeSand(c2.x, c2.y);
    }
    function onUp() {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('mouseleave', onUp);
    }
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('mouseleave', onUp);
  });
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  if (btnClear) btnClear.addEventListener('click', function () {
    initGrid();
  });

  initGrid();
  animId = requestAnimationFrame(loop);
})();
