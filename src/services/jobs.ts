import { v4 as uuid } from 'uuid';
import type { Job, JobLog, JobArtifact } from '@/types';

export type JobService = {
  create(input: Pick<Job, 'type' | 'title' | 'command' | 'meta'>): Job;
  start(jobId: string): void;
  complete(jobId: string, result?: string): void;
  fail(jobId: string, error: string): void;
  cancel(jobId: string): void;

  log(jobId: string, entry: Omit<JobLog, 'id' | 'ts'> & Partial<Pick<JobLog, 'id' | 'ts'>>): void;
  addArtifact(jobId: string, artifact: Omit<JobArtifact, 'id'> & Partial<Pick<JobArtifact, 'id'>>): void;

  list(): Job[];
  get(jobId: string): Job | undefined;
};

type JobsStore = {
  jobs: Record<string, Job>;
  addJob: (job: Omit<Job, 'id' | 'createdAt' | 'logs' | 'artifacts'>) => string;
  updateJob: (id: string, updates: Partial<Job>) => void;
  listJobs: () => Job[];
  getJob: (id: string) => Job | undefined;
};

export function createJobService(store: JobsStore): JobService {
  function create(input: Pick<Job, 'type' | 'title' | 'command' | 'meta'>): Job {
    const id = uuid();
    const now = new Date().toISOString();
    const job: Job = {
      id,
      type: input.type,
      title: input.title,
      command: input.command,
      status: 'queued',
      createdAt: now,
      logs: [],
      artifacts: [],
      meta: input.meta,
    };
    store.jobs[id] = job;
    return job;
  }

  function start(jobId: string): void {
    const job = store.jobs[jobId];
    if (!job) return;
    store.updateJob(jobId, {
      status: 'running',
      startedAt: new Date().toISOString(),
    });
  }

  function complete(jobId: string, result?: string): void {
    const job = store.jobs[jobId];
    if (!job) return;
    store.updateJob(jobId, {
      status: 'completed',
      finishedAt: new Date().toISOString(),
      result,
    });
  }

  function fail(jobId: string, error: string): void {
    const job = store.jobs[jobId];
    if (!job) return;
    store.updateJob(jobId, {
      status: 'failed',
      finishedAt: new Date().toISOString(),
      error,
    });
  }

  function cancel(jobId: string): void {
    const job = store.jobs[jobId];
    if (!job) return;
    store.updateJob(jobId, {
      status: 'canceled',
      finishedAt: new Date().toISOString(),
    });
  }

  function log(jobId: string, entry: Omit<JobLog, 'id' | 'ts'> & Partial<Pick<JobLog, 'id' | 'ts'>>): void {
    const job = store.jobs[jobId];
    if (!job) return;
    const logEntry: JobLog = {
      id: entry.id || uuid(),
      ts: entry.ts || new Date().toISOString(),
      level: entry.level,
      message: entry.message,
    };
    store.updateJob(jobId, {
      logs: [...job.logs, logEntry],
    });
  }

  function addArtifact(jobId: string, artifact: Omit<JobArtifact, 'id'> & Partial<Pick<JobArtifact, 'id'>>): void {
    const job = store.jobs[jobId];
    if (!job) return;
    const artifactEntry: JobArtifact = {
      id: artifact.id || uuid(),
      type: artifact.type,
      path: artifact.path,
      label: artifact.label,
    };
    store.updateJob(jobId, {
      artifacts: [...job.artifacts, artifactEntry],
    });
  }

  function list(): Job[] {
    return store.listJobs();
  }

  function get(jobId: string): Job | undefined {
    return store.getJob(jobId);
  }

  return { create, start, complete, fail, cancel, log, addArtifact, list, get };
}
