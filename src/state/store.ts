import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import type {
  FSNode, Job, Session, MemoryItem, RegistryEntry, ShellHistoryEntry
} from '@/types';
import { createInitialFSNodes } from '@/services/filesystem';
import { jobIntervals, clearJobInterval } from './jobIntervals';

// ============ Filesystem Store ============

interface FilesystemState {
  nodes: Record<string, FSNode>;
  cwd: string;
  init: () => void;
  getNode: (path: string) => FSNode | null;
  listDir: (path: string) => FSNode[];
  mkdir: (path: string) => void;
  touch: (path: string, content?: string) => void;
  rm: (path: string, recursive?: boolean) => void;
  writeFile: (path: string, content: string) => void;
  readFile: (path: string) => string | null;
  cd: (path: string) => void;
  cp: (src: string, dest: string) => void;
  mv: (src: string, dest: string) => void;
  find: (path: string, name: string) => FSNode[];
}

export const useFilesystemStore = create<FilesystemState>()(
  persist(
    (set, get) => ({
      nodes: {},
      cwd: '/home/user',

      init: () => {
        const state = get();
        if (Object.keys(state.nodes).length === 0) {
          set({ nodes: createInitialFSNodes(), cwd: '/home/user' });
        }
      },

      getNode: (path: string) => get().nodes[path] || null,

      listDir: (path: string) => {
        const node = get().nodes[path];
        if (!node || node.type !== 'directory') return [];
        const parentPath = path === '/' ? null : path;
        return Object.values(get().nodes).filter(n => n.parentPath === parentPath);
      },

      mkdir: (path: string) => {
        const state = get();
        if (state.nodes[path]) return;

        const now = new Date().toISOString();
        const name = path.split('/').pop() || '';
        const parentPath = path === '/' ? null : '/' + path.split('/').slice(1, -1).join('/') || '/';

        const newNode: FSNode = {
          id: uuid(),
          path,
          name,
          parentPath,
          type: 'directory',
          size: 0,
          createdAt: now,
          updatedAt: now,
        };

        set({ nodes: { ...state.nodes, [path]: newNode } });
      },

      touch: (path: string, content = '') => {
        const state = get();
        if (state.nodes[path]) return;

        const now = new Date().toISOString();
        const name = path.split('/').pop() || '';
        const parentPath = path === '/' ? null : '/' + path.split('/').slice(1, -1).join('/') || '/';

        const newNode: FSNode = {
          id: uuid(),
          path,
          name,
          parentPath,
          type: 'file',
          content,
          size: content.length,
          createdAt: now,
          updatedAt: now,
        };

        set({ nodes: { ...state.nodes, [path]: newNode } });
      },

      rm: (path: string, recursive = false) => {
        const state = get();
        const node = state.nodes[path];
        if (!node) return;

        if (node.type === 'directory') {
          const children = state.listDir(path);
          if (children.length > 0 && !recursive) {
            throw new Error(`rm: ${path}: Is a directory (use -r to remove)`);
          }
          if (recursive) {
            for (const child of children) {
              get().rm(child.path, true);
            }
          }
        }

        set(s => {
          const updated = { ...s.nodes };
          delete updated[path];
          return { nodes: updated };
        });
      },

      writeFile: (path: string, content: string) => {
        const state = get();
        const now = new Date().toISOString();

        if (state.nodes[path]) {
          set({
            nodes: {
              ...state.nodes,
              [path]: {
                ...state.nodes[path],
                content,
                size: content.length,
                updatedAt: now,
              },
            },
          });
        } else {
          state.touch(path, content);
        }
      },

      readFile: (path: string) => {
        const node = get().nodes[path];
        if (!node || node.type !== 'file') return null;
        return node.content || null;
      },

      cd: (path: string) => {
        const state = get();
        let newPath = path;

        if (path === '..') {
          const parts = state.cwd.split('/').filter(Boolean);
          newPath = '/' + parts.slice(0, -1).join('/') || '/';
        } else if (path === '.') {
          newPath = state.cwd;
        } else if (!path.startsWith('/')) {
          newPath = state.cwd === '/' ? `/${path}` : `${state.cwd}/${path}`;
        }

        const node = state.nodes[newPath];
        if (!node) {
          throw new Error(`cd: ${path}: No such file or directory`);
        }
        if (node.type !== 'directory') {
          throw new Error(`cd: ${path}: Not a directory`);
        }
        set({ cwd: newPath });
      },

      cp: (src: string, dest: string) => {
        const state = get();
        const srcNode = state.nodes[src];
        if (!srcNode) return;

        const now = new Date().toISOString();
        const name = dest.split('/').pop() || '';
        const parentPath = dest === '/' ? null : '/' + dest.split('/').slice(1, -1).join('/') || '/';

        const newNode: FSNode = {
          ...srcNode,
          id: uuid(),
          path: dest,
          name,
          parentPath,
          size: srcNode.type === 'file' ? (srcNode.size || 0) : 0,
          createdAt: now,
          updatedAt: now,
        };

        const newNodes = { ...state.nodes, [dest]: newNode };

        // Recursively copy all descendants
        if (srcNode.type === 'directory') {
          const copyChildren = (srcDir: string, destDir: string) => {
            const children = state.listDir(srcDir);
            for (const child of children) {
              const childDest = destDir + child.path.slice(srcDir.length);
              const childParentPath = destDir;
              newNodes[childDest] = {
                ...child,
                id: uuid(),
                path: childDest,
                parentPath: childParentPath,
                createdAt: now,
                updatedAt: now,
              };
              if (child.type === 'directory') {
                copyChildren(child.path, childDest);
              }
            }
          };
          copyChildren(src, dest);
        }

        set({ nodes: newNodes });
      },

      mv: (src: string, dest: string) => {
        const state = get();
        const srcNode = state.nodes[src];
        if (!srcNode) return;

        const now = new Date().toISOString();
        const name = dest.split('/').pop() || '';

        // Update all nodes that are children of src
        const updatedNodes = { ...state.nodes };
        delete updatedNodes[src];

        updatedNodes[dest] = {
          ...srcNode,
          path: dest,
          name,
          updatedAt: now,
        };

        // Update all descendant paths
        for (const [path, node] of Object.entries(updatedNodes)) {
          if (path.startsWith(src + '/')) {
            const newPath = dest + path.slice(src.length);
            const newParentPath = dest;
            delete updatedNodes[path];
            updatedNodes[newPath] = {
              ...node,
              path: newPath,
              parentPath: newParentPath,
              updatedAt: now,
            };
          }
        }

        set({ nodes: updatedNodes });
      },

      find: (startPath: string, name: string) => {
        const results: FSNode[] = [];
        const q = name.toLowerCase();
        const search = (p: string) => {
          const node = get().nodes[p];
          if (!node) return;
          // Match by name
          if (node.name.toLowerCase().includes(q)) {
            results.push(node);
            return; // Don't also match by content for directories
          }
          // Match by content for files
          if (node.type === 'file' && node.content?.toLowerCase().includes(q)) {
            results.push(node);
          }
          if (node.type === 'directory') {
            for (const child of get().listDir(p)) {
              search(child.path);
            }
          }
        };
        search(startPath);
        return results;
      },
    }),
    { name: 'goatos-filesystem', storage: createJSONStorage(() => localStorage) }
  )
);

// ============ Jobs Store ============

interface JobsState {
  jobs: Record<string, Job>;
  addJob: (job: Omit<Job, 'id' | 'createdAt' | 'logs' | 'artifacts' | 'status'>) => string;
  updateJob: (id: string, updates: Partial<Job>) => void;
  removeJob: (id: string) => void;
  getJob: (id: string) => Job | undefined;
  listJobs: () => Job[];
  initWatchJobs: () => void;
}

export const useJobsStore = create<JobsState>()(
  persist(
    (set, get) => ({
      jobs: {},

      addJob: (job) => {
        const id = uuid();
        const now = new Date().toISOString();
        set(state => ({
          jobs: {
            ...state.jobs,
            [id]: { ...job, id, createdAt: now, status: 'queued' as const, logs: [], artifacts: [] },
          },
        }));
        return id;
      },

      updateJob: (id, updates) => {
        set(state => ({
          jobs: {
            ...state.jobs,
            [id]: { ...state.jobs[id], ...updates },
          },
        }));
      },

      removeJob: (id) => {
        clearJobInterval(id);
        set(state => {
          const { [id]: _, ...rest } = state.jobs;
          return { jobs: rest };
        });
      },

      getJob: (id) => get().jobs[id],

      listJobs: () => Object.values(get().jobs).sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),

      initWatchJobs: () => {
        // Restart any watch jobs that were running before page reload
        const state = get();
        for (const job of Object.values(state.jobs)) {
          if (job.type === 'watch' && job.status === 'running' && job.meta?.watchCommand) {
            const command = job.meta.watchCommand as string;
            const interval = job.meta.watchInterval as number;
            if (command && interval && typeof interval === 'number') {
              // Check if already has an interval running
              if (!jobIntervals.has(job.id)) {
                let iteration = job.logs.length;
                const intervalId = setInterval(async () => {
                  iteration++;
                  // Lazy import to avoid circular dependency
                  const { executeCommand } = await import('@/commands/parser');
                  const result = await executeCommand(command);
                  const updatedJob = get().jobs[job.id];
                  if (updatedJob) {
                    const newLog = { id: `log-${Date.now()}`, ts: new Date().toISOString(), level: 'info' as const, message: `[${iteration}] ${result.output || '(no output)'}` };
                    get().updateJob(job.id, { logs: [...updatedJob.logs, newLog] });
                  }
                }, interval * 1000);
                jobIntervals.set(job.id, intervalId);
              }
            }
          }
        }
      },
    }),
    { name: 'goatos-jobs', storage: createJSONStorage(() => localStorage) }
  )
);

// ============ Registry Store ============

interface RegistryState {
  entries: Record<string, RegistryEntry>;
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
  list: () => RegistryEntry[];
  remove: (key: string) => void;
}

export const useRegistryStore = create<RegistryState>()(
  persist(
    (set, get) => ({
      entries: {
        'browser.default': { key: 'browser.default', value: 'chrome', updatedAt: new Date().toISOString() },
        'ai.model': { key: 'ai.model', value: 'local', updatedAt: new Date().toISOString() },
        'shell.theme': { key: 'shell.theme', value: 'dark', updatedAt: new Date().toISOString() },
        'automation.approval_mode': { key: 'automation.approval_mode', value: 'prompt', updatedAt: new Date().toISOString() },
      },

      get: (key) => get().entries[key]?.value,

      set: (key, value) => {
        set(state => ({
          entries: {
            ...state.entries,
            [key]: { key, value: value as import('@/types').RegistryValue, updatedAt: new Date().toISOString() },
          },
        }));
      },

      list: () => Object.values(get().entries),

      remove: (key) => {
        set(state => {
          const { [key]: _, ...rest } = state.entries;
          return { entries: rest };
        });
      },
    }),
    { name: 'goatos-registry', storage: createJSONStorage(() => localStorage) }
  )
);

// ============ Sessions Store ============

interface SessionsState {
  sessions: Record<string, Session>;
  addSession: (session: Omit<Session, 'id'>) => string;
  updateSession: (id: string, updates: Partial<Session>) => void;
  removeSession: (id: string) => void;
  getSession: (id: string) => Session | undefined;
  listSessions: () => Session[];
}

export const useSessionsStore = create<SessionsState>()(
  persist(
    (set, get) => ({
      sessions: {},

      addSession: (session) => {
        const id = uuid();
        set(state => ({
          sessions: { ...state.sessions, [id]: { ...session, id } },
        }));
        return id;
      },

      updateSession: (id, updates) => {
        set(state => ({
          sessions: { ...state.sessions, [id]: { ...state.sessions[id], ...updates } },
        }));
      },

      removeSession: (id) => {
        set(state => {
          const { [id]: _, ...rest } = state.sessions;
          return { sessions: rest };
        });
      },

      getSession: (id) => get().sessions[id],

      listSessions: () => Object.values(get().sessions),
    }),
    { name: 'goatos-sessions', storage: createJSONStorage(() => localStorage) }
  )
);

// ============ Memory Store ============

interface MemoryState {
  items: Record<string, MemoryItem>;
  addItem: (item: Omit<MemoryItem, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateItem: (id: string, updates: Partial<MemoryItem>) => void;
  removeItem: (id: string) => void;
  getItem: (id: string) => MemoryItem | undefined;
  listItems: () => MemoryItem[];
  searchItems: (query: string) => MemoryItem[];
}

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      items: {},

      addItem: (item) => {
        const id = uuid();
        const now = new Date().toISOString();
        set(state => ({
          items: { ...state.items, [id]: { ...item, id, createdAt: now, updatedAt: now } },
        }));
        return id;
      },

      updateItem: (id, updates) => {
        set(state => ({
          items: {
            ...state.items,
            [id]: { ...state.items[id], ...updates, updatedAt: new Date().toISOString() },
          },
        }));
      },

      removeItem: (id) => {
        set(state => {
          const { [id]: _, ...rest } = state.items;
          return { items: rest };
        });
      },

      getItem: (id) => get().items[id],

      listItems: () => Object.values(get().items),

      searchItems: (query) => {
        const q = query.toLowerCase();
        return Object.values(get().items).filter(item =>
          item.content.toLowerCase().includes(q) ||
          item.tags.some(tag => tag.toLowerCase().includes(q))
        );
      },
    }),
    { name: 'goatos-memory', storage: createJSONStorage(() => localStorage) }
  )
);

// ============ Shell Store ============

type ShellMode = 'terminal' | 'gui';

interface ShellState {
  mode: ShellMode;
  history: ShellHistoryEntry[];
  cwd: string;
  setMode: (mode: ShellMode) => void;
  addHistory: (entry: ShellHistoryEntry) => void;
  setCwd: (cwd: string) => void;
  clearHistory: () => void;
}

export const useShellStore = create<ShellState>()(
  persist(
    (set) => ({
      mode: 'terminal',
      history: [],
      cwd: '/home/user',

      setMode: (mode) => set({ mode }),

      addHistory: (entry) => set(state => ({
        history: [...state.history.slice(-99), entry],
      })),

      setCwd: (cwd) => set({ cwd }),

      clearHistory: () => set({ history: [] }),
    }),
    { name: 'goatos-shell', storage: createJSONStorage(() => localStorage) }
  )
);
