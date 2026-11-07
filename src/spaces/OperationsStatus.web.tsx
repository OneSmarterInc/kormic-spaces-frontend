import { displayDate } from './AdminTable.web';
export interface RunSummary {
  id: string;
  source__query: string;
  parameters?: {
    query?: string;
    location?: string;
    source_results?: Record<string, { status: string; reason?: string }>;
  };
  degraded?: boolean;
  source_failure_count?: number;
  source__location: string;
  status: string;
  fetched: number;
  created: number;
  queued_at: string;
  finished_at: string | null;
}
export function CollectionPulse({
  runs,
  degraded = 0,
  sourceFailures = 0,
  statuses,
  healthy,
  deferredReason,
}: {
  runs: RunSummary[];
  statuses: Record<string, number>;
  degraded?: number;
  sourceFailures?: number;
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
                ? `Collecting ${active.parameters?.query ?? active.source__query}`
                : deferredReason
                  ? 'Collection deferred'
                  : 'Collector ready'}
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
        {[
          { label: 'Running', value: statuses.running ?? 0 },
          { label: 'Queued', value: statuses.queued ?? 0 },
          {
            label: 'Completed · 24h',
            value: statuses.succeeded ?? 0,
            hint: 'Includes partial successes',
          },
          {
            label: 'Failed · 24h',
            value: statuses.failed ?? 0,
            attention: true,
          },
          { label: 'Partial · 24h', value: degraded, attention: true },
          {
            label: 'Source failures · 24h',
            value: sourceFailures,
            attention: true,
          },
        ].map((metric) => (
          <div key={metric.label}>
            <dt title={metric.hint}>{metric.label}</dt>
            <dd
              className={metric.attention && metric.value > 0 ? 'attention' : ''}
              title={metric.value.toLocaleString('en-US')}
              aria-label={metric.value.toLocaleString('en-US')}
            >
              {new Intl.NumberFormat('en-US', {
                notation: 'compact',
                maximumFractionDigits: 1,
              }).format(metric.value)}
            </dd>
          </div>
        ))}
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
              <span className={`run-dot status-${run.degraded ? 'empty' : run.status}`} />
              <div>
                <strong>{run.parameters?.query ?? run.source__query}</strong>
                <small>{run.source__location}</small>
                {!!run.source_failure_count && (
                  <details>
                    <summary>{run.source_failure_count} source failure(s)</summary>
                    {Object.entries(run.parameters?.source_results ?? {}).map(
                      ([source, outcome]) => (
                        <p key={source}>
                          {source}: {outcome.status}
                          {outcome.reason ? ` · ${outcome.reason}` : ''}
                        </p>
                      ),
                    )}
                  </details>
                )}
              </div>
              <span className={`admin-badge status-${run.degraded ? 'empty' : run.status}`}>
                {run.degraded ? 'Partial success' : run.status}
              </span>
              <span>
                {run.status === 'succeeded'
                  ? `${run.fetched} retrieved · ${run.created} new`
                  : run.status === 'running'
                    ? 'In progress'
                    : run.status === 'failed'
                      ? 'Collection failed'
                      : run.status === 'empty'
                        ? 'No matching results'
                        : 'Awaiting results'}
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
