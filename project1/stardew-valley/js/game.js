(function () {
  'use strict';

  const TILE = 32;
  const COLS = 16;
  const ROWS = 12;
  const CANVAS_W = COLS * TILE;
  const CANVAS_H = ROWS * TILE;

  const CROPS = {
    parsnip:    { days: 2, sell: 20,  seedCost: 10,  color: '#f4d03f', name: 'Parsnip' },
    potato:     { days: 3, sell: 40,  seedCost: 15,  color: '#e8b86d', name: 'Potato' },
    cauliflower: { days: 4, sell: 80, seedCost: 25,  color: '#f5f5dc', name: 'Cauliflower' }
  };

  const canvas = document.getElementById('farm');
  const ctx = canvas.getContext('2d');

  let grid = [];
  let day = 1;
  let season = 'Spring';
  let energy = 100;
  let maxEnergy = 100;
  let gold = 50;
  let selectedTool = 'hoe';
  let seeds = { parsnip: 5, potato: 3, cauliflower: 1 };

  const dayEl = document.getElementById('day');
  const seasonEl = document.getElementById('season');
  const energyEl = document.getElementById('energy');
  const goldEl = document.getElementById('gold');
  const seedTypeEl = document.getElementById('seed-type');
  const dayMsgEl = document.getElementById('day-msg');
  const shopModal = document.getElementById('shop-modal');
  const shopGoldEl = document.getElementById('shop-gold');
  const buyParsnip = document.getElementById('buy-parsnip');
  const buyPotato = document.getElementById('buy-potato');
  const buyCauliflower = document.getElementById('buy-cauliflower');

  function initGrid() {
    grid = [];
    for (var r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (var c = 0; c < COLS; c++) {
        grid[r][c] = { ground: 0, crop: null };
      }
    }
  }

  function getTileAtPixel(x, y) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var cx = (x - rect.left) * scaleX;
    var cy = (y - rect.top) * scaleY;
    var col = Math.floor(cx / TILE);
    var row = Math.floor(cy / TILE);
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return null;
    return { row: row, col: col, tile: grid[row][col] };
  }

  function useEnergy(amount) {
    if (energy < amount) {
      dayMsgEl.textContent = 'Not enough energy!';
      return false;
    }
    energy -= amount;
    return true;
  }

  function useTool(row, col) {
    var t = grid[row][col];
    if (selectedTool === 'hoe') {
      if (t.ground !== 0) return;
      if (!useEnergy(5)) return;
      t.ground = 1;
      dayMsgEl.textContent = 'Tilled the soil.';
    } else if (selectedTool === 'water') {
      if (t.ground === 0) return;
      if (!useEnergy(3)) return;
      t.ground = 2;
      if (t.crop) t.crop.watered = true;
      dayMsgEl.textContent = 'Watered.';
    } else if (selectedTool === 'plant') {
      if (t.ground === 0 || t.crop) return;
      var type = seedTypeEl.value;
      if (seeds[type] <= 0) {
        dayMsgEl.textContent = 'No ' + CROPS[type].name + ' seeds!';
        return;
      }
      if (!useEnergy(2)) return;
      seeds[type]--;
      t.crop = { type: type, stage: 0, watered: false };
      dayMsgEl.textContent = 'Planted ' + CROPS[type].name + '.';
    } else if (selectedTool === 'harvest') {
      if (!t.crop) return;
      var crop = CROPS[t.crop.type];
      if (t.crop.stage < crop.days) {
        dayMsgEl.textContent = 'Not ready to harvest yet.';
        return;
      }
      if (!useEnergy(2)) return;
      gold += crop.sell;
      t.crop = null;
      t.ground = 1;
      dayMsgEl.textContent = 'Harvested! +' + crop.sell + 'g';
    }
    updateHud();
  }

  function sleep() {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var t = grid[r][c];
        if (t.crop && t.crop.watered) {
          t.crop.stage++;
          if (t.crop.stage > CROPS[t.crop.type].days) t.crop.stage = CROPS[t.crop.type].days;
        }
        t.crop && (t.crop.watered = false);
        if (t.ground === 2) t.ground = 1;
      }
    }
    day++;
    if (day > 28) {
      day = 1;
      season = season === 'Spring' ? 'Summer' : season === 'Summer' ? 'Fall' : 'Spring';
    }
    energy = maxEnergy;
    dayMsgEl.textContent = 'Good morning! Day ' + day + ', ' + season + '.';
    updateHud();
    draw();
  }

  function updateHud() {
    dayEl.textContent = day;
    seasonEl.textContent = season;
    energyEl.textContent = energy + ' / ' + maxEnergy;
    goldEl.textContent = gold;
    document.getElementById('inv-parsnip').textContent = seeds.parsnip;
    document.getElementById('inv-potato').textContent = seeds.potato;
    document.getElementById('inv-cauliflower').textContent = seeds.cauliflower;
  }

  function draw() {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var x = c * TILE;
        var y = r * TILE;
        var t = grid[r][c];
        if (t.ground === 0) {
          ctx.fillStyle = '#5a8a5a';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#4a7a4a';
          ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        } else {
          ctx.fillStyle = t.ground === 2 ? '#8b6914' : '#6b4a14';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.strokeStyle = '#5a3a0a';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, TILE, TILE);
        }
        if (t.crop) {
          var crop = CROPS[t.crop.type];
          var progress = t.crop.stage / crop.days;
          ctx.fillStyle = crop.color;
          var size = 8 + progress * 14;
          var ox = x + (TILE - size) / 2;
          var oy = y + (TILE - size) / 2;
          ctx.fillRect(ox, oy, size, size);
          if (t.crop.stage >= crop.days) {
            ctx.strokeStyle = '#f4d03f';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
          }
          if (t.crop.watered) {
            ctx.fillStyle = 'rgba(100, 180, 255, 0.35)';
            ctx.fillRect(x, y, TILE, TILE);
          }
        }
      }
    }
  }

  canvas.addEventListener('click', function (e) {
    var hit = getTileAtPixel(e.clientX, e.clientY);
    if (hit) useTool(hit.row, hit.col);
    draw();
  });

  document.querySelectorAll('.tool-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.tool-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      selectedTool = btn.dataset.tool;
    });
  });

  document.getElementById('btn-sleep').addEventListener('click', sleep);

  document.getElementById('btn-shop').addEventListener('click', function () {
    shopGoldEl.textContent = gold;
    buyParsnip.value = 0;
    buyPotato.value = 0;
    buyCauliflower.value = 0;
    shopModal.classList.remove('hidden');
  });
  document.getElementById('btn-close-shop').addEventListener('click', function () {
    shopModal.classList.add('hidden');
  });
  document.getElementById('btn-buy').addEventListener('click', function () {
    var qp = parseInt(buyParsnip.value, 10) || 0;
    var qpt = parseInt(buyPotato.value, 10) || 0;
    var qc = parseInt(buyCauliflower.value, 10) || 0;
    var cost = qp * 10 + qpt * 15 + qc * 25;
    if (cost > gold) {
      dayMsgEl.textContent = 'Not enough gold!';
      return;
    }
    gold -= cost;
    seeds.parsnip += qp;
    seeds.potato += qpt;
    seeds.cauliflower += qc;
    shopGoldEl.textContent = gold;
    updateHud();
    dayMsgEl.textContent = 'Bought seeds.';
  });

  initGrid();
  updateHud();
  draw();
})();
