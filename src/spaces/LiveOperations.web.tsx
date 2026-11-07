import { useEffect, useState } from 'react';
import type { SpacesClient } from './liveApi';

interface Snapshot {
  asOf: string;
  workerSeenAt: string | null;
  workerHealthy: boolean;
  queue: Record<string, number>;
  limits: { running: number; queued: number };
  planner: {
    status: string;
    enabled: boolean;
    model: string;
    lastPlanAt: string | null;
    nextPlanAt: string | null;
  };
  runs: {
    id: string;
    query: string;
    status: string;
    fetched: number;
    created: number;
    degraded: boolean;
    queuedAt: string;
    startedAt: string | null;
    finishedAt: string | null;
  }[];
}
const time = (value: string | null) => (value ? new Date(value).toLocaleString() : 'Not recorded');
export function LiveOperations({ api, visible }: { api: SpacesClient; visible: boolean }) {
  const [data, setData] = useState<Snapshot>();
  const [error, setError] = useState('');
  useEffect(() => {
    if (!visible || typeof document === 'undefined') return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let pending = false;
    async function load() {
      if (pending || controller.signal.aborted) return;
      clearTimeout(timer);
      if (document.hidden) return;
      pending = true;
      try {
        const next = await api.request<Snapshot>(
          'admin/live-operations/',
          'GET',
          undefined,
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setData(next);
          setError('');
        }
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : 'Updates unavailable.');
      } finally {
        pending = false;
        if (!controller.signal.aborted) timer = setTimeout(() => void load(), 5000);
      }
    }
    const resume = () => {
      if (!document.hidden) void load();
    };
    void load();
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', resume);
    return () => {
      controller.abort();
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('online', resume);
    };
  }, [api, visible]);
  return (
    <aside className="copilot-context operations-panel" aria-label="Live operations">
      <header>
        <h2>Live operations</h2>
        <span>{error ? 'Updates interrupted' : 'Refreshes every 5s'}</span>
      </header>
      {error && <p role="alert">{error}</p>}
      {!data ? (
        <p role="status">Loading current activity…</p>
      ) : (
        <>
          <p className="operations-updated">Snapshot: {time(data.asOf)}</p>
          <section>
            <h3>Collection worker</h3>
            <strong className={data.workerHealthy ? 'operations-online' : 'attention'}>
              {data.workerHealthy ? 'Reporting' : 'Not reporting'}
            </strong>
            <small>Last heartbeat: {time(data.workerSeenAt)}</small>
            <dl>
              <dt>Running</dt>
              <dd>
                {data.queue.running ?? 0} / {data.limits.running}
              </dd>
              <dt>Queued</dt>
              <dd>
                {data.queue.queued ?? 0} / {data.limits.queued}
              </dd>
            </dl>
          </section>
          <section>
            <h3>Search planner</h3>
            <dl>
              <dt>Status</dt>
              <dd>{data.planner.status}</dd>
              <dt>Planning</dt>
              <dd>{data.planner.enabled ? 'Enabled' : 'Paused'}</dd>
              <dt>Model</dt>
              <dd>{data.planner.model || 'Not recorded'}</dd>
            </dl>
            <small>Last plan: {time(data.planner.lastPlanAt)}</small>
            <small>Next plan: {time(data.planner.nextPlanAt)}</small>
          </section>
          <section>
            <h3>Recent worker actions</h3>
            {data.runs.length ? (
              <ol className="operations-runs">
                {data.runs.map((run) => (
                  <li key={run.id}>
                    <strong>{run.query}</strong>
                    <span>{run.degraded ? 'Partial success' : run.status}</span>
                    <small>
                      {run.fetched.toLocaleString()} retrieved · {run.created.toLocaleString()}{' '}
                      added
                    </small>
                    <time>{time(run.finishedAt || run.startedAt || run.queuedAt)}</time>
                  </li>
                ))}
              </ol>
            ) : (
              <p>No collection runs recorded.</p>
            )}
          </section>
          <p className="operations-footnote">
            Recorded backend state. In-progress counts update when workers save progress. The
            assistant explains activity; it does not execute these actions.
          </p>
        </>
      )}
    </aside>
  );
}
