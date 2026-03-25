import { v4 as uuid } from 'uuid';
import type { Session } from '@/types';
import { useSessionsStore } from '@/state/store';

export interface BrowserSession {
  id: string;
  url: string;
  title: string;
  status: 'launching' | 'active' | 'closed' | 'error';
  createdAt: string;
  screenshot?: string;
}

export interface TraceEntry {
  id: string;
  sessionId: string;
  action: string;
  timestamp: string;
  screenshot?: string;
}

class BrowserManager {
  private sessions: Map<string, BrowserSession> = new Map();
  private traces: Map<string, TraceEntry[]> = new Map();
  private hydrated = false;

  /** Hydrate from sessions store on first access */
  private ensureHydrated(): void {
    if (this.hydrated) return;
    this.hydrated = true;

    try {
      const store = useSessionsStore.getState();
      const saved = store.listSessions().filter((s: Session) => s.type === 'browser');
      for (const s of saved) {
        this.sessions.set(s.id, {
          id: s.id,
          url: s.browser_url || 'about:blank',
          title: s.browser_url || 'Browser Tab',
          status: s.status as BrowserSession['status'],
          createdAt: s.last_activity,
          screenshot: undefined,
        });
        this.traces.set(s.id, []);
      }
    } catch {
      // Store not available during test initialization
    }
  }

  private syncToStore(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    try {
      const store = useSessionsStore.getState();
      const existing = store.getSession(sessionId);
      if (existing) {
        store.updateSession(sessionId, {
          status: session.status as Session['status'],
          last_activity: new Date().toISOString(),
          browser_url: session.url,
        });
      }
    } catch {
      // Store not available
    }
  }

  async createSession(url?: string): Promise<BrowserSession> {
    this.ensureHydrated();
    const id = uuid();
    const finalUrl = url || 'about:blank';
    const session: BrowserSession = {
      id,
      url: finalUrl,
      title: this.extractTitle(finalUrl),
      status: 'active',
      createdAt: new Date().toISOString(),
      screenshot: this.generatePlaceholderScreenshot(finalUrl, this.extractTitle(finalUrl)),
    };

    this.sessions.set(id, session);
    this.traces.set(id, []);

    // Persist to sessions store
    try {
      useSessionsStore.getState().addSession({
        type: 'browser',
        status: 'active',
        trace_refs: [],
        artifacts: [],
        last_activity: new Date().toISOString(),
        browser_url: finalUrl,
      });
    } catch {
      // Store not available
    }

    await this.captureTrace(id, `Session created: ${finalUrl}`);

    return session;
  }

  async navigate(sessionId: string, url: string): Promise<void> {
    this.ensureHydrated();
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    session.status = 'launching';
    session.url = url;
    session.title = this.extractTitle(url);

    await this.delay(100 + Math.random() * 200);
    session.status = 'active';

    this.syncToStore(sessionId);
    await this.captureTrace(sessionId, `navigate: ${url}`);
  }

  async captureTrace(sessionId: string, action: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    const entry: TraceEntry = {
      id: uuid(),
      sessionId,
      action,
      timestamp: new Date().toISOString(),
    };

    const existing = this.traces.get(sessionId) || [];
    existing.push(entry);
    this.traces.set(sessionId, existing);

    if (session) {
      session.screenshot = this.generatePlaceholderScreenshot(session.url, session.title);
      this.syncToStore(sessionId);
    }
  }

  private generatePlaceholderScreenshot(url: string, title: string): string {
    const canvas = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
        <rect fill="#1e1e2e" width="1280" height="720"/>
        <rect fill="#2d2d3d" x="40" y="100" width="1200" height="520" rx="8"/>
        <text fill="#e0e0e0" x="640" y="350" font-family="system-ui" font-size="24" text-anchor="middle">
          ${title || 'Browser Tab'}
        </text>
        <text fill="#666680" x="640" y="400" font-family="system-ui" font-size="14" text-anchor="middle">
          ${url}
        </text>
      </svg>
    `;
    const base64 = btoa(canvas);
    return `data:image/svg+xml;base64,${base64}`;
  }

  private extractTitle(url: string): string {
    try {
      const u = new URL(url);
      return u.hostname;
    } catch {
      return 'Unknown';
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async click(sessionId: string, selector: string): Promise<void> {
    this.ensureHydrated();
    await this.delay(50 + Math.random() * 100);
    await this.captureTrace(sessionId, `click: ${selector}`);
  }

  async type(sessionId: string, selector: string, text: string): Promise<void> {
    this.ensureHydrated();
    await this.delay(50 + Math.random() * 100);
    await this.captureTrace(sessionId, `type: ${selector}="${text}"`);
  }

  async getText(_sessionId: string, selector: string): Promise<string> {
    this.ensureHydrated();
    await this.delay(50);
    return `Text content at ${selector}`;
  }

  async evaluate(sessionId: string, script: string): Promise<unknown> {
    this.ensureHydrated();
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    await this.delay(50);
    await this.captureTrace(sessionId, `evaluate: ${script.slice(0, 50)}...`);

    // Simulate common DOM queries
    const trimmed = script.trim();
    if (trimmed === 'document.title' || trimmed === 'title') {
      return session.title;
    }
    if (trimmed === 'location.href' || trimmed === 'href') {
      return session.url;
    }
    if (trimmed === 'document.body.innerText' || trimmed === 'innerText') {
      return `Content of ${session.title} page`;
    }
    // Default: return a simulated result
    return `evaluated: ${script.slice(0, 30)}`;
  }

  async closeSession(sessionId: string): Promise<void> {
    this.ensureHydrated();
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'closed';
      this.syncToStore(sessionId);
      await this.captureTrace(sessionId, 'Session closed');
      // Remove from store to prevent stale sessions on reload
      try {
        useSessionsStore.getState().removeSession(sessionId);
      } catch {
        // Store not available during test initialization
      }
    }
  }

  getSession(id: string): BrowserSession | undefined {
    this.ensureHydrated();
    return this.sessions.get(id);
  }

  listSessions(): BrowserSession[] {
    this.ensureHydrated();
    return Array.from(this.sessions.values());
  }

  getTraces(sessionId: string): TraceEntry[] {
    this.ensureHydrated();
    return this.traces.get(sessionId) || [];
  }

  async closeAll(): Promise<void> {
    this.ensureHydrated();
    for (const [id] of this.sessions) {
      await this.closeSession(id);
    }
  }
}

export const browserManager = new BrowserManager();
