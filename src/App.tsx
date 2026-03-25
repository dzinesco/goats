import { Suspense, lazy } from 'react';
import { Terminal } from '@/components/Terminal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useShellStore } from '@/state/store';

const GUIApp = lazy(() => import('@/GUIApp').then(m => ({ default: m.GUIApp })));

function LoadingFallback() {
  return (
    <div className="w-screen h-screen bg-os-bg flex items-center justify-center">
      <div className="text-os-muted">Loading...</div>
    </div>
  );
}

function ErrorFallback() {
  return (
    <div className="w-screen h-screen bg-os-bg flex items-center justify-center p-8">
      <div className="bg-os-surface border border-os-error rounded-lg p-6 max-w-lg">
        <h2 className="text-xl font-bold text-os-error mb-4">GUI Error</h2>
        <p className="text-os-muted text-sm mb-4">The graphical shell encountered an error.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-os-accent text-white rounded hover:bg-os-accent/80 transition-colors"
        >
          Reload
        </button>
      </div>
    </div>
  );
}

export function App() {
  const mode = useShellStore(s => s.mode);

  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <div className="w-screen h-screen overflow-hidden">
        {mode === 'terminal' ? (
          <Terminal />
        ) : (
          <Suspense fallback={<LoadingFallback />}>
            <GUIApp />
          </Suspense>
        )}
      </div>
    </ErrorBoundary>
  );
}
