# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Single-file browser game — `tictactoe.html` contains all HTML, CSS, and JavaScript in one file. No build step, no dependencies, no package manager.

## Running the project

Open `tictactoe.html` directly in a browser:
```
start chrome tictactoe.html
```

## Git workflow

After every change: commit locally with a clean message and push to GitHub.

```
git add <file>
git commit -m "Short imperative description"
git push
```

Remote: https://github.com/kuba04032003-creator/tic-tac-toe

## Architecture

Everything lives in `tictactoe.html`:

- **State** — `state` (9-element array), `current` (active player), `gameOver`, `vsCPU`
- **Rendering** — DOM cells built on `init()`, updated directly on each move via `play(i)`
- **Win detection** — `checkWinner()` checks all 8 winning lines against the `state` array; `checkWinnerFor(s)` is a pure version used by minimax
- **CPU logic** — `minimax()` does a full recursive minimax search (no depth limit, no alpha-beta); the CPU is unbeatable
- **Score tracking** — `scores` object persists across `init()` calls; reset only on page reload
