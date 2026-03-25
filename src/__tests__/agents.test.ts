import { describe, it, expect, beforeEach } from 'vitest';
import { useAgentsStore } from '@/state/agents';

describe('Agents Store', () => {
  beforeEach(() => {
    const store = useAgentsStore.getState();
    Object.keys(store.agents).forEach(id => store.deleteAgent(id));
  });

  it('starts with empty agents', () => {
    const store = useAgentsStore.getState();
    expect(store.listAgents()).toEqual([]);
  });

  it('creates an agent', () => {
    const store = useAgentsStore.getState();
    const id = store.createAgent('Test Agent', 'A test agent');
    expect(id).toBeDefined();
    expect(store.listAgents()).toHaveLength(1);
    expect(store.getAgent(id)?.name).toBe('Test Agent');
  });

  it('deletes an agent', () => {
    const store = useAgentsStore.getState();
    const id = store.createAgent('To Delete', 'Will be deleted');
    store.deleteAgent(id);
    expect(store.listAgents()).toHaveLength(0);
  });

  it('runs an agent with a task', async () => {
    const store = useAgentsStore.getState();
    const id = store.createAgent('Worker', 'Does work');

    const result = await store.runAgent(id, 'Analyze this data');
    expect(result.success).toBe(true);
    expect(result.result).toContain('Worker');

    const agent = store.getAgent(id);
    expect(agent?.status).toBe('completed');
  });

  it('fails for non-existent agent', async () => {
    const store = useAgentsStore.getState();
    const result = await store.runAgent('non-existent', 'task');
    expect(result.success).toBe(false);
  });
});
