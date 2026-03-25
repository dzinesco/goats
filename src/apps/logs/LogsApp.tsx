import { useShellStore } from '@/state/store';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function LogsApp() {
  const history = useShellStore(s => s.history);
  const clearHistory = useShellStore(s => s.clearHistory);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-os-text">Shell Logs</h2>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="px-3 py-1 bg-os-surface text-os-text rounded hover:bg-os-border transition-colors text-sm"
          >
            Clear History
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-12 text-os-muted">
          <p className="text-lg mb-2">No logs yet</p>
          <p className="text-sm">Command history will appear here</p>
        </div>
      ) : (
        <div className="space-y-2 font-mono text-sm">
          {history.map((entry, i) => (
            <div key={i} className="flex gap-4 p-3 bg-os-surface rounded">
              <span className="text-os-muted shrink-0">{new Date(entry.timestamp).toLocaleTimeString()}</span>
              <span className={entry.success ? 'text-green-400' : 'text-red-400'}>{entry.command}</span>
              {entry.output && (
                <span className="text-os-muted truncate">{entry.output.slice(0, 50)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function LogsAppWithErrorBoundary() {
  return (
    <ErrorBoundary name="Logs">
      <LogsApp />
    </ErrorBoundary>
  );
}
