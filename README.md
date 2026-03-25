# goatos

A terminal-first browser OS built with React. Starts in a shell, supports virtual filesystem commands, and launches a graphical shell with `startx`.

## Quick Start

```bash
npm install
npm run dev
```

Visit `http://localhost:5173`

## Features

- **Terminal Shell** — xterm.js with 25+ commands
- **Graphical Shell** — React home screen with icons for 8 apps
- **Virtual Filesystem** — Real state persistence via Zustand + localStorage
- **Browser Sessions** — Create, track, and trace browser automation sessions
- **Automations** — Step-based automation runner
- **Agents** — AI agent creation and task execution
- **Registry** — Persistent key-value configuration
- **Memory** — Persistent memory store with search

## Commands

```bash
# Filesystem
ls /home/user           # List directory
cd /home/user           # Change directory
pwd                     # Print working directory
mkdir [-p] newdir       # Create directory (with -p for parents)
touch file.txt          # Create file
cat file.txt            # Read file
rm [-r] file.txt        # Delete file (-r for directories)
cp src dest             # Copy
mv src dest             # Move
find /home user         # Find files by name or content

# System
jobs                     # List jobs
ps                       # List processes
kill <pid>               # Kill process
history                  # Show command history (persisted)
whoami                   # Current user
uname                    # System info
clear                    # Clear terminal

# Config
reg list                 # List all settings
reg get key              # Get setting value
reg set key value        # Set setting value
reg delete key           # Delete a setting

# Browser
browser open <url>           # Open URL in new session
browser sessions             # List active sessions
browser trace <session-id>  # View session traces
browser close <session-id>   # Close session

# AI
ask <question>              # Ask AI a question
plan <task>                 # Generate a plan for a task
run <command>               # Run a shell command
watch <command> <interval>   # Watch a command at interval
memory list                 # List memory items
memory add <content>         # Add a memory item
memory search <query>       # Search memories

# Agents
agent list                    # List all agents
agent create <name> <desc>   # Create new agent
agent run <id> <task>         # Run agent with task
agent delete <id>             # Delete agent

# GUI
startx            # Launch graphical shell
```

## GUI Apps

- **Files** — Browse and edit virtual filesystem
- **Browser** — Manage browser automation sessions
- **Tasks** — View job history and status
- **Automations** — Create and run step-based automations
- **Memory** — Store and search memory items
- **Logs** — View command history
- **Settings** — Edit registry configuration
- **Agents** — Create and run AI agents

## Stack

- React 18 + TypeScript
- Vite (code-splitting enabled)
- Tailwind CSS
- xterm.js
- Zustand (state management)
- Framer Motion

## Testing

```bash
npm run test:run  # Run all tests (70 tests)
npm run build     # Production build
```

## Architecture

- Terminal and GUI share Zustand stores backed by localStorage
- Command parser (`src/commands/parser.ts`) routes to store actions
- Browser manager provides simulated sessions (SVG placeholders)
- Automation runner supports: browser.open, browser.click, browser.type, delay, log
- Agents run tasks with simulated AI responses
- Shell history persists and rehydrates across sessions
