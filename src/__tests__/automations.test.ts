import { describe, it, expect, beforeEach } from 'vitest';
import { useAutomationsStore } from '@/state/automations';

describe('Automations Store', () => {
  beforeEach(() => {
    const store = useAutomationsStore.getState();
    // Clear automations
    Object.keys(store.automations).forEach(id => store.removeAutomation(id));
  });

  it('starts with empty automations', () => {
    const store = useAutomationsStore.getState();
    expect(store.listAutomations()).toEqual([]);
  });

  it('adds an automation', () => {
    const store = useAutomationsStore.getState();
    const id = store.addAutomation({
      name: 'Test Automation',
      trigger: { type: 'manual', config: {} },
      steps: [{ id: '1', action: 'log', params: { message: 'test' } }],
      approvals: [],
      status: 'active',
      success_metrics: { total_runs: 0, successful_runs: 0 },
    });

    expect(id).toBeDefined();
    expect(store.listAutomations()).toHaveLength(1);
    expect(store.getAutomation(id)?.name).toBe('Test Automation');
  });

  it('removes an automation', () => {
    const store = useAutomationsStore.getState();
    const id = store.addAutomation({
      name: 'Test',
      trigger: { type: 'manual', config: {} },
      steps: [],
      approvals: [],
      status: 'active',
      success_metrics: { total_runs: 0, successful_runs: 0 },
    });

    store.removeAutomation(id);
    expect(store.listAutomations()).toHaveLength(0);
  });

  it('runs an automation with browser.open step', async () => {
    const store = useAutomationsStore.getState();
    const id = store.addAutomation({
      name: 'Open Browser',
      trigger: { type: 'manual', config: {} },
      steps: [
        { id: '1', action: 'browser.open', params: { url: 'https://example.com' } },
        { id: '2', action: 'log', params: { message: 'Done' } },
      ],
      approvals: [],
      status: 'active',
      success_metrics: { total_runs: 0, successful_runs: 0 },
    });

    const result = await store.runAutomation(id);
    expect(result.success).toBe(true);
    expect(result.output).toContain('Opened https://example.com');

    // Check metrics updated
    const automation = store.getAutomation(id);
    expect(automation?.success_metrics.total_runs).toBe(1);
    expect(automation?.success_metrics.successful_runs).toBe(1);
  });

  it('runs a simple log-only automation', async () => {
    const store = useAutomationsStore.getState();
    const id = store.addAutomation({
      name: 'Simple Log',
      trigger: { type: 'manual', config: {} },
      steps: [
        { id: '1', action: 'log', params: { message: 'Hello World' } },
      ],
      approvals: [],
      status: 'active',
      success_metrics: { total_runs: 0, successful_runs: 0 },
    });

    const result = await store.runAutomation(id);
    expect(result.success).toBe(true);
    expect(result.output).toContain('Hello World');
  });

  it('does not run non-existent automation', async () => {
    const store = useAutomationsStore.getState();
    const result = await store.runAutomation('non-existent-id');
    expect(result.success).toBe(false);
  });

  it('tracks running state', async () => {
    const store = useAutomationsStore.getState();
    const id = store.addAutomation({
      name: 'Delayed',
      trigger: { type: 'manual', config: {} },
      steps: [{ id: '1', action: 'delay', params: { ms: 50 } }],
      approvals: [],
      status: 'active',
      success_metrics: { total_runs: 0, successful_runs: 0 },
    });

    expect(store.runningAutomations[id]).toBeUndefined();

    const promise = store.runAutomation(id);
    // Wait for the automation to complete
    await promise;

    // State should be back to false after completion
    expect(store.runningAutomations[id]).toBeUndefined();
  });
});
