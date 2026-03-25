// Track watch job intervals so they can be stopped when jobs are removed
export const jobIntervals = new Map<string, ReturnType<typeof setInterval>>();

export function clearJobInterval(jobId: string): void {
  const interval = jobIntervals.get(jobId);
  if (interval) {
    clearInterval(interval);
    jobIntervals.delete(jobId);
  }
}
