import { useState } from 'react';
import { useAutomationsStore } from '@/state/automations';
import { AutomationStep } from '@/types';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const PRESET_AUTOMATIONS = [
  {
    name: 'Open and Browse',
    description: 'Opens a URL and logs the page title',
    steps: [
      { action: 'browser.open', params: { url: 'https://example.com' } },
      { action: 'log', params: { message: 'Page loaded successfully' } },
    ],
  },
  {
    name: 'Search Flow',
    description: 'Opens search engine and simulates a search',
    steps: [
      { action: 'browser.open', params: { url: 'https://duckduckgo.com' } },
      { action: 'delay', params: { ms: 500 } },
      { action: 'log', params: { message: 'Search page loaded' } },
    ],
  },
];

export function AutomationsApp() {
  const { listAutomations, addAutomation, removeAutomation, runAutomation, runningAutomations } = useAutomationsStore();
  const automations = listAutomations();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSteps, setNewSteps] = useState<AutomationStep[]>([]);
  const [output, setOutput] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    addAutomation({
      name: newName,
      trigger: { type: 'manual', config: {} },
      steps: newSteps.length > 0 ? newSteps : [{ id: crypto.randomUUID(), action: 'log', params: { message: 'Hello from automation' } }],
      approvals: [],
      status: 'active',
      success_metrics: { total_runs: 0, successful_runs: 0 },
    });
    setNewName('');
    setNewSteps([]);
    setShowCreate(false);
  };

  const handleRun = async (id: string) => {
    setRunning(id);
    setOutput(null);
    const result = await runAutomation(id);
    setOutput(result.output);
    setRunning(null);
  };

  const handlePreset = (preset: typeof PRESET_AUTOMATIONS[0]) => {
    addAutomation({
      name: preset.name,
      trigger: { type: 'manual', config: {} },
      steps: preset.steps.map(s => ({ ...s, id: crypto.randomUUID() })),
      approvals: [],
      status: 'active',
      success_metrics: { total_runs: 0, successful_runs: 0 },
    });
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-os-text">Automations</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-os-accent text-white rounded-lg hover:bg-os-accent/80 transition-colors text-sm"
        >
          {showCreate ? 'Cancel' : '+ New Automation'}
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 p-4 bg-os-surface border border-os-border rounded-lg">
          <h3 className="text-sm font-medium text-os-text mb-3">Create Automation</h3>
          <input
            type="text"
            placeholder="Automation name..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-full px-3 py-2 mb-3 bg-os-bg border border-os-border rounded text-os-text placeholder-os-muted focus:outline-none focus:border-os-accent"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-os-accent text-white rounded hover:bg-os-accent/80 transition-colors text-sm"
            >
              Create
            </button>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-sm font-medium text-os-muted mb-3">Quick Start Templates</h3>
        <div className="flex gap-3">
          {PRESET_AUTOMATIONS.map((preset, i) => (
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
        {automations.length === 0 ? (
          <div className="text-center py-12 text-os-muted">
            <p className="text-lg mb-2">No automations yet</p>
            <p className="text-sm">Create one or use a template to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {automations.map(automation => (
              <div key={automation.id} className="p-4 bg-os-surface border border-os-border rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-os-text font-medium">{automation.name}</h3>
                    <div className="text-xs text-os-muted mt-1">
                      {automation.steps.length} steps • Last run: {automation.last_run ? new Date(automation.last_run).toLocaleString() : 'Never'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRun(automation.id)}
                    disabled={running === automation.id || runningAutomations[automation.id]}
                    className="px-4 py-2 bg-os-accent text-white rounded hover:bg-os-accent/80 transition-colors text-sm disabled:opacity-50"
                  >
                    {running === automation.id ? <LoadingSpinner size="sm" /> : 'Run'}
                  </button>
                </div>

                <div className="mb-3">
                  <div className="text-xs text-os-muted mb-1">Steps:</div>
                  <div className="flex flex-wrap gap-2">
                    {automation.steps.map((step, i) => (
                      <span key={i} className="px-2 py-1 bg-os-bg text-xs text-os-text rounded">
                        {step.action}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-os-muted">
                  <div>
                    Runs: {automation.success_metrics.successful_runs}/{automation.success_metrics.total_runs} successful
                  </div>
                  <button
                    onClick={() => removeAutomation(automation.id)}
                    className="text-os-error hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {output && (
        <div className="mt-4 p-4 bg-os-bg border border-os-border rounded-lg">
          <h3 className="text-sm font-medium text-os-muted mb-2">Last Run Output</h3>
          <pre className="text-xs text-os-text font-mono whitespace-pre-wrap max-h-48 overflow-auto">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}

export function AutomationsAppWithErrorBoundary() {
  return (
    <ErrorBoundary name="Automations">
      <AutomationsApp />
    </ErrorBoundary>
  );
}
