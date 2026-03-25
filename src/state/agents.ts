import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';

export interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  task?: string;
  result?: string;
  created_at: string;
  updated_at: string;
}

interface AgentsState {
  agents: Record<string, Agent>;
  createAgent: (name: string, description: string) => string;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  deleteAgent: (id: string) => void;
  getAgent: (id: string) => Agent | undefined;
  listAgents: () => Agent[];
  runAgent: (id: string, task: string) => Promise<{ success: boolean; result: string }>;
}

export const useAgentsStore = create<AgentsState>()(
  persist(
    (set, get) => ({
      agents: {},

      createAgent: (name, description) => {
        const id = uuid();
        const now = new Date().toISOString();
        set(state => ({
          agents: {
            ...state.agents,
            [id]: { id, name, description, status: 'idle', created_at: now, updated_at: now },
          },
        }));
        return id;
      },

      updateAgent: (id, updates) => {
        set(state => ({
          agents: {
            ...state.agents,
            [id]: { ...state.agents[id], ...updates, updated_at: new Date().toISOString() },
          },
        }));
      },

      deleteAgent: (id) => {
        set(state => {
          const { [id]: _, ...rest } = state.agents;
          return { agents: rest };
        });
      },

      getAgent: (id) => get().agents[id],

      listAgents: () => Object.values(get().agents),

      runAgent: async (id, task) => {
        const agent = get().agents[id];
        if (!agent) {
          return { success: false, result: 'Agent not found' };
        }

        get().updateAgent(id, { status: 'running', task });

        // Simulate agent work
        await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));

        // Simulated agent response
        const responses = [
          `Agent "${agent.name}" analyzed task: ${task.slice(0, 50)}...`,
          `Agent "${agent.name}" completed analysis.`,
          `Task processed by "${agent.name}".`,
        ];
        const result = responses[Math.floor(Math.random() * responses.length)];

        get().updateAgent(id, { status: 'completed', result });

        // Reset to idle after 2 seconds so agent can be run again
        setTimeout(() => {
          get().updateAgent(id, { status: 'idle', result: undefined });
        }, 2000);

        return { success: true, result };
      },
    }),
    { name: 'goatos-agents', storage: createJSONStorage(() => localStorage) }
  )
);
