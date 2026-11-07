import { useEffect, useState } from 'react';
import { SpacesClient, type WorkspaceData } from './liveApi';
import { useDebouncedSearch } from './useDebouncedSearch';

type ActivityEvent = WorkspaceData['activity'][number];
function readableChange(value: unknown): string {
  if (value === null || value === undefined) return 'None';
  if (Array.isArray(value)) return value.map(readableChange).join(', ') || 'None';
  if (typeof value === 'object')
    return Object.entries(value)
      .map(([key, item]) => `${key.replaceAll('_', ' ')}: ${readableChange(item)}`)
      .join(' · ');
  return String(value).replaceAll('_', ' ');
}
interface ActivityPage {
  count: number;
  results: ActivityEvent[];
  filters: { actor_name: string[]; job_title: string[]; event_type: string[] };
}
const eventLabels: Record<string, string> = {
  stage_changed: 'Stage changed',
  note_updated: 'Review note updated',
  workspace_updated: 'Workspace updated',
  legacy: 'Earlier activity',
  candidate_applied: 'Candidate applied',
  candidate_withdrew: 'Candidate withdrew',
  candidate_reapplied: 'Candidate reapplied',
  member_invited: 'Member invited',
  member_joined: 'Member joined',
  member_profile_changed: 'Member profile updated',
  member_role_changed: 'Member role changed',
  member_revoked: 'Workspace access removed',
  member_email_requested: 'Email change requested',
  member_email_changed: 'Email changed',
  company_updated: 'Company updated',
  job_deleted: 'Job deleted',
  job_created: 'Job created',
  job_updated: 'Job updated',
};
const initialFilters = {
  q: '',
  event_type: '',
  actor_name: '',
  job_title: '',
  new_stage: '',
  from: '',
  to: '',
};
const columns = [
  ['created_at', 'Date & time'],
  ['candidate_name', 'Candidate'],
  ['event_type', 'Activity'],
  ['actor_name', 'Changed by'],
  ['job_title', 'Job'],
] as const;

/** Date inputs represent the viewer's local calendar days, sent with explicit UTC boundaries. */
export function activityDateBoundary(value: string, nextDay = false): string {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year!, month! - 1, day! + (nextDay ? 1 : 0)).toISOString();
}

export function ActivityLog({ api, org }: { api: SpacesClient; org: string }) {
  const [filters, setFilters] = useState(initialFilters);
  const [sort, setSort] = useState('-created_at');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<ActivityPage>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const query = useDebouncedSearch(filters.q);
  const invalidRange = Boolean(filters.from && filters.to && filters.from > filters.to);
  const params = new URLSearchParams({
    sort,
    limit: String(size),
    offset: String(page * size),
    q: query,
  });
  for (const key of ['event_type', 'actor_name', 'job_title', 'new_stage'] as const) {
    if (filters[key]) params.set(key, filters[key]);
  }
  if (filters.from) params.set('after', activityDateBoundary(filters.from));
  if (filters.to) params.set('before', activityDateBoundary(filters.to, true));
  const path = `${org}/activity/?${params}`;
  useEffect(() => {
    if (invalidRange) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void api
      .request<ActivityPage>(path, 'GET', undefined, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : 'Could not load activity. Please try again.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [api, path, revision, invalidRange]);
  function change(key: keyof typeof filters, value: string) {
    setFilters((previous) => ({ ...previous, [key]: value }));
    setPage(0);
  }
  const pending = loading || query !== filters.q;
  const activeFilters = Object.values(filters).some(Boolean);
  const total = error || invalidRange ? 0 : (data?.count ?? 0);
  return (
    <section className="audit-log" aria-label="Workspace activity log">
      <div className="audit-search-row">
        <label className="audit-search">
          Search all columns
          <input
            type="search"
            maxLength={200}
            placeholder="Search names, jobs, stages, events or dates…"
            value={filters.q}
            onChange={(e) => change('q', e.target.value)}
          />
        </label>
        <button className="btn" onClick={() => setRevision((v) => v + 1)} disabled={pending}>
          Refresh log
        </button>
      </div>
      <div className="audit-status">
        <span role="status">
          {pending ? 'Loading activity…' : `${total} ${total === 1 ? 'event' : 'events'}`}
        </span>
        <span>Read-only history · Times shown in your timezone</span>
        {activeFilters && (
          <button
            className="btn sm"
            onClick={() => {
              setFilters(initialFilters);
              setPage(0);
            }}
          >
            Clear search
          </button>
        )}
      </div>
      {(error || invalidRange) && (
        <div className="live-alert" role="alert">
          {invalidRange ? 'Choose an end date on or after the start date.' : error}
          {!invalidRange && (
            <button className="btn sm" onClick={() => setRevision((v) => v + 1)}>
              Retry
            </button>
          )}
        </div>
      )}
      <div
        className="audit-table-scroll"
        role="region"
        aria-label="Activity records"
        tabIndex={0}
        aria-busy={pending}
      >
        <table className={`audit-table ${pending ? 'is-loading' : ''}`}>
          <caption className="audit-sr-only">
            Workspace activity. Select a column heading to sort.
          </caption>
          <thead>
            <tr>
              {columns.map(([key, label]) => (
                <th
                  key={key}
                  scope="col"
                  aria-sort={
                    sort.replace('-', '') === key
                      ? sort.startsWith('-')
                        ? 'descending'
                        : 'ascending'
                      : 'none'
                  }
                >
                  <button
                    onClick={() => {
                      setSort(sort === key ? `-${key}` : key);
                      setPage(0);
                    }}
                  >
                    {label}
                    <span aria-hidden="true">
                      {sort === key ? '↑' : sort === `-${key}` ? '↓' : '↕'}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!invalidRange &&
              !error &&
              data?.results.map((event) => (
                <tr key={event.id}>
                  <td>
                    <time
                      dateTime={event.created_at}
                      title={new Date(event.created_at).toLocaleString(undefined, {
                        timeZoneName: 'long',
                      })}
                    >
                      <strong>
                        {new Date(event.created_at).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </strong>
                      <small>
                        {new Date(event.created_at).toLocaleTimeString(undefined, {
                          hour: 'numeric',
                          minute: '2-digit',
                          second: '2-digit',
                          timeZoneName: 'short',
                        })}
                      </small>
                    </time>
                    <small className="audit-event-id">Event #{event.id}</small>
                  </td>
                  <td>
                    {event.candidate_name || (
                      <span className="muted">
                        {event.event_type === 'legacy' ? 'Not recorded' : '—'}
                      </span>
                    )}
                  </td>
                  <td>
                    <strong>
                      {eventLabels[event.event_type ?? 'legacy'] ?? 'Workspace updated'}
                    </strong>
                    {event.event_type === 'stage_changed' ? (
                      <div
                        className="activity-transition"
                        aria-label={`From ${event.previous_stage} to ${event.new_stage}`}
                      >
                        <span>{event.previous_stage}</span>
                        <span aria-hidden="true">→</span>
                        <span className="activity-stage-new">{event.new_stage}</span>
                      </div>
                    ) : (
                      <p className="audit-description">{event.text}</p>
                    )}
                    {event.changes && Object.keys(event.changes).length > 0 && (
                      <details className="audit-change-details">
                        <summary>Change details</summary>
                        <dl>
                          {Object.entries(event.changes).map(([key, value]) => (
                            <div key={key}>
                              <dt>{key.replaceAll('_', ' ')}</dt>
                              <dd>{readableChange(value)}</dd>
                            </div>
                          ))}
                        </dl>
                      </details>
                    )}
                  </td>
                  <td>{event.actor_name || <span className="muted">Not recorded</span>}</td>
                  <td>
                    {event.job_title || (
                      <span className="muted">
                        {event.event_type === 'legacy' ? 'Not recorded' : '—'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!pending && !error && !invalidRange && !data?.results.length && (
          <div className="audit-empty">
            <h2>{activeFilters ? 'No matching activity' : 'No activity yet'}</h2>
            <p>
              {activeFilters
                ? 'Try a different search or clear your search.'
                : 'Hiring changes will appear here as your team works.'}
            </p>
          </div>
        )}
      </div>
      <footer className="audit-pagination">
        <label>
          Rows per page
          <select
            value={size}
            onChange={(e) => {
              setSize(Number(e.target.value));
              setPage(0);
            }}
          >
            {[10, 25, 50, 100].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <span>
          {total
            ? `${page * size + 1}–${Math.min((page + 1) * size, total)} of ${total}`
            : '0 events'}
        </span>
        <div>
          <button
            className="btn sm"
            disabled={pending || invalidRange || !!error || page === 0}
            onClick={() => setPage((v) => v - 1)}
          >
            Previous
          </button>
          <button
            className="btn sm"
            disabled={pending || invalidRange || !!error || (page + 1) * size >= total}
            onClick={() => setPage((v) => v + 1)}
          >
            Next
          </button>
        </div>
      </footer>
    </section>
  );
}
