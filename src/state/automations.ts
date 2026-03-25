import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Automation } from '@/types';
import { v4 as uuid } from 'uuid';
import { browserManager } from '@/lib/browser';
import { useJobsStore } from './store';
import type { JobLog } from '@/types';

interface AutomationsState {
  automations: Record<string, Automation>;
  runningAutomations: Record<string, boolean>;
  addAutomation: (automation: Omit<Automation, 'id'>) => string;
  updateAutomation: (id: string, updates: Partial<Automation>) => void;
  removeAutomation: (id: string) => void;
  getAutomation: (id: string) => Automation | undefined;
  listAutomations: () => Automation[];
  runAutomation: (id: string) => Promise<{ success: boolean; output: string }>;
}

export const useAutomationsStore = create<AutomationsState>()(
  persist(
    (set, get) => ({
      automations: {},
      runningAutomations: {},

      addAutomation: (automation) => {
        const id = uuid();
        set(state => ({
          automations: { ...state.automations, [id]: { ...automation, id } },
        }));
        return id;
      },

      updateAutomation: (id, updates) => {
        set(state => ({
          automations: {
            ...state.automations,
            [id]: { ...state.automations[id], ...updates },
          },
        }));
      },

      removeAutomation: (id) => {
        set(state => {
          const { [id]: _, ...rest } = state.automations;
          return { automations: rest };
        });
      },

      getAutomation: (id) => get().automations[id],

      listAutomations: () => Object.values(get().automations),

      runAutomation: async (id) => {
        const automation = get().automations[id];
        if (!automation) {
          return { success: false, output: 'Automation not found' };
        }

        if (get().runningAutomations[id]) {
          return { success: false, output: 'Automation already running' };
        }

        set(state => ({ runningAutomations: { ...state.runningAutomations, [id]: true } }));

        const jobId = useJobsStore.getState().addJob({
          title: automation.name,
          type: 'automation',
          command: undefined,
          meta: undefined,
        });

        useJobsStore.getState().updateJob(jobId, { status: 'running' });

        let sessionId: string | null = null;
        const jobLogs: JobLog[] = [];

        const addLog = (message: string, level: JobLog['level'] = 'info') => {
          jobLogs.push({ id: uuid(), ts: new Date().toISOString(), level, message });
          useJobsStore.getState().updateJob(jobId, { logs: [...jobLogs] });
        };

        try {
          for (const step of automation.steps) {
            addLog(`Starting step: ${step.action}`);

            let stepError: Error | null = null;

            try {
              switch (step.action) {
                case 'browser.open': {
                  const url = step.params.url as string;
                  const session = await browserManager.createSession(url);
                  sessionId = session.id;
                  addLog(`Opened ${url} in session ${session.id.slice(0, 8)}`);
                  break;
                }

                case 'browser.click': {
                  if (!sessionId) { throw new Error('No active browser session'); }
                  const selector = step.params.selector as string;
                  await browserManager.click(sessionId, selector);
                  addLog(`Clicked ${selector}`);
                  break;
                }

                case 'browser.type': {
                  if (!sessionId) { throw new Error('No active browser session'); }
                  const selector = step.params.selector as string;
                  const text = step.params.text as string;
                  await browserManager.type(sessionId, selector, text);
                  addLog(`Typed "${text}" in ${selector}`);
                  break;
                }

                case 'delay': {
                  const ms = step.params.ms as number || 1000;
                  await new Promise(r => setTimeout(r, ms));
                  addLog(`Delayed ${ms}ms`);
                  break;
                }

                case 'log': {
                  const message = step.params.message as string;
                  addLog(`Log: ${message}`);
                  break;
                }

                default:
                  addLog(`Unknown action: ${step.action}`, 'warn');
              }
            } catch (err) {
              stepError = err instanceof Error ? err : new Error(String(err));
              addLog(`Step failed: ${stepError.message}`, 'error');
            }

            if (stepError) break;
          }

          if (sessionId) {
            await browserManager.closeSession(sessionId);
          }

          useJobsStore.getState().updateJob(jobId, {
            status: 'completed',
            result: jobLogs.map(l => l.message).join('\n'),
          });

          set(state => {
            const updated = { ...state.automations };
            updated[id] = {
              ...updated[id],
              last_run: new Date().toISOString(),
              success_metrics: {
                ...updated[id].success_metrics,
                total_runs: updated[id].success_metrics.total_runs + 1,
                successful_runs: updated[id].success_metrics.successful_runs + 1,
              },
            };
            return { automations: updated };
          });

          return { success: true, output: jobLogs.map(l => l.message).join('\n') };
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          addLog(`Error: ${errorMsg}`, 'error');

          useJobsStore.getState().updateJob(jobId, {
            status: 'failed',
            error: errorMsg,
          });

          set(state => {
            const updated = { ...state.automations };
            updated[id] = {
              ...updated[id],
              last_run: new Date().toISOString(),
              success_metrics: {
                ...updated[id].success_metrics,
                total_runs: updated[id].success_metrics.total_runs + 1,
              },
            };
            return { automations: updated };
          });

          return { success: false, output: errorMsg };
        } finally {
          set(state => ({ runningAutomations: { ...state.runningAutomations, [id]: false } }));
        }
      },
    }),
    { name: 'goatos-automations', storage: createJSONStorage(() => localStorage) }
  )
);
