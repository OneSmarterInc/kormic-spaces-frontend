import { displayDate } from './AdminTable.web';
export interface RunSummary {
  id: string;
  source__query: string;
  source__location: string;
  status: string;
  fetched: number;
  created: number;
  queued_at: string;
  finished_at: string | null;
}
export function CollectionPulse({
  runs,
  statuses,
  healthy,
  deferredReason,
}: {
  runs: RunSummary[];
  statuses: Record<string, number>;
  healthy: boolean;
  deferredReason?: string;
}) {
  const active = runs.find((r) => r.status === 'running');
  return (
    <section className="collection-pulse" aria-label="Collection progress">
      <div>
        <span className={`pulse-dot ${healthy ? 'healthy' : ''}`} />
        <div>
          <strong>
            {!healthy
              ? 'Worker not reporting'
              : active
                ? `Collecting ${active.source__query}`
                : deferredReason ? 'Collection deferred' : 'Collector ready'}
          </strong>
          <p>
            {active
              ? active.source__location
              : healthy
                ? deferredReason || 'Waiting for the next scheduled search'
                : 'Check the collection worker before starting new searches'}
          </p>
        </div>
      </div>
      <dl>
        <div>
          <dt>Running</dt>
          <dd>{statuses.running ?? 0}</dd>
        </div>
        <div>
          <dt>Queued</dt>
          <dd>{statuses.queued ?? 0}</dd>
        </div>
        <div>
          <dt>Completed · 24h</dt>
          <dd>{statuses.succeeded ?? 0}</dd>
        </div>
        <div>
          <dt>Failed · 24h</dt>
          <dd className={(statuses.failed ?? 0) > 0 ? 'attention' : ''}>{statuses.failed ?? 0}</dd>
        </div>
      </dl>
    </section>
  );
}
export function RecentRuns({ runs, onView }: { runs: RunSummary[]; onView: () => void }) {
  return (
    <section className="recent-runs">
      <header>
        <h2>Recent collection activity</h2>
        <button className="table-link" onClick={onView}>
          View job data
        </button>
      </header>
      {runs.length ? (
        <div className="recent-list">
          {runs.map((run) => (
            <div className="recent-row" key={run.id}>
              <span className={`run-dot status-${run.status}`} />
              <div>
                <strong>{run.source__query}</strong>
                <small>{run.source__location}</small>
              </div>
              <span className={`admin-badge status-${run.status}`}>{run.status}</span>
              <span>
                {run.status === 'succeeded'
                  ? `${run.fetched} retrieved · ${run.created} new`
                  : run.status === 'running'
                    ? 'In progress'
                    : run.status === 'failed' ? 'Collection failed' : 'Awaiting results'}
              </span>
              <time>{displayDate(run.finished_at || run.queued_at)}</time>
            </div>
          ))}
        </div>
      ) : (
        <p className="table-empty">No collection activity yet. Start a search from Job data.</p>
      )}
    </section>
  );
}
