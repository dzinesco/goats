# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**goatos** is a terminal-native browser OS with an optional graphical shell launched via `startx`. Users boot into a terminal-style shell with AI built in as a native command surface.

## Development Commands

```bash
npm install       # Install dependencies
npm run dev       # Start dev server (port 5173)
npm run build     # Production build
npm run test      # Run tests in watch mode
npm run test:run  # Run tests once
npm run lint      # ESLint
npm run typecheck # TypeScript check
```

## Architecture

### Two Modes

1. **Shell Mode** (default) — Terminal entry point with xterm.js, command history, virtual filesystem, job/process control, and AI commands
2. **X Session** — Graphical React frontend launched via `startx`, overlaying the same state and filesystem as the shell

### State Management

Shared state via Zustand with persist middleware (localStorage):
- `useFilesystemStore` — Virtual filesystem (nodes, cwd)
- `useJobsStore` — Job/process management
- `useRegistryStore` — Configuration/registry
- `useSessionsStore` — Browser/session management
- `useMemoryStore` — Memory items
- `useShellStore` — Shell mode, history
- `useAutomationsStore` — Automation definitions and runner
- `useAgentsStore` — AI agent definitions and execution

### Key Stores

**useFilesystemStore**: Virtual filesystem with nodes, supports mkdir, touch, cat, cp, mv, rm, ls, cd, find
**useJobsStore**: Job tracking for processes, automations, browser sessions
**useRegistryStore**: Key-value configuration with reg list/get/set
**useAutomationsStore**: Step-based automation runner with browser actions
**useAgentsStore**: AI agent creation and task execution

## Shell Commands

### Filesystem
`ls`, `cd`, `pwd`, `mkdir [-p]`, `touch`, `cat`, `cp`, `mv`, `rm [-r]`, `find`

### System
`startx` (launch GUI), `ps`, `jobs`, `kill`, `clear`, `history`, `whoami`, `uname`, `echo`

### Config
`reg list`, `reg get <key>`, `reg set <key> <value>`, `reg delete <key>`

### Browser
`browser open <url>`, `browser sessions`, `browser trace <id>`, `browser close <id>`

### AI/Agent
`ask <question>`, `plan <task>`, `run <command>`, `watch <command> <interval>`, `memory [list|add|search]`
`agent list`, `agent create <name> <desc>`, `agent run <id> <task>`, `agent delete <id>`

## GUI Apps

8 apps accessible from the graphical shell home screen:
- **Files** — Browse virtual filesystem
- **Browser** — Manage browser automation sessions
- **Tasks** — View job history
- **Automations** — Create and run step-based automations
- **Memory** — Store and search memory items
- **Logs** — View command history
- **Settings** — Edit registry configuration
- **Agents** — Create and run AI agents

## Stack

- React 18 + TypeScript
- Vite (code-split: terminal ~470KB, GUI ~141KB)
- Tailwind CSS
- xterm.js for terminal UI
- Zustand for state management
- Framer Motion for animations

## File Structure

```
src/
├── App.tsx                   # Root component, mode switching
├── main.tsx                  # Entry point
├── index.css                 # Global styles + Tailwind
├── types/index.ts            # Frozen TypeScript schemas (FSNode, Job, ParsedCommand, etc.)
├── services/
│   ├── filesystem.ts         # FileSystemService (deterministic, service-layer)
│   ├── jobs.ts               # JobService (lifecycle management)
│   └── registry.ts           # RegistryService
├── state/
│   ├── store.ts              # Core Zustand stores
│   ├── automations.ts        # Automation store + runner
│   └── agents.ts             # Agent store + executor
├── commands/parser.ts        # Shell command handlers (delegate to services)
├── components/
│   ├── Terminal.tsx           # xterm.js terminal with tab completion
│   ├── ErrorBoundary.tsx     # Error handling
│   └── LoadingSpinner.tsx     # Loading states
├── apps/                     # GUI applications (all with ErrorBoundaries)
│   ├── home/HomeScreen.tsx
│   ├── files/FilesApp.tsx
│   ├── browser/BrowserApp.tsx
│   ├── tasks/TasksApp.tsx
│   ├── automations/AutomationsApp.tsx
│   ├── memory/MemoryApp.tsx
│   ├── logs/LogsApp.tsx
│   ├── settings/SettingsApp.tsx
│   └── agents/AgentsApp.tsx
├── lib/browser.ts             # Browser session manager
└── __tests__/               # Vitest tests (67 tests)
```

## Testing

67 tests across 5 test files:
- parser.test.ts — Command parsing and execution (38 tests)
- browser.test.ts — Browser session management (6 tests)
- integration.test.ts — Store operations and mode switching (11 tests)
- automations.test.ts — Automation creation and execution (7 tests)
- agents.test.ts — Agent creation and task execution (5 tests)

## Implementation Notes

- Terminal uses xterm.js with FitAddon for auto-sizing
- Tab completion for commands and paths (single match auto-completes, multiple cycle on repeated Tab)
- Arrow key history navigation with temp input buffer
- Ctrl+C cancels input, Ctrl+L clears screen
- GUI lazy-loaded via React.lazy for code-splitting
- ErrorBoundary at app root level and individual app levels
- All stores persist to localStorage via Zustand persist middleware
- Browser sessions sync to useSessionsStore for persistence across page reloads
- Browser manager provides simulated sessions (SVG placeholders as screenshots)
- Automation runner supports: browser.open, browser.click, browser.type, delay, log
