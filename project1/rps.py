#!/usr/bin/env python3
"""Simple rock-paper-scissors game."""

import random

CHOICES = ("rock", "paper", "scissors")
SHORTCUTS = {"r": "rock", "p": "paper", "s": "scissors"}


def get_user_choice() -> str:
    """Prompt until valid input; return normalized choice (full word)."""
    prompt = "Rock, paper, or scissors? (r/p/s or full word): "
    while True:
        raw = input(prompt).strip().lower()
        if not raw:
            continue
        if raw in SHORTCUTS:
            return SHORTCUTS[raw]
        if raw in CHOICES:
            return raw
        print("Invalid choice. Please enter r, p, s, or rock, paper, scissors.")


def get_computer_choice() -> str:
    """Return a random choice from rock, paper, scissors."""
    return random.choice(CHOICES)


def determine_winner(user: str, computer: str) -> str | None:
    """Return 'win', 'lose', or None for tie."""
    if user == computer:
        return None
    wins = (
        ("rock", "scissors"),
        ("scissors", "paper"),
        ("paper", "rock"),
    )
    if (user, computer) in wins:
        return "win"
    return "lose"


def main() -> None:
    print("Rock, Paper, Scissors — type r/p/s or the full word.")
    while True:
        user = get_user_choice()
        computer = get_computer_choice()
        result = determine_winner(user, computer)

        print(f"\nYou chose {user}. Computer chose {computer}.")
        if result == "win":
            print("You win!")
        elif result == "lose":
            print("You lose.")
        else:
            print("It's a tie!")

        again = input("\nPlay again? (y/n): ").strip().lower()
        if again not in ("y", "yes"):
            print("Thanks for playing!")
            break


if __name__ == "__main__":
    main()
