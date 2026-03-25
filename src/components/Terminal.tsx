import { useEffect, useRef, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { executeCommand } from '@/commands/parser';
import { useFilesystemStore, useShellStore, useJobsStore } from '@/state/store';

const COMMANDS = [
  'ls', 'cd', 'pwd', 'mkdir', 'touch', 'cat', 'cp', 'mv', 'rm', 'find',
  'ps', 'jobs', 'kill', 'clear', 'history', 'whoami', 'uname', 'echo',
  'reg', 'browser', 'agent', 'ask', 'plan', 'run', 'watch', 'memory',
  'startx', 'help',
];

export function Terminal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const historyIndexRef = useRef(-1);
  const currentLineRef = useRef('');
  const tempInputRef = useRef('');
  const completionIndexRef = useRef(-1);
  const completionCandidatesRef = useRef<string[]>([]);

  const init = useFilesystemStore(s => s.init);
  const initWatchJobs = useJobsStore(s => s.initWatchJobs);
  const shellHistory = useShellStore(s => s.history);

  const prompt = useCallback(() => {
    const cwd = useFilesystemStore.getState().cwd;
    const homeShort = cwd.replace('/home/user', '~');
    return `\x1b[1;32muser@goatos\x1b[0m:\x1b[1;34m${homeShort}\x1b[0m$ `;
  }, []);

  const printPrompt = useCallback(() => {
    xtermRef.current?.write(prompt());
  }, [prompt]);

  const clearCurrentLine = useCallback((line: string) => {
    const xterm = xtermRef.current;
    if (!xterm) return;
    for (let i = 0; i < line.length; i++) {
      xterm.write('\b \b');
    }
  }, []);

  const getCompletionCandidates = useCallback((partial: string): string[] => {
    const parts = partial.split(' ');
    const cwd = useFilesystemStore.getState().cwd;

    if (parts.length === 1) {
      // Command completion
      const cmdPart = parts[0].toLowerCase();
      return COMMANDS.filter(c => c.startsWith(cmdPart));
    }

    // Path completion (after a command)
    const lastPart = parts[parts.length - 1];

    if (lastPart.startsWith('/')) {
      // Absolute path
      const dir = lastPart.includes('/') ? lastPart.slice(0, lastPart.lastIndexOf('/') + 1) : '/';
      const prefix = lastPart.includes('/') ? lastPart.slice(lastPart.lastIndexOf('/') + 1) : lastPart;
      const state = useFilesystemStore.getState();
      const children = state.listDir(dir);
      return children
        .filter(n => n.name.startsWith(prefix))
        .map(n => {
          const completed = dir + n.name;
          return n.type === 'directory' ? completed + '/' : completed;
        });
    } else if (lastPart.includes('/')) {
      // Relative path with current dir context
      const prefix = lastPart.slice(lastPart.lastIndexOf('/') + 1);
      const state = useFilesystemStore.getState();
      const resolvedDir = cwd + (lastPart.startsWith('./') ? lastPart.slice(1) : lastPart).slice(0, lastPart.lastIndexOf('/'));
      const children = state.listDir(resolvedDir);
      return children
        .filter(n => n.name.startsWith(prefix))
        .map(n => {
          const completed = resolvedDir + '/' + n.name;
          return n.type === 'directory' ? completed + '/' : completed;
        });
    } else {
      // Relative to current directory
      const state = useFilesystemStore.getState();
      const children = state.listDir(cwd);
      return children
        .filter(n => n.name.startsWith(lastPart))
        .map(n => {
          const completed = n.name;
          return n.type === 'directory' ? completed + '/' : completed;
        });
    }
  }, []);

  const handleCommand = useCallback(async (command: string) => {
    const result = await executeCommand(command);

    if (result.output) {
      xtermRef.current?.write('\r\n' + result.output.replace(/\n/g, '\r\n') + '\r\n');
    }

    if (result.success && command.trim() !== 'clear') {
      printPrompt();
    } else if (command.trim() === 'clear') {
      printPrompt();
    }
  }, [printPrompt]);

  useEffect(() => {
    init();
    initWatchJobs();

    const xterm = new XTerm({
      cursorBlink: true,
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      fontSize: 14,
      theme: {
        background: '#0a0a0f',
        foreground: '#e0e0e0',
        cursor: '#6366f1',
        cursorAccent: '#0a0a0f',
        black: '#0a0a0f',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#f59e0b',
        blue: '#6366f1',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#e0e0e0',
        brightBlack: '#666680',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#fbbf24',
        brightBlue: '#818cf8',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff',
      },
      scrollback: 1000,
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);

    xterm.open(containerRef.current!);
    fitAddon.fit();

    xterm.write('Welcome to goatos v1.0.0\r\n');
    xterm.write('Type "help" for available commands. Press Tab for completion.\r\n\r\n');

    // Rehydrate history from store
    if (shellHistory.length > 0) {
      xterm.write('\x1b[1;33m--- Restored previous session ---\x1b[0m\r\n');
    }

    printPrompt();

    let currentLine = '';
    currentLineRef.current = '';

    // Handle special keys
    xterm.onKey(({ domEvent }) => {
      const code = domEvent.key;
      const ctrl = domEvent.ctrlKey;

      if (code === 'Enter') {
        xterm.write('\r\n');
        completionIndexRef.current = -1;
        completionCandidatesRef.current = [];
        if (currentLine.trim()) {
          handleCommand(currentLine);
        } else {
          printPrompt();
        }
        currentLine = '';
        currentLineRef.current = '';
        historyIndexRef.current = -1;
      } else if (code === 'Backspace') {
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          currentLineRef.current = currentLine;
          xterm.write('\b \b');
        }
        completionIndexRef.current = -1;
        completionCandidatesRef.current = [];
      } else if (code === 'Tab') {
        domEvent.preventDefault();

        // If no candidates yet, get them
        if (completionCandidatesRef.current.length === 0 || completionIndexRef.current === -1) {
          completionCandidatesRef.current = getCompletionCandidates(currentLine);
          completionIndexRef.current = completionCandidatesRef.current.length === 1 ? 0 : -1;
        }

        if (completionCandidatesRef.current.length === 1) {
          // Single match - complete it
          const parts = currentLine.split(' ');
          const lastPart = parts[parts.length - 1];
          const completion = completionCandidatesRef.current[0];

          // Calculate how much to add
          const toAdd = completion.slice(lastPart.length);

          // Write the completion
          xterm.write(toAdd);
          currentLine += toAdd;
          currentLineRef.current = currentLine;

          completionIndexRef.current = -1;
          completionCandidatesRef.current = [];
        } else if (completionCandidatesRef.current.length > 1) {
          // Multiple matches - cycle through them
          completionIndexRef.current = (completionIndexRef.current + 1) % completionCandidatesRef.current.length;
          const candidate = completionCandidatesRef.current[completionIndexRef.current];

          // Restore to state before completion started and apply new candidate
          const parts = currentLine.split(' ');
          parts[parts.length - 1] = candidate;
          const newLine = parts.join(' ');

          clearCurrentLine(currentLine);
          xterm.write(newLine);
          currentLine = newLine;
          currentLineRef.current = currentLine;
        } else {
          // No matches - beep or show nothing
          xterm.write('\x07'); // Bell
        }
      } else if (code === 'ArrowUp' && !ctrl) {
        domEvent.preventDefault();
        completionIndexRef.current = -1;
        completionCandidatesRef.current = [];
        const history = useShellStore.getState().history;
        if (history.length === 0) return;

        if (historyIndexRef.current === -1) {
          tempInputRef.current = currentLine;
          historyIndexRef.current = history.length - 1;
        } else if (historyIndexRef.current > 0) {
          historyIndexRef.current--;
        } else {
          return;
        }

        const historyItem = history[historyIndexRef.current];
        if (historyItem) {
          clearCurrentLine(currentLine);
          currentLine = historyItem.command;
          currentLineRef.current = currentLine;
          xterm.write(currentLine);
        }
      } else if (code === 'ArrowDown' && !ctrl) {
        domEvent.preventDefault();
        completionIndexRef.current = -1;
        completionCandidatesRef.current = [];
        const history = useShellStore.getState().history;
        if (historyIndexRef.current === -1) return;

        if (historyIndexRef.current < history.length - 1) {
          historyIndexRef.current++;
          const historyItem = history[historyIndexRef.current];
          clearCurrentLine(currentLine);
          currentLine = historyItem?.command || '';
          currentLineRef.current = currentLine;
          xterm.write(currentLine);
        } else {
          historyIndexRef.current = -1;
          clearCurrentLine(currentLine);
          currentLine = tempInputRef.current;
          currentLineRef.current = currentLine;
          xterm.write(currentLine);
        }
      } else if (code === 'ArrowLeft' || code === 'ArrowRight') {
        return;
      } else if (code === 'c' && ctrl) {
        xterm.write('^C\r\n');
        currentLine = '';
        currentLineRef.current = '';
        historyIndexRef.current = -1;
        completionIndexRef.current = -1;
        completionCandidatesRef.current = [];
        printPrompt();
      } else if (code === 'l' && ctrl) {
        xterm.write('\x1b[2J\x1b[H');
        printPrompt();
      }
    });

    xterm.onData(data => {
      const charCode = data.charCodeAt(0);
      if (charCode >= 32 && charCode <= 126) {
        currentLine += data;
        currentLineRef.current = currentLine;
        xterm.write(data);
        // Reset completion state on new input
        completionIndexRef.current = -1;
        completionCandidatesRef.current = [];
      }
    });

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      xterm.dispose();
    };
  }, [init, handleCommand, printPrompt, shellHistory, clearCurrentLine, getCompletionCandidates]);

  return (
    <div ref={containerRef} className="w-full h-full bg-os-bg" />
  );
}
