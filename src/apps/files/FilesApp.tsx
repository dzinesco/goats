import { useState, useEffect } from 'react';
import { useFilesystemStore } from '@/state/store';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function FilesApp() {
  const { cwd, listDir, cd, getNode, init, mkdir, touch, rm, writeFile } = useFilesystemStore();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [showNewFile, setShowNewFile] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  const nodes = listDir(cwd);

  const navigateTo = (path: string) => {
    const node = getNode(path);
    if (node?.type === 'directory') {
      cd(path);
      setSelectedPath(null);
      setIsEditing(false);
    } else {
      setSelectedPath(path);
      setEditContent(node?.content || '');
      setIsEditing(false);
    }
  };

  const handleSave = () => {
    if (selectedPath) {
      writeFile(selectedPath, editContent);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    if (selectedPath) {
      const node = getNode(selectedPath);
      setEditContent(node?.content || '');
    }
    setIsEditing(false);
  };

  const goUp = () => {
    const parts = cwd.split('/').filter(Boolean);
    if (parts.length > 1) {
      cd('/' + parts.slice(0, -1).join('/'));
    } else {
      cd('/');
    }
    setSelectedPath(null);
  };

  const handleNewFile = () => {
    if (newName.trim()) {
      touch(`${cwd}/${newName.trim()}`);
      setNewName('');
      setShowNewFile(false);
    }
  };

  const handleNewFolder = () => {
    if (newName.trim()) {
      mkdir(`${cwd}/${newName.trim()}`);
      setNewName('');
      setShowNewFolder(false);
    }
  };

  const handleDelete = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    rm(path, true);
    if (selectedPath === path) setSelectedPath(null);
  };

  const selectedNode = selectedPath ? getNode(selectedPath) : null;

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 border-r border-os-border">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={goUp} className="px-3 py-1 bg-os-surface text-os-text rounded hover:bg-os-border transition-colors">
            ⬆️ Up
          </button>
          <h2 className="text-xl font-bold text-os-text flex-1">{cwd}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowNewFolder(true); setShowNewFile(false); }}
              className="px-3 py-1 bg-os-surface text-os-text rounded hover:bg-os-border transition-colors text-sm"
            >
              + Folder
            </button>
            <button
              onClick={() => { setShowNewFile(true); setShowNewFolder(false); }}
              className="px-3 py-1 bg-os-surface text-os-text rounded hover:bg-os-border transition-colors text-sm"
            >
              + File
            </button>
          </div>
        </div>

        {(showNewFile || showNewFolder) && (
          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  showNewFile ? handleNewFile() : handleNewFolder();
                }
              }}
              placeholder={showNewFile ? 'filename.txt' : 'folder name'}
              className="flex-1 px-3 py-2 bg-os-surface border border-os-border rounded text-os-text placeholder-os-muted focus:outline-none focus:border-os-accent"
              autoFocus
            />
            <button
              onClick={() => {
                if (showNewFile) handleNewFile();
                else handleNewFolder();
              }}
              className="px-4 py-2 bg-os-accent text-white rounded hover:bg-os-accent/80 transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => { setShowNewFile(false); setShowNewFolder(false); setNewName(''); }}
              className="px-4 py-2 bg-os-surface text-os-muted rounded hover:bg-os-border transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {nodes.length === 0 && !showNewFile && !showNewFolder ? (
          <div className="text-center py-12 text-os-muted">
            <p>Empty directory</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {nodes.map(node => (
              <div
                key={node.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  selectedPath === node.path ? 'bg-os-accent/20' : 'hover:bg-os-surface'
                }`}
              >
                <button
                  onClick={() => navigateTo(node.path)}
                  onDoubleClick={() => node.type === 'directory' && cd(node.path)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  <span className="text-xl">{node.type === 'directory' ? '📁' : '📄'}</span>
                  <div className="flex-1">
                    <div className="text-os-text">{node.name}</div>
                    <div className="text-xs text-os-muted">{node.type === 'file' ? `${node.size || 0} bytes` : 'Directory'}</div>
                  </div>
                </button>
                <button
                  onClick={(e) => handleDelete(node.path, e)}
                  className="text-os-muted hover:text-red-400 transition-colors text-sm px-2 py-1"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedNode && selectedNode.type === 'file' && (
        <div className="w-1/2 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-os-text">{selectedNode.name}</h3>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 bg-os-accent text-white rounded hover:bg-os-accent/80 transition-colors text-sm"
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-3 py-1 bg-os-accent text-white rounded hover:bg-os-accent/80 transition-colors text-sm"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 bg-os-surface text-os-text rounded hover:bg-os-border transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          {isEditing ? (
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="w-full h-64 px-3 py-2 bg-os-surface border border-os-border rounded-lg text-os-text font-mono text-sm focus:outline-none focus:border-os-accent resize-none"
            />
          ) : (
            <pre className="text-sm text-os-muted font-mono bg-os-surface p-4 rounded-lg overflow-auto h-64">
              {selectedNode.content || '(empty file)'}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export function FilesAppWithErrorBoundary() {
  return (
    <ErrorBoundary name="Files">
      <FilesApp />
    </ErrorBoundary>
  );
}
