(function () {
  'use strict';

  const canvas = document.getElementById('game');
  canvas.setAttribute('tabindex', '0');
  canvas.setAttribute('role', 'application');
  canvas.addEventListener('mousedown', function () {
    canvas.focus();
  });
  const ctx = canvas.getContext('2d');
  const elTick = document.getElementById('tick-count');
  const elTock = document.getElementById('tock-time');
  const elParadox = document.getElementById('paradox-fill');
  const elRewind = document.getElementById('rewind-overlay');
  const elBubble = document.getElementById('bubble-host');
  const elChapter = document.getElementById('chapter-num');
  const elLevelName = document.getElementById('level-name');

  const W = 800;
  const H = 450;
  const FPS = 60;
  const DT = 1 / FPS;
  const CYCLE_FRAMES = 600;
  const MAX_ECHOES = 5;
  const RECORD_MAX_FRAMES = CYCLE_FRAMES;

  const GRAVITY = 2200;
  const MOVE_ACCEL = 8800;
  const MAX_RUN = 220;
  const FRICTION_GROUND = 0.82;
  const FRICTION_AIR = 0.92;
  const JUMP_V = -920;
  const BODY_W = 22;
  const BODY_H = 36;
  const BLOCK_PUSH = 640;
  const CRATE_FRICTION = 0.84;
  const CRATE_MAX_V = 260;

  let masterFrame = 0;
  let levelIndex = 0;
  let recording = false;
  let recordFrames = [];
  let recordFrameCount = 0;

  const keys = { left: false, right: false, jump: false };
  let prevJump = false;

  function crateBesideSpawn(sp, w, h) {
    const cw = w != null ? w : 40;
    const ch = h != null ? h : 40;
    const gx = sp.x + BODY_W + 8;
    const gy = sp.y >= 300 ? 400 - ch : sp.y;
    return [{ x: gx, y: gy, w: cw, h: ch }];
  }

  function generateVaultLevels(count) {
    const list = [];
    const floorPlats = function () {
      return [
        { x: 0, y: 400, w: 800, h: 60 },
        { x: 0, y: 0, w: 28, h: 450 },
        { x: 772, y: 0, w: 28, h: 450 },
      ];
    };
    for (let i = 0; i < count; i++) {
      const h0 = (i * 1597334677 + 3812015801) >>> 0;
      const h1 = (h0 * 2246822519) >>> 0;
      const sx = 52 + (h0 % 130);
      const sy = 364;
      const spawn = { x: sx, y: sy };
      const plateX = 220 + (h1 % 280);
      const doorX = 340 + ((h1 >> 9) % 200);
      const plateW = 64 + (i % 3) * 4;
      list.push({
        name: 'Vault ' + (i + 6),
        chapter: (i % 6) + 1,
        spawn: spawn,
        exit: { x: 720, y: 328, w: 44, h: 52 },
        platforms: floorPlats(),
        plates: [{ x: plateX, y: 388, w: plateW, h: 14, id: 'a' }],
        doors: [{ x: doorX, y: 268, w: 24, h: 132, plateId: 'a' }],
        crates: crateBesideSpawn(spawn),
        paradoxDensity: 1.72 + (i % 8) * 0.04,
      });
    }
    return list;
  }

  const LEVELS = [
    {
      name: 'First Echo',
      chapter: 1,
      spawn: { x: 70, y: 364 },
      exit: { x: 720, y: 328, w: 44, h: 52 },
      platforms: [
        { x: 0, y: 400, w: 800, h: 60 },
        { x: 0, y: 0, w: 40, h: 450 },
        { x: 760, y: 0, w: 40, h: 450 },
      ],
      plates: [{ x: 320, y: 388, w: 72, h: 14, id: 'a' }],
      doors: [{ x: 480, y: 268, w: 24, h: 132, plateId: 'a' }],
      crates: crateBesideSpawn({ x: 70, y: 364 }),
      paradoxDensity: 2.5,
    },
    {
      name: 'Held Open',
      chapter: 1,
      spawn: { x: 80, y: 364 },
      exit: { x: 730, y: 328, w: 44, h: 52 },
      platforms: [
        { x: 0, y: 400, w: 800, h: 60 },
        { x: 0, y: 280, w: 200, h: 20 },
        { x: 580, y: 320, w: 220, h: 20 },
        { x: 0, y: 0, w: 32, h: 450 },
        { x: 768, y: 0, w: 32, h: 450 },
      ],
      plates: [{ x: 240, y: 388, w: 64, h: 14, id: 'a' }],
      doors: [{ x: 380, y: 200, w: 22, h: 200, plateId: 'a' }],
      crates: crateBesideSpawn({ x: 80, y: 364 }),
      paradoxDensity: 2.5,
    },
    {
      name: 'Two Hands',
      chapter: 2,
      spawn: { x: 50, y: 364 },
      exit: { x: 720, y: 328, w: 44, h: 52 },
      platforms: [
        { x: 0, y: 400, w: 800, h: 60 },
        { x: 300, y: 300, w: 200, h: 16 },
        { x: 620, y: 280, w: 160, h: 16 },
        { x: 0, y: 0, w: 28, h: 450 },
        { x: 772, y: 0, w: 28, h: 450 },
      ],
      plates: [
        { x: 120, y: 388, w: 56, h: 14, id: 'a' },
        { x: 620, y: 388, w: 56, h: 14, id: 'b' },
      ],
      doors: [
        { x: 260, y: 260, w: 20, h: 140, plateId: 'a' },
        { x: 520, y: 220, w: 20, h: 180, plateId: 'b' },
      ],
      crates: crateBesideSpawn({ x: 50, y: 364 }),
      paradoxDensity: 2.2,
    },
    {
      name: 'The Pass',
      chapter: 3,
      spawn: { x: 210, y: 224 },
      exit: { x: 720, y: 328, w: 44, h: 52 },
      platforms: [
        { x: 0, y: 400, w: 800, h: 60 },
        { x: 180, y: 260, w: 120, h: 16 },
        { x: 480, y: 220, w: 120, h: 16 },
        { x: 0, y: 0, w: 28, h: 450 },
        { x: 772, y: 0, w: 28, h: 450 },
      ],
      plates: [{ x: 360, y: 388, w: 70, h: 14, id: 'a' }],
      doors: [{ x: 400, y: 248, w: 20, h: 160, plateId: 'a' }],
      crates: crateBesideSpawn({ x: 210, y: 224 }, 36, 36),
      paradoxDensity: 2,
    },
    {
      name: 'Crowded Gears',
      chapter: 5,
      spawn: { x: 400, y: 364 },
      exit: { x: 720, y: 328, w: 44, h: 52 },
      platforms: [
        { x: 0, y: 400, w: 800, h: 60 },
        { x: 200, y: 180, w: 400, h: 14 },
        { x: 0, y: 0, w: 24, h: 450 },
        { x: 776, y: 0, w: 24, h: 450 },
      ],
      plates: [
        { x: 100, y: 388, w: 50, h: 14, id: 'a' },
        { x: 650, y: 388, w: 50, h: 14, id: 'b' },
      ],
      doors: [{ x: 390, y: 250, w: 22, h: 150, plateId: 'a' }],
      crates: crateBesideSpawn({ x: 400, y: 364 }, 38, 38),
      paradoxDensity: 1.85,
    },
  ].concat(generateVaultLevels(40));

  let level = null;
  let crates = [];
  let echoes = [];
  let player = { x: 0, y: 0, vx: 0, vy: 0, grounded: false };
  let paradoxHeat = 0;
  let won = false;

  const ACCENT = { r: 94, g: 176, b: 255 };
  let visualTime = 0;
  let dustParticles = [];
  let trailBuffers = [];

  function syncAccent() {
    const m = {
      1: [94, 176, 255],
      2: [232, 197, 108],
      3: [78, 224, 168],
      4: [255, 123, 123],
      5: [184, 148, 255],
      6: [220, 220, 235],
    };
    const ch = level ? level.chapter : 1;
    const a = m[ch] || m[1];
    ACCENT.r = a[0];
    ACCENT.g = a[1];
    ACCENT.b = a[2];
  }

  function initDust() {
    dustParticles = [];
    for (let i = 0; i < 60; i++) {
      dustParticles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 18,
        r: 0.35 + Math.random() * 1.5,
        a: 0.05 + Math.random() * 0.14,
      });
    }
  }

  function updateEchoTrails() {
    while (trailBuffers.length < echoes.length) trailBuffers.push([]);
    while (trailBuffers.length > echoes.length) trailBuffers.pop();
    for (let i = 0; i < echoes.length; i++) {
      const t = trailBuffers[i];
      const ex = echoes[i];
      t.push({ x: ex.x + BODY_W * 0.5, y: ex.y + BODY_H * 0.55 });
      if (t.length > 16) t.shift();
    }
  }

  function cloneCrates(src) {
    return src.map(function (c) {
      return { x: c.x, y: c.y, w: c.w || 36, h: c.h || 36, vx: 0, vy: 0, grounded: false };
    });
  }

  function loadLevel(i) {
    levelIndex = i % LEVELS.length;
    level = LEVELS[levelIndex];
    crates = cloneCrates(level.crates || []);
    echoes = [];
    recording = false;
    recordFrames = [];
    recordFrameCount = 0;
    masterFrame = 0;
    paradoxHeat = 0;
    won = false;
    resetBodies();
    applyChapterClass(level.chapter);
    elChapter.textContent = String(level.chapter);
    elLevelName.textContent = level.name + ' (' + (levelIndex + 1) + '/' + LEVELS.length + ')';
    elTick.textContent = '0';
    elTock.textContent = '—';
    syncAccent();
    initDust();
    trailBuffers = [];
    showBubble('Push gear blocks onto switches. Record with R, rewind to bind Echoes.', 4500);
  }

  function applyChapterClass(ch) {
    document.body.className = '';
    document.body.classList.add('ch' + Math.min(6, Math.max(1, ch)));
  }

  function resetBodies() {
    player.x = level.spawn.x;
    player.y = level.spawn.y;
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;
    crates = cloneCrates(level.crates || []);
    for (let e = 0; e < echoes.length; e++) {
      echoes[e].x = level.spawn.x;
      echoes[e].y = level.spawn.y;
      echoes[e].vx = 0;
      echoes[e].vy = 0;
      echoes[e].grounded = false;
    }
    trailBuffers = [];
    masterFrame = 0;
  }

  function padRecording(frames) {
    const out = frames.slice();
    while (out.length < CYCLE_FRAMES) {
      out.push({ l: false, r: false, j: false });
    }
    return out.slice(0, CYCLE_FRAMES);
  }

  function commitRecording() {
    if (recordFrames.length < 2) {
      showBubble('Recording too short — hold R again to try.', 2500);
      recordFrames = [];
      recording = false;
      return;
    }
    if (echoes.length >= MAX_ECHOES) {
      showBubble('Maximum Echoes (5) — erase one with Backspace.', 3000);
      recordFrames = [];
      recording = false;
      return;
    }
    const padded = padRecording(recordFrames);
    echoes.push({
      frames: padded,
      x: level.spawn.x,
      y: level.spawn.y,
      vx: 0,
      vy: 0,
      grounded: false,
      prevJ: false,
    });
    recordFrames = [];
    recording = false;
    recordFrameCount = 0;
    elRewind.classList.add('active');
    setTimeout(function () {
      elRewind.classList.remove('active');
    }, 500);
    playRewindSound();
    resetBodies();
    elTick.textContent = String(echoes.length);
    showBubble('Echo ' + echoes.length + ' bound. Layer the next move.', 2800);
  }

  function eraseLastEcho() {
    if (echoes.length === 0) return;
    echoes.pop();
    resetBodies();
    elTick.textContent = String(echoes.length);
    paradoxHeat = 0;
    showBubble('Last Echo unraveled.', 2000);
  }

  function plateActive(pid) {
    const plates = level.plates.filter(function (p) {
      return p.id === pid;
    });
    if (plates.length === 0) return true;
    const pl = plates[0];
    if (aabbOverlap(player.x, player.y, BODY_W, BODY_H, pl.x, pl.y, pl.w, pl.h)) return true;
    for (let i = 0; i < echoes.length; i++) {
      const b = echoes[i];
      if (aabbOverlap(b.x, b.y, BODY_W, BODY_H, pl.x, pl.y, pl.w, pl.h)) return true;
    }
    for (let c = 0; c < crates.length; c++) {
      const b = crates[c];
      if (aabbOverlap(b.x, b.y, b.w, b.h, pl.x, pl.y, pl.w, pl.h)) return true;
    }
    return false;
  }

  function getSolids() {
    const solids = level.platforms.map(function (p) {
      return { x: p.x, y: p.y, w: p.w, h: p.h };
    });
    for (let d = 0; d < level.doors.length; d++) {
      const door = level.doors[d];
      if (!plateActive(door.plateId)) {
        solids.push({ x: door.x, y: door.y, w: door.w, h: door.h });
      }
    }
    return solids;
  }

  function aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function physicsStep(body, input, solids, isCrate) {
    const w = isCrate ? body.w : BODY_W;
    const h = isCrate ? body.h : BODY_H;

    let left = input.l;
    let right = input.r;
    if (left && right) {
      left = false;
      right = false;
    }

    body.vx += (right - left) * MOVE_ACCEL * DT;
    if (Math.abs(body.vx) > MAX_RUN) body.vx = (body.vx > 0 ? 1 : -1) * MAX_RUN;

    if (body.grounded) body.vx *= FRICTION_GROUND;
    else body.vx *= FRICTION_AIR;

    body.vy += GRAVITY * DT;

    body.x += body.vx * DT;
    resolveAxis(body, w, h, solids, true);
    body.y += body.vy * DT;
    body.grounded = false;
    resolveAxis(body, w, h, solids, false);
  }

  function resolveAxis(body, w, h, solids, horizontal) {
    for (let iter = 0; iter < 5; iter++) {
      let moved = false;
      for (let s = 0; s < solids.length; s++) {
        const o = solids[s];
        if (!aabbOverlap(body.x, body.y, w, h, o.x, o.y, o.w, o.h)) continue;
        moved = true;
        if (horizontal) {
          if (body.vx > 0) body.x = o.x - w;
          else if (body.vx < 0) body.x = o.x + o.w;
          body.vx = 0;
        } else {
          if (body.vy > 0) {
            body.y = o.y - h;
            body.grounded = true;
          } else if (body.vy < 0) {
            body.y = o.y + o.h;
          }
          body.vy = 0;
        }
      }
      if (!moved) break;
    }
  }

  function tryJump(body, input, prevJ) {
    const want = input.j && !prevJ;
    if (want && body.grounded) body.vy = JUMP_V;
    return input.j;
  }

  function vOverlapBody(ax, ay, aw, ah, bx, by, bw, bh) {
    return ay + ah > by + 8 && ay < by + bh - 8;
  }

  function tryPushBlocks(body, w, h, inp) {
    for (let c = 0; c < crates.length; c++) {
      const crate = crates[c];
      if (!vOverlapBody(body.x, body.y, w, h, crate.x, crate.y, crate.w, crate.h)) continue;
      if (inp.r) {
        const gap = crate.x - (body.x + w);
        if (gap >= -4 && gap <= 10) {
          crate.vx += BLOCK_PUSH * DT;
        }
      }
      if (inp.l) {
        const gap = body.x - (crate.x + crate.w);
        if (gap >= -4 && gap <= 10) {
          crate.vx -= BLOCK_PUSH * DT;
        }
      }
    }
  }

  function getCrateSolids(excludeCi) {
    const base = getSolids();
    const rest = [];
    for (let i = 0; i < crates.length; i++) {
      if (i === excludeCi) continue;
      const c = crates[i];
      rest.push({ x: c.x, y: c.y, w: c.w, h: c.h });
    }
    return base.concat(rest);
  }

  function separateCrates() {
    for (let k = 0; k < 8; k++) {
      for (let i = 0; i < crates.length; i++) {
        for (let j = i + 1; j < crates.length; j++) {
          const A = crates[i];
          const B = crates[j];
          if (!aabbOverlap(A.x, A.y, A.w, A.h, B.x, B.y, B.w, B.h)) continue;
          const ax = A.x + A.w * 0.5;
          const ay = A.y + A.h * 0.5;
          const bx = B.x + B.w * 0.5;
          const by = B.y + B.h * 0.5;
          const dx = ax - bx;
          const dy = ay - by;
          const push = 0.6;
          if (Math.abs(dx) > Math.abs(dy)) {
            const s = dx > 0 ? push : -push;
            A.x += s;
            B.x -= s;
          } else {
            const s = dy > 0 ? push : -push;
            A.y += s;
            B.y -= s;
          }
        }
      }
    }
  }

  function simulateEchoesInput() {
    const idx = masterFrame % CYCLE_FRAMES;
    const out = [];
    for (let e = 0; e < echoes.length; e++) {
      const fr = echoes[e].frames[idx];
      out.push(fr || { l: false, r: false, j: false });
    }
    return out;
  }

  function stepPlayer(prevJumpState) {
    const solids = getSolids().concat(
      crates.map(function (c) {
        return { x: c.x, y: c.y, w: c.w, h: c.h };
      })
    );
    const inp = {
      l: keys.left,
      r: keys.right,
      j: keys.jump,
    };
    const pj = tryJump(player, inp, prevJumpState);
    physicsStep(player, inp, solids, false);
    tryPushBlocks(player, BODY_W, BODY_H, inp);
    return pj;
  }

  function stepEcho(echo, input) {
    const solids = getSolids().concat(
      crates.map(function (c) {
        return { x: c.x, y: c.y, w: c.w, h: c.h };
      })
    );
    if (echo.prevJ === undefined) echo.prevJ = false;
    echo.prevJ = tryJump(echo, input, echo.prevJ);
    physicsStep(echo, input, solids, false);
    tryPushBlocks(echo, BODY_W, BODY_H, input);
  }

  function stepCrates() {
    for (let ci = 0; ci < crates.length; ci++) {
      const crate = crates[ci];
      const solids = getCrateSolids(ci);
      physicsStep(crate, { l: false, r: false, j: false }, solids, true);
    }
    separateCrates();
    for (let ci = 0; ci < crates.length; ci++) {
      const crate = crates[ci];
      if (crate.grounded) {
        crate.vx *= CRATE_FRICTION;
      }
      if (Math.abs(crate.vx) > CRATE_MAX_V) {
        crate.vx = (crate.vx > 0 ? 1 : -1) * CRATE_MAX_V;
      }
    }
  }

  function paradoxStep() {
    const bodies = [player].concat(echoes);
    let closePairs = 0;
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const dx = bodies[i].x - bodies[j].x;
        const dy = bodies[i].y - bodies[j].y;
        if (dx * dx + dy * dy < 45 * 45) closePairs++;
      }
    }
    const lim = (level.paradoxDensity || 2) * DT * 60;
    if (closePairs > 0) {
      paradoxHeat += closePairs * 0.015;
    } else {
      paradoxHeat *= 0.96;
    }
    if (paradoxHeat > 1) {
      paradoxHeat = 0;
      if (echoes.length > 0) {
        echoes.pop();
        resetBodies();
        elTick.textContent = String(echoes.length);
        showBubble('The Paradox unravels an Echo…', 3200);
        playParadoxSound();
      }
    }
    elParadox.style.width = Math.min(100, paradoxHeat * 100) + '%';
  }

  function checkWin() {
    const ex = level.exit;
    if (aabbOverlap(player.x, player.y, BODY_W, BODY_H, ex.x, ex.y, ex.w, ex.h)) {
      won = true;
      showBubble('Gear found. The path remembers you.', 5000);
      playWinChime();
    }
  }

  let prevJumpy = false;
  let acc = 0;
  let last = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    acc += dt;
    while (acc >= DT) {
      acc -= DT;
      if (!won) {
        if (recording) {
          recordFrameCount++;
          recordFrames.push({
            l: keys.left,
            r: keys.right,
            j: keys.jump,
          });
          if (recordFrames.length >= RECORD_MAX_FRAMES) {
            commitRecording();
          }
          const left = Math.max(0, RECORD_MAX_FRAMES - recordFrames.length);
          elTock.textContent = (left / FPS).toFixed(1) + 's';
        } else {
          elTock.textContent = echoes.length ? (masterFrame % CYCLE_FRAMES) + 'f' : '—';
        }

        const echoInputs = simulateEchoesInput();
        for (let e = 0; e < echoes.length; e++) {
          stepEcho(echoes[e], echoInputs[e]);
        }
        prevJumpy = stepPlayer(prevJumpy);
        stepCrates();
        paradoxStep();
        checkWin();
        updateEchoTrails();
        masterFrame++;
      }
    }
    render();
    requestAnimationFrame(frame);
  }

  function render() {
    visualTime = performance.now() * 0.001;
    syncAccent();
    ctx.clearRect(0, 0, W, H);
    drawBackground(visualTime);
    drawFarGears(visualTime);
    drawLevelStatic();
    drawPlates(visualTime);
    drawCrates();
    drawVignette();
    for (let e = 0; e < echoes.length; e++) {
      drawEchoTrail(e, visualTime);
      drawEchoBloom(echoes[e], visualTime);
      drawBody(echoes[e], true, e, visualTime);
    }
    drawPlayerCloak(player, visualTime);
    drawBody(player, false, -1, visualTime);
    drawExit(visualTime);
    drawRecordingHud(visualTime);
  }

  function drawBackground(t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#080810');
    g.addColorStop(0.45, '#0c0c18');
    g.addColorStop(1, '#040406');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const rg = ctx.createRadialGradient(W * 0.5, -20, 0, W * 0.5, H * 0.35, 420);
    rg.addColorStop(0, 'rgba(' + ACCENT.r + ',' + ACCENT.g + ',' + ACCENT.b + ',0.12)');
    rg.addColorStop(0.5, 'rgba(' + ACCENT.r + ',' + ACCENT.g + ',' + ACCENT.b + ',0.02)');
    rg.addColorStop(1, 'transparent');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x + (Math.sin(t * 0.4 + x * 0.01) * 2), 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    for (let i = 0; i < dustParticles.length; i++) {
      const d = dustParticles[i];
      d.x += d.vx * 0.22;
      d.y += d.vy * 0.22;
      if (d.x < 0) d.x += W;
      if (d.x > W) d.x -= W;
      if (d.y < 0) d.y += H;
      if (d.y > H) d.y -= H;
      ctx.fillStyle = 'rgba(255,255,255,' + d.a + ')';
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawGearPath(cx, cy, r, teeth, rot) {
    ctx.beginPath();
    const step = (Math.PI * 2) / teeth;
    for (let i = 0; i < teeth; i++) {
      const a0 = rot + i * step;
      const a1 = a0 + step * 0.45;
      const a2 = a0 + step * 0.55;
      const a3 = a0 + step;
      const r0 = r * 0.88;
      const r1 = r;
      if (i === 0) ctx.moveTo(cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0);
      ctx.lineTo(cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1);
      ctx.lineTo(cx + Math.cos(a2) * r1, cy + Math.sin(a2) * r1);
      ctx.lineTo(cx + Math.cos(a3) * r0, cy + Math.sin(a3) * r0);
    }
    ctx.closePath();
  }

  function drawFarGears(t) {
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = 'rgba(' + ACCENT.r + ',' + ACCENT.g + ',' + ACCENT.b + ',0.5)';
    ctx.lineWidth = 2;
    const gears = [
      { x: 120, y: 100, r: 140, teeth: 16, sp: 0.04 },
      { x: 680, y: 80, r: 100, teeth: 12, sp: -0.05 },
      { x: 500, y: 360, r: 180, teeth: 24, sp: 0.025 },
    ];
    for (let g = 0; g < gears.length; g++) {
      const G = gears[g];
      drawGearPath(G.x, G.y, G.r, G.teeth, t * G.sp);
      ctx.stroke();
      drawGearPath(G.x, G.y, G.r * 0.55, G.teeth, t * G.sp + 0.2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLevelStatic() {
    for (let p = 0; p < level.platforms.length; p++) {
      const o = level.platforms[p];
      const lg = ctx.createLinearGradient(o.x, o.y, o.x, o.y + o.h);
      lg.addColorStop(0, '#2a2c38');
      lg.addColorStop(0.15, '#1a1c28');
      lg.addColorStop(1, '#12141c');
      ctx.fillStyle = lg;
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(o.x, o.y, o.w, Math.min(3, o.h * 0.08));
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(o.x + 0.5, o.y + 0.5, o.w - 1, o.h - 1);
    }
    for (let d = 0; d < level.doors.length; d++) {
      const door = level.doors[d];
      const open = plateActive(door.plateId);
      if (open) {
        const dg = ctx.createLinearGradient(door.x, door.y, door.x + door.w, door.y + door.h);
        dg.addColorStop(0, 'rgba(60,200,120,0.35)');
        dg.addColorStop(1, 'rgba(40,140,90,0.15)');
        ctx.fillStyle = dg;
      } else {
        ctx.fillStyle = '#252530';
      }
      ctx.fillRect(door.x, door.y, door.w, door.h);
      ctx.strokeStyle = open ? 'rgba(120,255,180,0.35)' : 'rgba(255,255,255,0.1)';
      ctx.strokeRect(door.x + 0.5, door.y + 0.5, door.w - 1, door.h - 1);
      if (!open) {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(door.x + 3, door.y + 3, door.w - 6, door.h - 6);
      }
    }
  }

  function drawPlates(t) {
    const pulse = 0.55 + Math.sin(t * 3) * 0.12;
    for (let p = 0; p < level.plates.length; p++) {
      const pl = level.plates[p];
      const on = plateActive(pl.id);
      if (on) {
        ctx.shadowColor = 'rgba(' + ACCENT.r + ',' + ACCENT.g + ',' + ACCENT.b + ',0.9)';
        ctx.shadowBlur = 18 * pulse;
      } else {
        ctx.shadowBlur = 0;
      }
      const alpha = on ? 0.35 + pulse * 0.25 : 0.1;
      ctx.fillStyle = on
        ? 'rgba(' + ACCENT.r + ',' + ACCENT.g + ',' + ACCENT.b + ',' + alpha + ')'
        : 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.roundRect(pl.x, pl.y, pl.w, pl.h, 5);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = on ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.12)';
      ctx.lineWidth = on ? 1.5 : 1;
      ctx.stroke();
    }
  }

  function drawCrates() {
    for (let c = 0; c < crates.length; c++) {
      const b = crates[c];
      const cx = b.x + b.w * 0.5;
      const cy = b.y + b.h * 0.5;
      ctx.shadowColor = 'rgba(232,200,140,0.35)';
      ctx.shadowBlur = 8;
      const g = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
      g.addColorStop(0, '#5a5862');
      g.addColorStop(0.45, '#35343f');
      g.addColorStop(1, '#1a1922');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 6);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(220,190,130,0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(b.w, b.h) * 0.22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const ang = (k / 8) * Math.PI * 2;
        const r0 = Math.min(b.w, b.h) * 0.28;
        const r1 = Math.min(b.w, b.h) * 0.38;
        ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
        ctx.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
      }
      ctx.stroke();
    }
  }

  function drawEchoTrail(idx, t) {
    const tr = trailBuffers[idx];
    if (!tr || tr.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < tr.length - 1; i++) {
      const a = (i + 1) / tr.length;
      ctx.strokeStyle = 'rgba(' + ACCENT.r + ',' + ACCENT.g + ',' + ACCENT.b + ',' + (a * 0.35) + ')';
      ctx.lineWidth = 3 + a * 4;
      ctx.beginPath();
      ctx.moveTo(tr[i].x, tr[i].y);
      ctx.lineTo(tr[i + 1].x, tr[i + 1].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawEchoBloom(b, t) {
    const cx = b.x + BODY_W * 0.5;
    const cy = b.y + BODY_H * 0.5;
    const pulse = 0.65 + Math.sin(t * 4 + b.x * 0.05) * 0.15;
    const rg = ctx.createRadialGradient(cx, cy, 2, cx, cy, 38 * pulse);
    rg.addColorStop(0, 'rgba(' + ACCENT.r + ',' + ACCENT.g + ',' + ACCENT.b + ',0.25)');
    rg.addColorStop(1, 'transparent');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(cx, cy, 40 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPlayerCloak(b, t) {
    const cx = b.x + BODY_W * 0.5;
    const cy = b.y + BODY_H * 0.55;
    const rg = ctx.createRadialGradient(cx, cy, 1, cx, cy, 28);
    rg.addColorStop(0, 'rgba(' + ACCENT.r + ',' + ACCENT.g + ',' + ACCENT.b + ',0.18)');
    rg.addColorStop(1, 'transparent');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBody(b, ghost, idx, t) {
    ctx.save();
    const hood = ctx.createLinearGradient(b.x, b.y, b.x + BODY_W, b.y + BODY_H);
    if (ghost) {
      ctx.globalAlpha = 0.5;
      hood.addColorStop(0, 'rgba(' + ACCENT.r + ',' + ACCENT.g + ',' + ACCENT.b + ',0.95)');
      hood.addColorStop(1, 'rgba(' + Math.floor(ACCENT.r * 0.5) + ',' + Math.floor(ACCENT.g * 0.5) + ',' + Math.floor(ACCENT.b * 0.5) + ',0.5)');
      ctx.shadowColor = 'rgba(' + ACCENT.r + ',' + ACCENT.g + ',' + ACCENT.b + ',0.9)';
      ctx.shadowBlur = 16;
    } else {
      hood.addColorStop(0, '#f8f8fc');
      hood.addColorStop(0.55, '#c8cad4');
      hood.addColorStop(1, '#6e7080');
    }
    ctx.fillStyle = hood;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, BODY_W, BODY_H, 7);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (!ghost) {
      ctx.fillStyle = 'rgba(20,22,32,0.85)';
      ctx.beginPath();
      ctx.roundRect(b.x + 3, b.y + 8, BODY_W - 6, 16, 4);
      ctx.fill();
      const glow = 0.55 + Math.sin(t * 5) * 0.25;
      ctx.fillStyle = 'rgba(' + ACCENT.r + ',' + ACCENT.g + ',' + ACCENT.b + ',' + glow + ')';
      ctx.beginPath();
      ctx.arc(b.x + BODY_W * 0.62, b.y + 16, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawExit(t) {
    const ex = level.exit;
    const cx = ex.x + ex.w * 0.5;
    const cy = ex.y + ex.h * 0.5;
    const rot = t * 1.2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.strokeStyle = 'rgba(232,200,120,0.5)';
    ctx.lineWidth = 2;
    drawGearPath(0, 0, Math.max(ex.w, ex.h) * 0.65, 10, 0);
    ctx.stroke();
    ctx.rotate(-rot * 2);
    drawGearPath(0, 0, Math.max(ex.w, ex.h) * 0.4, 8, 0.3);
    ctx.strokeStyle = 'rgba(255,220,160,0.35)';
    ctx.stroke();
    ctx.restore();
    const sh = 0.6 + Math.sin(t * 4) * 0.2;
    ctx.shadowColor = 'rgba(232,200,120,0.8)';
    ctx.shadowBlur = 22 * sh;
    ctx.strokeStyle = 'rgba(232,200,120,0.95)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(ex.x + 0.5, ex.y + 0.5, ex.w - 1, ex.h - 1);
    const gg = ctx.createLinearGradient(ex.x, ex.y, ex.x + ex.w, ex.y + ex.h);
    gg.addColorStop(0, 'rgba(232,200,120,0.25)');
    gg.addColorStop(1, 'rgba(232,200,120,0.05)');
    ctx.fillStyle = gg;
    ctx.fillRect(ex.x, ex.y, ex.w, ex.h);
    ctx.shadowBlur = 0;
  }

  function drawVignette() {
    const v = ctx.createRadialGradient(W * 0.5, H * 0.42, 120, W * 0.5, H * 0.5, Math.max(W, H) * 0.72);
    v.addColorStop(0, 'transparent');
    v.addColorStop(0.55, 'rgba(0,0,0,0.06)');
    v.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  function drawRecordingHud(t) {
    if (!recording) return;
    const blink = Math.sin(t * 12) > 0;
    ctx.fillStyle = 'rgba(25,8,12,0.75)';
    ctx.beginPath();
    ctx.roundRect(10, 8, 138, 32, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,80,100,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = blink ? '#ff4458' : '#aa2233';
    ctx.beginPath();
    ctx.arc(26, 24, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '600 13px Outfit, system-ui, sans-serif';
    ctx.fillText('REC  ' + (recordFrames.length / FPS).toFixed(1) + 's', 38, 28);
  }

  function showBubble(text, ms) {
    elBubble.innerHTML = '<p class="line">' + text + '</p>';
    const t = ms || 3000;
    setTimeout(function () {
      elBubble.innerHTML = '';
    }, t);
  }

  let audioCtx = null;
  function beep(freq, dur, type) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g);
      g.connect(audioCtx.destination);
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.value = 0.06;
      o.start();
      o.stop(audioCtx.currentTime + dur);
    } catch (e) {}
  }

  function playRewindSound() {
    beep(180, 0.15, 'triangle');
    setTimeout(function () {
      beep(120, 0.2, 'sawtooth');
    }, 60);
  }

  function playParadoxSound() {
    beep(80, 0.3, 'square');
    beep(60, 0.35, 'square');
  }

  function playWinChime() {
    beep(523, 0.12);
    setTimeout(function () {
      beep(659, 0.12);
    }, 100);
    setTimeout(function () {
      beep(784, 0.18);
    }, 200);
  }

  document.addEventListener('keydown', function (e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
      keys.jump = true;
      e.preventDefault();
    }
    if (e.code === 'KeyR' && !e.repeat) {
      if (!recording) {
        recording = true;
        recordFrames = [];
        recordFrameCount = 0;
        elTock.textContent = '10.0s';
        showBubble('Recording… press R again to bind Echo.', 2000);
      } else {
        commitRecording();
      }
      e.preventDefault();
    }
    if (e.code === 'Backspace') {
      eraseLastEcho();
      e.preventDefault();
    }
    if (e.code === 'KeyN') {
      loadLevel(levelIndex + 1);
      e.preventDefault();
    }
    if (e.code >= 'Digit1' && e.code <= 'Digit6') {
      applyChapterClass(parseInt(e.code.replace('Digit', ''), 10));
    }
  });

  document.addEventListener('keyup', function (e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') keys.jump = false;
  });

  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      const rr = Math.min(r, w / 2, h / 2);
      this.beginPath();
      this.moveTo(x + rr, y);
      this.arcTo(x + w, y, x + w, y + h, rr);
      this.arcTo(x + w, y + h, x, y + h, rr);
      this.arcTo(x, y + h, x, y, rr);
      this.arcTo(x, y, x + w, y, rr);
      this.closePath();
    };
  }

  loadLevel(0);
  requestAnimationFrame(frame);
  try {
    canvas.focus();
  } catch (err) {}
})();
