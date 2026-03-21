#!/usr/bin/env python3
"""Simple tic-tac-toe game for terminal: two players or vs computer."""

import random

# Board positions 1-9 (user-facing) map to indices 0-8
LINES = [
    (0, 1, 2),
    (3, 4, 5),
    (6, 7, 8),
    (0, 3, 6),
    (1, 4, 7),
    (2, 5, 8),
    (0, 4, 8),
    (2, 4, 6),
]


def display_board(board: list[str]) -> None:
    """Print the 3x3 board with grid lines."""
    for i in (0, 3, 6):
        row = board[i : i + 3]
        print(" " + " | ".join(cell if cell.strip() else str(i + 1) for cell in row))
        if i < 6:
            print("---+" * 2 + "---")


def get_empty_cells(board: list[str]) -> list[int]:
    """Return list of indices (0-8) where cell is empty."""
    return [i for i in range(9) if not board[i].strip()]


def check_winner(board: list[str]) -> str | None:
    """Return 'X', 'O', or None if no winner yet."""
    for a, b, c in LINES:
        if board[a] == board[b] == board[c] and board[a].strip():
            return board[a]
    return None


def human_move(board: list[str], mark: str) -> None:
    """Prompt for a position 1-9 until valid; update board in place."""
    empty = get_empty_cells(board)
    prompt = f"Player {mark}, choose position 1-9: "
    while True:
        raw = input(prompt).strip()
        if not raw or not raw.isdigit():
            print("Please enter a number 1-9.")
            continue
        pos = int(raw)
        if pos < 1 or pos > 9:
            print("Please enter a number between 1 and 9.")
            continue
        idx = pos - 1
        if idx not in empty:
            print("That cell is already taken.")
            continue
        board[idx] = mark
        return


def computer_move(board: list[str], mark: str) -> None:
    """Pick a random empty cell and place mark; update board in place."""
    empty = get_empty_cells(board)
    if not empty:
        return
    idx = random.choice(empty)
    board[idx] = mark


def main() -> None:
    print("Tic-Tac-Toe — positions 1-9 (top-left=1, bottom-right=9).")
    while True:
        mode = input("Two players (1) or vs computer (2)? ").strip()
        if mode == "1":
            vs_computer = False
            break
        if mode == "2":
            vs_computer = True
            break
        print("Please enter 1 or 2.")

    while True:
        board = [" "] * 9
        current = "X"
        winner = None

        while True:
            display_board(board)
            empty = get_empty_cells(board)
            if not empty:
                break

            if current == "X" or (current == "O" and not vs_computer):
                human_move(board, current)
            else:
                print(f"Computer (O) is thinking...")
                computer_move(board, current)

            winner = check_winner(board)
            if winner:
                break
            current = "O" if current == "X" else "X"

        display_board(board)
        if winner:
            print(f"{winner} wins!")
        else:
            print("It's a tie!")

        again = input("\nPlay again? (y/n): ").strip().lower()
        if again not in ("y", "yes"):
            print("Thanks for playing!")
            break

        mode_again = input("Change mode? (y/n): ").strip().lower()
        if mode_again in ("y", "yes"):
            while True:
                mode = input("Two players (1) or vs computer (2)? ").strip()
                if mode == "1":
                    vs_computer = False
                    break
                if mode == "2":
                    vs_computer = True
                    break
                print("Please enter 1 or 2.")


if __name__ == "__main__":
    main()
