import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { SpacesClient } from './liveApi';
export type Resource =
  | 'catalog'
  | 'runs'
  | 'sources'
  | 'plans'
  | 'users'
  | 'activity'
  | 'companies'
  | 'admins'
  | 'admin_invites';
export interface Row {
  name?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  is_active?: boolean;
  status_label?: string;
  verification_status?: string;
  member_count?: number;
  last_activity?: string;
  last_login?: string;
  date_joined?: string;
  company_name?: string;
  account_label?: string;
  expires_at?: string;
  id?: string | number;
  published?: boolean;
  latest_status?: string;
  latest_fetched?: number;
  latest_finished?: string;
  person_id?: string;
  title?: string;
  company?: string;
  source?: string;
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
  degraded?: boolean;
  source_failure_count?: number;
  parameters?: {
    query?: string;
    location?: string;
    source_results?: Record<
      string,
      {
        status: string;
        fetched: number;
        reason?: string;
        cost_usd?: number;
        reserved_usd?: number;
        filtered?: number;
      }
    >;
  };
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
  companies: 'Company workspaces',
  admins: 'Administrators',
  admin_invites: 'Pending invitations',
};
const columns: Record<Resource, string[]> = {
  catalog: [
    'Job title',
    'Company',
    'Location',
    'Platform',
    'Posted',
    'Last collected',
    'Visibility',
    '',
  ],
  runs: ['Search', 'Status', 'Results', 'Added', 'Queued', ''],
  sources: ['Search', 'Type', 'Status', 'Frequency', 'Next run', 'Latest run', ''],
  plans: ['Search', 'Status', 'Demand', 'Frequency', 'Next run', 'Latest run', ''],
  users: ['User', 'Selected role', 'Location', 'Status', 'Joined', ''],
  companies: ['Company', 'Owner email', 'Status', 'Members', 'Last activity', 'Created', ''],
  admins: ['Name', 'Email', 'Company', 'Account type', 'Status', 'Last sign-in', 'Joined', ''],
  admin_invites: ['Name', 'Email', 'Status', 'Invited', 'Expires', ''],
  activity: ['Action', 'Actor', 'Company', 'Account type', 'Date'],
};
const columnSorts: Record<Resource, string[]> = {
  catalog: ['name', 'company', 'location', 'platform', 'posted', 'recent', 'visibility', ''],
  runs: ['name', 'status', 'results', 'added', 'recent', ''],
  sources: ['name', 'type', 'status', 'frequency', 'next', 'outcome', ''],
  plans: ['name', 'status', 'priority', 'frequency', 'next', 'outcome', ''],
  users: ['name', 'role', 'location', 'status', 'recent', ''],
  companies: ['name', 'email', 'status', 'members', 'activity', 'recent', ''],
  admins: ['name', 'email', 'company', 'account', 'status', 'activity', 'recent', ''],
  admin_invites: ['name', 'email', 'status', 'recent', 'expires', ''],
  activity: ['action', 'actor', 'company', 'account', 'recent'],
};
const tableWidths: Partial<Record<Resource, number[]>> = {
  activity: [35, 21, 20, 10, 14],
  users: [30, 18, 14, 10, 18, 10],
  companies: [20, 21, 10, 7, 16, 16, 10],
  admins: [16, 22, 14, 9, 8, 11, 11, 9],
  admin_invites: [20, 25, 12, 16, 17, 10],
};
const accountLabel = (value?: string) =>
  ({
    admin: 'Admin',
    company: 'Company user',
    careers: 'Careers user',
    unknown: 'Not recorded',
  })[value || 'unknown'] || value;
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
  onManage,
}: {
  api: SpacesClient;
  resource: Resource;
  revision?: number;
  onManage?: (row: Row) => void;
}) {
  const [page, setPage] = useState(1),
    [size, setSize] = useState(10),
    [draft, setDraft] = useState(''),
    [query, setQuery] = useState(''),
    [sort, setSort] = useState(defaultSort(resource)),
    [direction, setDirection] = useState<'asc' | 'desc'>(resource === 'sources' ? 'asc' : 'desc');
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(draft.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [draft]);
  const [platform, setPlatform] = useState('');
  const [company, setCompany] = useState('');
  const [accountType, setAccountType] = useState('');
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
          `admin/table/${resource}/?${new URLSearchParams({ page: String(page), page_size: String(size), q: query, sort, direction, platform, company_q: company, account_type: accountType })}`,
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
          timer = setTimeout(() => void load(), 30000);
        }
      }
    }
    const resume = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', resume);
    void load();
    return () => {
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('online', resume);
      controller.abort();
      clearTimeout(timer);
    };
  }, [
    api,
    resource,
    page,
    size,
    query,
    sort,
    direction,
    refresh,
    revision,
    company,
    accountType,
    platform,
  ]);
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
      await api.request('admin/collection/', 'POST', {
        action,
        source_id: row.id,
      });
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
    (row.degraded ? 'Partial success' : row.status) ??
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
          <td>
            {(
              {
                linkedin: 'LinkedIn',
                indeed: 'Indeed',
                monster: 'Monster',
              } as Record<string, string>
            )[row.source ?? ''] ?? '—'}
          </td>
          <td className="nowrap">{displayDate(row.posted_date)}</td>
          <td className="nowrap">
            <time dateTime={row.last_seen_at}>
              {displayDate(row.last_seen_at)
                .split(', ')
                .map((part, index) => (
                  <span key={index}>{part}</span>
                ))}
            </time>
          </td>
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
            {resource === 'plans' && (
              <small className="agent-selection-reason">
                {row.agent_reason || 'No selection reason recorded yet.'}
              </small>
            )}
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
          <td>
            {['one_time', 'on_demand'].includes(row.origin ?? '')
              ? 'Once'
              : `${row.interval_minutes} min`}
          </td>
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
    if (resource === 'companies')
      return (
        <>
          <td className="primary-cell">{row.name}</td>
          <td>{row.email || 'Not recorded'}</td>
          <td>{row.verification_status}</td>
          <td>{row.member_count}</td>
          <td>{displayDate(row.last_activity)}</td>
          <td>{displayDate(row.created_at)}</td>
          <td>
            {onManage && (
              <button className="table-link" onClick={() => onManage(row)}>
                Manage
              </button>
            )}
          </td>
        </>
      );
    if (resource === 'admins' || resource === 'admin_invites')
      return (
        <>
          <td className="primary-cell">
            {row.full_name?.trim() || row.display_name || 'Name not recorded'}
          </td>
          <td>{row.email}</td>
          {resource === 'admins' && (
            <>
              <td>{row.company_name}</td>
              <td>{accountLabel(row.account_label)}</td>
            </>
          )}
          <td>{badge(row.status_label || '')}</td>
          <td>{displayDate(resource === 'admins' ? row.last_login : row.created_at)}</td>
          <td>{displayDate(resource === 'admins' ? row.date_joined : row.expires_at)}</td>
          <td>
            {onManage && (
              <button className="table-link" onClick={() => onManage(row)}>
                {resource === 'admins' ? 'Manage' : 'Revoke'}
              </button>
            )}
          </td>
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
          <td>{badge(row.status_label || '')}</td>
          <td className="nowrap">{displayDate(row.created_at)}</td>
          <td>
            {onManage && (
              <button className="table-link" onClick={() => onManage(row)}>
                Manage
              </button>
            )}
          </td>
        </>
      );
    return (
      <>
        <td className="primary-cell">{row.text}</td>
        <td>{row.actor_name || 'Not recorded'}</td>
        <td>{row.company_name}</td>
        <td>{accountLabel(row.account_label)}</td>
        <td className="nowrap">{displayDate(row.created_at)}</td>
      </>
    );
  }
  const current = data?.page ?? page,
    total = data?.pages ?? 1;
  return (
    <section className="admin-data-panel" aria-label={titles[resource]}>
      <div className="admin-table-heading">
        <h2>
          {titles[resource]}{' '}
          {data && <span className="table-total">{data.count.toLocaleString()}</span>}
        </h2>
        {error && (
          <span className="table-live is-stale" role="status">
            Updates interrupted · retrying
          </span>
        )}
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
            placeholder="Search all columns"
          />
        </form>
        {resource === 'catalog' && (
          <label>
            Platform
            <select
              value={platform}
              onChange={(e) => {
                setPlatform(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All platforms</option>
              <option value="linkedin">LinkedIn</option>
              <option value="indeed">Indeed</option>
              <option value="monster">Monster</option>
            </select>
          </label>
        )}
        {resource === 'activity' && (
          <>
            <label>
              Company
              <input
                type="search"
                placeholder="Filter company name"
                value={company}
                maxLength={160}
                onChange={(e) => {
                  setCompany(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label>
              Account type
              <select
                value={accountType}
                onChange={(e) => {
                  setAccountType(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All account types</option>
                <option value="careers">Careers user</option>
                <option value="company">Company user</option>
                <option value="admin">Administrator</option>
                <option value="unknown">Not recorded</option>
              </select>
            </label>
          </>
        )}
        <span className="table-count">
          {loading
            ? 'Updating…'
            : updatedAt
              ? `Synced ${updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
              : 'No data'}
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
      <div
        className="admin-table-scroll"
        aria-busy={loading}
        tabIndex={0}
        role="region"
        aria-label={`${titles[resource]} table`}
      >
        <table
          className={`admin-table${resource === 'catalog' ? ' catalog-table' : ''}${tableWidths[resource] ? ' fixed-account-table' : ''}`}
        >
          <caption className="sr-only">{titles[resource]}</caption>
          {tableWidths[resource] && (
            <colgroup>
              {tableWidths[resource]!.map((width, index) => (
                <col key={index} style={{ width: `${width}%` }} />
              ))}
            </colgroup>
          )}
          {resource === 'catalog' && (
            <colgroup>
              {[24, 14, 16, 9, 9, 13, 8, 7].map((width, index) => (
                <col key={index} style={{ width: `${width}%` }} />
              ))}
            </colgroup>
          )}
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
                /^https:\/\/(?:www\.linkedin\.com\/jobs\/view\/\d+\/|www\.indeed\.com\/viewjob\?jk=[A-Za-z0-9_-]{1,100}|www\.monster\.com\/job-openings\/[A-Za-z0-9_-]{1,1500})$/.test(
                  detail.url,
                ) && (
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
              {detail.parameters?.source_results && (
                <dl>
                  {Object.entries(detail.parameters.source_results).map(([site, result]) => (
                    <div key={site}>
                      <dt>{site}</dt>
                      <dd>
                        {result.status} · {result.fetched} retrieved
                        {result.filtered !== undefined && ` · ${result.filtered} filtered`}
                        {result.cost_usd !== undefined &&
                          ` · $${result.cost_usd.toFixed(5)} charged`}
                        {result.reserved_usd !== undefined &&
                          ` · $${result.reserved_usd.toFixed(2)} reserved`}
                        {result.reason && ` · ${result.reason.replaceAll('_', ' ')}`}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
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
