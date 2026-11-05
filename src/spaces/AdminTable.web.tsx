import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { SpacesClient } from './liveApi';
export type Resource = 'catalog' | 'runs' | 'sources' | 'plans' | 'users' | 'activity';
interface Row {
  id?: string | number;
  published?: boolean;
  latest_status?: string;
  latest_fetched?: number;
  latest_finished?: string;
  person_id?: string;
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  url?: string;
  posted_date?: string | null;
  last_seen_at?: string;
  query?: string;
  origin?: string;
  enabled?: boolean;
  agent_approved?: boolean;
  agent_reason?: string;
  demand_score?: number;
  demand_signals?: Record<string, number>;
  interval_minutes?: number;
  next_run_at?: string;
  publish_to_careers?: boolean;
  hours?: number;
  limit?: number;
  status?: string;
  parameters?: { query?: string; location?: string };
  fetched?: number;
  created?: number;
  updated?: number;
  rejected?: number;
  error?: string;
  queued_at?: string;
  finished_at?: string;
  full_name?: string;
  email?: string;
  city?: string;
  created_at?: string;
  career_path__role__name?: string | null;
  text?: string;
  actor_name?: string;
}
interface Page {
  results: Row[];
  count: number;
  page: number;
  page_size: number;
  pages: number;
  start: number;
  end: number;
}
const titles: Record<Resource, string> = {
  catalog: 'Collected jobs',
  runs: 'Collection history',
  sources: 'Search schedules',
  plans: 'Search decisions',
  users: 'Careers users',
  activity: 'Audit trail',
};
const columns: Record<Resource, string[]> = {
  catalog: ['Job title', 'Company', 'Location', 'Posted', 'Last collected', 'Visibility', ''],
  runs: ['Search', 'Status', 'Results', 'Added', 'Queued', ''],
  sources: ['Search', 'Type', 'Status', 'Frequency', 'Next run', 'Latest run', ''],
  plans: ['Search', 'Status', 'Demand', 'Frequency', 'Next run', 'Latest run', ''],
  users: ['User', 'Selected role', 'Location', 'Joined'],
  activity: ['Action', 'Administrator', 'Date'],
};
const columnSorts: Record<Resource, string[]> = {
  catalog: ['name', 'company', 'location', 'posted', 'recent', 'visibility', ''],
  runs: ['name', 'status', 'results', 'added', 'recent', ''],
  sources: ['name', 'type', 'status', 'frequency', 'next', 'outcome', ''],
  plans: ['name', 'status', 'priority', 'frequency', 'next', 'outcome', ''],
  users: ['name', 'role', 'location', 'recent'],
  activity: ['action', 'actor', 'recent'],
};
const defaultSort = (resource: Resource) =>
  resource === 'plans' ? 'priority' : resource === 'sources' ? 'next' : 'recent';
export const displayDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        ...(value.includes('T') ? { hour: '2-digit', minute: '2-digit' } : {}),
      }).format(new Date(value))
    : '—';
export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="admin-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-label={title}
    >
      <header>
        <h2>{title}</h2>
        <button type="button" aria-label="Close details" className="quiet" onClick={onClose}>
          ×
        </button>
      </header>
      <div className="admin-dialog-body">{children}</div>
    </dialog>
  );
}
export function AdminTable({
  api,
  resource,
  revision = 0,
}: {
  api: SpacesClient;
  resource: Resource;
  revision?: number;
}) {
  const [page, setPage] = useState(1),
    [size, setSize] = useState(10),
    [draft, setDraft] = useState(''),
    [query, setQuery] = useState(''),
    [sort, setSort] = useState(defaultSort(resource)),
    [direction, setDirection] = useState<'asc' | 'desc'>(resource === 'sources' ? 'asc' : 'desc');
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date>();
  const [data, setData] = useState<Page>(),
    [error, setError] = useState(''),
    [refresh, setRefresh] = useState(0),
    [detail, setDetail] = useState<Row>(),
    [detailLoading, setDetailLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let inFlight = false;
    setLoading(true);
    async function load() {
      if (inFlight || controller.signal.aborted) return;
      clearTimeout(timer);
      if (document.hidden) return;
      inFlight = true;
      try {
        const result = await api.request<Page>(
          `admin/table/${resource}/?${new URLSearchParams({ page: String(page), page_size: String(size), q: query, sort, direction })}`,
          'GET',
          undefined,
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setData(result);
          setUpdatedAt(new Date());
          setError('');
        }
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : 'Unable to load data.');
      } finally {
        inFlight = false;
        if (!controller.signal.aborted) {
          setLoading(false);
          timer = setTimeout(() => void load(), 5000);
        }
      }
    }
    const resume = () => { if (!document.hidden) void load(); };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', resume);
    void load();
    return () => {
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('online', resume);
      controller.abort();
      clearTimeout(timer);
    };
  }, [api, resource, page, size, query, sort, direction, refresh, revision]);
  async function open(row: Row) {
    setDetail(row);
    if (resource !== 'catalog') return;
    setDetailLoading(true);
    try {
      const value = await api.request<Row>(`admin/catalog/${row.id}/`);
      setDetail((current) => (current?.id === row.id ? { ...row, ...value } : current));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load details.');
    } finally {
      setDetailLoading(false);
    }
  }
  async function control(row: Row, action: string) {
    setBusy(true);
    try {
      await api.request('admin/collection/', 'POST', { action, source_id: row.id });
      setNotice('Search updated.');
      setDetail(undefined);
      setRefresh((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  }
  const statusOf = (row: Row) =>
    row.status ??
    (['one_time', 'on_demand'].includes(row.origin ?? '')
      ? (row.latest_status ?? 'queued')
      : !row.enabled
        ? 'Paused'
        : row.origin !== 'profile'
          ? 'Scheduled'
          : row.agent_approved
            ? 'Scheduled'
            : 'Awaiting selection');
  const badge = (value: string) => (
    <span className={`admin-badge status-${value.toLowerCase()}`}>{value}</span>
  );
  const actions = (row: Row) => (
    <button
      className="table-link"
      onClick={() => void open(row)}
      aria-label={`Details for ${row.title ?? row.query ?? row.parameters?.query ?? 'run'}`}
    >
      Details
    </button>
  );
  function cells(row: Row) {
    if (resource === 'catalog')
      return (
        <>
          <td className="primary-cell">{row.title}</td>
          <td>{row.company || '—'}</td>
          <td>{row.location || '—'}</td>
          <td className="nowrap">{displayDate(row.posted_date)}</td>
          <td className="nowrap">{displayDate(row.last_seen_at)}</td>
          <td>{badge(row.published ? 'Published' : 'Private')}</td>
          <td>{actions(row)}</td>
        </>
      );
    if (resource === 'runs')
      return (
        <>
          <td className="primary-cell">
            {row.parameters?.query}
            <small>{row.parameters?.location}</small>
          </td>
          <td>{badge(statusOf(row))}</td>
          <td className="number">{row.fetched}</td>
          <td className="number">{row.created}</td>
          <td className="nowrap">{displayDate(row.queued_at)}</td>
          <td>{actions(row)}</td>
        </>
      );
    if (resource === 'sources' || resource === 'plans')
      return (
        <>
          <td className="primary-cell">
            {row.query}
            <small>{row.location}</small>
            {resource === 'plans' && <small className="agent-selection-reason">{row.agent_reason || 'No selection reason recorded yet.'}</small>}
          </td>
          {resource === 'sources' ? (
            <td>
              {row.origin === 'profile'
                ? 'Agent'
                : ['one_time', 'on_demand'].includes(row.origin ?? '')
                  ? 'One-time'
                  : 'Admin'}
            </td>
          ) : null}
          <td>{badge(statusOf(row))}</td>
          {resource === 'plans' ? (
            <td className="number">
              {row.demand_score}
              <small>
                {(row.demand_signals?.chat_requests ?? 0) +
                  (row.demand_signals?.profiles ?? 0) +
                  (row.demand_signals?.job_clicks ?? 0) >
                0
                  ? `${row.demand_signals?.chat_requests ?? 0} chats · ${row.demand_signals?.profiles ?? 0} profiles · ${row.demand_signals?.job_clicks ?? 0} opens`
                  : 'Catalog coverage'}
              </small>
            </td>
          ) : null}
          <td>{['one_time', 'on_demand'].includes(row.origin ?? '') ? 'Once' : `${row.interval_minutes} min`}</td>
          <td className="nowrap">
            {row.enabled && (row.origin !== 'profile' || row.agent_approved)
              ? displayDate(row.next_run_at)
              : '—'}
          </td>
          <td>
            {row.latest_status ? (
              <>
                {badge(row.latest_status)}
                <small>{row.latest_fetched ?? 0} jobs retrieved</small>
              </>
            ) : (
              <span className="muted">Not run yet</span>
            )}
          </td>
          <td>{actions(row)}</td>
        </>
      );
    if (resource === 'users')
      return (
        <>
          <td className="primary-cell">
            <span className="user-name">
              <span className="user-avatar" aria-hidden="true">
                {(row.full_name || row.email || '?').slice(0, 1).toUpperCase()}
              </span>
              {row.full_name || 'Unnamed user'}
            </span>
            <small>{row.email}</small>
          </td>
          <td>{row.career_path__role__name ?? 'Not selected'}</td>
          <td>{row.city || '—'}</td>
          <td className="nowrap">{displayDate(row.created_at)}</td>
        </>
      );
    return (
      <>
        <td className="primary-cell">{row.text}</td>
        <td>{row.actor_name}</td>
        <td className="nowrap">{displayDate(row.created_at)}</td>
      </>
    );
  }
  const current = data?.page ?? page,
    total = data?.pages ?? 1;
  return (
    <section className="admin-data-panel" aria-label={titles[resource]}>
      <div className="admin-table-heading">
        <h2>{titles[resource]} {data && <span className="table-total">{data.count.toLocaleString()}</span>}</h2>
        {error && <span className="table-live is-stale" role="status">Updates interrupted · retrying</span>}
      </div>
      <div className="admin-toolbar">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(draft.trim());
            setPage(1);
          }}
        >
          <label className="sr-only" htmlFor={`search-${resource}`}>
            Search {titles[resource].toLowerCase()}
          </label>
          <input
            id={`search-${resource}`}
            type="search"
            maxLength={160}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              resource === 'users'
                ? 'Search name or email'
                : resource === 'activity'
                  ? 'Search action or administrator'
                  : 'Search role or location'
            }
          />
          <button className="secondary">Search</button>
        </form>
        <span className="table-count">
          {loading ? 'Updating…' : updatedAt ? `Synced ${updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'No data'}
        </span>
      </div>
      {error && (
        <p className="portal-alert" role="alert">
          {error}
          <button onClick={() => setRefresh((n) => n + 1)}>Retry</button>
        </p>
      )}
      {notice && (
        <p className="admin-notice" role="status">
          {notice}
        </p>
      )}
      <div className="admin-table-scroll" aria-busy={loading}>
        <table className="admin-table">
          <caption className="sr-only">{titles[resource]}</caption>
          <thead>
            <tr>
              {columns[resource].map((label, index) => {
                const key = columnSorts[resource][index];
                const active = key === sort;
                return (
                  <th
                    scope="col"
                    key={index}
                    aria-sort={
                      key
                        ? active
                          ? direction === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                        : undefined
                    }
                    className={
                      ['Results', 'Added', 'Demand'].includes(label) ? 'number' : undefined
                    }
                  >
                    {key ? (
                      <button
                        className="column-sort"
                        aria-label={`Sort by ${label}, ${active && direction === 'asc' ? 'descending' : 'ascending'}`}
                        onClick={() => {
                          setSort(key);
                          setDirection(active && direction === 'asc' ? 'desc' : 'asc');
                          setPage(1);
                        }}
                      >
                        {label}
                        <svg viewBox="0 0 12 16" width="12" height="16" aria-hidden="true">
                          <path
                            d="M3 6 6 3 9 6"
                            fill="none"
                            stroke={active && direction === 'asc' ? 'currentColor' : '#abb3c0'}
                            strokeWidth="1.5"
                          />
                          <path
                            d="m3 10 3 3 3-3"
                            fill="none"
                            stroke={active && direction === 'desc' ? 'currentColor' : '#abb3c0'}
                            strokeWidth="1.5"
                          />
                        </svg>
                      </button>
                    ) : (
                      <span className="sr-only">Actions</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {!data ? (
              <tr>
                <td colSpan={columns[resource].length} className="table-empty" role="status">
                  {error ? 'Data unavailable' : 'Loading records…'}
                </td>
              </tr>
            ) : data.results.length ? (
              data.results.map((row) => <tr key={row.id ?? row.person_id}>{cells(row)}</tr>)
            ) : (
              <tr>
                <td colSpan={columns[resource].length} className="table-empty">
                  No records match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <footer className="admin-table-footer">
        <span>
          {data ? `${data.start}–${data.end} of ${data.count.toLocaleString()}` : 'Loading…'}
        </span>
        <label>
          Rows per page
          <select
            aria-label="Rows per page"
            value={size}
            onChange={(e) => {
              setSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 25, 50].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <nav aria-label={`${titles[resource]} pagination`}>
          <button
            className="quiet"
            disabled={loading || !data || current === 1}
            onClick={() => setPage(current - 1)}
          >
            Previous
          </button>
          <span>
            Page {current} of {total}
          </span>
          <button
            className="quiet"
            disabled={loading || !data || current >= total}
            onClick={() => setPage(current + 1)}
          >
            Next
          </button>
        </nav>
      </footer>
      {detail && (
        <Dialog
          title={detail.title ?? detail.query ?? detail.parameters?.query ?? 'Record details'}
          onClose={() => setDetail(undefined)}
        >
          {detailLoading ? (
            <p role="status">Loading details…</p>
          ) : resource === 'catalog' ? (
            <>
              <p>
                {detail.company} · {detail.location}
              </p>
              <div className="admin-description">
                {detail.description || 'No description provided.'}
              </div>
              {detail.url &&
                /^https:\/\/www\.linkedin\.com\/jobs\/view\/\d+\/$/.test(detail.url) && (
                  <a
                    className="admin-external"
                    href={detail.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open original listing ↗
                  </a>
                )}
            </>
          ) : resource === 'runs' ? (
            <>
              <dl>
                <dt>Status</dt>
                <dd>{badge(statusOf(detail))}</dd>
                <dt>Results</dt>
                <dd>{detail.fetched}</dd>
                <dt>New / updated / rejected</dt>
                <dd>
                  {detail.created} / {detail.updated} / {detail.rejected}
                </dd>
                <dt>Completed</dt>
                <dd>{displayDate(detail.finished_at)}</dd>
              </dl>
              {detail.error && <p className="portal-alert">{detail.error}</p>}
            </>
          ) : (
            <>
              <p>{detail.location}</p>
              <dl>
                <dt>Schedule</dt>
                <dd>Every {detail.interval_minutes} minutes</dd>
                <dt>Search window</dt>
                <dd>
                  Last {detail.hours} hours · up to {detail.limit} jobs
                </dd>
                <dt>Chat / clicks / profiles</dt>
                <dd>
                  {detail.demand_signals?.chat_requests ?? 0} /{' '}
                  {detail.demand_signals?.job_clicks ?? 0} / {detail.demand_signals?.profiles ?? 0}
                </dd>
                <dt>Careers visibility</dt>
                <dd>{detail.publish_to_careers ? 'Published' : 'Private'}</dd>
              </dl>
              {detail.agent_reason && (
                <>
                  <h3>Agent explanation</h3>
                  <p>{detail.agent_reason}</p>
                </>
              )}
              <div className="admin-dialog-actions">
                <button
                  disabled={busy}
                  onClick={() => void control(detail, detail.enabled ? 'pause' : 'resume')}
                >
                  {detail.enabled ? 'Pause search' : 'Resume search'}
                </button>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void control(detail, detail.publish_to_careers ? 'unpublish' : 'publish')
                  }
                >
                  {detail.publish_to_careers ? 'Unpublish' : 'Publish to Careers'}
                </button>
              </div>
            </>
          )}
        </Dialog>
      )}
    </section>
  );
}
