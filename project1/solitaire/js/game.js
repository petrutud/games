(function () {
  'use strict';

  const SUITS = ['♠', '♥', '♦', '♣'];
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  function isRed(suit) {
    return suit === 1 || suit === 2;
  }

  function makeDeck() {
    var d = [];
    for (var s = 0; s < 4; s++) {
      for (var r = 0; r < 13; r++) {
        d.push({ suit: s, rank: r, faceUp: false });
      }
    }
    for (var i = d.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = d[i];
      d[i] = d[j];
      d[j] = t;
    }
    return d;
  }

  var columns = [[], [], [], [], [], [], []];
  var foundations = [[], [], [], []];
  var stock = [];
  var waste = [];
  var moves = 0;
  var selected = null;
  var gameWon = false;
  var table = document.getElementById('table');
  var movesEl = document.getElementById('moves');

  function cardKey(c) {
    return c.suit + '-' + c.rank;
  }

  function canPlaceOnColumn(topCard, moving) {
    if (!topCard) return moving.rank === 12;
    if (isRed(topCard.suit) === isRed(moving.suit)) return false;
    return moving.rank === topCard.rank - 1;
  }

  function canPlaceFoundation(suit, rank) {
    var f = foundations[suit];
    if (f.length === 0) return rank === 0;
    return rank === f[f.length - 1].rank + 1;
  }

  function deal() {
    var deck = makeDeck();
    var idx = 0;
    for (var col = 0; col < 7; col++) {
      columns[col] = [];
      for (var i = 0; i <= col; i++) {
        var c = deck[idx++];
        c.faceUp = i === col;
        columns[col].push(c);
      }
    }
    stock = deck.slice(idx);
    waste = [];
    foundations = [[], [], [], []];
    moves = 0;
    selected = null;
    gameWon = false;
    movesEl.textContent = '0';
    render();
  }

  function onWasteDblClick(e) {
    e.stopPropagation();
    if (waste.length === 0) return;
    var c = waste[waste.length - 1];
    if (canPlaceFoundation(c.suit, c.rank)) {
      waste.pop();
      foundations[c.suit].push(c);
      addMoves(1);
      selected = null;
      render();
    }
  }

  function removeFromColumn(col, fromIndex) {
    var rest = columns[col].splice(fromIndex);
    return rest;
  }

  function addMoves(n) {
    moves += n;
    movesEl.textContent = moves;
  }

  function render() {
    table.innerHTML = '';
    var topRow = document.createElement('div');
    topRow.className = 'row-top';

    var sw = document.createElement('div');
    sw.className = 'stock-waste';
    var stockPile = document.createElement('div');
    stockPile.className = 'pile';
    stockPile.dataset.pile = 'stock';
    if (stock.length > 0) {
      var sc = elCard({ faceUp: false }, 0, 'stock');
      stockPile.appendChild(sc);
    }
    stockPile.addEventListener('click', onStockClick);

    var wastePile = document.createElement('div');
    wastePile.className = 'pile';
    wastePile.dataset.pile = 'waste';
    if (waste.length > 0) {
      var wc = elCard(waste[waste.length - 1], waste.length - 1, 'waste');
      wc.addEventListener('dblclick', onWasteDblClick);
      wastePile.appendChild(wc);
    }
    wastePile.addEventListener('click', onWasteClick);

    sw.appendChild(stockPile);
    sw.appendChild(wastePile);

    var foundRow = document.createElement('div');
    foundRow.className = 'foundations';
    for (var f = 0; f < 4; f++) {
      var fp = document.createElement('div');
      fp.className = 'pile foundation';
      fp.dataset.pile = 'foundation';
      fp.dataset.suit = f;
      if (foundations[f].length > 0) {
        var top = foundations[f][foundations[f].length - 1];
        fp.appendChild(elCard(top, f, 'foundation'));
      }
      fp.addEventListener('click', onFoundationClick);
      foundRow.appendChild(fp);
    }

    topRow.appendChild(sw);
    topRow.appendChild(foundRow);
    table.appendChild(topRow);

    var cols = document.createElement('div');
    cols.className = 'columns';
    for (var c = 0; c < 7; c++) {
      var col = document.createElement('div');
      col.className = 'pile column';
      col.dataset.pile = 'column';
      col.dataset.col = c;
      var stack = columns[c];
      for (var i = 0; i < stack.length; i++) {
        var card = stack[i];
        var el = elCard(card, i, 'column', c);
        el.style.top = (i * 22) + 'px';
        el.dataset.col = c;
        el.dataset.idx = i;
        el.addEventListener('click', onColumnCardClick);
        el.addEventListener('dblclick', onCardDblClick);
        col.appendChild(el);
      }
      col.addEventListener('click', onColumnEmptyClick);
      cols.appendChild(col);
    }
    table.appendChild(cols);

    checkWin();
  }

  function elCard(card, index, source, col) {
    var d = document.createElement('div');
    d.className = 'card' + (isRed(card.suit) ? ' red' : ' black');
    if (!card.faceUp) d.className += ' face-down';
    else {
      d.innerHTML = '<span class="rank">' + RANKS[card.rank] + '</span><span class="suit">' + SUITS[card.suit] + '</span>';
    }
    d.dataset.source = source;
    if (col !== undefined) d.dataset.col = col;
    d.dataset.idx = index;
    return d;
  }

  function onStockClick() {
    if (stock.length === 0) {
      while (waste.length) {
        var c = waste.pop();
        c.faceUp = false;
        stock.push(c);
      }
      addMoves(1);
    } else {
      waste.push(stock.pop());
      waste[waste.length - 1].faceUp = true;
      addMoves(1);
    }
    selected = null;
    render();
  }

  function onWasteClick(e) {
    e.stopPropagation();
    if (waste.length === 0) return;
    var top = waste[waste.length - 1];
    if (selected && selected.type === 'waste') {
      selected = null;
      render();
      return;
    }
    selected = { type: 'waste', card: top };
    render();
    highlightSelection();
  }

  function onFoundationClick(e) {
    var suit = parseInt(e.currentTarget.dataset.suit, 10);
    if (!selected) return;
    if (selected.type === 'waste') {
      var c = selected.card;
      if (c.suit === suit && canPlaceFoundation(suit, c.rank)) {
        waste.pop();
        foundations[suit].push(c);
        addMoves(1);
      }
    } else if (selected.type === 'column') {
      var col = selected.col;
      var idx = selected.fromIdx;
      var stack = columns[col].slice(idx);
      if (stack.length !== 1) return;
      var c = stack[0];
      if (c.suit === suit && canPlaceFoundation(suit, c.rank)) {
        columns[col].pop();
        foundations[suit].push(c);
        flipTop(col);
        addMoves(1);
      }
    }
    selected = null;
    render();
  }

  function onColumnCardClick(e) {
    e.stopPropagation();
    var col = parseInt(e.currentTarget.dataset.col, 10);
    var idx = parseInt(e.currentTarget.dataset.idx, 10);
    var card = columns[col][idx];
    if (!card.faceUp) {
      if (idx === columns[col].length - 1) {
        card.faceUp = true;
        addMoves(1);
        render();
      }
      return;
    }
    if (selected && selected.type === 'column' && selected.col === col && selected.fromIdx === idx) {
      selected = null;
      render();
      return;
    }
    if (selected && selected.type === 'waste') {
      var c = selected.card;
      var top = columns[col].length ? columns[col][columns[col].length - 1] : null;
      if (canPlaceOnColumn(top, c)) {
        waste.pop();
        columns[col].push(c);
        addMoves(1);
        selected = null;
        render();
        return;
      }
    }
    if (selected && selected.type === 'column') {
      var fromCol = selected.col;
      var fromIdx = selected.fromIdx;
      if (fromCol === col && fromIdx === idx) return;
      var moving = columns[fromCol].slice(fromIdx);
      var destTop = columns[col].length ? columns[col][columns[col].length - 1] : null;
      if (canPlaceOnColumn(destTop, moving[0])) {
        columns[fromCol].splice(fromIdx);
        for (var i = 0; i < moving.length; i++) columns[col].push(moving[i]);
        flipTop(fromCol);
        addMoves(1);
        selected = null;
        render();
        return;
      }
    }
    var seq = columns[col].slice(idx);
    var ok = true;
    for (var i = 1; i < seq.length; i++) {
      if (!seq[i].faceUp || isRed(seq[i].suit) === isRed(seq[i - 1].suit) || seq[i].rank !== seq[i - 1].rank - 1) {
        ok = false;
        break;
      }
    }
    if (ok) selected = { type: 'column', col: col, fromIdx: idx };
    render();
    highlightSelection();
  }

  function onColumnEmptyClick(e) {
    if (e.target !== e.currentTarget) return;
    var col = parseInt(e.currentTarget.dataset.col, 10);
    if (!selected) return;
    if (selected.type === 'waste') {
      var c = selected.card;
      if (columns[col].length === 0 && c.rank === 12) {
        waste.pop();
        columns[col].push(c);
        addMoves(1);
        selected = null;
        render();
      }
    } else if (selected.type === 'column') {
      var moving = columns[selected.col].slice(selected.fromIdx);
      if (columns[col].length === 0 && moving[0].rank === 12) {
        columns[selected.col].splice(selected.fromIdx);
        for (var i = 0; i < moving.length; i++) columns[col].push(moving[i]);
        flipTop(selected.col);
        addMoves(1);
        selected = null;
        render();
      }
    }
  }

  function onCardDblClick(e) {
    e.stopPropagation();
    var col = parseInt(e.currentTarget.dataset.col, 10);
    var idx = parseInt(e.currentTarget.dataset.idx, 10);
    var card = columns[col][idx];
    if (!card.faceUp || idx !== columns[col].length - 1) return;
    if (!canPlaceFoundation(card.suit, card.rank)) return;
    columns[col].pop();
    foundations[card.suit].push(card);
    flipTop(col);
    addMoves(1);
    selected = null;
    render();
  }

  function flipTop(col) {
    var stack = columns[col];
    if (stack.length > 0 && !stack[stack.length - 1].faceUp) {
      stack[stack.length - 1].faceUp = true;
    }
  }

  function highlightSelection() {
    if (!selected) return;
  }

  function checkWin() {
    if (gameWon) return;
    var total = 0;
    for (var f = 0; f < 4; f++) total += foundations[f].length;
    if (total === 52) {
      gameWon = true;
      var b = document.createElement('div');
      b.className = 'win-banner';
      b.innerHTML = '<p>You win! Moves: ' + moves + '</p><p style="font-size:1rem;margin-top:0.5rem">Click to play again</p>';
      b.addEventListener('click', function () { b.remove(); deal(); });
      document.body.appendChild(b);
    }
  }

  document.getElementById('btn-new').addEventListener('click', deal);
  deal();
})();
