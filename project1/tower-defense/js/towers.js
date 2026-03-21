(function (window) {
  'use strict';

  const TOWER_TYPES = {
    'Basic Gun': {
      cost: 40,
      range: 200,
      damage: 22,
      cooldownMs: 900,
      color: '#9098a0',
      upgrades: [
        { cost: 50, damage: 35, range: 230, cooldownMs: 800 },
        { cost: 80, damage: 52, range: 260, cooldownMs: 700 },
      ],
    },
    Cannon: {
      cost: 50,
      range: 200,
      damage: 30,
      cooldownMs: 800,
      color: '#c45c4c',
      upgrades: [
        { cost: 60, damage: 48, range: 240, cooldownMs: 700 },
        { cost: 100, damage: 72, range: 280, cooldownMs: 600 },
      ],
    },
    Frost: {
      cost: 90,
      range: 200,
      damage: 12,
      cooldownMs: 600,
      slowPercent: 40,
      color: '#5eb4c4',
      upgrades: [
        { cost: 80, damage: 20, range: 240, slowPercent: 50, cooldownMs: 500 },
        { cost: 120, damage: 32, range: 280, slowPercent: 60, cooldownMs: 450 },
      ],
    },
    Splash: {
      cost: 150,
      range: 100,
      damage: 24,
      cooldownMs: 1200,
      splashRadius: 40,
      color: '#e8c547',
      upgrades: [
        { cost: 120, damage: 42, range: 120, splashRadius: 50, cooldownMs: 1000 },
        { cost: 180, damage: 65, range: 140, splashRadius: 60, cooldownMs: 900 },
      ],
    },
    Sniper: {
      cost: 200,
      range: 800,
      damage: 95,
      cooldownMs: 1500,
      canHitFlying: true,
      color: '#7caf5e',
      upgrades: [
        { cost: 100, damage: 140, range: 900, cooldownMs: 1300 },
        { cost: 150, damage: 200, range: 1000, cooldownMs: 1100 },
      ],
    },
    'Anti-Air': {
      cost: 130,
      range: 350,
      damage: 55,
      cooldownMs: 600,
      canHitFlying: true,
      onlyFlying: true,
      color: '#6080c0',
      upgrades: [
        { cost: 90, damage: 80, range: 400, cooldownMs: 500 },
        { cost: 120, damage: 115, range: 450, cooldownMs: 400 },
      ],
    },
    'Rapid Fire': {
      cost: 70,
      range: 180,
      damage: 8,
      cooldownMs: 250,
      color: '#f0a050',
      upgrades: [
        { cost: 50, damage: 12, range: 200, cooldownMs: 200 },
        { cost: 80, damage: 18, range: 220, cooldownMs: 160 },
      ],
    },
    Poison: {
      cost: 110,
      range: 180,
      damage: 15,
      cooldownMs: 1000,
      poisonDps: 8,
      poisonDuration: 3,
      color: '#60c060',
      upgrades: [
        { cost: 90, damage: 22, range: 200, poisonDps: 12, poisonDuration: 4, cooldownMs: 850 },
        { cost: 130, damage: 32, range: 220, poisonDps: 18, poisonDuration: 5, cooldownMs: 700 },
      ],
    },
    Support: {
      cost: 120,
      range: 0,
      damage: 0,
      cooldownMs: 0,
      supportRange: 140,
      supportDamagePercent: 15,
      supportSpeedPercent: 15,
      color: '#b080f0',
      upgrades: [
        { cost: 100, supportRange: 170, supportDamagePercent: 22, supportSpeedPercent: 22 },
        { cost: 140, supportRange: 200, supportDamagePercent: 30, supportSpeedPercent: 30 },
      ],
    },
    Summoner: {
      cost: 160,
      range: 0,
      damage: 0,
      cooldownMs: 0,
      spawnCooldownMs: 50000,
      minionDamage: 50,
      minionRadius: 28,
      spawnRange: 140,
      maxMinions: 5,
      color: '#d08040',
      upgrades: [
        { cost: 100, spawnCooldownMs: 40000, minionDamage: 70, minionRadius: 32, spawnRange: 160, maxMinions: 6 },
        { cost: 140, spawnCooldownMs: 30000, minionDamage: 95, minionRadius: 36, spawnRange: 180, maxMinions: 8 },
      ],
    },
  };

  window.TD_TOWERS = { TOWER_TYPES };
})(window);
