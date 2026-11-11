import { useEffect, useState } from 'react';
import type { SpacesClient } from './liveApi';
import { CandidateSearch } from './CandidateSearch.web';

type View = 'prospects' | 'coverage' | 'runs';
type Prospect = {
  id: string;
  name?: string;
  headline?: string;
  location?: string;
  email?: string;
  profile_url?: string;
  skills?: string[];
  review_status?: string;
  possible_person_id?: number;
  country?: string;
  state?: string;
  total?: number;
  target?: number;
  attempts?: number;
  status?: string;
  reason?: string;
  query?: string;
  accepted?: number;
  fetched?: number;
  error?: string;
  started_at?: string;
  collected_at?: string;
};
type Result = {
  count: number;
  results: Prospect[];
  summary: {
    enabled: boolean;
    roles: string[];
    sources: string[];
    week: string;
    states: number;
    complete: number;
    collected: number;
    worker_healthy: boolean;
    configuration_error: string;
    last_error: string;
    trends: { role: string; jobs: number; previous: number; growth: number }[];
  };
};

export function ApplicantAgent({ api }: { api: SpacesClient }) {
  const [view, setView] = useState<View>('prospects');
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('');
  const [order, setOrder] = useState('newest');
  const [offset, setOffset] = useState(0);
  const [result, setResult] = useState<Result>();
  const [resultView, setResultView] = useState<View>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [roles, setRoles] = useState<string>();
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let inFlight = false;
    setLoading(true);
    async function load() {
      if (inFlight || controller.signal.aborted) return;
      inFlight = true;
      try {
        const params = new URLSearchParams({
          view,
          q: query,
          country,
          order,
          offset: String(offset),
        });
        const next = await api.request<Result>(
          `admin/applicant-agent/?${params}`,
          'GET',
          undefined,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setResult(next);
        setResultView(view);
        setError('');
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : 'Unable to load applicant collection.');
      } finally {
        inFlight = false;
        if (!controller.signal.aborted) {
          setLoading(false);
          timer = setTimeout(() => {
            if (!document.hidden) void load();
          }, 15000);
        }
      }
    }
    const initial = setTimeout(() => void load(), 300);
    const resume = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        void load();
      }
    };
    document.addEventListener('visibilitychange', resume);
    return () => {
      clearTimeout(initial);
      clearTimeout(timer);
      controller.abort();
      document.removeEventListener('visibilitychange', resume);
    };
  }, [api, view, query, country, order, offset, revision]);

  async function save(path: string, method: 'PATCH' | 'POST', body: unknown) {
    setBusy(true);
    setSaveError('');
    try {
      await api.request(path, method, body);
      setRevision((n) => n + 1);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Unable to save. Please retry.');
    } finally {
      setBusy(false);
    }
  }
  const summary = result?.summary;
  return (
    <section className="applicant-agent" aria-label="Applicant Agent">
      <style>{`
      .applicant-agent{display:grid;gap:14px}.applicant-status{display:flex;align-items:center;flex-wrap:wrap;gap:12px 24px;padding:14px 16px;background:#fff;border:1px solid var(--line);border-radius:7px}.applicant-status>div{display:grid;gap:3px}.applicant-status strong{font-size:18px;font-variant-numeric:tabular-nums}.applicant-status button{margin-left:auto}.applicant-agent .admin-toolbar{flex-wrap:wrap;justify-content:flex-start}.applicant-agent .admin-toolbar input{width:min(420px,100%)}.applicant-agent details{padding:14px 16px;background:white;border:1px solid var(--line);border-radius:7px}.applicant-agent details>div{display:grid;gap:12px;margin-top:12px}.applicant-agent textarea{width:100%;min-height:72px}.applicant-notice{background:#fff8e9;border:1px solid #decba3;color:#72511e;border-radius:6px;padding:12px 16px}.applicant-trends{display:flex;gap:8px;flex-wrap:wrap}.applicant-trends span{border:1px solid var(--line);padding:6px 9px;border-radius:5px}.applicant-agent .admin-tabs{width:fit-content;max-width:100%;overflow:auto}.applicant-agent .admin-table{table-layout:fixed}.applicant-agent .admin-table td{vertical-align:top}.applicant-agent .admin-table td button{margin:3px 6px 3px 0}.applicant-agent .admin-table-footer{justify-content:space-between}
    `}</style>
      <CandidateSearch api={api} />
      <div className="applicant-status">
        <div>
          <span>Weekly target</span>
          <strong>100 per state</strong>
        </div>
        <div>
          <span>India + United States</span>
          <strong>78 states</strong>
        </div>
        <div>
          <span>Collected this week</span>
          <strong>{summary?.collected.toLocaleString() ?? '—'} / 7,800</strong>
        </div>
        <div>
          <span>States at target</span>
          <strong>{summary?.complete ?? '—'} / 78</strong>
        </div>
        <div>
          <span>{summary?.worker_healthy ? 'Worker connected' : 'Worker not reporting'}</span>
          <small>Week of {summary?.week ?? '—'} · Monday–Sunday UTC</small>
        </div>
        {summary && (
          <button
            disabled={busy}
            className="secondary"
            onClick={() =>
              void save('admin/applicant-agent/', 'PATCH', {
                enabled: !summary.enabled,
              })
            }
          >
            {summary.enabled ? 'Pause collection' : 'Resume collection'}
          </button>
        )}
      </div>
      {summary?.configuration_error && (
        <div className="applicant-notice" role="status">
          <strong>Source setup required</strong>
          <p>
            {summary.configuration_error} Collection starts automatically when sources and the
            worker are ready.
          </p>
        </div>
      )}
      {summary?.last_error && !summary.configuration_error && (
        <div className="applicant-notice" role="status">
          {summary.last_error}
        </div>
      )}
      {error && (
        <div className="portal-alert" role="alert">
          {error}
          <button onClick={() => setRevision((n) => n + 1)}>Retry</button>
        </div>
      )}
      {saveError && (
        <div className="portal-alert" role="alert">
          {saveError}
        </div>
      )}
      <nav className="admin-tabs" aria-label="Applicant Agent views">
        {(['prospects', 'coverage', 'runs'] as const).map((tab) => (
          <button
            key={tab}
            aria-current={view === tab ? 'page' : undefined}
            onClick={() => {
              setView(tab);
              setOffset(0);
            }}
          >
            {
              {
                prospects: 'Prospects',
                coverage: 'Weekly coverage',
                runs: 'Search history',
              }[tab]
            }
          </button>
        ))}
      </nav>
      <section className="admin-data-panel" aria-busy={loading}>
        <div className="admin-toolbar">
          <input
            type="search"
            aria-label="Search applicant collection"
            placeholder="Search profiles, skills, locations or status…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOffset(0);
            }}
          />
          <select
            aria-label="Country"
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">Both countries</option>
            <option value="india">India</option>
            <option value="usa">United States</option>
          </select>
          {view === 'prospects' && (
            <select
              aria-label="Sort prospects"
              value={order}
              onChange={(e) => {
                setOrder(e.target.value);
                setOffset(0);
              }}
            >
              <option value="newest">Recently collected</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A–Z</option>
            </select>
          )}
          <span role="status">{loading ? 'Updating…' : `${result?.count ?? 0} results`}</span>
        </div>
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                {(view === 'prospects'
                  ? ['Prospect / source', 'Skills & location', 'Contact / identity', 'Review']
                  : view === 'coverage'
                    ? ['State', 'Progress', 'Status', 'Next steps']
                    : ['Search', 'Started', 'Result', 'Status']
                ).map((label) => (
                  <th key={label} scope="col">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resultView !== view || !result?.results.length ? (
                <tr>
                  <td colSpan={4} className="table-empty">
                    {loading || resultView !== view
                      ? 'Loading…'
                      : view === 'prospects'
                        ? 'No external prospects yet. Collected profiles will appear here with their source evidence.'
                        : 'No records yet. The worker initializes coverage and records each search.'}
                  </td>
                </tr>
              ) : (
                result.results.map((row) => (
                  <tr key={row.id}>
                    {view === 'prospects' ? (
                      <>
                        <td className="primary-cell">
                          <strong>{row.name}</strong>
                          <small>{row.headline}</small>
                          <a href={row.profile_url} target="_blank" rel="noopener noreferrer">
                            View source profile
                          </a>
                        </td>
                        <td>
                          {row.skills?.join(', ') || 'No skills published'}
                          <small>{row.location}</small>
                        </td>
                        <td>
                          {row.email || 'No contact published'}
                          <small>{row.email ? 'Published email · Not verified' : ''}</small>
                          <small>
                            {row.possible_person_id
                              ? 'Possible Careers account match — review required'
                              : 'External prospect · Not an application'}
                          </small>
                        </td>
                        <td>
                          <span className="admin-badge">{row.review_status}</span>
                          <div>
                            <button
                              className="table-link"
                              disabled={busy || loading || row.review_status === 'reviewed'}
                              onClick={() =>
                                void save(`admin/applicant-agent/${row.id}/review/`, 'POST', {
                                  status: 'reviewed',
                                })
                              }
                            >
                              Mark reviewed
                            </button>
                            <button
                              className="table-link"
                              disabled={busy || loading || row.review_status === 'suppressed'}
                              onClick={() =>
                                void save(`admin/applicant-agent/${row.id}/review/`, 'POST', {
                                  status: 'suppressed',
                                })
                              }
                            >
                              Exclude
                            </button>
                          </div>
                        </td>
                      </>
                    ) : view === 'coverage' ? (
                      <>
                        <td className="primary-cell">
                          {row.state}
                          <small>{row.country === 'india' ? 'India' : 'United States'}</small>
                        </td>
                        <td>
                          <strong>
                            {row.total} / {row.target}
                          </strong>
                          <small>{row.attempts} search batches</small>
                        </td>
                        <td>
                          <span className="admin-badge">{row.status}</span>
                        </td>
                        <td>
                          {row.reason ||
                            'Scheduled automatically; profiles must have matching state evidence.'}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="primary-cell">{row.query}</td>
                        <td>{row.started_at ? new Date(row.started_at).toLocaleString() : '—'}</td>
                        <td>
                          {row.accepted} added
                          <small>{row.fetched} extracted</small>
                        </td>
                        <td>
                          <span className="admin-badge">{row.status}</span>
                          <small>{row.error}</small>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <footer className="admin-table-footer">
          <span>
            {result?.count
              ? `${offset + 1}–${Math.min(offset + 20, result.count)} of ${result.count}`
              : '0 results'}
          </span>
          <nav aria-label="Results pages">
            <button
              className="secondary"
              disabled={!offset || loading}
              onClick={() => setOffset(Math.max(0, offset - 20))}
            >
              Previous
            </button>
            <button
              className="secondary"
              disabled={loading || offset + 20 >= (result?.count ?? 0)}
              onClick={() => setOffset(offset + 20)}
            >
              Next
            </button>
          </nav>
        </footer>
      </section>
      <details>
        <summary>Search strategy and sources</summary>
        <div>
          <p>
            The agent rotates through every state and combines your roles with rising job titles in
            the collected catalog. It searches automatically and stops counting at 100 distinct
            profiles per state each week. This is a target, not a guarantee.
          </p>
          <p>
            Coverage includes India’s 28 states and the 50 US states. Territories and union
            territories are not included. Profile URLs and published name/email pairs are
            deduplicated; uncertain identity matches need review.
          </p>
          <label>
            Seed roles — one per line
            <textarea
              value={roles ?? summary?.roles.join('\n') ?? ''}
              onChange={(e) => setRoles(e.target.value)}
            />
          </label>
          <button
            disabled={busy || roles === undefined || !roles.trim()}
            onClick={() =>
              void save('admin/applicant-agent/', 'PATCH', {
                roles: roles?.split('\n').filter((r) => r.trim()),
              })
            }
          >
            Save search roles
          </button>
          <p>Approved sources: {summary?.sources.join(', ') || 'Not configured'}</p>
          <strong>Rising roles in our catalog · Last 7 days versus previous 7 days</strong>
          <div className="applicant-trends">
            {summary?.trends.length ? (
              summary.trends.map((t) => (
                <span key={t.role}>
                  {t.role} · {t.jobs} jobs ({t.growth >= 0 ? '+' : ''}
                  {t.growth})
                </span>
              ))
            ) : (
              <p>No catalog trends yet; the agent uses seed roles.</p>
            )}
          </div>
          <p>
            Collection does not create Careers accounts, submit applications or send messages.
            Extracted claims remain unverified until reviewed.
          </p>
        </div>
      </details>
    </section>
  );
}
