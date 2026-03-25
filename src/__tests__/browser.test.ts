import { describe, it, expect } from 'vitest';
import { executeCommand } from '@/commands/parser';
import { browserManager } from '@/lib/browser';

describe('Browser Commands', () => {
  it('browser open creates session', async () => {
    const result = await executeCommand('browser open https://example.com');
    expect(result.success).toBe(true);
    expect(result.output).toContain('Browser session started');
  });

  it('browser sessions lists sessions', async () => {
    await browserManager.createSession('https://example.com');
    const result = await executeCommand('browser sessions');
    expect(result.success).toBe(true);
  });

  it('browser close closes session', async () => {
    const session = await browserManager.createSession('https://example.com');
    const result = await executeCommand(`browser close ${session.id}`);
    expect(result.success).toBe(true);
  });

  it('browser trace shows traces', async () => {
    const session = await browserManager.createSession('https://example.com');
    await browserManager.navigate(session.id, 'https://example.org');
    const result = await executeCommand(`browser trace ${session.id}`);
    expect(result.success).toBe(true);
  });

  it('browser sessions can be closed and re-listed', async () => {
    const session = await browserManager.createSession('https://example.com');
    await browserManager.closeSession(session.id);
    const sessions = browserManager.listSessions();
    const closed = sessions.find(s => s.id === session.id);
    expect(closed?.status).toBe('closed');
  });

  it('createSession extracts hostname as title from URL', async () => {
    const session = await browserManager.createSession('https://github.com/user/repo');
    expect(session.title).toBe('github.com');
    expect(session.url).toBe('https://github.com/user/repo');
  });
});
