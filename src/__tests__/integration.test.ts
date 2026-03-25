import { describe, it, expect, beforeEach } from 'vitest';
import { useShellStore, useFilesystemStore, useRegistryStore } from '@/state/store';

describe('Shell Store', () => {
  beforeEach(() => {
    useShellStore.getState().setMode('terminal');
  });

  it('starts in terminal mode', () => {
    expect(useShellStore.getState().mode).toBe('terminal');
  });

  it('can switch to gui mode', () => {
    useShellStore.getState().setMode('gui');
    expect(useShellStore.getState().mode).toBe('gui');
  });

  it('can switch back to terminal mode', () => {
    useShellStore.getState().setMode('gui');
    useShellStore.getState().setMode('terminal');
    expect(useShellStore.getState().mode).toBe('terminal');
  });

  it('adds to history', () => {
    useShellStore.getState().addHistory({
      command: 'ls',
      output: '',
      timestamp: new Date().toISOString(),
      success: true,
    });
    expect(useShellStore.getState().history.length).toBe(1);
  });

  it('limits history to 100 entries', () => {
    // Clear existing history first
    const currentLen = useShellStore.getState().history.length;
    // Add enough to exceed 100
    for (let i = 0; i < 150 - currentLen; i++) {
      useShellStore.getState().addHistory({
        command: `cmd${i}`,
        output: '',
        timestamp: new Date().toISOString(),
        success: true,
      });
    }
    expect(useShellStore.getState().history.length).toBeLessThanOrEqual(100);
  });
});

describe('Filesystem Store', () => {
  beforeEach(() => {
    useFilesystemStore.getState().init();
  });

  it('initializes with default directories', () => {
    const node = useFilesystemStore.getState().getNode('/home/user');
    expect(node).not.toBeNull();
    expect(node?.type).toBe('directory');
  });

  it('creates files and directories', () => {
    useFilesystemStore.getState().mkdir('/home/user/test');
    useFilesystemStore.getState().touch('/home/user/test/file.txt', 'content');

    const file = useFilesystemStore.getState().getNode('/home/user/test/file.txt');
    expect(file).not.toBeNull();
    expect(file?.content).toBe('content');
  });

  it('persists across store operations', () => {
    useFilesystemStore.getState().mkdir('/home/user/persist');
    useFilesystemStore.getState().touch('/home/user/persist/data.txt', 'important');

    const data = useFilesystemStore.getState().readFile('/home/user/persist/data.txt');
    expect(data).toBe('important');
  });
});

describe('Registry Store', () => {
  it('has default entries', () => {
    const entries = useRegistryStore.getState().list();
    expect(entries.length).toBeGreaterThan(0);
  });

  it('can set and get values', () => {
    useRegistryStore.getState().set('test.value', 'hello');
    expect(useRegistryStore.getState().get('test.value')).toBe('hello');
  });

  it('can set complex values', () => {
    const obj = { nested: { value: 123 } };
    useRegistryStore.getState().set('test.object', obj);
    expect(useRegistryStore.getState().get('test.object')).toEqual(obj);
  });
});
