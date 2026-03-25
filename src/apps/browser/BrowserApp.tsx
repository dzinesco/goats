import { useState, useEffect, useRef } from 'react';
import { browserManager } from '@/lib/browser';
import { BrowserSession, TraceEntry } from '@/lib/browser';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export function BrowserApp() {
  const [sessions, setSessions] = useState<BrowserSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<BrowserSession | null>(null);
  const [traces, setTraces] = useState<TraceEntry[]>([]);
  const [url, setUrl] = useState('');
  const [isOpening, setIsOpening] = useState(false);
  const selectedSessionRef = useRef<BrowserSession | null>(null);

  const refresh = () => {
    setSessions(browserManager.listSessions());
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(() => {
      refresh();
      // Also refresh traces if a session is selected
      if (selectedSessionRef.current) {
        setTraces(browserManager.getTraces(selectedSessionRef.current.id));
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Keep ref in sync with state
  useEffect(() => {
    selectedSessionRef.current = selectedSession;
    if (selectedSession) {
      setTraces(browserManager.getTraces(selectedSession.id));
    }
  }, [selectedSession]);

  const handleOpen = async () => {
    if (!url) return;
    setIsOpening(true);
    try {
      await browserManager.createSession(url);
      setUrl('');
      refresh();
    } finally {
      setIsOpening(false);
    }
  };

  const handleSelectSession = (session: BrowserSession) => {
    setSelectedSession(session);
    setTraces(browserManager.getTraces(session.id));
  };

  const handleCloseSession = async (session: BrowserSession, e: React.MouseEvent) => {
    e.stopPropagation();
    await browserManager.closeSession(session.id);
    if (selectedSession?.id === session.id) {
      setSelectedSession(null);
    }
    refresh();
  };

  return (
    <div className="p-6 flex gap-6 h-full">
      <div className="w-1/3 flex flex-col">
        <h2 className="text-xl font-bold text-os-text mb-4">Browser Sessions</h2>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Enter URL..."
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleOpen()}
            className="flex-1 px-3 py-2 bg-os-surface border border-os-border rounded text-os-text placeholder-os-muted focus:outline-none focus:border-os-accent"
          />
          <button
            onClick={handleOpen}
            disabled={isOpening || !url}
            className="px-4 py-2 bg-os-accent text-white rounded hover:bg-os-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isOpening ? <LoadingSpinner size="sm" /> : 'Open'}
          </button>
        </div>

        <div className="flex-1 overflow-auto space-y-2">
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-os-muted">
              <p>No browser sessions</p>
              <p className="text-sm mt-1">Open a URL to start browsing</p>
            </div>
          ) : (
            sessions.map(session => (
              <button
                key={session.id}
                onClick={() => handleSelectSession(session)}
                className={`w-full p-3 rounded-lg text-left transition-colors ${
                  selectedSession?.id === session.id ? 'bg-os-accent/20' : 'bg-os-surface hover:bg-os-border'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${
                    session.status === 'active' ? 'text-green-400' :
                    session.status === 'error' ? 'text-red-400' : 'text-os-muted'
                  }`}>
                    {session.status}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleCloseSession(session, e)}
                      className="text-os-muted hover:text-red-400 transition-colors text-xs px-2 py-1"
                      title="Close session"
                    >
                      ✕
                    </button>
                    <span className="text-xs text-os-muted">{session.id.slice(0, 8)}</span>
                  </div>
                </div>
                <div className="text-os-text truncate">{session.title || 'New Tab'}</div>
                <div className="text-xs text-os-muted truncate">{session.url}</div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <h2 className="text-xl font-bold text-os-text mb-4">
          {selectedSession ? `Session ${selectedSession.id.slice(0, 8)}` : 'Session Details'}
        </h2>

        {selectedSession ? (
          <>
            {selectedSession.screenshot && (
              <div className="mb-4 rounded-lg overflow-hidden border border-os-border">
                <img
                  src={selectedSession.screenshot}
                  alt="Session preview"
                  className="w-full h-64 object-cover"
                />
              </div>
            )}

            <div className="mb-4 p-4 bg-os-surface rounded-lg">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-os-muted">URL:</div>
                <div className="text-os-text font-mono">{selectedSession.url}</div>
                <div className="text-os-muted">Title:</div>
                <div className="text-os-text">{selectedSession.title}</div>
                <div className="text-os-muted">Status:</div>
                <div className="text-os-text">{selectedSession.status}</div>
              </div>
            </div>

            <h3 className="text-sm font-medium text-os-muted mb-2">Trace History</h3>
            <div className="flex-1 overflow-auto bg-os-surface rounded-lg p-3 space-y-1">
              {traces.length === 0 ? (
                <p className="text-os-muted text-sm">No traces yet</p>
              ) : (
                traces.map(trace => (
                  <div key={trace.id} className="text-sm font-mono">
                    <span className="text-os-muted">[{new Date(trace.timestamp).toLocaleTimeString()}]</span>{' '}
                    <span className="text-os-text">{trace.action}</span>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-os-muted">
            <p>Select a session to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function BrowserAppWithErrorBoundary() {
  return (
    <ErrorBoundary name="Browser">
      <BrowserApp />
    </ErrorBoundary>
  );
}
