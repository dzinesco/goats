import { useFilesystemStore, useJobsStore, useRegistryStore, useShellStore, useMemoryStore } from '@/state/store';
import { useAgentsStore } from '@/state/agents';
import { browserManager } from '@/lib/browser';
import { jobIntervals, clearJobInterval } from '@/state/jobIntervals';

export interface ParsedCommand {
  cmd: string;
  args: string[];
  flags: Record<string, string | boolean>;
}

export interface CommandResult {
  output: string;
  success: boolean;
  error?: string;
}

export function parseCommand(input: string): ParsedCommand {
  const parts = input.trim().split(/\s+/);
  const cmd = parts[0] || '';
  const args: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (part.startsWith('--')) {
      const key = part.slice(2);
      if (i + 1 < parts.length && !parts[i + 1].startsWith('-')) {
        flags[key] = parts[++i];
      } else {
        flags[key] = true;
      }
    } else if (part.startsWith('-')) {
      const key = part.slice(1);
      // For single-char flags, don't consume next arg as value (they're booleans)
      // For multi-char flags (like --long), consume value if next arg exists
      if (key.length > 1 && i + 1 < parts.length && !parts[i + 1].startsWith('-')) {
        flags[key] = parts[++i];
      } else {
        flags[key] = true;
      }
    } else {
      args.push(part);
    }
  }

  return { cmd, args, flags };
}

export type CommandHandler = (args: string[], flags: Record<string, string | boolean>) => CommandResult | Promise<CommandResult>;

const commands: Record<string, CommandHandler> = {
  pwd: () => {
    const cwd = useFilesystemStore.getState().cwd;
    return { output: cwd, success: true };
  },

  cd: (args) => {
    const path = args[0] || '/home/user';
    try {
      useFilesystemStore.getState().cd(path);
      return { output: '', success: true };
    } catch (e) {
      return { output: (e as Error).message, success: false, error: (e as Error).message };
    }
  },

  ls: (args) => {
    const state = useFilesystemStore.getState();
    const path = args[0] || state.cwd;
    const nodes = state.listDir(path);

    if (nodes.length === 0) {
      return { output: '', success: true };
    }

    const output = nodes.map(n => {
      const type = n.type === 'directory' ? 'd' : '-';
      const size = n.size?.toString().padStart(8) || '         -';
      const name = n.type === 'directory' ? `\x1b[1;34m${n.name}/\x1b[0m` : n.name;
      return `${type}  ${size}  ${name}`;
    }).join('\n');

    return { output, success: true };
  },

  mkdir: (args, flags) => {
    if (!args[0]) return { output: 'mkdir: missing path', success: false, error: 'Usage: mkdir [-p] <path>' };
    const path = args[0];
    const state = useFilesystemStore.getState();
    if (flags.p) {
      // Create all parent directories
      const parts = path.split('/').filter(Boolean);
      let current = '';
      for (const part of parts) {
        current += '/' + part;
        if (!state.nodes[current]) {
          state.mkdir(current);
        }
      }
    } else {
      const existing = state.nodes[path];
      if (existing) return { output: `mkdir: ${path}: File exists`, success: false, error: 'Exists' };
      state.mkdir(path);
    }
    return { output: '', success: true };
  },

  touch: (args) => {
    if (!args[0]) return { output: 'touch: missing path', success: false, error: 'Usage: touch <path>' };
    useFilesystemStore.getState().touch(args[0]);
    return { output: '', success: true };
  },

  cat: (args) => {
    if (!args[0]) return { output: 'cat: missing path', success: false, error: 'Usage: cat <path>' };
    const state = useFilesystemStore.getState();
    const node = state.getNode(args[0]);
    if (!node) return { output: `cat: ${args[0]}: No such file or directory`, success: false, error: 'Not found' };
    if (node.type === 'directory') return { output: `cat: ${args[0]}: Is a directory`, success: false, error: 'Is a directory' };
    const content = state.readFile(args[0]);
    return { output: content ?? '', success: true };
  },

  rm: (args, flags) => {
    if (!args[0]) return { output: 'rm: missing path', success: false, error: 'Usage: rm [-r] <path>' };
    const path = args[0];
    const state = useFilesystemStore.getState();
    const node = state.getNode(path);
    if (!node) return { output: `rm: ${path}: No such file or directory`, success: false, error: 'Not found' };
    if (node.type === 'directory' && !flags.r) {
      return { output: `rm: ${path}: Is a directory (use -r to remove)`, success: false, error: 'Is directory' };
    }
    state.rm(path, !!flags.r);
    return { output: '', success: true };
  },

  cp: (args) => {
    if (args.length < 2) return { output: 'cp: missing arguments', success: false, error: 'Usage: cp <source> <dest>' };
    const src = useFilesystemStore.getState().getNode(args[0]);
    if (!src) return { output: `cp: ${args[0]}: No such file`, success: false, error: 'Source not found' };
    useFilesystemStore.getState().cp(args[0], args[1]);
    return { output: '', success: true };
  },

  mv: (args) => {
    if (args.length < 2) return { output: 'mv: missing arguments', success: false, error: 'Usage: mv <source> <dest>' };
    const src = useFilesystemStore.getState().getNode(args[0]);
    if (!src) return { output: `mv: ${args[0]}: No such file`, success: false, error: 'Source not found' };
    useFilesystemStore.getState().mv(args[0], args[1]);
    return { output: '', success: true };
  },

  find: (args) => {
    const state = useFilesystemStore.getState();
    const path = args[0] || state.cwd;
    const name = args[1] || '';
    if (!name) return { output: 'find: missing name', success: false, error: 'Usage: find <path> <name>' };
    const results = state.find(path, name);
    return { output: results.map(r => r.path).join('\n'), success: true };
  },

  whoami: () => {
    return { output: 'user', success: true };
  },

  uname: (args) => {
    const flag = args[0];
    if (flag === '-a') {
      return { output: 'goatos 1.0.0 browser-arm64 GNU', success: true };
    }
    return { output: 'goatos', success: true };
  },

  clear: () => {
    return { output: '\x1b[2J\x1b[H', success: true };
  },

  jobs: () => {
    const jobs = useJobsStore.getState().listJobs();
    if (jobs.length === 0) {
      return { output: 'No active jobs', success: true };
    }
    const output = jobs.map(j => {
      const status = j.status === 'running' ? '\x1b[1;32mrunning\x1b[0m' : `\x1b[1;33m${j.status}\x1b[0m`;
      return `[${j.id.slice(0, 8)}] ${j.type} - ${j.title} (${status})`;
    }).join('\n');
    return { output, success: true };
  },

  ps: () => {
    const jobs = useJobsStore.getState().listJobs().filter(j => j.status === 'running');
    if (jobs.length === 0) {
      return { output: 'No processes', success: true };
    }
    const output = jobs.map(j => {
      return `${j.id.slice(0, 8)}\t${j.title}\t${j.type}`;
    }).join('\n');
    return { output: 'PID\tNAME\tTYPE\n' + output, success: true };
  },

  kill: (args) => {
    if (!args[0]) return { output: 'kill: missing pid', success: false, error: 'Usage: kill <pid>' };
    const jobId = args[0];
    const jobs = useJobsStore.getState().listJobs();
    const job = jobs.find(j => j.id === jobId || j.id.startsWith(jobId));
    if (!job) return { output: `kill: ${jobId}: no such process`, success: false, error: 'Process not found' };
    clearJobInterval(job.id);
    useJobsStore.getState().updateJob(job.id, { status: 'failed', error: 'Killed' });
    return { output: '', success: true };
  },

  reg: (args) => {
    const registry = useRegistryStore.getState();
    const subcmd = args[0];

    if (subcmd === 'list') {
      const entries = registry.list();
      const output = entries.map(e => `${e.key} = ${JSON.stringify(e.value)}`).join('\n');
      return { output, success: true };
    }

    if (subcmd === 'get') {
      if (!args[1]) return { output: 'reg get: missing key', success: false, error: 'Usage: reg get <key>' };
      const value = registry.get(args[1]);
      return { output: value !== undefined ? String(value) : '', success: true };
    }

    if (subcmd === 'set') {
      if (args.length < 3) return { output: 'reg set: missing args', success: false, error: 'Usage: reg set <key> <value>' };
      let value: unknown = args[2];
      try { value = JSON.parse(args[2]); } catch { /* keep as string */ }
      registry.set(args[1], value);
      return { output: '', success: true };
    }

    if (subcmd === 'delete') {
      if (!args[1]) return { output: 'reg delete: missing key', success: false, error: 'Usage: reg delete <key>' };
      registry.remove(args[1]);
      return { output: '', success: true };
    }

    return { output: 'reg: unknown subcommand. Use: list, get, set, delete', success: false, error: 'Unknown subcommand' };
  },

  history: () => {
    const history = useShellStore.getState().history;
    const output = history.map((h, i) => `  ${i + 1}  ${h.command}`).join('\n');
    return { output, success: true };
  },

  startx: () => {
    useShellStore.getState().setMode('gui');
    return { output: 'Starting graphical shell...', success: true };
  },

  ask: (args) => {
    if (!args[0]) return { output: 'ask: missing query', success: false, error: 'Usage: ask <question>' };
    const answer = `[AI] This is a simulated response to: ${args.join(' ')}. AI integration requires backend connection.`;
    return { output: answer, success: true };
  },

  echo: (args) => {
    return { output: args.join(' '), success: true };
  },

  help: (args) => {
    const cmdHelp: Record<string, string> = {
      ls: 'ls [path] — list directory contents',
      cd: 'cd [path] — change directory (default: /home/user)',
      pwd: 'pwd — print working directory',
      mkdir: 'mkdir [-p] <path> — create directory (-p for parents)',
      touch: 'touch <path> — create empty file',
      cat: 'cat <path> — display file contents',
      cp: 'cp <source> <dest> — copy file',
      mv: 'mv <source> <dest> — move/rename file',
      rm: 'rm [-r] <path> — remove file/directory (-r for recursive)',
      find: 'find [path] <name> — find files by name or content',
      ps: 'ps — list running processes',
      jobs: 'jobs — list background jobs',
      kill: 'kill <pid> — terminate a job',
      clear: 'clear — clear terminal screen',
      history: 'history — show command history',
      whoami: 'whoami — show current user',
      uname: 'uname [-a] — show system information',
      echo: 'echo <args...> — print arguments',
      reg: 'reg list|get <key>|set <key> <value>|delete <key>',
      browser: 'browser open <url>|sessions|trace <id>|close <id>',
      startx: 'startx — launch graphical shell',
      ask: 'ask <question> — query AI assistant',
      plan: 'plan <task> — generate task plan',
      run: 'run <command> — execute a shell command',
      watch: 'watch <command> <interval> — run command periodically',
      memory: 'memory list|add <content>|search <query>',
      agent: 'agent list|create <name> <desc>|run <id> <task>|delete <id>',
    };

    if (args[0]) {
      const cmd = args[0].toLowerCase();
      if (cmdHelp[cmd]) {
        return { output: cmdHelp[cmd], success: true };
      }
      return { output: `help: unknown command '${args[0]}'`, success: false, error: 'Unknown command' };
    }

    const helpText = `goatos shell commands:
  filesystem: ls, cd, pwd, mkdir, touch, cat, cp, mv, rm, find
  system:     ps, jobs, kill, clear, history, whoami, uname, echo
  config:      reg (list|get|set|delete)
  browser:     browser open, browser sessions, browser trace, browser close
  ai:          ask, plan, run, watch, memory, agent
  gui:         startx

Type 'help <command>' for more info on a specific command.`;
    return { output: helpText, success: true };
  },

  browser: async (args) => {
    const subcmd = args[0];

    if (subcmd === 'open') {
      const url = args[1] || 'about:blank';
      const session = await browserManager.createSession(url);
      return { output: `Browser session started: ${session.id.slice(0, 8)}\nURL: ${url}\nTitle: ${session.title}`, success: true };
    }

    if (subcmd === 'sessions') {
      const sessions = browserManager.listSessions();
      if (sessions.length === 0) {
        return { output: 'No active browser sessions', success: true };
      }
      const output = sessions.map(s =>
        `[${s.id.slice(0, 8)}] ${s.status} - ${s.title} (${s.url})`
      ).join('\n');
      return { output, success: true };
    }

    if (subcmd === 'trace') {
      const sessionId = args[1];
      if (!sessionId) {
        return { output: 'browser trace: missing session id', success: false, error: 'Usage: browser trace <session-id>' };
      }
      const traces = browserManager.getTraces(sessionId);
      if (traces.length === 0) {
        return { output: 'No traces for this session', success: true };
      }
      const output = traces.map(t =>
        `[${t.timestamp}] ${t.action}`
      ).join('\n');
      return { output, success: true };
    }

    if (subcmd === 'close') {
      const sessionId = args[1];
      if (!sessionId) {
        return { output: 'browser close: missing session id', success: false, error: 'Usage: browser close <session-id>' };
      }
      await browserManager.closeSession(sessionId);
      return { output: `Session ${sessionId.slice(0, 8)} closed`, success: true };
    }

    return { output: 'browser: unknown subcommand. Use: open, sessions, trace, close', success: false, error: 'Unknown subcommand' };
  },

  plan: (args) => {
    if (!args[0]) return { output: 'plan: missing query', success: false, error: 'Usage: plan <task-description>' };
    const query = args.join(' ');
    return { output: `[Plan] Task: ${query}\n\nSubtasks:\n  1. Analyze requirements\n  2. Identify components\n  3. Implement solution\n  4. Test and verify`, success: true };
  },

  run: async (args) => {
    if (!args[0]) return { output: 'run: missing command', success: false, error: 'Usage: run <command>' };
    const result = await executeCommand(args.join(' '));
    return { output: result.output, success: result.success };
  },

  watch: async (args) => {
    if (!args[0]) return { output: 'watch: missing command', success: false, error: 'Usage: watch <command> [interval]' };
    const interval = parseInt(args[args.length - 1], 10);
    const command = args.slice(0, isNaN(interval) ? undefined : -1).join(' ');
    if (isNaN(interval)) {
      return { output: `watch: missing interval (e.g., watch ls 2)`, success: false, error: 'Usage: watch <command> <seconds>' };
    }

    // Create a job to track this watch
    const jobId = useJobsStore.getState().addJob({
      title: `watch: ${command}`,
      type: 'watch',
      command: `${command} every ${interval}s`,
      meta: { watchCommand: command, watchInterval: interval },
    });

    useJobsStore.getState().updateJob(jobId, { status: 'running' });

    let iteration = 0;
    const intervalId = setInterval(async () => {
      iteration++;
      const result = await executeCommand(command);
      const job = useJobsStore.getState().getJob(jobId);
      if (job) {
        const newLog = { id: `log-${Date.now()}`, ts: new Date().toISOString(), level: 'info' as const, message: `[${iteration}] ${result.output || '(no output)'}` };
        useJobsStore.getState().updateJob(jobId, { logs: [...job.logs, newLog] });
      }
    }, interval * 1000);

    jobIntervals.set(jobId, intervalId);
    return { output: `Watching: ${command} every ${interval}s\nJob ID: ${jobId.slice(0, 8)}\n(Ctrl+C or kill to stop)`, success: true };
  },

  memory: (args) => {
    const subcmd = args[0];
    const memory = useMemoryStore.getState();

    if (subcmd === 'list') {
      const items = memory.listItems();
      if (items.length === 0) return { output: 'No memory items', success: true };
      return { output: items.map(i => `[${i.id.slice(0, 8)}] ${i.content.slice(0, 50)}`).join('\n'), success: true };
    }

    if (subcmd === 'add') {
      const content = args.slice(1).join(' ');
      if (!content) return { output: 'memory add: missing content', success: false, error: 'Usage: memory add <content>' };
      memory.addItem({ path: `/memory/${Date.now()}`, content, tags: [], meta: {} });
      return { output: 'Memory item added', success: true };
    }

    if (subcmd === 'search') {
      const query = args.slice(1).join(' ');
      const results = memory.searchItems(query);
      if (results.length === 0) return { output: 'No matching memories', success: true };
      return { output: results.map(i => `[${i.id.slice(0, 8)}] ${i.content.slice(0, 50)}`).join('\n'), success: true };
    }

    return { output: 'memory: use: list, add, search', success: false, error: 'Usage: memory [list|add <content>|search <query>]' };
  },

  agent: async (args) => {
    const subcmd = args[0];

    if (subcmd === 'list') {
      const agents = useAgentsStore.getState().listAgents();
      if (agents.length === 0) {
        return { output: 'No agents configured', success: true };
      }
      const output = agents.map(a =>
        `[${a.id.slice(0, 8)}] ${a.name} (${a.status}) - ${a.description}`
      ).join('\n');
      return { output, success: true };
    }

    if (subcmd === 'create') {
      // agent create <name> [description...]
      const name = args[1] || 'Unnamed Agent';
      const description = args.slice(2).join(' ');
      const id = useAgentsStore.getState().createAgent(name, description);
      return { output: `Agent created: ${id.slice(0, 8)}`, success: true };
    }

    if (subcmd === 'run') {
      const agentId = args[1];
      const task = args.slice(2).join(' ') || 'No task';
      if (!agentId) {
        return { output: 'agent run: missing agent id', success: false, error: 'Usage: agent run <id> <task>' };
      }
      const result = await useAgentsStore.getState().runAgent(agentId, task);
      return { output: result.result, success: result.success };
    }

    if (subcmd === 'delete') {
      const agentId = args[1];
      if (!agentId) {
        return { output: 'agent delete: missing agent id', success: false, error: 'Usage: agent delete <id>' };
      }
      useAgentsStore.getState().deleteAgent(agentId);
      return { output: `Agent ${agentId.slice(0, 8)} deleted`, success: true };
    }

    return { output: 'agent: unknown subcommand. Use: list, create, run, delete', success: false, error: 'Unknown subcommand' };
  },
};

export async function executeCommand(input: string): Promise<CommandResult> {
  const { cmd, args, flags } = parseCommand(input);

  if (!cmd) {
    return { output: '', success: true };
  }

  const handler = commands[cmd.toLowerCase()];
  if (!handler) {
    return { output: `${cmd}: command not found`, success: false, error: `Unknown command: ${cmd}` };
  }

  try {
    const result = await handler(args, flags);
    useShellStore.getState().addHistory({ command: input, output: result.output, timestamp: new Date().toISOString(), success: result.success });
    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return { output: `${cmd}: ${errorMsg}`, success: false, error: errorMsg };
  }
}
