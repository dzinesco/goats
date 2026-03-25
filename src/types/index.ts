// Core system types for goatos
// These types are frozen - do not modify without architectural review

// ============ FSNode ============

export type FSNodeType = 'file' | 'directory';

export type FSNode = {
  id: string;
  path: string;              // canonical absolute path: /home/user/file.txt
  name: string;              // basename
  parentPath: string | null; // null only for root
  type: FSNodeType;

  content?: string;          // text files only in v1
  size: number;              // derived from content for files, 0 for dirs

  createdAt: string;
  updatedAt: string;

  mimeType?: string;         // text/plain, application/json, etc.
  tags?: string[];
  meta?: Record<string, string | number | boolean>;
};

// ============ Job ============

export type JobStatus = 'queued' | 'running' | 'waiting' | 'completed' | 'failed' | 'canceled';
export type JobType = 'command' | 'automation' | 'browser' | 'watch' | 'agent' | 'system';
export type JobLogLevel = 'info' | 'warn' | 'error';

export type JobLog = {
  id: string;
  ts: string;
  level: JobLogLevel;
  message: string;
};

export type JobArtifact = {
  id: string;
  type: 'file' | 'screenshot' | 'trace' | 'json';
  path: string;
  label: string;
};

export type Job = {
  id: string;
  type: JobType;
  command?: string;
  title: string;
  status: JobStatus;

  createdAt: string;
  startedAt?: string;
  finishedAt?: string;

  progress?: number;
  result?: string;
  error?: string;

  logs: JobLog[];
  artifacts: JobArtifact[];

  meta?: Record<string, string | number | boolean>;
};

// ============ ParsedCommand ============

export type ParsedCommand = {
  raw: string;
  name: string;
  args: string[];
  flags: Record<string, string | boolean>;
};

export type CommandResult = {
  success: boolean;
  output: string;
  error?: string;
};

// ============ Registry ============

export type RegistryValue = string | number | boolean | null;

export type RegistryEntry = {
  key: string;
  value: RegistryValue;
  updatedAt: string;
};

// ============ Memory ============

export type MemoryItem = {
  id: string;
  path: string;
  content: string;
  tags: string[];
  meta: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
};

// ============ Session ============

export type Session = {
  id: string;
  type: 'browser' | 'terminal' | 'agent';
  status: 'active' | 'closed' | 'error';
  trace_refs: string[];
  artifacts: JobArtifact[];
  last_activity: string;
  browser_url?: string;
};

// ============ Automation ============

export type AutomationTrigger = {
  type: 'schedule' | 'event' | 'manual';
  config: Record<string, unknown>;
};

export type AutomationStep = {
  id: string;
  action: string;
  params: Record<string, unknown>;
};

export type Automation = {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  steps: AutomationStep[];
  approvals: string[];
  last_run?: string;
  status: 'active' | 'paused' | 'disabled';
  success_metrics: {
    total_runs: number;
    successful_runs: number;
  };
};

// ============ Agent ============

export type Agent = {
  id: string;
  name: string;
  description: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  task?: string;
  result?: string;
  created_at: string;
  updated_at: string;
};

// ============ Shell ============

export type ShellHistoryEntry = {
  command: string;
  output: string;
  timestamp: string;
  success: boolean;
};
