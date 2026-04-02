(function () {
  'use strict';

  // ═══════════════════════════════════════════════
  //  CONSTANTS
  // ═══════════════════════════════════════════════
  const UNLOCK_KEY = 'gd2_unlocked';
  const SOUND_KEY  = 'gd2_sound';

  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const GROUND_H    = 30;
  const GROUND_Y    = H - GROUND_H;
  const CEILING_Y   = 0;
  const PLAYER_X    = 100;
  const BASE_SIZE   = 30;
  const GRAVITY     = 0.6;
  const JUMP_VEL    = -14.5;
  const MAX_FALL    = 14;

  const scoreEl     = document.getElementById('score');
  const pctEl       = document.getElementById('pct');
  const progressEl  = document.getElementById('progress-fill');
  const levelNameEl = document.getElementById('level-name');
  const overlay     = document.getElementById('overlay');
  const overlayMsg  = document.getElementById('overlay-msg');
  const overlayBtns = document.getElementById('overlay-buttons');
  const levelSelEl  = document.getElementById('level-select');
  const gameAreaEl  = document.getElementById('game-area');

  // ═══════════════════════════════════════════════
  //  LEVEL DEFINITIONS
  // ═══════════════════════════════════════════════
  //  Each level has a seed-based procedural layout
  //  plus portal placements
  const LEVELS = [
    { length: 2500,  speed: 2.8, gap:[340,480], portalChance: 0.2,  col:'#00f0ff', bg:'#0a0a2a' },
    { length: 2800,  speed: 3.0, gap:[320,450], portalChance: 0.25, col:'#4dff70', bg:'#0a1a0a' },
    { length: 3000,  speed: 3.2, gap:[300,430], portalChance: 0.3,  col:'#ff6040', bg:'#1a0a0a' },
    { length: 3300,  speed: 3.4, gap:[290,410], portalChance: 0.2,  col:'#ff00e0', bg:'#1a0a1a' },
    { length: 3600,  speed: 3.6, gap:[280,400], portalChance: 0.25, col:'#ffe600', bg:'#1a1a0a' },
    { length: 4000,  speed: 3.8, gap:[270,390], portalChance: 0.3,  col:'#00ffaa', bg:'#0a1a1a' },
    { length: 4300,  speed: 4.0, gap:[260,370], portalChance: 0.35, col:'#ff4080', bg:'#1a0a15' },
    { length: 4600,  speed: 4.2, gap:[250,360], portalChance: 0.4,  col:'#80aaff', bg:'#0a0f1a' },
    { length: 5000,  speed: 4.4, gap:[240,350], portalChance: 0.45, col:'#ff8800', bg:'#1a0f0a' },
    { length: 5500,  speed: 4.6, gap:[230,340], portalChance: 0.5,  col:'#cc44ff', bg:'#120a1a' },
    { length: 6500,  speed: 4.8, gap:[220,320], portalChance: 0.55, col:'#ffffff', bg:'#0a0a0a' },
    { length: 7000,  speed: 5.0, gap:[210,310], portalChance: 0.35, col:'#ff00ff', bg:'#1a001a' },
    { length: 7500,  speed: 5.2, gap:[200,300], portalChance: 0.4,  col:'#00ffff', bg:'#001a1a' },
    { length: 8000,  speed: 5.4, gap:[190,290], portalChance: 0.45, col:'#ffff00', bg:'#1a1a00' },
    { length: 8500,  speed: 5.6, gap:[180,280], portalChance: 0.5,  col:'#ff6600', bg:'#1a0a00' },
    { length: 9000,  speed: 5.8, gap:[170,270], portalChance: 0.55, col:'#00ff66', bg:'#001a0a' },
    { length: 9500,  speed: 6.0, gap:[160,260], portalChance: 0.6,  col:'#ff0066', bg:'#1a000a' },
    { length: 10000, speed: 6.2, gap:[150,250], portalChance: 0.35, col:'#66ffff', bg:'#001a1a' },
    { length: 10500, speed: 6.4, gap:[140,240], portalChance: 0.4,  col:'#ffaa00', bg:'#1a0a00' },
    { length: 11000, speed: 6.6, gap:[130,230], portalChance: 0.45, col:'#aa00ff', bg:'#0a001a' },
    { length: 11500, speed: 6.8, gap:[120,220], portalChance: 0.5,  col:'#00aaff', bg:'#000a1a' },
    { length: 12000, speed: 7.0, gap:[110,210], portalChance: 0.55, col:'#ffff66', bg:'#1a1a00' },
    { length: 12500, speed: 7.2, gap:[100,200], portalChance: 0.6,  col:'#ff66aa', bg:'#1a000a' },
    { length: 13000, speed: 7.4, gap:[90,190],  portalChance: 0.35, col:'#66ff99', bg:'#001a06' },
    { length: 13500, speed: 7.6, gap:[80,180],  portalChance: 0.4,  col:'#ff9966', bg:'#1a0600' },
    { length: 14000, speed: 7.8, gap:[70,170],  portalChance: 0.45, col:'#9966ff', bg:'#0a001a' },
    { length: 14500, speed: 8.0, gap:[60,160],  portalChance: 0.5,  col:'#66ffee', bg:'#001a1a' },
    { length: 15000, speed: 8.2, gap:[50,150],  portalChance: 0.55, col:'#ffee66', bg:'#1a1a00' },
    { length: 15500, speed: 8.4, gap:[40,140],  portalChance: 0.6,  col:'#ff6699', bg:'#1a000a' },
    { length: 16000, speed: 8.6, gap:[30,130],  portalChance: 0.35, col:'#66ff66', bg:'#001a00' },
    { length: 16500, speed: 8.8, gap:[20,120],  portalChance: 0.4,  col:'#ff8866', bg:'#1a0300' },
    { length: 17000, speed: 9.0, gap:[10,110],  portalChance: 0.45, col:'#8866ff', bg:'#0a001a' },
    { length: 17500, speed: 9.2, gap:[5,100],   portalChance: 0.5,  col:'#66ffdd', bg:'#001a1a' },
    { length: 18000, speed: 9.4, gap:[5,90],    portalChance: 0.55, col:'#ffdd66', bg:'#1a1a00' },
    { length: 18500, speed: 9.6, gap:[5,80],    portalChance: 0.6,  col:'#ff6688', bg:'#1a000a' },
    { length: 19000, speed: 9.8, gap:[5,70],    portalChance: 0.35, col:'#66ff88', bg:'#001a00' },
    { length: 19500, speed: 10.0, gap:[5,60],   portalChance: 0.4,  col:'#ff7744', bg:'#1a0200' },
    { length: 20000, speed: 10.2, gap:[5,50],   portalChance: 0.45, col:'#7744ff', bg:'#080001' },
    { length: 20500, speed: 10.4, gap:[5,40],   portalChance: 0.5,  col:'#44ffcc', bg:'#001a0f' },
    { length: 21000, speed: 10.6, gap:[5,30],   portalChance: 0.55, col:'#ffcc44', bg:'#1a1200' },
    { length: 21500, speed: 10.8, gap:[5,20],   portalChance: 0.6,  col:'#ff4488', bg:'#1a000c' },
    { length: 22000, speed: 11.0, gap:[5,20],   portalChance: 0.35, col:'#88ccff', bg:'#001133' },
    { length: 22500, speed: 11.2, gap:[5,15],   portalChance: 0.4,  col:'#ffcc88', bg:'#331100' },
    { length: 23000, speed: 11.4, gap:[5,15],   portalChance: 0.45, col:'#88ff88', bg:'#003300' },
    { length: 23500, speed: 11.6, gap:[5,15],   portalChance: 0.5,  col:'#ff88ff', bg:'#330033' },
    { length: 24000, speed: 11.8, gap:[5,15],   portalChance: 0.55, col:'#88ffff', bg:'#003333' },
    { length: 24500, speed: 12.0, gap:[5,15],   portalChance: 0.6,  col:'#ffff88', bg:'#333300' },
    { length: 25000, speed: 12.2, gap:[5,10],   portalChance: 0.35, col:'#ff6699', bg:'#330011' },
    { length: 25500, speed: 12.4, gap:[5,10],   portalChance: 0.4,  col:'#66ff99', bg:'#110033' },
    { length: 26000, speed: 12.6, gap:[5,10],   portalChance: 0.45, col:'#6699ff', bg:'#001133' },
    { length: 26500, speed: 12.8, gap:[5,10],   portalChance: 0.5,  col:'#ff99ff', bg:'#330033' },
    { length: 27000, speed: 13.0, gap:[5,10],   portalChance: 0.55, col:'#99ffff', bg:'#003333' },
    { length: 27500, speed: 13.2, gap:[5,10],   portalChance: 0.6,  col:'#ffff99', bg:'#333300' },
    { length: 28000, speed: 13.4, gap:[5,10],   portalChance: 0.35, col:'#ff88cc', bg:'#330022' },
    { length: 28500, speed: 13.6, gap:[5,10],   portalChance: 0.4,  col:'#88ff88', bg:'#113300' },
    { length: 29000, speed: 13.8, gap:[5,10],   portalChance: 0.45, col:'#8888ff', bg:'#001133' },
    { length: 29500, speed: 14.0, gap:[5,10],   portalChance: 0.5,  col:'#ff88ff', bg:'#330033' },
    { length: 30000, speed: 14.2, gap:[5,5],    portalChance: 0.55, col:'#88ffff', bg:'#003333' },
    { length: 30500, speed: 14.4, gap:[5,5],    portalChance: 0.6,  col:'#ffcc00', bg:'#332000' },
    { length: 31000, speed: 14.6, gap:[5,5],    portalChance: 0.35, col:'#00ffcc', bg:'#003333' },
    { length: 31500, speed: 14.8, gap:[5,5],    portalChance: 0.4,  col:'#ff00ff', bg:'#330033' },
    { length: 32000, speed: 15.0, gap:[5,5],    portalChance: 0.45, col:'#00ffff', bg:'#003333' },
    { length: 32500, speed: 15.2, gap:[5,5],    portalChance: 0.5,  col:'#ffff00', bg:'#333300' },
    { length: 33000, speed: 15.4, gap:[5,5],    portalChance: 0.55, col:'#ff6600', bg:'#330800' },
    { length: 33500, speed: 15.6, gap:[5,5],    portalChance: 0.6,  col:'#00ff66', bg:'#003300' },
    { length: 34000, speed: 15.8, gap:[5,5],    portalChance: 0.35, col:'#0066ff', bg:'#000033' },
    { length: 34500, speed: 16.0, gap:[5,5],    portalChance: 0.4,  col:'#ff0066', bg:'#330011' },
    { length: 35000, speed: 16.2, gap:[5,5],    portalChance: 0.45, col:'#66ff00', bg:'#113300' },
    { length: 35500, speed: 16.4, gap:[5,5],    portalChance: 0.5,  col:'#0066ff', bg:'#000033' },
    { length: 36000, speed: 16.6, gap:[5,5],    portalChance: 0.55, col:'#ff66ff', bg:'#330033' },
    { length: 36500, speed: 16.8, gap:[5,5],    portalChance: 0.6,  col:'#66ffff', bg:'#003333' },
    { length: 37000, speed: 17.0, gap:[5,5],    portalChance: 0.35, col:'#ffff66', bg:'#333300' },
    { length: 37500, speed: 17.2, gap:[5,5],    portalChance: 0.4,  col:'#ff6666', bg:'#330000' },
    { length: 38000, speed: 17.4, gap:[5,5],    portalChance: 0.45, col:'#66ff66', bg:'#003300' },
    { length: 38500, speed: 17.6, gap:[5,5],    portalChance: 0.5,  col:'#6666ff', bg:'#000033' },
    { length: 39000, speed: 17.8, gap:[5,5],    portalChance: 0.55, col:'#ff66ff', bg:'#330033' },
    { length: 39500, speed: 18.0, gap:[5,5],    portalChance: 0.6,  col:'#66ffff', bg:'#003333' },
    { length: 40000, speed: 18.2, gap:[5,5],    portalChance: 0.35, col:'#ffff66', bg:'#333300' },
    { length: 40500, speed: 18.4, gap:[5,5],    portalChance: 0.4,  col:'#ff9944', bg:'#330011' },
    { length: 41000, speed: 18.6, gap:[5,5],    portalChance: 0.45, col:'#99ff44', bg:'#113300' },
    { length: 41500, speed: 18.8, gap:[5,5],    portalChance: 0.5,  col:'#4499ff', bg:'#001133' },
    { length: 42000, speed: 19.0, gap:[5,5],    portalChance: 0.55, col:'#ff44ff', bg:'#330033' },
    { length: 42500, speed: 19.2, gap:[5,5],    portalChance: 0.6,  col:'#44ffff', bg:'#003333' },
    { length: 43000, speed: 19.4, gap:[5,5],    portalChance: 0.35, col:'#ffff44', bg:'#333300' },
    { length: 43500, speed: 19.6, gap:[5,5],    portalChance: 0.4,  col:'#ff4444', bg:'#330000' },
    { length: 44000, speed: 19.8, gap:[5,5],    portalChance: 0.45, col:'#44ff44', bg:'#003300' },
    { length: 44500, speed: 20.0, gap:[5,5],    portalChance: 0.5,  col:'#4444ff', bg:'#000033' },
    { length: 45000, speed: 20.2, gap:[5,5],    portalChance: 0.55, col:'#ff44ff', bg:'#330033' },
    { length: 45500, speed: 20.4, gap:[5,5],    portalChance: 0.6,  col:'#44ffff', bg:'#003333' },
    { length: 46000, speed: 20.6, gap:[5,5],    portalChance: 0.35, col:'#ffff44', bg:'#333300' },
    { length: 46500, speed: 20.8, gap:[5,5],    portalChance: 0.4,  col:'#ff7744', bg:'#330700' },
    { length: 47000, speed: 21.0, gap:[5,5],    portalChance: 0.45, col:'#77ff44', bg:'#113300' },
    { length: 47500, speed: 21.2, gap:[5,5],    portalChance: 0.5,  col:'#4477ff', bg:'#001133' },
    { length: 48000, speed: 21.4, gap:[5,5],    portalChance: 0.55, col:'#ff44ff', bg:'#330033' },
    { length: 48500, speed: 21.6, gap:[5,5],    portalChance: 0.6,  col:'#44ffff', bg:'#003333' },
    { length: 49000, speed: 21.8, gap:[5,5],    portalChance: 0.35, col:'#ffff44', bg:'#333300' },
    { length: 49500, speed: 22.0, gap:[5,5],    portalChance: 0.4,  col:'#ff5544', bg:'#330000' },
    { length: 50000, speed: 22.2, gap:[5,5],    portalChance: 0.45, col:'#55ff44', bg:'#003300' },
    { length: 50500, speed: 22.4, gap:[5,5],    portalChance: 0.5,  col:'#4455ff', bg:'#000033' },
    { length: 51000, speed: 22.6, gap:[5,5],    portalChance: 0.55, col:'#ff44ff', bg:'#330033' },
    { length: 51500, speed: 22.8, gap:[5,5],    portalChance: 0.6,  col:'#44ffff', bg:'#003333' },
    { length: 52000, speed: 23.0, gap:[5,5],    portalChance: 0.35, col:'#ffff44', bg:'#333300' },
    { length: 52500, speed: 23.2, gap:[5,5],    portalChance: 0.4,  col:'#ff4466', bg:'#330011' },
    { length: 53000, speed: 23.4, gap:[5,5],    portalChance: 0.45, col:'#44ff66', bg:'#003300' },
    { length: 53500, speed: 23.6, gap:[5,5],    portalChance: 0.5,  col:'#4466ff', bg:'#000033' },
    { length: 54000, speed: 23.8, gap:[5,5],    portalChance: 0.55, col:'#ff44ff', bg:'#330033' },
    { length: 54500, speed: 24.0, gap:[5,5],    portalChance: 0.6,  col:'#44ffff', bg:'#003333' },
    { length: 55000, speed: 24.2, gap:[5,5],    portalChance: 0.35, col:'#ffff44', bg:'#333300' },
    { length: 55500, speed: 24.4, gap:[5,5],    portalChance: 0.4,  col:'#ff4488', bg:'#330022' },
    { length: 56000, speed: 24.6, gap:[5,5],    portalChance: 0.45, col:'#44ff88', bg:'#003300' },
    { length: 56500, speed: 24.8, gap:[5,5],    portalChance: 0.5,  col:'#4488ff', bg:'#000033' },
    { length: 57000, speed: 25.0, gap:[5,5],    portalChance: 0.55, col:'#ff44ff', bg:'#330033' },
    { length: 57500, speed: 25.2, gap:[5,5],    portalChance: 0.6,  col:'#44ffff', bg:'#003333' },
    { length: 58000, speed: 25.4, gap:[5,5],    portalChance: 0.35, col:'#ffff44', bg:'#333300' },
    { length: 58500, speed: 25.6, gap:[5,5],    portalChance: 0.4,  col:'#ff44aa', bg:'#330033' },
    { length: 59000, speed: 25.8, gap:[5,5],    portalChance: 0.45, col:'#44ffaa', bg:'#003333' },
    { length: 59500, speed: 26.0, gap:[5,5],    portalChance: 0.5,  col:'#44aaff', bg:'#001133' },
    { length: 60000, speed: 26.2, gap:[5,5],    portalChance: 0.55, col:'#ff44ff', bg:'#330033' },
    { length: 60500, speed: 26.4, gap:[5,5],    portalChance: 0.6,  col:'#44ffff', bg:'#003333' },
    { length: 61000, speed: 26.6, gap:[5,5],    portalChance: 0.35, col:'#ffff44', bg:'#333300' },
    { length: 61500, speed: 26.8, gap:[5,5],    portalChance: 0.4,  col:'#ffaa44', bg:'#330011' },
    { length: 62000, speed: 27.0, gap:[5,5],    portalChance: 0.45, col:'#aaffaa', bg:'#113300' },
    { length: 62500, speed: 27.2, gap:[5,5],    portalChance: 0.5,  col:'#aaaaff', bg:'#001133' },
    { length: 63000, speed: 27.4, gap:[5,5],    portalChance: 0.55, col:'#ffaa99', bg:'#330022' },
    { length: 63500, speed: 27.6, gap:[5,5],    portalChance: 0.6,  col:'#99ffaa', bg:'#003300' },
    { length: 64000, speed: 27.8, gap:[5,5],    portalChance: 0.35, col:'#99aaff', bg:'#001133' },
    { length: 64500, speed: 28.0, gap:[5,5],    portalChance: 0.4,  col:'#ffaa66', bg:'#330011' },
    { length: 65000, speed: 28.2, gap:[5,5],    portalChance: 0.45, col:'#66ffaa', bg:'#003300' },
    { length: 65500, speed: 28.4, gap:[5,5],    portalChance: 0.5,  col:'#66aaff', bg:'#000033' },
    { length: 66000, speed: 28.6, gap:[5,5],    portalChance: 0.55, col:'#ffaa33', bg:'#330011' },
    { length: 66500, speed: 28.8, gap:[5,5],    portalChance: 0.6,  col:'#33ffaa', bg:'#003300' },
    { length: 67000, speed: 29.0, gap:[5,5],    portalChance: 0.35, col:'#33aaff', bg:'#000033' },
    { length: 67500, speed: 29.2, gap:[5,5],    portalChance: 0.4,  col:'#ffaa11', bg:'#330000' },
    { length: 68000, speed: 29.4, gap:[5,5],    portalChance: 0.45, col:'#11ffaa', bg:'#003300' },
    { length: 68500, speed: 29.6, gap:[5,5],    portalChance: 0.5,  col:'#11aaff', bg:'#000033' },
    { length: 69000, speed: 29.8, gap:[5,5],    portalChance: 0.55, col:'#ff11ff', bg:'#330033' },
    { length: 69500, speed: 30.0, gap:[5,5],    portalChance: 0.6,  col:'#11ffff', bg:'#003333' },
  ];

  // Portal types
  const PORTAL = {
    GRAVITY_FLIP:  { type:'gravity',  color1:'#ffe600', color2:'#ff8800', label:'G',  icon:'↕' },
    SPEED_UP:      { type:'speed_up', color1:'#ff00e0', color2:'#ff4080', label:'>>',  icon:'»' },
    SPEED_DOWN:    { type:'speed_dn', color1:'#00f0ff', color2:'#0088ff', label:'<<',  icon:'«' },
    MINI:          { type:'mini',     color1:'#4dff70', color2:'#00cc44', label:'m',   icon:'▾' },
    BIG:           { type:'big',      color1:'#ff4040', color2:'#cc0000', label:'M',   icon:'▴' },
    TELEPORT:      { type:'teleport', color1:'#cc44ff', color2:'#8800ff', label:'T',   icon:'⊕' },
    JUMP_BOOST:    { type:'jump_boost', color1:'#00ffff', color2:'#ff6600', label:'J',  icon:'⇑' },
    JUMP_PAD:      { type:'jump_pad',   color1:'#ffff00', color2:'#ffaa00', label:'Π',  icon:'⬆' },
  };
  const PORTAL_TYPES = Object.values(PORTAL);

  // ═══════════════════════════════════════════════
  //  GAME STATE
  // ═══════════════════════════════════════════════
  let scrollOff = 0, scrollSpeed = 4, baseSpeed = 4;
  let playerY = 0, playerVelY = 0, playerSize = BASE_SIZE;
  let gravityDir = 1;        // 1 = normal, -1 = flipped
  let sizeScale = 1;         // 0.6 = mini, 1 = normal, 1.4 = big
  let playerAngle = 0;
  let obstacles = [], portals = [], orbs = [], particles = [];
  let nextSpawnAt = 0;
  let gameOver = false, levelComplete = false, started = false;
  let currentLevel = 0, levelLen = 5000;
  let animId = null;
  let levelColor = '#00f0ff', levelBg = '#0a0a2a';
  let bgStars = [];
  let shakeTime = 0;
  let trail = [];
  let deathParticles = [];
  let flashAlpha = 0;
  let orbsCollected = 0;
  let jumpBoostActive = false; // true = next jump is boosted

  // ═══════════════════════════════════════════════
  //  SOUND
  // ═══════════════════════════════════════════════
  function soundOn() {
    try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch(e) { return true; }
  }
  function getAC() {
    let ac = window._gdAC;
    if (!ac) { ac = new (window.AudioContext||window.webkitAudioContext)(); window._gdAC = ac; }
    if (ac.state==='suspended') ac.resume();
    return ac;
  }
  function sfx(kind) {
    if (!soundOn()) return;
    try {
      const ac = getAC(), now = ac.currentTime;
      const o = ac.createOscillator(), g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      let dur = 0.12;
      if (kind==='jump')  { o.type='sine'; o.frequency.setValueAtTime(500,now); o.frequency.linearRampToValueAtTime(720,now+0.08); dur=0.1; g.gain.setValueAtTime(0.1,now); }
      if (kind==='death') { o.type='sawtooth'; o.frequency.setValueAtTime(220,now); o.frequency.linearRampToValueAtTime(60,now+0.3); dur=0.35; g.gain.setValueAtTime(0.12,now); }
      if (kind==='win')   { o.type='sine'; o.frequency.setValueAtTime(523,now); o.frequency.setValueAtTime(659,now+0.08); o.frequency.setValueAtTime(784,now+0.16); o.frequency.setValueAtTime(1047,now+0.24); dur=0.4; g.gain.setValueAtTime(0.1,now); }
      if (kind==='portal'){ o.type='sine'; o.frequency.setValueAtTime(800,now); o.frequency.linearRampToValueAtTime(1200,now+0.15); dur=0.18; g.gain.setValueAtTime(0.08,now); }
      if (kind==='orb')   { o.type='sine'; o.frequency.setValueAtTime(1000,now); o.frequency.linearRampToValueAtTime(1400,now+0.08); dur=0.1; g.gain.setValueAtTime(0.06,now); }
      g.gain.exponentialRampToValueAtTime(0.001,now+dur);
      o.start(now); o.stop(now+dur+0.01);
    } catch(e){}
  }

  // ═══════════════════════════════════════════════
  //  UNLOCK / STORAGE
  // ═══════════════════════════════════════════════
  function getUnlocked() { try { const v=parseInt(localStorage.getItem(UNLOCK_KEY),10); return isNaN(v)?-1:Math.min(v,LEVELS.length-1); } catch(e){ return -1; } }
  function setUnlocked(i) { try { if(i>getUnlocked()) localStorage.setItem(UNLOCK_KEY,String(i)); } catch(e){} }
  function updateButtons() {
    const u = getUnlocked();
    document.querySelectorAll('.level-btn').forEach((b,i)=>{
      const locked = i > u+1;
      b.disabled = locked;
      b.classList.toggle('locked', locked);
    });
  }
  function updateSoundBtn() {
    const b = document.getElementById('btn-sound');
    if (b) b.textContent = soundOn() ? 'Sound: ON' : 'Sound: OFF';
  }

  // ═══════════════════════════════════════════════
  //  BACKGROUND STARS
  // ═══════════════════════════════════════════════
  function genStars() {
    bgStars = [];
    for (let i=0; i<120; i++) {
      bgStars.push({
        x: Math.random()*W,
        y: Math.random()*H,
        r: Math.random()*1.5+0.3,
        speed: Math.random()*0.3+0.05,
        bright: Math.random()*0.5+0.3,
      });
    }
  }

  // ═══════════════════════════════════════════════
  //  PARTICLES
  // ═══════════════════════════════════════════════
  function spawnParticles(x,y,color,count,spread) {
    for (let i=0;i<count;i++){
      particles.push({
        x, y,
        vx: (Math.random()-0.5)*spread,
        vy: (Math.random()-0.5)*spread,
        life: 1,
        decay: Math.random()*0.03+0.02,
        size: Math.random()*4+1,
        color
      });
    }
  }

  function spawnDeathEffect(x,y) {
    for (let i=0;i<40;i++){
      const a = (Math.PI*2/40)*i;
      const sp = Math.random()*6+2;
      deathParticles.push({
        x,y,
        vx: Math.cos(a)*sp,
        vy: Math.sin(a)*sp,
        life:1,
        decay: Math.random()*0.015+0.01,
        size: Math.random()*5+2,
        color: levelColor,
      });
    }
  }

  // ═══════════════════════════════════════════════
  //  LEVEL GENERATION
  // ═══════════════════════════════════════════════
  function genLevel(idx) {
    const L = LEVELS[idx];
    obstacles = [];
    portals = [];
    orbs = [];

    let x = W + 200;
    const end = L.length;
    let lastPortalX = 0;

    while (x < end - 200) {
      // Obstacle cluster
      const clusterSize = Math.random() < 0.3 ? 2 : 1;
      for (let c = 0; c < clusterSize; c++) {
        const kind = Math.random();
        if (kind < 0.55) {
          // Spike
          const w = 24 + Math.random()*12;
          const h = 30 + Math.random()*15;
          obstacles.push({ type:'spike', x: x+c*50, w, h });
        } else if (kind < 0.8) {
          // Block
          const w = 26 + Math.random()*20;
          const h = 26 + Math.random()*24;
          obstacles.push({ type:'block', x: x+c*60, w, h });
        } else {
          // Short pillar (jumpable)
          const w = 18 + Math.random()*10;
          const h = 30 + Math.random()*20;
          obstacles.push({ type:'pillar', x: x+c*50, w, h });
        }
      }

      // Maybe an orb above
      if (Math.random() < 0.4) {
        orbs.push({ x: x + 20, y: GROUND_Y - 90 - Math.random()*60, collected: false });
      }

      // Maybe a portal
      if (Math.random() < L.portalChance && x - lastPortalX > 500) {
        const pt = PORTAL_TYPES[Math.floor(Math.random()*PORTAL_TYPES.length)];
        portals.push({ x: x + 120, portalDef: pt, used: false });
        lastPortalX = x + 120;
      }

      const gap = L.gap[0] + Math.random()*(L.gap[1]-L.gap[0]);
      x += gap + clusterSize * 50;
    }
  }

  // ═══════════════════════════════════════════════
  //  COLLISION
  // ═══════════════════════════════════════════════
  function rectsOverlap(ax,ay,aw,ah, bx,by,bw,bh) {
    return ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by;
  }

  function triPlayerCollision(px,py,ps, tx,ty,tw,th) {
    // Approximate triangle as narrower rect
    const margin = tw*0.2;
    return rectsOverlap(px,py,ps,ps, tx+margin,ty,tw-margin*2,th);
  }

  // ═══════════════════════════════════════════════
  //  UPDATE
  // ═══════════════════════════════════════════════
  function update() {
    if (gameOver || levelComplete || !started) return;

    scrollOff += scrollSpeed;
    const pct = Math.min(100, Math.floor((scrollOff / levelLen)*100));
    scoreEl.textContent = Math.floor(scrollOff / 8);
    pctEl.textContent = pct + '%';
    progressEl.style.width = pct + '%';

    // Level complete
    if (scrollOff >= levelLen) {
      scrollOff = levelLen;
      levelComplete = true;
      setUnlocked(currentLevel);
      sfx('win');
      flashAlpha = 1;
      showOverlay(
        currentLevel === LEVELS.length-1 ? 'ALL LEVELS COMPLETE!' : 'LEVEL COMPLETE!',
        currentLevel < LEVELS.length-1 ? [
          { text:'Level Select', action: showMenu },
          { text:'Next Level', action:()=>startLevel(currentLevel+1) }
        ] : [{ text:'Level Select', action: showMenu }]
      );
      return;
    }

    // Gravity & physics
    const grav = GRAVITY * gravityDir;
    playerVelY += grav;
    playerVelY = Math.max(-MAX_FALL, Math.min(MAX_FALL, playerVelY));
    playerY += playerVelY;

    const ps = playerSize;
    // Ground / ceiling clamping
    if (gravityDir === 1) {
      if (playerY >= GROUND_Y - ps) { playerY = GROUND_Y - ps; playerVelY = 0; }
      if (playerY < CEILING_Y) { playerY = CEILING_Y; playerVelY = 0; }
    } else {
      if (playerY <= CEILING_Y) { playerY = CEILING_Y; playerVelY = 0; }
      if (playerY + ps > GROUND_Y) { playerY = GROUND_Y - ps; playerVelY = 0; }
    }

    // Rotation
    const onGround = gravityDir===1 ? (playerY >= GROUND_Y-ps-1) : (playerY <= CEILING_Y+1);
    if (!onGround) {
      playerAngle += 0.08 * gravityDir;
    } else {
      // Snap to nearest 90 degrees
      const target = Math.round(playerAngle / (Math.PI/2)) * (Math.PI/2);
      playerAngle += (target - playerAngle) * 0.3;
    }

    // Trail
    trail.push({ x: PLAYER_X + ps/2, y: playerY + ps/2, life: 1 });
    if (trail.length > 25) trail.shift();

    // Spawn particles from player
    if (Math.random() < 0.4) {
      spawnParticles(PLAYER_X, playerY + ps/2, levelColor, 1, 2);
    }

    // Check obstacle collisions
    const px = PLAYER_X, py = playerY;
    for (const o of obstacles) {
      const ox = o.x - scrollOff;
      if (ox > W + 50) break;
      if (ox + o.w < -50) continue;

      let hit = false;
      // Obstacles stick to floor when gravity normal, ceiling when flipped
      const oy = gravityDir === 1 ? GROUND_Y - o.h : CEILING_Y;
      if (o.type === 'spike') {
        hit = triPlayerCollision(px,py,ps, ox,oy,o.w,o.h);
      } else {
        hit = rectsOverlap(px,py,ps,ps, ox,oy,o.w,o.h);
      }

      if (hit) {
        die();
        return;
      }
    }

    // Check portal collisions
    for (const p of portals) {
      if (p.used) continue;
      const px2 = p.x - scrollOff;
      if (px2 > W+50 || px2 < -80) continue;
      if (rectsOverlap(PLAYER_X, playerY, ps, ps, px2, GROUND_Y-90, 40, 80)) {
        activatePortal(p);
      }
    }

    // Check orb collisions
    for (const o of orbs) {
      if (o.collected) continue;
      const ox = o.x - scrollOff;
      if (ox > W+50 || ox < -50) continue;
      const dist = Math.hypot((PLAYER_X+ps/2)-(ox), (playerY+ps/2)-(o.y));
      if (dist < ps/2 + 12) {
        o.collected = true;
        orbsCollected++;
        sfx('orb');
        spawnParticles(ox, o.y, '#ffe600', 12, 5);
      }
    }

    // Update particles
    particles = particles.filter(p => {
      p.x += p.vx; p.y += p.vy;
      p.life -= p.decay;
      return p.life > 0;
    });

    deathParticles = deathParticles.filter(p => {
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.98; p.vy *= 0.98;
      p.life -= p.decay;
      return p.life > 0;
    });

    // Trail decay
    trail.forEach(t => t.life -= 0.04);
    trail = trail.filter(t => t.life > 0);

    // Shake decay
    if (shakeTime > 0) shakeTime -= 0.05;

    // Flash decay
    if (flashAlpha > 0) flashAlpha -= 0.03;

    // Stars parallax
    bgStars.forEach(s => {
      s.x -= s.speed * scrollSpeed * 0.3;
      if (s.x < 0) { s.x = W; s.y = Math.random()*H; }
    });
  }

  function die() {
    gameOver = true;
    shakeTime = 1;
    sfx('death');
    spawnDeathEffect(PLAYER_X + playerSize/2, playerY + playerSize/2);
    flashAlpha = 0.6;
    showOverlay(
      'CRASHED! Score: ' + Math.floor(scrollOff/8),
      [
        { text:'Retry', action:()=>startLevel(currentLevel) },
        { text:'Level Select', action: showMenu }
      ]
    );
  }

  function activatePortal(p) {
    p.used = true;
    sfx('portal');
    flashAlpha = 0.4;
    const def = p.portalDef;
    spawnParticles(p.x - scrollOff + 20, GROUND_Y - 50, def.color1, 25, 8);

    switch (def.type) {
      case 'gravity':
        gravityDir *= -1;
        playerVelY = 0;
        break;
      case 'speed_up':
        scrollSpeed = Math.min(baseSpeed * 1.8, scrollSpeed * 1.3);
        break;
      case 'speed_dn':
        scrollSpeed = Math.max(baseSpeed * 0.6, scrollSpeed * 0.75);
        break;
      case 'mini':
        sizeScale = 0.6;
        playerSize = Math.round(BASE_SIZE * sizeScale);
        break;
      case 'big':
        sizeScale = 1.3;
        playerSize = Math.round(BASE_SIZE * sizeScale);
        break;
      case 'teleport':
        // Jump forward
        scrollOff += 200;
        flashAlpha = 0.8;
        break;
      case 'jump_boost':
        jumpBoostActive = true;
        break;
      case 'jump_pad':
        // High jump - makes you jump really high one time
        const padBoost = 2.2;
        playerVelY = JUMP_VEL * gravityDir * padBoost;
        spawnParticles(p.x - scrollOff + 20, GROUND_Y - 50, '#ffff00', 20, 8);
        break;
    }
  }

  // ═══════════════════════════════════════════════
  //  DRAW
  // ═══════════════════════════════════════════════
  function draw() {
    // Shake offset
    let sx = 0, sy = 0;
    if (shakeTime > 0) {
      sx = (Math.random()-0.5) * 8 * shakeTime;
      sy = (Math.random()-0.5) * 8 * shakeTime;
    }

    ctx.save();
    ctx.translate(sx, sy);

    // Background
    const grad = ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0, levelBg);
    grad.addColorStop(1, '#000');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,W,H);

    // Stars
    bgStars.forEach(s => {
      ctx.globalAlpha = s.bright;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Ground
    const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, H);
    groundGrad.addColorStop(0, levelColor + '30');
    groundGrad.addColorStop(1, '#000');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, GROUND_Y, W, GROUND_H);

    // Ground line (neon glow)
    ctx.shadowColor = levelColor;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = levelColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(W, GROUND_Y);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Ceiling line (neon glow) when gravity flipped
    if (gravityDir === -1) {
      ctx.shadowColor = levelColor;
      ctx.shadowBlur = 12;
      ctx.strokeStyle = levelColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, CEILING_Y);
      ctx.lineTo(W, CEILING_Y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Grid lines on ground
    ctx.strokeStyle = levelColor + '15';
    ctx.lineWidth = 1;
    const gridOff = scrollOff % 40;
    for (let gx = -gridOff; gx < W; gx += 40) {
      ctx.beginPath(); ctx.moveTo(gx, GROUND_Y); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = GROUND_Y+10; gy < H; gy += 10) {
      ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke();
    }

    // ── PORTALS ──
    for (const p of portals) {
      const px = p.x - scrollOff;
      if (px < -80 || px > W+80) continue;
      const def = p.portalDef;
      const py = GROUND_Y - 90;
      const pw = 40, ph = 80;

      ctx.save();
      if (p.used) ctx.globalAlpha = 0.2;

      // Portal frame glow
      ctx.shadowColor = def.color1;
      ctx.shadowBlur = 20;
      ctx.strokeStyle = def.color1;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(px+pw/2, py+ph/2, pw/2, ph/2, 0, 0, Math.PI*2);
      ctx.stroke();

      // Inner fill
      const pGrad = ctx.createRadialGradient(px+pw/2,py+ph/2,5, px+pw/2,py+ph/2,ph/2);
      pGrad.addColorStop(0, def.color2+'80');
      pGrad.addColorStop(1, def.color1+'10');
      ctx.fillStyle = pGrad;
      ctx.fill();

      // Icon
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.icon, px+pw/2, py+ph/2);

      ctx.restore();
    }

    // ── ORBS ──
    for (const o of orbs) {
      if (o.collected) continue;
      const ox = o.x - scrollOff;
      if (ox < -30 || ox > W+30) continue;
      const pulse = Math.sin(Date.now()*0.005)*2;
      ctx.shadowColor = '#ffe600';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ffe600';
      ctx.beginPath();
      ctx.arc(ox, o.y, 8+pulse, 0, Math.PI*2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Inner white
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ox, o.y, 3, 0, Math.PI*2);
      ctx.fill();
    }

    // ── OBSTACLES ──
    for (const o of obstacles) {
      const ox = o.x - scrollOff;
      if (ox > W+60 || ox+o.w < -60) continue;
      // Floor or ceiling depending on gravity
      const onFloor = gravityDir === 1;
      const oy = onFloor ? GROUND_Y - o.h : CEILING_Y;
      const base = onFloor ? GROUND_Y : CEILING_Y + o.h;

      if (o.type === 'spike') {
        // Neon triangle spike
        ctx.shadowColor = '#ff4040';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#ff404080';
        ctx.strokeStyle = '#ff4040';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (onFloor) {
          ctx.moveTo(ox + o.w/2, oy);       // tip points up
          ctx.lineTo(ox + o.w, GROUND_Y);
          ctx.lineTo(ox, GROUND_Y);
        } else {
          ctx.moveTo(ox + o.w/2, oy + o.h); // tip points down
          ctx.lineTo(ox + o.w, CEILING_Y);
          ctx.lineTo(ox, CEILING_Y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (o.type === 'pillar') {
        // Tall glowing pillar
        ctx.shadowColor = levelColor;
        ctx.shadowBlur = 6;
        ctx.fillStyle = levelColor + '40';
        ctx.fillRect(ox, oy, o.w, o.h);
        ctx.strokeStyle = levelColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(ox, oy, o.w, o.h);
        ctx.shadowBlur = 0;
        // Stripes
        ctx.fillStyle = levelColor + '20';
        for (let sy2 = oy+5; sy2 < oy+o.h-5; sy2 += 12) {
          ctx.fillRect(ox+2, sy2, o.w-4, 4);
        }
      } else {
        // Block
        ctx.shadowColor = '#ff6040';
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#ff604050';
        ctx.fillRect(ox, oy, o.w, o.h);
        ctx.strokeStyle = '#ff6040';
        ctx.lineWidth = 2;
        ctx.strokeRect(ox, oy, o.w, o.h);
        ctx.shadowBlur = 0;
        // X mark
        ctx.strokeStyle = '#ff604060';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ox,oy); ctx.lineTo(ox+o.w,oy+o.h);
        ctx.moveTo(ox+o.w,oy); ctx.lineTo(ox,oy+o.h);
        ctx.stroke();
      }
    }

    // ── TRAIL ──
    for (let i=0; i<trail.length; i++) {
      const t = trail[i];
      const tx = t.x - (scrollOff - (scrollOff - scrollSpeed*(trail.length-i)*0.3));
      ctx.globalAlpha = t.life * 0.4;
      ctx.fillStyle = levelColor;
      const ts = playerSize * t.life * 0.5;
      ctx.fillRect(t.x - scrollSpeed*(trail.length-i)*0.4 - ts/2, t.y - ts/2, ts, ts);
    }
    ctx.globalAlpha = 1;

    // ── PARTICLES ──
    for (const p of particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x-p.size/2, p.y-p.size/2, p.size, p.size);
    }
    for (const p of deathParticles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      const s = p.size * p.life;
      ctx.fillRect(p.x-s/2, p.y-s/2, s, s);
    }
    ctx.globalAlpha = 1;

    // ── PLAYER ──
    if (!gameOver) {
      const ps = playerSize;
      const cx = PLAYER_X + ps/2;
      const cy = playerY + ps/2;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(playerAngle);

      // Glow
      ctx.shadowColor = levelColor;
      ctx.shadowBlur = 16;

      // Body
      ctx.fillStyle = levelColor;
      ctx.fillRect(-ps/2, -ps/2, ps, ps);

      // Border
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-ps/2, -ps/2, ps, ps);

      // Inner highlight
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(-ps/2+3, -ps/2+3, ps/2-3, ps/2-3);

      ctx.shadowBlur = 0;

      // Jump boost indicator (pulsing glow around player)
      if (jumpBoostActive) {
        const pulse = Math.sin(Date.now()*0.008)*0.3 + 0.5;
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 30 * pulse;
        ctx.strokeStyle = `rgba(0,255,255,${pulse})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(-ps/2 - 4, -ps/2 - 4, ps + 8, ps + 8);
        ctx.shadowBlur = 0;
      }

      ctx.restore();

      // Gravity flip indicator
      if (gravityDir === -1) {
        ctx.fillStyle = '#ffe60080';
        ctx.font = 'bold 10px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText('↕', PLAYER_X + ps/2, playerY - 8);
      }
    }

    // ── NOT STARTED OVERLAY ──
    if (!started && !gameOver && !levelComplete) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle = levelColor;
      ctx.font = 'bold 22px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TAP TO START', W/2, H/2 - 10);
      ctx.fillStyle = '#888';
      ctx.font = '12px Orbitron';
      ctx.fillText('Space / Click / Up', W/2, H/2 + 20);
    }

    // ── FLASH ──
    if (flashAlpha > 0) {
      ctx.fillStyle = `rgba(255,255,255,${flashAlpha * 0.3})`;
      ctx.fillRect(0,0,W,H);
    }

    // ── ORB COUNTER ──
    if (orbsCollected > 0) {
      ctx.fillStyle = '#ffe600';
      ctx.font = 'bold 13px Orbitron';
      ctx.textAlign = 'right';
      ctx.fillText('★ ' + orbsCollected, W - 12, 20);
    }

    ctx.restore();
  }

  // ═══════════════════════════════════════════════
  //  LOOP
  // ═══════════════════════════════════════════════
  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }

  // ═══════════════════════════════════════════════
  //  INPUT
  // ═══════════════════════════════════════════════
  function jump() {
    if (!started) {
      started = true;
      overlay.classList.add('hidden');
    }
    if (gameOver || levelComplete) return;

    const ps = playerSize;
    const onGround = gravityDir===1
      ? (playerY >= GROUND_Y - ps - 2)
      : (playerY <= CEILING_Y + 2);

    if (onGround) {
      const boost = jumpBoostActive ? 1.8 : 1;
      playerVelY = JUMP_VEL * gravityDir * boost;
      if (jumpBoostActive) {
        jumpBoostActive = false;
        spawnParticles(PLAYER_X + ps/2, playerY + ps/2, '#00ffff', 15, 6);
      }
      sfx('jump');
      spawnParticles(PLAYER_X + ps/2, playerY + (gravityDir===1 ? ps : 0), levelColor, 6, 3);
    }
  }

  document.addEventListener('keydown', e => {
    if (e.code==='Space' || e.code==='ArrowUp' || e.code==='KeyW') { e.preventDefault(); jump(); }
  });
  canvas.addEventListener('click', jump);
  canvas.addEventListener('touchstart', e => { e.preventDefault(); jump(); }, {passive:false});

  // ═══════════════════════════════════════════════
  //  OVERLAY HELPERS
  // ═══════════════════════════════════════════════
  function showOverlay(msg, buttons) {
    overlayMsg.textContent = msg;
    overlayBtns.innerHTML = '';
    buttons.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = b.text;
      btn.addEventListener('click', b.action);
      overlayBtns.appendChild(btn);
    });
    overlay.classList.remove('hidden');
  }

  function showMenu() {
    levelSelEl.classList.remove('hidden');
    gameAreaEl.classList.add('hidden');
    updateButtons();
    updateSoundBtn();
    if (animId) { cancelAnimationFrame(animId); animId = null; }
  }

  // ═══════════════════════════════════════════════
  //  START LEVEL
  // ═══════════════════════════════════════════════
  function startLevel(idx) {
    currentLevel = idx;
    const L = LEVELS[idx];
    baseSpeed = L.speed;
    scrollSpeed = L.speed;
    levelLen = L.length;
    levelColor = L.col;
    levelBg = L.bg;

    scrollOff = 0;
    playerSize = BASE_SIZE;
    sizeScale = 1;
    playerY = GROUND_Y - playerSize;
    playerVelY = 0;
    playerAngle = 0;
    gravityDir = 1;
    gameOver = false;
    levelComplete = false;
    started = false;
    shakeTime = 0;
    flashAlpha = 0;
    trail = [];
    particles = [];
    deathParticles = [];
    orbsCollected = 0;
    jumpBoostActive = false;

    genStars();
    genLevel(idx);

    levelSelEl.classList.add('hidden');
    gameAreaEl.classList.remove('hidden');
    scoreEl.textContent = '0';
    pctEl.textContent = '0%';
    progressEl.style.width = '0%';
    levelNameEl.textContent = 'Level ' + (idx+1);
    overlay.classList.add('hidden');

    if (animId) cancelAnimationFrame(animId);
    loop();
  }

  // ═══════════════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════════════
  document.getElementById('level-buttons').addEventListener('click', e => {
    const btn = e.target.closest('.level-btn');
    if (!btn || btn.disabled) return;
    const idx = parseInt(btn.getAttribute('data-level'),10) - 1;
    if (idx >= 0 && idx < LEVELS.length) startLevel(idx);
  });

  document.getElementById('btn-sound').addEventListener('click', () => {
    try { localStorage.setItem(SOUND_KEY, soundOn()?'off':'on'); } catch(e){}
    updateSoundBtn();
  });

  updateButtons();
  updateSoundBtn();

  // ═══════════════════════════════════════════════
  //  LEVEL EDITOR
  // ═══════════════════════════════════════════════
  const EDITOR_KEY = 'gd2_editor_level';
  const editorAreaEl = document.getElementById('editor-area');
  const editorCanvas = document.getElementById('editor-canvas');
  const editorCtx = editorCanvas.getContext('2d');
  const GRID = 40; // grid cell size
  const ED_H = editorCanvas.height; // 400
  const ED_GROUND_Y = ED_H - GROUND_H;

  let editorTool = 'spike';
  let editorItems = []; // {type, gridX, gridY}
  let editorSpeed = 3.0;
  let editorColor = '#00f0ff';
  let isCustomLevel = false;

  const PORTAL_MAP = {
    portal_gravity: PORTAL.GRAVITY_FLIP,
    portal_speed_up: PORTAL.SPEED_UP,
    portal_speed_dn: PORTAL.SPEED_DOWN,
    portal_mini: PORTAL.MINI,
    portal_big: PORTAL.BIG,
    portal_teleport: PORTAL.TELEPORT,
    portal_jump_boost: PORTAL.JUMP_BOOST,
    portal_jump_pad: PORTAL.JUMP_PAD,
  };

  // Tool selection
  document.getElementById('editor-tools').addEventListener('click', e => {
    const btn = e.target.closest('.tool-btn');
    if (!btn) return;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    editorTool = btn.getAttribute('data-tool');
  });

  // Speed slider
  const speedSlider = document.getElementById('editor-speed');
  const speedVal = document.getElementById('editor-speed-val');
  speedSlider.addEventListener('input', () => {
    editorSpeed = parseFloat(speedSlider.value);
    speedVal.textContent = editorSpeed.toFixed(1);
  });

  // Color picker
  document.getElementById('editor-color').addEventListener('input', e => {
    editorColor = e.target.value;
    drawEditor();
  });

  // Open editor
  document.getElementById('btn-editor').addEventListener('click', () => {
    levelSelEl.classList.add('hidden');
    gameAreaEl.classList.add('hidden');
    editorAreaEl.classList.remove('hidden');
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    loadEditorFromStorage();
    drawEditor();
  });

  // Back to menu
  document.getElementById('btn-editor-back').addEventListener('click', () => {
    editorAreaEl.classList.add('hidden');
    showMenu();
  });

  // Clear
  document.getElementById('btn-editor-clear').addEventListener('click', () => {
    editorItems = [];
    drawEditor();
  });

  // Save
  document.getElementById('btn-editor-save').addEventListener('click', () => {
    try {
      localStorage.setItem(EDITOR_KEY, JSON.stringify({
        items: editorItems,
        speed: editorSpeed,
        color: editorColor
      }));
    } catch(e){}
  });

  // Load
  document.getElementById('btn-editor-load').addEventListener('click', () => {
    loadEditorFromStorage();
    drawEditor();
  });

  function loadEditorFromStorage() {
    try {
      const data = JSON.parse(localStorage.getItem(EDITOR_KEY));
      if (data && data.items) {
        editorItems = data.items;
        editorSpeed = data.speed || 3.0;
        editorColor = data.color || '#00f0ff';
        speedSlider.value = editorSpeed;
        speedVal.textContent = editorSpeed.toFixed(1);
        document.getElementById('editor-color').value = editorColor;
      }
    } catch(e){}
  }

  // Play custom level
  document.getElementById('btn-editor-play').addEventListener('click', () => {
    if (editorItems.length === 0) return;
    isCustomLevel = true;
    startCustomLevel();
  });

  function startCustomLevel() {
    // Find the rightmost item to determine level length
    let maxX = 0;
    editorItems.forEach(item => {
      const px = item.gridX * GRID;
      if (px > maxX) maxX = px;
    });
    const customLength = maxX + 700; // add buffer

    currentLevel = -1;
    baseSpeed = editorSpeed;
    scrollSpeed = editorSpeed;
    levelLen = customLength;
    levelColor = editorColor;
    levelBg = '#0a0a2a';

    scrollOff = 0;
    playerSize = BASE_SIZE;
    sizeScale = 1;
    playerY = GROUND_Y - playerSize;
    playerVelY = 0;
    playerAngle = 0;
    gravityDir = 1;
    gameOver = false;
    levelComplete = false;
    started = false;
    shakeTime = 0;
    flashAlpha = 0;
    trail = [];
    particles = [];
    deathParticles = [];
    orbsCollected = 0;
    jumpBoostActive = false;

    genStars();

    // Convert editor items to game objects
    obstacles = [];
    portals = [];
    orbs = [];

    editorItems.forEach(item => {
      const px = item.gridX * GRID;
      const py = item.gridY * GRID;

      if (item.type === 'spike') {
        obstacles.push({ type: 'spike', x: px, w: 30, h: 35 });
      } else if (item.type === 'block') {
        obstacles.push({ type: 'block', x: px, w: 36, h: 36 });
      } else if (item.type === 'pillar') {
        obstacles.push({ type: 'pillar', x: px, w: 22, h: 45 });
      } else if (item.type === 'orb') {
        orbs.push({ x: px + 20, y: py + GRID/2, collected: false });
      } else if (item.type.startsWith('portal_')) {
        const portalDef = PORTAL_MAP[item.type];
        if (portalDef) {
          portals.push({ x: px, portalDef: portalDef, used: false });
        }
      }
    });

    editorAreaEl.classList.add('hidden');
    levelSelEl.classList.add('hidden');
    gameAreaEl.classList.remove('hidden');
    scoreEl.textContent = '0';
    pctEl.textContent = '0%';
    progressEl.style.width = '0%';
    levelNameEl.textContent = 'Custom Level';
    overlay.classList.add('hidden');

    if (animId) cancelAnimationFrame(animId);
    loop();
  }

  // Override showOverlay for custom levels to add "Edit" button
  const origShowOverlay = showOverlay;
  showOverlay = function(msg, buttons) {
    if (isCustomLevel) {
      buttons.push({ text: 'Edit Level', action: () => {
        isCustomLevel = false;
        editorAreaEl.classList.remove('hidden');
        gameAreaEl.classList.add('hidden');
        if (animId) { cancelAnimationFrame(animId); animId = null; }
        drawEditor();
      }});
      // Replace retry to replay custom
      const retryIdx = buttons.findIndex(b => b.text === 'Retry');
      if (retryIdx >= 0) {
        buttons[retryIdx] = { text: 'Retry', action: () => { isCustomLevel = true; startCustomLevel(); } };
      }
      // Remove "Next Level" for custom
      const nextIdx = buttons.findIndex(b => b.text === 'Next Level');
      if (nextIdx >= 0) buttons.splice(nextIdx, 1);
    }
    origShowOverlay(msg, buttons);
  };

  // Also fix Level Select button for custom levels
  const origShowMenu = showMenu;
  showMenu = function() {
    isCustomLevel = false;
    origShowMenu();
  };

  // ── EDITOR CANVAS INTERACTION ──
  function getEditorGridPos(e) {
    const rect = editorCanvas.getBoundingClientRect();
    const scaleX = editorCanvas.width / rect.width;
    const scaleY = editorCanvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    return { gridX: Math.floor(x / GRID), gridY: Math.floor(y / GRID) };
  }

  function itemAt(gx, gy) {
    return editorItems.findIndex(i => i.gridX === gx && i.gridY === gy);
  }

  editorCanvas.addEventListener('click', e => {
    const { gridX, gridY } = getEditorGridPos(e);
    // Don't place below ground
    if (gridY * GRID >= ED_GROUND_Y) return;

    if (editorTool === 'eraser') {
      const idx = itemAt(gridX, gridY);
      if (idx >= 0) editorItems.splice(idx, 1);
    } else {
      // Remove existing item at this position
      const idx = itemAt(gridX, gridY);
      if (idx >= 0) editorItems.splice(idx, 1);
      editorItems.push({ type: editorTool, gridX, gridY });
    }
    drawEditor();
  });

  editorCanvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    const { gridX, gridY } = getEditorGridPos(e);
    const idx = itemAt(gridX, gridY);
    if (idx >= 0) {
      editorItems.splice(idx, 1);
      drawEditor();
    }
  });

  // ── EDITOR DRAWING ──
  function drawEditor() {
    const ew = editorCanvas.width;
    const eh = editorCanvas.height;

    // Background
    const grad = editorCtx.createLinearGradient(0,0,0,eh);
    grad.addColorStop(0, '#0a0a2a');
    grad.addColorStop(1, '#000');
    editorCtx.fillStyle = grad;
    editorCtx.fillRect(0,0,ew,eh);

    // Grid lines
    editorCtx.strokeStyle = 'rgba(255,255,255,0.04)';
    editorCtx.lineWidth = 1;
    for (let x = 0; x < ew; x += GRID) {
      editorCtx.beginPath(); editorCtx.moveTo(x,0); editorCtx.lineTo(x,eh); editorCtx.stroke();
    }
    for (let y = 0; y < eh; y += GRID) {
      editorCtx.beginPath(); editorCtx.moveTo(0,y); editorCtx.lineTo(ew,y); editorCtx.stroke();
    }

    // Ground
    editorCtx.fillStyle = editorColor + '20';
    editorCtx.fillRect(0, ED_GROUND_Y, ew, GROUND_H);
    editorCtx.strokeStyle = editorColor;
    editorCtx.lineWidth = 2;
    editorCtx.beginPath();
    editorCtx.moveTo(0, ED_GROUND_Y);
    editorCtx.lineTo(ew, ED_GROUND_Y);
    editorCtx.stroke();

    // Player start indicator
    editorCtx.fillStyle = editorColor + '60';
    editorCtx.fillRect(PLAYER_X - BASE_SIZE/2, ED_GROUND_Y - BASE_SIZE, BASE_SIZE, BASE_SIZE);
    editorCtx.strokeStyle = '#fff';
    editorCtx.lineWidth = 1;
    editorCtx.strokeRect(PLAYER_X - BASE_SIZE/2, ED_GROUND_Y - BASE_SIZE, BASE_SIZE, BASE_SIZE);
    editorCtx.fillStyle = '#fff';
    editorCtx.font = '9px Orbitron';
    editorCtx.textAlign = 'center';
    editorCtx.fillText('START', PLAYER_X, ED_GROUND_Y - BASE_SIZE - 4);

    // Draw items
    editorItems.forEach(item => {
      const px = item.gridX * GRID;
      const py = item.gridY * GRID;

      if (item.type === 'spike') {
        editorCtx.fillStyle = '#ff404080';
        editorCtx.strokeStyle = '#ff4040';
        editorCtx.lineWidth = 2;
        editorCtx.beginPath();
        editorCtx.moveTo(px + GRID/2, py);
        editorCtx.lineTo(px + GRID, py + GRID);
        editorCtx.lineTo(px, py + GRID);
        editorCtx.closePath();
        editorCtx.fill();
        editorCtx.stroke();
      } else if (item.type === 'block') {
        editorCtx.fillStyle = '#ff604050';
        editorCtx.strokeStyle = '#ff6040';
        editorCtx.lineWidth = 2;
        editorCtx.fillRect(px+2, py+2, GRID-4, GRID-4);
        editorCtx.strokeRect(px+2, py+2, GRID-4, GRID-4);
        // X mark
        editorCtx.strokeStyle = '#ff604060';
        editorCtx.lineWidth = 1;
        editorCtx.beginPath();
        editorCtx.moveTo(px+2,py+2); editorCtx.lineTo(px+GRID-2,py+GRID-2);
        editorCtx.moveTo(px+GRID-2,py+2); editorCtx.lineTo(px+2,py+GRID-2);
        editorCtx.stroke();
      } else if (item.type === 'pillar') {
        editorCtx.fillStyle = editorColor + '40';
        editorCtx.strokeStyle = editorColor;
        editorCtx.lineWidth = 2;
        editorCtx.fillRect(px+8, py, GRID-16, GRID);
        editorCtx.strokeRect(px+8, py, GRID-16, GRID);
      } else if (item.type === 'orb') {
        editorCtx.fillStyle = '#ffe600';
        editorCtx.shadowColor = '#ffe600';
        editorCtx.shadowBlur = 8;
        editorCtx.beginPath();
        editorCtx.arc(px + GRID/2, py + GRID/2, 10, 0, Math.PI*2);
        editorCtx.fill();
        editorCtx.shadowBlur = 0;
        editorCtx.fillStyle = '#fff';
        editorCtx.beginPath();
        editorCtx.arc(px + GRID/2, py + GRID/2, 4, 0, Math.PI*2);
        editorCtx.fill();
      } else if (item.type.startsWith('portal_')) {
        const portalDef = PORTAL_MAP[item.type];
        if (portalDef) {
          const cx = px + GRID/2;
          const cy = py + GRID/2;
          editorCtx.shadowColor = portalDef.color1;
          editorCtx.shadowBlur = 12;
          editorCtx.strokeStyle = portalDef.color1;
          editorCtx.lineWidth = 2;
          editorCtx.beginPath();
          editorCtx.ellipse(cx, cy, GRID/2 - 4, GRID/2, 0, 0, Math.PI*2);
          editorCtx.stroke();
          editorCtx.shadowBlur = 0;
          editorCtx.fillStyle = '#fff';
          editorCtx.font = 'bold 16px Orbitron, sans-serif';
          editorCtx.textAlign = 'center';
          editorCtx.textBaseline = 'middle';
          editorCtx.fillText(portalDef.icon, cx, cy);
          editorCtx.textBaseline = 'alphabetic';
        }
      }
    });
  }
})();
