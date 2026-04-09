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

**After every change, commit and push to GitHub immediately.** Never leave work uncommitted — the goal is that GitHub always reflects the latest state so nothing is ever lost and any version can be reverted to.

```
git add <file>
git commit -m "Short imperative description"
git push
```

Commit message rules:
- Use the imperative mood: "Add", "Fix", "Update" — not "Added" or "Adds"
- First line under 72 characters, describing *what and why*, not *how*
- Include `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` in the body

Remote: https://github.com/kuba04032003-creator/tic-tac-toe

## Architecture

Everything lives in `tictactoe.html`:

- **State** — `state` (9-element array), `current` (active player), `gameOver`, `vsCPU`
- **Rendering** — DOM cells built on `init()`, updated directly on each move via `play(i)`
- **Win detection** — `checkWinner()` checks all 8 winning lines against the `state` array; `checkWinnerFor(s)` is a pure version used by minimax
- **CPU logic** — `minimax()` does a full recursive minimax search (no depth limit, no alpha-beta); the CPU is unbeatable
- **Score tracking** — `scores` object persists across `init()` calls; reset only on page reload
