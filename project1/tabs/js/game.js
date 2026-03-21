(function () {
  'use strict';

  const canvas = document.getElementById('battlefield');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const MID = W / 2;
  const BUDGET = 100;
  const BLUE_ZONE = MID - 80;
  const RED_ZONE = MID + 80;

  const UNIT_TYPES = [
    { id: 'peasant',  name: 'Peasant',  cost: 5,  hp: 30,  damage: 8,  speed: 1.2,  range: 0,   cooldown: 40,  color: '#94a3b8' },
    { id: 'sword',    name: 'Swordsman', cost: 15, hp: 60,  damage: 18, speed: 1,    range: 0,   cooldown: 35,  color: '#60a5fa' },
    { id: 'archer',   name: 'Archer',   cost: 20, hp: 35,  damage: 22, speed: 1.1,  range: 180, cooldown: 50,  color: '#4ade80' },
    { id: 'knight',   name: 'Knight',  cost: 35, hp: 100, damage: 28, speed: 1.4,  range: 0,   cooldown: 30,  color: '#a78bfa' },
    { id: 'spear',    name: 'Spearman', cost: 25, hp: 55,  damage: 20, speed: 1,    range: 45,  cooldown: 45,  color: '#38bdf8' },
    { id: 'club',     name: 'Clubber',  cost: 12, hp: 80,  damage: 15, speed: 0.9,  range: 0,   cooldown: 50,  color: '#f97316' }
  ];

  let budget = BUDGET;
  let units = [];
  let selectedUnitType = null;
  let phase = 'place';
  let animId = null;

  const budgetEl = document.getElementById('budget');
  const phaseEl = document.getElementById('phase');
  const btnBattle = document.getElementById('btn-battle');
  const btnReset = document.getElementById('btn-reset');
  const overlay = document.getElementById('overlay');
  const overlayMsg = document.getElementById('overlay-msg');

  function getType(id) {
    for (var i = 0; i < UNIT_TYPES.length; i++) {
      if (UNIT_TYPES[i].id === id) return UNIT_TYPES[i];
    }
    return null;
  }

  function spawnEnemyArmy() {
    var spent = 0;
    while (spent < BUDGET) {
      var t = UNIT_TYPES[Math.floor(Math.random() * UNIT_TYPES.length)];
      if (spent + t.cost > BUDGET) break;
      var x = RED_ZONE + 30 + Math.random() * (W - RED_ZONE - 80);
      var y = 60 + Math.random() * (H - 120);
      units.push({
        x: x, y: y, vx: 0, vy: 0,
        type: t.id, hp: t.hp, maxHp: t.hp, team: 1,
        cooldown: 0, wobble: Math.random() * Math.PI * 2
      });
      spent += t.cost;
    }
  }

  function placeUnit(team, x, y, typeId) {
    var t = getType(typeId);
    if (!t || budget < t.cost) return false;
    budget -= t.cost;
    units.push({
      x: x, y: y, vx: 0, vy: 0,
      type: typeId, hp: t.hp, maxHp: t.hp, team: team,
      cooldown: 0, wobble: Math.random() * Math.PI * 2
    });
    return true;
  }

  function getNearestEnemy(u) {
    var uType = getType(u.type);
    var best = null;
    var bestD = 1e9;
    for (var i = 0; i < units.length; i++) {
      var o = units[i];
      if (o.team === u.team || o.hp <= 0) continue;
      var d = Math.hypot(o.x - u.x, o.y - u.y);
      if (d < bestD) { bestD = d; best = o; }
    }
    return best;
  }

  function updateBattle() {
    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      if (u.hp <= 0) continue;
      var t = getType(u.type);
      var enemy = getNearestEnemy(u);
      u.wobble += 0.15;

      if (enemy) {
        var dx = enemy.x - u.x;
        var dy = enemy.y - u.y;
        var d = Math.hypot(dx, dy) || 1;
        var hitRange = t.range > 0 ? t.range : 28;
        if (d <= hitRange) {
          u.vx = 0;
          u.vy = 0;
          u.cooldown--;
          if (u.cooldown <= 0) {
            u.cooldown = t.cooldown;
            enemy.hp -= t.damage;
          }
        } else {
          u.vx = (dx / d) * t.speed;
          u.vy = (dy / d) * t.speed;
          u.x += u.vx;
          u.y += u.vy;
        }
      } else {
        var moveDir = u.team === 0 ? 1 : -1;
        u.vx = moveDir * t.speed * 0.8;
        u.vy = Math.sin(u.wobble) * 0.3;
        u.x += u.vx;
        u.y += u.vy;
      }

      u.x = Math.max(20, Math.min(W - 20, u.x));
      u.y = Math.max(25, Math.min(H - 25, u.y));
    }

    var blueAlive = 0, redAlive = 0;
    for (var j = 0; j < units.length; j++) {
      if (units[j].hp <= 0) continue;
      if (units[j].team === 0) blueAlive++;
      else redAlive++;
    }
    if (blueAlive === 0 || redAlive === 0) {
      phase = 'ended';
      overlay.classList.remove('hidden');
      overlayMsg.textContent = blueAlive > 0 ? 'You win! Totally accurate.' : 'Enemy wins!';
    }
  }

  function draw() {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 15]);
    ctx.beginPath();
    ctx.moveTo(MID, 0);
    ctx.lineTo(MID, H);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
    ctx.fillRect(0, 0, BLUE_ZONE, H);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
    ctx.fillRect(RED_ZONE, 0, W - RED_ZONE, H);

    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      if (u.hp <= 0) continue;
      var t = getType(u.type);
      var col = u.team === 0 ? '#3b82f6' : '#ef4444';
      var wob = Math.sin(u.wobble) * 2;
      ctx.save();
      ctx.translate(u.x, u.y);
      ctx.rotate(wob * 0.02);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = u.team === 0 ? '#60a5fa' : '#f87171';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = t.color;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.name.charAt(0), 0, 0);
      ctx.restore();
      ctx.fillStyle = '#333';
      ctx.fillRect(u.x - 14, u.y - 22, 28, 4);
      ctx.fillStyle = u.hp > u.maxHp * 0.5 ? '#22c55e' : '#ef4444';
      ctx.fillRect(u.x - 14, u.y - 22, 28 * (u.hp / u.maxHp), 4);
    }

    if (phase === 'battle') requestAnimationFrame(draw);
  }

  function gameLoop() {
    if (phase === 'battle') {
      updateBattle();
    }
    draw();
    requestAnimationFrame(gameLoop);
  }

  function startBattle() {
    if (units.filter(function (u) { return u.team === 0; }).length === 0) return;
    phase = 'battle';
    spawnEnemyArmy();
    btnBattle.disabled = true;
    phaseEl.textContent = 'Battle!';
    gameLoop();
  }

  function reset() {
    phase = 'place';
    budget = BUDGET;
    units = [];
    selectedUnitType = null;
    overlay.classList.add('hidden');
    btnBattle.disabled = true;
    phaseEl.textContent = 'Place your army (click field)';
    budgetEl.textContent = budget;
    document.querySelectorAll('.unit-btn').forEach(function (b) { b.classList.remove('active'); });
    draw();
  }

  canvas.addEventListener('click', function (e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var x = (e.clientX - rect.left) * scaleX;
    var y = (e.clientY - rect.top) * scaleY;
    if (phase === 'place' && x < BLUE_ZONE && selectedUnitType) {
      if (placeUnit(0, x, y, selectedUnitType)) {
        budgetEl.textContent = budget;
        if (units.filter(function (u) { return u.team === 0; }).length > 0)
          btnBattle.disabled = false;
      }
    }
    draw();
  });

  UNIT_TYPES.forEach(function (t) {
    var btn = document.createElement('button');
    btn.className = 'unit-btn';
    btn.dataset.type = t.id;
    btn.innerHTML = t.name + ' <span class="cost">(' + t.cost + ')</span>';
    btn.addEventListener('click', function () {
      document.querySelectorAll('.unit-btn').forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');
      selectedUnitType = t.id;
    });
    document.getElementById('unit-buttons').appendChild(btn);
  });

  btnBattle.addEventListener('click', startBattle);
  btnReset.addEventListener('click', reset);
  document.getElementById('btn-again').addEventListener('click', function () {
    overlay.classList.add('hidden');
    reset();
  });

  reset();
  draw();
})();
