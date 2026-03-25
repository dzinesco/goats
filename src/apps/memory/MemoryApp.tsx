import { useState } from 'react';
import { useMemoryStore } from '@/state/store';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function MemoryApp() {
  const { listItems, addItem, searchItems, removeItem } = useMemoryStore();
  const [query, setQuery] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');

  const displayItems = query ? searchItems(query) : listItems();

  const handleAdd = () => {
    if (content) {
      addItem({
        path: `/memory/${Date.now()}`,
        content,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        meta: {},
      });
      setContent('');
      setTags('');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-os-text mb-6">Memory</h2>

      <div className="mb-6 space-y-3">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Store a memory..."
          className="w-full h-24 px-4 py-3 bg-os-surface border border-os-border rounded-lg text-os-text placeholder-os-muted focus:outline-none focus:border-os-accent resize-none"
        />
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="tags (comma separated)"
            value={tags}
            onChange={e => setTags(e.target.value)}
            className="flex-1 px-4 py-2 bg-os-surface border border-os-border rounded-lg text-os-text placeholder-os-muted focus:outline-none focus:border-os-accent"
          />
          <button
            onClick={handleAdd}
            className="px-6 py-2 bg-os-accent text-white rounded-lg hover:bg-os-accent/80 transition-colors"
          >
            Store
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search memories..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full px-4 py-2 bg-os-surface border border-os-border rounded-lg text-os-text placeholder-os-muted focus:outline-none focus:border-os-accent"
        />
      </div>

      <div className="space-y-3">
        {displayItems.map(item => (
          <div key={item.id} className="p-4 bg-os-surface border border-os-border rounded-lg">
            <div className="flex items-start justify-between gap-3">
              <p className="text-os-text mb-2 flex-1">{item.content}</p>
              <button
                onClick={() => removeItem(item.id)}
                className="text-os-muted hover:text-red-400 transition-colors text-sm px-2 py-1"
                title="Delete"
              >
                ✕
              </button>
            </div>
            <div className="flex gap-2">
              {item.tags.map(tag => (
                <span key={tag} className="px-2 py-1 text-xs bg-os-accent/20 text-os-accent rounded">
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-2 text-xs text-os-muted">
              {new Date(item.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MemoryAppWithErrorBoundary() {
  return (
    <ErrorBoundary name="Memory">
      <MemoryApp />
    </ErrorBoundary>
  );
}
