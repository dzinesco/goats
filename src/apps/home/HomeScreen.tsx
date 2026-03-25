import { motion } from 'framer-motion';
import { useShellStore } from '@/state/store';

const apps = [
  { id: 'files', name: 'Files', icon: '📁', color: 'bg-blue-500' },
  { id: 'browser', name: 'Browser', icon: '🌐', color: 'bg-cyan-500' },
  { id: 'tasks', name: 'Tasks', icon: '📋', color: 'bg-green-500' },
  { id: 'automations', name: 'Automations', icon: '⚡', color: 'bg-yellow-500' },
  { id: 'memory', name: 'Memory', icon: '🧠', color: 'bg-purple-500' },
  { id: 'logs', name: 'Logs', icon: '📜', color: 'bg-orange-500' },
  { id: 'settings', name: 'Settings', icon: '⚙️', color: 'bg-gray-500' },
  { id: 'agents', name: 'Agents', icon: '🤖', color: 'bg-indigo-500' },
];

interface HomeScreenProps {
  onOpenApp: (appId: string) => void;
}

export function HomeScreen({ onOpenApp }: HomeScreenProps) {
  const setMode = useShellStore(s => s.setMode);

  return (
    <div className="min-h-screen bg-os-bg flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between border-b border-os-border">
        <h1 className="text-xl font-bold text-os-text">goatos</h1>
        <button
          onClick={() => setMode('terminal')}
          className="px-3 py-1 text-sm bg-os-surface text-os-muted hover:text-os-text transition-colors rounded"
        >
          Exit to Shell
        </button>
      </header>

      <main className="flex-1 p-6">
        <div className="grid grid-cols-4 gap-6 max-w-2xl mx-auto">
          {apps.map((app, i) => (
            <motion.button
              key={app.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onOpenApp(app.id)}
              className="flex flex-col items-center gap-3 p-4 bg-os-surface hover:bg-os-border rounded-xl transition-colors group"
            >
              <div className={`w-16 h-16 ${app.color} rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform`}>
                {app.icon}
              </div>
              <span className="text-sm text-os-text">{app.name}</span>
            </motion.button>
          ))}
        </div>
      </main>

      <footer className="px-6 py-3 border-t border-os-border flex justify-between text-xs text-os-muted">
        <span>goatos v1.0.0</span>
        <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
      </footer>
    </div>
  );
}
