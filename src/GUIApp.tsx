import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HomeScreen } from '@/apps/home/HomeScreen';
import { FilesAppWithErrorBoundary } from '@/apps/files/FilesApp';
import { TasksAppWithErrorBoundary } from '@/apps/tasks/TasksApp';
import { LogsAppWithErrorBoundary } from '@/apps/logs/LogsApp';
import { SettingsAppWithErrorBoundary } from '@/apps/settings/SettingsApp';
import { MemoryAppWithErrorBoundary } from '@/apps/memory/MemoryApp';
import { BrowserAppWithErrorBoundary } from '@/apps/browser/BrowserApp';
import { AutomationsAppWithErrorBoundary } from '@/apps/automations/AutomationsApp';
import { AgentsAppWithErrorBoundary } from '@/apps/agents/AgentsApp';
import { useShellStore } from '@/state/store';

const appComponents: Record<string, React.ComponentType> = {
  files: FilesAppWithErrorBoundary,
  tasks: TasksAppWithErrorBoundary,
  logs: LogsAppWithErrorBoundary,
  settings: SettingsAppWithErrorBoundary,
  memory: MemoryAppWithErrorBoundary,
  browser: BrowserAppWithErrorBoundary,
  automations: AutomationsAppWithErrorBoundary,
  agents: AgentsAppWithErrorBoundary,
};

const appTitles: Record<string, string> = {
  files: 'Files',
  tasks: 'Tasks',
  logs: 'Logs',
  settings: 'Settings',
  memory: 'Memory',
  browser: 'Browser',
  automations: 'Automations',
  agents: 'Agents',
};

export function GUIApp() {
  const [openApp, setOpenApp] = useState<string | null>(null);
  const setMode = useShellStore(s => s.setMode);

  return (
    <div className="h-screen bg-os-bg text-os-text flex flex-col">
      <AnimatePresence mode="wait">
        {openApp && appComponents[openApp] ? (
          <motion.div
            key={openApp}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col"
          >
            <header className="px-4 py-3 bg-os-surface border-b border-os-border flex items-center gap-4">
              <button
                onClick={() => setOpenApp(null)}
                className="px-3 py-1 text-sm bg-os-bg text-os-muted hover:text-os-text rounded transition-colors"
              >
                ← Home
              </button>
              <h2 className="text-lg font-bold">{appTitles[openApp] || openApp}</h2>
              <button
                onClick={() => setMode('terminal')}
                className="ml-auto px-3 py-1 text-sm bg-os-bg text-os-muted hover:text-os-text rounded transition-colors"
              >
                Exit to Shell
              </button>
            </header>
            <main className="flex-1 overflow-auto">
              {(() => {
                const Component = appComponents[openApp];
                return Component ? <Component /> : null;
              })()}
            </main>
          </motion.div>
        ) : (
          <HomeScreen key="home" onOpenApp={setOpenApp} />
        )}
      </AnimatePresence>
    </div>
  );
}
