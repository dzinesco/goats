import { useState } from 'react';
import { useRegistryStore } from '@/state/store';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function SettingsApp() {
  const { list, set, remove } = useRegistryStore();
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [filter, setFilter] = useState('');

  const entries = list();
  const filtered = entries.filter(e => e.key.toLowerCase().includes(filter.toLowerCase()));

  const handleSet = () => {
    if (newKey && newValue) {
      let parsedValue: unknown = newValue;
      try { parsedValue = JSON.parse(newValue); } catch { /* keep string */ }
      set(newKey, parsedValue);
      setNewKey('');
      setNewValue('');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-os-text mb-6">Settings</h2>

      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Filter settings..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="flex-1 px-4 py-2 bg-os-surface border border-os-border rounded-lg text-os-text placeholder-os-muted focus:outline-none focus:border-os-accent"
        />
      </div>

      <div className="mb-8 p-4 bg-os-surface border border-os-border rounded-lg">
        <h3 className="text-sm font-medium text-os-muted mb-3">Add / Update Setting</h3>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="key.name"
            value={newKey}
            onChange={e => setNewKey(e.target.value)}
            className="flex-1 px-3 py-2 bg-os-bg border border-os-border rounded text-os-text placeholder-os-muted focus:outline-none focus:border-os-accent"
          />
          <input
            type="text"
            placeholder="value"
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            className="flex-1 px-3 py-2 bg-os-bg border border-os-border rounded text-os-text placeholder-os-muted focus:outline-none focus:border-os-accent"
          />
          <button
            onClick={handleSet}
            className="px-4 py-2 bg-os-accent text-white rounded hover:bg-os-accent/80 transition-colors"
          >
            Set
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map(entry => (
          <div key={entry.key} className="flex items-center justify-between p-4 bg-os-surface border border-os-border rounded-lg">
            <div>
              <div className="text-os-text font-mono">{entry.key}</div>
            </div>
            <div className="flex items-center gap-4">
              <code className="text-sm text-os-accent bg-os-bg px-3 py-1 rounded">
                {JSON.stringify(entry.value)}
              </code>
              <button
                onClick={() => remove(entry.key)}
                className="text-os-muted hover:text-red-400 transition-colors text-sm px-2 py-1"
                title="Delete"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsAppWithErrorBoundary() {
  return (
    <ErrorBoundary name="Settings">
      <SettingsApp />
    </ErrorBoundary>
  );
}
