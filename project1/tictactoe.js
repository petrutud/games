#!/usr/bin/env node
"use strict";
/** Simple tic-tac-toe game for terminal: two players or vs computer. */

const readline = require("readline");

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function displayBoard(board) {
  for (let i = 0; i < 9; i += 3) {
    const row = board.slice(i, i + 3);
    const line = row.map((cell, j) => (cell.trim() ? cell : String(i + j + 1)));
    console.log(" " + line.join(" | "));
    if (i < 6) console.log("---+" + "---+" + "---");
  }
}

function getEmptyCells(board) {
  return board.map((c, i) => (c.trim() ? -1 : i)).filter((i) => i >= 0);
}

function checkWinner(board) {
  for (const [a, b, c] of LINES) {
    if (board[a] === board[b] && board[b] === board[c] && board[a].trim())
      return board[a];
  }
  return null;
}

function computerMove(board, mark) {
  const empty = getEmptyCells(board);
  if (empty.length === 0) return;
  const idx = empty[Math.floor(Math.random() * empty.length)];
  board[idx] = mark;
}

function ask(rl, prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

async function humanMove(rl, board, mark) {
  const empty = getEmptyCells(board);
  while (true) {
    const raw = (await ask(rl, `Player ${mark}, choose position 1-9: `)).trim();
    if (!raw || !/^\d+$/.test(raw)) {
      console.log("Please enter a number 1-9.");
      continue;
    }
    const pos = parseInt(raw, 10);
    if (pos < 1 || pos > 9) {
      console.log("Please enter a number between 1 and 9.");
      continue;
    }
    const idx = pos - 1;
    if (!empty.includes(idx)) {
      console.log("That cell is already taken.");
      continue;
    }
    board[idx] = mark;
    return;
  }
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log("Tic-Tac-Toe — positions 1-9 (top-left=1, bottom-right=9).");

  let vsComputer = false;
  while (true) {
    const mode = (await ask(rl, "Two players (1) or vs computer (2)? ")).trim();
    if (mode === "1") break;
    if (mode === "2") {
      vsComputer = true;
      break;
    }
    console.log("Please enter 1 or 2.");
  }

  for (;;) {
    const board = Array(9).fill(" ");
    let current = "X";
    let winner = null;

    while (true) {
      displayBoard(board);
      const empty = getEmptyCells(board);
      if (empty.length === 0) break;

      if (current === "X" || (current === "O" && !vsComputer)) {
        await humanMove(rl, board, current);
      } else {
        console.log("Computer (O) is thinking...");
        computerMove(board, current);
      }

      winner = checkWinner(board);
      if (winner) break;
      current = current === "X" ? "O" : "X";
    }

    displayBoard(board);
    if (winner) console.log(`${winner} wins!`);
    else console.log("It's a tie!");

    const again = (await ask(rl, "\nPlay again? (y/n): ")).trim().toLowerCase();
    if (again !== "y" && again !== "yes") {
      console.log("Thanks for playing!");
      rl.close();
      return;
    }

    const modeAgain = (await ask(rl, "Change mode? (y/n): ")).trim().toLowerCase();
    if (modeAgain === "y" || modeAgain === "yes") {
      while (true) {
        const mode = (await ask(rl, "Two players (1) or vs computer (2)? ")).trim();
        if (mode === "1") {
          vsComputer = false;
          break;
        }
        if (mode === "2") {
          vsComputer = true;
          break;
        }
        console.log("Please enter 1 or 2.");
      }
    }
  }
}

main();
