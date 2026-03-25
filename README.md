# Goats

A terminal-native browser OS with an optional graphical shell. You boot into a real, working terminal — xterm.js with full command history, tab completion, job control — and launch a minimal dark-mode GUI with `startx`.

I was building something else and accidentally made a UI I actually liked.

Early / proof-of-concept, but it already works.

## What it looks like



**Shell mode** — xterm.js terminal with session restore, persistent history, and 30+ commands:
<img width="537" height="159" alt="image" src="https://github.com/user-attachments/assets/b893320b-6b09-40af-82c3-e07c55ea4ae2" />
- Filesystem: `ls`, `cd`, `mkdir`, `touch`, `cat`, `cp`, `mv`, `rm`, `find`
- System: `jobs`, `ps`, `kill`, `history`, `whoami`, `uname`, `echo`
- Config: `reg list`, `reg get`, `reg set`, `reg delete`
- Browser: `browser open`, `browser sessions`, `browser trace`, `browser close`
- AI: `ask`, `plan`, `run`, `watch`, `memory list/add/search`
- Agents: `agent list`, `agent create`, `agent run`, `agent delete`
- GUI: `startx` to launch the graphical shell

**Graphical shell** — dark, minimal home screen with 8 icon tiles:
<img width="1284" height="381" alt="image" src="https://github.com/user-attachments/assets/9df5570b-8ee4-46db-9e91-9246bd8a54a0" />

Files | Browser | Tasks | Automations | Memory | Logs | Settings | Agents

Everything is wired together — browser sessions, command history, memory, automations, agents — all persist across reloads via Zustand + localStorage.

## Tech stack

- React 18 + TypeScript
- Vite (code-split: terminal ~470KB, GUI ~141KB)
- Tailwind CSS
- xterm.js — terminal UI
- Zustand — state management with localStorage persistence
- Framer Motion — animations

## Screenshots

> (drag screenshots here)

## Getting started

```bash
npm install
npm run dev
```

Visit `http://localhost:5173`

## Running tests

```bash
npm run test:run   # Run all 67 tests once
npm run test       # Run tests in watch mode
```

## Project structure

```
src/
├── App.tsx                    # Root — switches between shell and GUI mode
├── main.tsx                   # Entry point
├── types/index.ts             # TypeScript schemas (FSNode, Job, ParsedCommand, etc.)
├── services/
│   ├── filesystem.ts          # Virtual filesystem operations
│   ├── jobs.ts                # Job/process lifecycle
│   └── registry.ts            # Key-value config
├── state/
│   ├── store.ts               # Core Zustand stores
│   ├── automations.ts         # Automation runner
│   └── agents.ts              # Agent executor
├── commands/parser.ts         # Shell command routing
├── components/
│   ├── Terminal.tsx           # xterm.js with FitAddon, tab completion, history
│   └── ErrorBoundary.tsx
├── apps/                      # GUI applications
│   ├── home/HomeScreen.tsx
│   ├── files/FilesApp.tsx
│   ├── browser/BrowserApp.tsx
│   ├── tasks/TasksApp.tsx
│   ├── automations/AutomationsApp.tsx
│   ├── memory/MemoryApp.tsx
│   ├── logs/LogsApp.tsx
│   ├── settings/SettingsApp.tsx
│   └── agents/AgentsApp.tsx
└── __tests__/                 # 67 tests (parser, browser, integration, automations, agents)
```

## What's working right now

- Terminal shell with persistent history and session restore
- Virtual filesystem (mkdir, touch, cat, cp, mv, rm, ls, cd, pwd, find)
- Browser automation sessions (simulated — SVG placeholders as screenshots)
- Step-based automation runner (browser.open, browser.click, browser.type, delay, log)
- AI agent creation and task execution
- Persistent memory store with search
- Registry config (key-value, persisted)
- Graphical home with 8 app tiles
- Full Zustand state persistence across page reloads

## What's not done / needs work

- Browser sessions are simulated (no real CDP/Puppeteer yet)
- AI commands use simulated responses (no real API integration yet)
- `run` and `watch` are stubs
- Agents are basic task executors, not proper LLM-powered agents

## I probably won't build all of this myself

If you like the vibe and want to pitch in, the highest-impact next steps would be:

1. **Real browser automation** — swap the SVG placeholders for Puppeteer/Playwright
2. **Actual AI integration** — wire up Claude/OpenAI for `ask`, `plan`, agents
3. **A proper `run` command** — actual shell command execution, not a stub
4. **Multi-user / sessions** — proper session isolation and user management

Issues and PRs welcome. Fork it. Make it weird.

## License

MIT
