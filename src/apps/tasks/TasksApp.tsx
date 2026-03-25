import { useJobsStore } from '@/state/store';
import { Job } from '@/types';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function TasksApp() {
  const jobs = useJobsStore(s => s.listJobs());
  const removeJob = useJobsStore(s => s.removeJob);

  const statusColors: Record<Job['status'], string> = {
    running: 'text-green-400',
    completed: 'text-blue-400',
    failed: 'text-red-400',
    queued: 'text-yellow-400',
    waiting: 'text-yellow-400',
    canceled: 'text-gray-400',
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-os-text mb-6">Tasks</h2>

      {jobs.length === 0 ? (
        <div className="text-center py-12 text-os-muted">
          <p className="text-lg mb-2">No tasks yet</p>
          <p className="text-sm">Tasks will appear here when you run background jobs</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <div key={job.id} className="bg-os-surface border border-os-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-os-muted font-mono text-sm">{job.id.slice(0, 8)}</span>
                  <span className="text-os-text font-medium">{job.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${statusColors[job.status]}`}>
                    {job.status}
                  </span>
                  <button
                    onClick={() => removeJob(job.id)}
                    className="text-os-muted hover:text-red-400 transition-colors text-sm px-2 py-1"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="flex gap-4 text-xs text-os-muted">
                <span>Type: {job.type}</span>
                <span>Created: {new Date(job.createdAt).toLocaleString()}</span>
              </div>
              {job.logs.length > 0 && (
                <div className="mt-3 pt-3 border-t border-os-border">
                  <pre className="text-xs text-os-muted font-mono overflow-x-auto">
                    {job.logs.slice(-5).map(l => `[${l.level}] ${l.message}`).join('\n')}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TasksAppWithErrorBoundary() {
  return (
    <ErrorBoundary name="Tasks">
      <TasksApp />
    </ErrorBoundary>
  );
}
