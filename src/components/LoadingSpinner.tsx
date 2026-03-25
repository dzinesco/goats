export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div className={`${sizeClasses[size]} border-2 border-os-border border-t-os-accent rounded-full animate-spin`} />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="text-4xl mb-4">{icon}</span>
      <h3 className="text-lg font-medium text-os-text mb-2">{title}</h3>
      <p className="text-os-muted text-sm mb-4 max-w-xs">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-os-accent text-white rounded-lg hover:bg-os-accent/80 transition-colors text-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
