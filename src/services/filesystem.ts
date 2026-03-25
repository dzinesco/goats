import { v4 as uuid } from 'uuid';
import type { FSNode, FSNodeType } from '@/types';

const DEFAULT_DIRS = ['/', '/home', '/home/user', '/apps', '/jobs', '/memory', '/automations', '/sessions', '/logs', '/mounts'];

export type FileSystemService = {
  getNode(path: string): FSNode | undefined;
  listDir(path: string): FSNode[];
  exists(path: string): boolean;

  mkdir(path: string, opts?: { recursive?: boolean }): void;
  writeFile(path: string, content: string): void;
  readFile(path: string): string;
  rm(path: string, opts?: { recursive?: boolean }): void;
  mv(from: string, to: string): void;
  cp(from: string, to: string): void;
  touch(path: string): void;
  find(startPath: string, pattern?: string): FSNode[];
};

type FSStore = {
  nodes: Record<string, FSNode>;
};

export function createFileSystemService(store: FSStore): FileSystemService {
  function getNode(path: string): FSNode | undefined {
    return store.nodes[path];
  }

  function exists(path: string): boolean {
    return path in store.nodes;
  }

  function listDir(path: string): FSNode[] {
    const node = store.nodes[path];
    if (!node || node.type !== 'directory') return [];
    const parentPath = path === '/' ? null : path;
    return Object.values(store.nodes).filter(n => n.parentPath === parentPath);
  }

  function mkdir(path: string, opts?: { recursive?: boolean }): void {
    if (exists(path)) return;

    if (opts?.recursive) {
      const parts = path.split('/').filter(Boolean);
      let current = '';
      for (const part of parts) {
        current += '/' + part;
        if (!exists(current)) {
          createNode(current, 'directory');
        }
      }
    } else {
      createNode(path, 'directory');
    }
  }

  function createNode(path: string, type: FSNodeType, content?: string): FSNode {
    const now = new Date().toISOString();
    const name = path.split('/').pop() || '';
    const parentPath = path === '/' ? null : '/' + path.split('/').slice(1, -1).join('/') || '/';

    const node: FSNode = {
      id: uuid(),
      path,
      name,
      parentPath,
      type,
      size: type === 'file' && content !== undefined ? content.length : 0,
      content: type === 'file' ? content : undefined,
      createdAt: now,
      updatedAt: now,
    };

    store.nodes[path] = node;
    return node;
  }

  function writeFile(path: string, content: string): void {
    const dirPath = '/' + path.split('/').slice(1, -1).join('/') || '/';
    if (!exists(dirPath)) {
      mkdir(dirPath, { recursive: true });
    }

    const existing = store.nodes[path];
    const now = new Date().toISOString();
    if (existing) {
      store.nodes[path] = {
        ...existing,
        content,
        size: content.length,
        updatedAt: now,
      };
    } else {
      createNode(path, 'file', content);
    }
  }

  function readFile(path: string): string {
    const node = store.nodes[path];
    if (!node || node.type !== 'file') {
      throw new Error(`cat: ${path}: No such file`);
    }
    return node.content || '';
  }

  function rm(path: string, opts?: { recursive?: boolean }): void {
    const node = store.nodes[path];
    if (!node) {
      throw new Error(`rm: ${path}: No such file or directory`);
    }

    if (node.type === 'directory') {
      const children = listDir(path);
      if (children.length > 0 && !opts?.recursive) {
        throw new Error(`rm: ${path}: Is a directory (use -r to remove)`);
      }
      if (opts?.recursive) {
        for (const child of children) {
          rm(child.path, { recursive: true });
        }
      }
    }

    delete store.nodes[path];
  }

  function mv(from: string, to: string): void {
    const node = store.nodes[from];
    if (!node) {
      throw new Error(`mv: ${from}: No such file or directory`);
    }

    const toDir = '/' + to.split('/').slice(1, -1).join('/') || '/';
    if (!exists(toDir)) {
      mkdir(toDir, { recursive: true });
    }

    const now = new Date().toISOString();
    const name = to.split('/').pop() || '';

    store.nodes[to] = {
      ...node,
      name,
      path: to,
      updatedAt: now,
    };
    delete store.nodes[from];
  }

  function cp(from: string, to: string): void {
    const node = store.nodes[from];
    if (!node) {
      throw new Error(`cp: ${from}: No such file or directory`);
    }

    const toDir = '/' + to.split('/').slice(1, -1).join('/') || '/';
    if (!exists(toDir)) {
      mkdir(toDir, { recursive: true });
    }

    const now = new Date().toISOString();
    const name = to.split('/').pop() || '';

    store.nodes[to] = {
      ...node,
      id: uuid(),
      name,
      path: to,
      createdAt: now,
      updatedAt: now,
    };
  }

  function touch(path: string): void {
    if (!exists(path)) {
      writeFile(path, '');
    }
  }

  function find(startPath: string, pattern?: string): FSNode[] {
    const results: FSNode[] = [];
    const search = (p: string) => {
      const node = store.nodes[p];
      if (!node) return;
      if (pattern && node.name.toLowerCase().includes(pattern.toLowerCase())) {
        results.push(node);
      }
      if (node.type === 'directory') {
        for (const child of listDir(p)) {
          search(child.path);
        }
      }
    };
    search(startPath);
    return results;
  }

  return { getNode, listDir, exists, mkdir, writeFile, readFile, rm, mv, cp, touch, find };
}

export function createInitialFSNodes(): Record<string, FSNode> {
  const nodes: Record<string, FSNode> = {};
  const now = new Date().toISOString();

  for (const dir of DEFAULT_DIRS) {
    const parts = dir.split('/').filter(Boolean);
    const name = parts[parts.length - 1] || '';
    const parentPath = dir === '/' ? null : '/' + parts.slice(0, -1).join('/') || null;

    nodes[dir] = {
      id: uuid(),
      path: dir,
      name: name || '/',
      parentPath,
      type: 'directory',
      size: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  return nodes;
}
