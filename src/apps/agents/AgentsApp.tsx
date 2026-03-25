import { useState } from 'react';
import { useAgentsStore, Agent } from '@/state/agents';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const PRESET_AGENTS = [
  { name: 'Research Agent', description: 'Research and summarize topics from web sources' },
  { name: 'Code Agent', description: 'Write, review, and refactor code' },
  { name: 'Data Agent', description: 'Analyze and visualize data' },
];

export function AgentsApp() {
  const { listAgents, createAgent, deleteAgent, runAgent } = useAgentsStore();
  const agents = listAgents();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [taskInputs, setTaskInputs] = useState<Record<string, string>>({});
  const [running, setRunning] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createAgent(newName, newDesc);
    setNewName('');
    setNewDesc('');
    setShowCreate(false);
  };

  const handleRun = async (id: string, taskText: string) => {
    if (!taskText.trim()) return;
    setRunning(id);
    await runAgent(id, taskText);
    setTaskInputs(prev => ({ ...prev, [id]: '' }));
    setRunning(null);
  };

  const handlePreset = (preset: typeof PRESET_AGENTS[0]) => {
    createAgent(preset.name, preset.description);
  };

  const statusColors: Record<Agent['status'], string> = {
    idle: 'text-os-muted',
    running: 'text-yellow-400',
    completed: 'text-green-400',
    failed: 'text-red-400',
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-os-text">Agents</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-os-accent text-white rounded-lg hover:bg-os-accent/80 transition-colors text-sm"
        >
          {showCreate ? 'Cancel' : '+ New Agent'}
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 p-4 bg-os-surface border border-os-border rounded-lg">
          <h3 className="text-sm font-medium text-os-text mb-3">Create Agent</h3>
          <input
            type="text"
            placeholder="Agent name..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-full px-3 py-2 mb-2 bg-os-bg border border-os-border rounded text-os-text placeholder-os-muted focus:outline-none focus:border-os-accent"
          />
          <input
            type="text"
            placeholder="Description..."
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            className="w-full px-3 py-2 mb-3 bg-os-bg border border-os-border rounded text-os-text placeholder-os-muted focus:outline-none focus:border-os-accent"
          />
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-os-accent text-white rounded hover:bg-os-accent/80 transition-colors text-sm"
          >
            Create
          </button>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-sm font-medium text-os-muted mb-3">Quick Start Templates</h3>
        <div className="flex gap-3">
          {PRESET_AGENTS.map((preset, i) => (
            <button
              key={i}
              onClick={() => handlePreset(preset)}
              className="p-3 bg-os-surface border border-os-border rounded-lg text-left hover:bg-os-border transition-colors"
            >
              <div className="text-sm font-medium text-os-text">{preset.name}</div>
              <div className="text-xs text-os-muted">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {agents.length === 0 ? (
          <div className="text-center py-12 text-os-muted">
            <p className="text-lg mb-2">No agents yet</p>
            <p className="text-sm">Create one or use a template to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {agents.map(agent => (
              <div key={agent.id} className="p-4 bg-os-surface border border-os-border rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-os-text font-medium">{agent.name}</h3>
                    <p className="text-xs text-os-muted mt-1">{agent.description}</p>
                  </div>
                  <span className={`text-sm ${statusColors[agent.status]}`}>
                    {agent.status}
                  </span>
                </div>

                {agent.result && (
                  <div className="mb-3 p-3 bg-os-bg rounded text-sm text-os-text">
                    {agent.result}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Assign a task..."
                    value={taskInputs[agent.id] || ''}
                    onChange={e => setTaskInputs(prev => ({ ...prev, [agent.id]: e.target.value }))}
                    disabled={running === agent.id}
                    className="flex-1 px-3 py-2 bg-os-bg border border-os-border rounded text-os-text placeholder-os-muted focus:outline-none focus:border-os-accent text-sm disabled:opacity-50"
                  />
                  <button
                    onClick={() => handleRun(agent.id, taskInputs[agent.id] || '')}
                    disabled={running === agent.id || !(taskInputs[agent.id] || '').trim()}
                    className="px-4 py-2 bg-os-accent text-white rounded hover:bg-os-accent/80 transition-colors text-sm disabled:opacity-50"
                  >
                    {running === agent.id ? <LoadingSpinner size="sm" /> : 'Run'}
                  </button>
                  <button
                    onClick={() => deleteAgent(agent.id)}
                    className="px-3 py-2 bg-os-bg text-os-error border border-os-border rounded hover:bg-os-border transition-colors text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AgentsAppWithErrorBoundary() {
  return (
    <ErrorBoundary name="Agents">
      <AgentsApp />
    </ErrorBoundary>
  );
}
