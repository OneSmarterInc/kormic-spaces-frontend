import { useEffect, useState } from 'react';
import { SpacesClient, type WorkspaceData } from './liveApi';
import { useDebouncedSearch } from './useDebouncedSearch';

type ActivityEvent = WorkspaceData['activity'][number];
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
          Search activity
          <input
            type="search"
            maxLength={200}
            placeholder="Search candidate, person, job or change…"
            value={filters.q}
            onChange={(e) => change('q', e.target.value)}
          />
        </label>
        <button className="btn" onClick={() => setRevision((v) => v + 1)} disabled={pending}>
          Refresh log
        </button>
      </div>
      <div className="audit-filters">
        <label>
          Event type
          <select value={filters.event_type} onChange={(e) => change('event_type', e.target.value)}>
            <option value="">All events</option>
            {(data?.filters.event_type ?? []).map((value) => (
              <option key={value} value={value}>
                {eventLabels[value] ?? value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Changed by
          <select value={filters.actor_name} onChange={(e) => change('actor_name', e.target.value)}>
            <option value="">Everyone</option>
            {(data?.filters.actor_name ?? []).map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Job
          <select value={filters.job_title} onChange={(e) => change('job_title', e.target.value)}>
            <option value="">All jobs</option>
            {(data?.filters.job_title ?? []).map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          New stage
          <select value={filters.new_stage} onChange={(e) => change('new_stage', e.target.value)}>
            <option value="">All stages</option>
            {['New', 'In review', 'Shortlisted', 'Interview', 'Accepted', 'Rejected'].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
        </label>
        <label>
          From date
          <input
            type="date"
            value={filters.from}
            onChange={(e) => change('from', e.target.value)}
          />
        </label>
        <label>
          To date
          <input
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(e) => change('to', e.target.value)}
          />
        </label>
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
            Clear filters
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
            <h2>{activeFilters ? 'No activity matches these filters' : 'No activity yet'}</h2>
            <p>
              {activeFilters
                ? 'Try a different search or clear your filters.'
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
