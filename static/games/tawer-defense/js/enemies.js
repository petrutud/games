(function (window) {
  'use strict';

  const ENEMY_TYPES = {
    normal: { hp: 100, speed: 0.05, gold: 10, score: 10, color: '#c45c4c', radius: 10 },
    grunt: { hp: 80, speed: 0.055, gold: 8, score: 8, color: '#a07060', radius: 9 },
    tank: { hp: 300, speed: 0.03, gold: 30, score: 30, color: '#4a4a5a', radius: 14 },
    fast: { hp: 50, speed: 0.09, gold: 15, score: 15, color: '#5eb4c4', radius: 8 },
    flyer: { hp: 60, speed: 0.08, gold: 20, score: 20, color: '#a0a0e0', radius: 9, flying: true },
    splitter: { hp: 120, speed: 0.04, gold: 5, score: 5, color: '#80c080', radius: 11, splitsInto: 'small', splitCount: 2 },
    lure: { hp: 500, speed: 0.02, gold: 5, score: 5, color: '#e0c060', radius: 12 },
    boss: { hp: 800, speed: 0.025, gold: 100, score: 100, color: '#802020', radius: 18 },
    small: { hp: 25, speed: 0.07, gold: 2, score: 2, color: '#90b090', radius: 6 },
  };

  window.TD_ENEMIES = { ENEMY_TYPES };
})(window);
