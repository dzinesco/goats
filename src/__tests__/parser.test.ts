import { describe, it, expect, beforeEach } from 'vitest';
import { parseCommand, executeCommand } from '@/commands/parser';
import { useFilesystemStore, useRegistryStore } from '@/state/store';

describe('Command Parser', () => {
  it('parses simple command', () => {
    const result = parseCommand('ls');
    expect(result.cmd).toBe('ls');
    expect(result.args).toEqual([]);
    expect(result.flags).toEqual({});
  });

  it('parses command with args', () => {
    const result = parseCommand('ls /home/user');
    expect(result.cmd).toBe('ls');
    expect(result.args).toEqual(['/home/user']);
  });

  it('parses command with flags', () => {
    const result = parseCommand('ls -l -a /home');
    expect(result.cmd).toBe('ls');
    expect(result.args).toEqual(['/home']);
    expect(result.flags).toEqual({ l: true, a: true });
  });

  it('parses command with multi-char flag and value', () => {
    const result = parseCommand('reg set --key somevalue');
    expect(result.cmd).toBe('reg');
    expect(result.args).toEqual(['set']);
    expect(result.flags).toEqual({ key: 'somevalue' });
  });

  it('parses ls -la as combined flag', () => {
    const result = parseCommand('ls -la');
    expect(result.cmd).toBe('ls');
    expect(result.args).toEqual([]);
    expect(result.flags).toEqual({ la: true });
  });

  it('parses command with --flag value', () => {
    const result = parseCommand('reg set --key value');
    expect(result.flags).toEqual({ key: 'value' });
  });
});

describe('Filesystem Commands', () => {
  beforeEach(() => {
    useFilesystemStore.getState().init();
  });

  it('pwd returns current directory', async () => {
    const result = await executeCommand('pwd');
    expect(result.success).toBe(true);
    expect(result.output).toBe('/home/user');
  });

  it('mkdir creates directory', async () => {
    await executeCommand('mkdir /home/user/testdir');
    const node = useFilesystemStore.getState().getNode('/home/user/testdir');
    expect(node).not.toBeNull();
    expect(node?.type).toBe('directory');
  });

  it('touch creates file', async () => {
    await executeCommand('touch /home/user/testfile.txt');
    const node = useFilesystemStore.getState().getNode('/home/user/testfile.txt');
    expect(node).not.toBeNull();
    expect(node?.type).toBe('file');
  });

  it('ls lists directory contents', async () => {
    await executeCommand('mkdir /home/user/testls');
    const result = await executeCommand('ls');
    expect(result.success).toBe(true);
  });

  it('cat reads file content', async () => {
    await executeCommand('touch /home/user/readme.txt');
    useFilesystemStore.getState().writeFile('/home/user/readme.txt', 'Hello World');
    const result = await executeCommand('cat /home/user/readme.txt');
    expect(result.output).toBe('Hello World');
  });

  it('cat on directory returns error', async () => {
    await executeCommand('mkdir /home/user/testdir');
    const result = await executeCommand('cat /home/user/testdir');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Is a directory');
  });

  it('rm removes file', async () => {
    await executeCommand('touch /home/user/rmtest.txt');
    await executeCommand('rm /home/user/rmtest.txt');
    const node = useFilesystemStore.getState().getNode('/home/user/rmtest.txt');
    expect(node).toBeNull();
  });

  it('cd changes directory', async () => {
    await executeCommand('cd /home');
    expect(useFilesystemStore.getState().cwd).toBe('/home');
  });

  it('cp copies file', async () => {
    await executeCommand('touch /home/user/cpsource.txt');
    useFilesystemStore.getState().writeFile('/home/user/cpsource.txt', 'copy content');
    await executeCommand('cp /home/user/cpsource.txt /home/user/cpdest.txt');
    const dest = useFilesystemStore.getState().getNode('/home/user/cpdest.txt');
    expect(dest).not.toBeNull();
    expect(dest?.content).toBe('copy content');
  });

  it('mv moves file', async () => {
    await executeCommand('touch /home/user/mvtest.txt');
    useFilesystemStore.getState().writeFile('/home/user/mvtest.txt', 'moved content');
    await executeCommand('mv /home/user/mvtest.txt /home/user/moved.txt');
    const oldNode = useFilesystemStore.getState().getNode('/home/user/mvtest.txt');
    const newNode = useFilesystemStore.getState().getNode('/home/user/moved.txt');
    expect(oldNode).toBeNull();
    expect(newNode).not.toBeNull();
    expect(newNode?.content).toBe('moved content');
  });
});

describe('Registry Commands', () => {
  beforeEach(() => {
    useRegistryStore.getState().set('test.key', 'testvalue');
  });

  it('reg list shows entries', async () => {
    const result = await executeCommand('reg list');
    expect(result.success).toBe(true);
    expect(result.output).toContain('test.key');
  });

  it('reg get returns value', async () => {
    const result = await executeCommand('reg get test.key');
    expect(result.success).toBe(true);
    expect(result.output).toBe('testvalue');
  });

  it('reg set updates value', async () => {
    await executeCommand('reg set test.key newvalue');
    const value = useRegistryStore.getState().get('test.key');
    expect(value).toBe('newvalue');
  });

  it('reg delete removes key', async () => {
    await executeCommand('reg delete test.key');
    const value = useRegistryStore.getState().get('test.key');
    expect(value).toBeUndefined();
  });
});

describe('System Commands', () => {
  it('whoami returns user', async () => {
    const result = await executeCommand('whoami');
    expect(result.output).toBe('user');
  });

  it('uname returns system info', async () => {
    const result = await executeCommand('uname');
    expect(result.output).toBe('goatos');
  });

  it('help shows general help', async () => {
    const result = await executeCommand('help');
    expect(result.success).toBe(true);
    expect(result.output).toContain('goatos shell commands');
  });

  it('help <command> shows specific help', async () => {
    const result = await executeCommand('help ls');
    expect(result.success).toBe(true);
    expect(result.output).toContain('ls');
  });

  it('help unknown command returns error', async () => {
    const result = await executeCommand('help nonexistent');
    expect(result.success).toBe(false);
  });

  it('uname -a returns full info', async () => {
    const result = await executeCommand('uname -a');
    expect(result.output).toContain('goatos');
  });

  it('echo prints arguments', async () => {
    const result = await executeCommand('echo Hello World');
    expect(result.output).toBe('Hello World');
  });

  it('jobs shows job list', async () => {
    const result = await executeCommand('jobs');
    expect(result.success).toBe(true);
  });
});

describe('Error Handling', () => {
  it('unknown command returns error', async () => {
    const result = await executeCommand('unknowncmd');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown command');
  });

  it('cat nonexistent file returns error', async () => {
    const result = await executeCommand('cat /nonexistent/file.txt');
    expect(result.success).toBe(false);
  });
});

describe('Advanced Filesystem', () => {
  beforeEach(() => {
    useFilesystemStore.getState().init();
  });

  it('mkdir -p creates parent directories', async () => {
    const result = await executeCommand('mkdir -p /home/user/parent/child/grandchild');
    expect(result.success).toBe(true);
    const node = useFilesystemStore.getState().getNode('/home/user/parent/child/grandchild');
    expect(node).not.toBeNull();
    expect(node?.type).toBe('directory');
  });

  it('rm -r removes directory recursively', async () => {
    await executeCommand('mkdir -p /home/user/rmtest/child');
    await executeCommand('rm -r /home/user/rmtest');
    const node = useFilesystemStore.getState().getNode('/home/user/rmtest');
    expect(node).toBeNull();
  });

  it('rm without -r on directory fails', async () => {
    await executeCommand('mkdir /home/user/rmdirtest');
    const result = await executeCommand('rm /home/user/rmdirtest');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Is directory');
  });

  it('find searches file content', async () => {
    await executeCommand('touch /home/user/searchfile.txt');
    useFilesystemStore.getState().writeFile('/home/user/searchfile.txt', 'secret password content');
    const result = await executeCommand('find /home/user secret');
    expect(result.success).toBe(true);
    expect(result.output).toContain('/home/user/searchfile.txt');
  });
});

describe('AI Commands', () => {
  it('plan generates a plan', async () => {
    const result = await executeCommand('plan build a web app');
    expect(result.success).toBe(true);
    expect(result.output).toContain('build a web app');
    expect(result.output).toContain('Subtasks');
  });

  it('run executes a command', async () => {
    const result = await executeCommand('run echo hello');
    expect(result.success).toBe(true);
    expect(result.output).toBe('hello');
  });

  it('watch requires interval', async () => {
    const result = await executeCommand('watch ls');
    expect(result.success).toBe(false);
  });

  it('watch creates a job with interval', async () => {
    const result = await executeCommand('watch echo test 1');
    expect(result.success).toBe(true);
    expect(result.output).toContain('Watching: echo test every 1s');
    expect(result.output).toContain('Job ID:');
  });

  it('memory list shows items', async () => {
    const result = await executeCommand('memory list');
    expect(result.success).toBe(true);
  });

  it('memory add stores item', async () => {
    const result = await executeCommand('memory add Remember to buy milk');
    expect(result.success).toBe(true);
    expect(result.output).toBe('Memory item added');
  });

  it('memory search finds items', async () => {
    await executeCommand('memory add Searchable content here');
    const result = await executeCommand('memory search Searchable');
    expect(result.success).toBe(true);
    expect(result.output).toContain('Searchable');
  });
});
