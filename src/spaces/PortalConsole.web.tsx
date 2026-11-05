import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { appConfig } from '../services/config';
import { SpacesClient } from './liveApi';
import { JobCollection } from './JobCollection.web';
import { AdminCopilot } from './AdminCopilot.web';
import { CollectionPulse, RecentRuns, type RunSummary } from './OperationsStatus.web';
import { AdminTable } from './AdminTable.web';
import { DemandMonitor, type AgentState } from './DemandMonitor.web';
import { OperationsCharts, type TrendPoint } from './OperationsCharts.web';
import { spacesPagePath, spacesPageSegment } from './deployment';
import { portalStyles } from './portalStyles';

type Session = { authenticated: boolean; name: string };
type Summary = AgentState & {
  recent_runs: RunSummary[];
  current_run: RunSummary | null;
  queue_status: Record<string, number>;
  trend: TrendPoint[];
  top_locations: { location: string; total: number }[];
  users: number;
  jobs: number;
  new_jobs_24h: number;
  active_searches: number;
  worker_healthy: boolean;
  worker_seen_at: string | null;
  profiles_enabled: boolean;
  last_profile_sync: string | null;
  profile_pair_count: number;
  profile_pairs_omitted: number;
  collection_status: Record<string, number>;
  chat_status: Record<string, number>;
  model: { primary: string; fallback: string | null };
};
const pages = {
  overview: 'Overview',
  collection: 'Job data',
  planner: 'Search agents',
  users: 'Users',
  copilot: 'Admin copilot',
  activity: 'Activity log',
};
type Page = keyof typeof pages;
const currentPage = (): Page => {
  const path = spacesPageSegment(location.pathname);
  return path in pages ? (path as Page) : 'overview';
};
const failure = (e: unknown) =>
  e instanceof Error ? e.message : 'The request could not be completed.';

export function PortalConsole() {
  const api = useMemo(() => new SpacesClient(appConfig().apiHost), []);
  const [session, setSession] = useState<Session>();
  const [page, setPage] = useState<Page>(currentPage);
  const [summary, setSummary] = useState<Summary>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<Date>();
  useEffect(() => {
    const controller = new AbortController();
    api
      .request<Session>('session/', 'GET', undefined, controller.signal)
      .then(setSession)
      .catch((e) => {
        if (!controller.signal.aborted) setError(failure(e));
      });
    return () => controller.abort();
  }, [api]);
  useEffect(() => {
    const back = () => setPage(currentPage());
    window.addEventListener('popstate', back);
    return () => window.removeEventListener('popstate', back);
  }, []);
  useEffect(() => {
    if (!session?.authenticated) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let inFlight = false;
    async function refresh() {
      if (inFlight || controller.signal.aborted) return;
      clearTimeout(timer);
      if (document.hidden) return;
      inFlight = true;
      try {
        const value = await api.request<Summary>(
          'admin/overview/',
          'GET',
          undefined,
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setSummary(value);
          setUpdatedAt(new Date());
          setError('');
        }
      } catch (e) {
        if (!controller.signal.aborted) setError(failure(e));
      } finally {
        inFlight = false;
        if (!controller.signal.aborted) timer = setTimeout(() => void refresh(), 5000);
      }
    }
    const resume = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', resume);
    void refresh();
    return () => {
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('online', resume);
      controller.abort();
      clearTimeout(timer);
    };
  }, [api, session?.authenticated, revision]);
  function navigate(next: Page) {
    setPage(next);
    history.pushState({}, '', spacesPagePath(next));
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(failure(e));
    } finally {
      setBusy(false);
    }
  }
  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run(async () => {
      setSession(
        await api.request<Session>('session/', 'POST', {
          action: 'login',
          email: form.get('email'),
          password: form.get('password'),
        }),
      );
    });
  }
  const styles = <style>{portalStyles}</style>;
  if (!session?.authenticated)
    return (
      <div className="portal-login">
        {styles}
        <section>
          <span className="portal-eyebrow">KORMIC / ADMINISTRATION</span>
          <h1>Spaces</h1>
          <p>The control room for Kormic Careers.</p>
          <form onSubmit={signIn}>
            <label>
              Admin email
              <input name="email" type="email" autoComplete="username" required />
            </label>
            <label>
              Password
              <input name="password" type="password" autoComplete="current-password" required />
            </label>
            <button disabled={busy || !session} type="submit">
              {busy ? 'Signing in…' : 'Sign in to Spaces'}
            </button>
          </form>
          {error && <p role="alert">{error}</p>}
          <small>
            Restricted to authorized portal administrators. Accounts are provisioned by an operator.
          </small>
        </section>
      </div>
    );
  return (
    <div className="portal-shell">
      {styles}
      <a className="portal-skip" href="#portal-main">
        Skip to content
      </a>
      <aside className="portal-sidebar">
        <div className="portal-brand">
          <b>
            kormic<span> / Spaces</span>
          </b>
          <small>Administration</small>
        </div>
        <nav aria-label="Administration">
          {Object.entries(pages).map(([key, label]) => (
            <button
              key={key}
              aria-current={page === key ? 'page' : undefined}
              onClick={() => navigate(key as Page)}
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path
                  d={
                    {
                      overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
                      collection: 'M4 7h16v14H4z M8 7V3h8v4 M4 12h16 M10 12v3h4v-3',
                      planner: 'M8 3h8v4H8z M3 17h6v4H3z M15 17h6v4h-6z M12 7v5 M6 17v-5h12v5',
                      users: 'M16 7a4 4 0 1 1-8 0a4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2',
                      copilot: 'M4 4h16v12H9l-5 4z M8 8h8 M8 12h5',
                      activity: 'M5 3h14v18H5z M9 7h6 M9 12h6 M9 17h4',
                    }[key as Page]
                  }
                />
              </svg>
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="portal-account">
          <small>Signed in as</small>
          <span>{session.name}</span>
          <button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                setSession(await api.request<Session>('session/', 'POST', { action: 'logout' }));
                setSummary(undefined);
              })
            }
          >
            Sign out
          </button>
        </div>
      </aside>
      <main id="portal-main">
        <header className="portal-top">
          <span>
            Kormic Careers <span aria-hidden="true">/</span> Administration
          </span>
          <span className={summary?.worker_healthy ? 'portal-status good' : 'portal-status'}>
            {summary?.worker_healthy ? 'Collector online' : 'Collector not reporting'}
          </span>
        </header>
        <div className="portal-title">
          <div>
            <h1>{pages[page]}</h1>
            <p>
              {page === 'overview'
                ? 'Your portal, agents and data at a glance.'
                : page === 'collection'
                  ? 'Browse collected jobs, collection history and search schedules.'
                  : page === 'planner'
                    ? 'Review search decisions and control automatic discovery.'
                    : page === 'users'
                      ? 'Monitor registered Careers users and their selected roles.'
                      : page === 'copilot'
                        ? 'Ask about portal health, collection activity and recommendation processing.'
                        : 'A record of administrative actions across the portal.'}
            </p>
          </div>
          <div className="page-status">
            <span className={summary?.worker_healthy ? 'portal-status good' : 'portal-status'}>
              {summary?.worker_healthy ? 'Worker connected' : 'Worker not reporting'}
            </span>
            <small>
              {updatedAt
                ? `Updated ${updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                : 'Connecting…'}
            </small>
          </div>
        </div>
        {error && (
          <div className="portal-alert" role="alert">
            {error}
            <button onClick={() => setRevision((n) => n + 1)}>Retry</button>
          </div>
        )}
        {page === 'overview' &&
          (!summary ? (
            <p role="status">Loading portal status…</p>
          ) : (
            <>
              <section className="portal-metrics" aria-label="Portal metrics">
                {[
                  ['Careers users', summary.users],
                  ['Collected jobs', summary.jobs],
                  ['Active searches', summary.active_searches],
                  ['New jobs · 24h', summary.new_jobs_24h ?? 0],
                ].map(([label, value]) => (
                  <article key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </article>
                ))}
              </section>
              <CollectionPulse
                runs={summary.current_run ? [summary.current_run] : []}
                statuses={{
                  ...summary.collection_status,
                  running: summary.queue_status?.running ?? 0,
                  queued: summary.queue_status?.queued ?? 0,
                }}
                healthy={summary.worker_healthy}
                deferredReason={summary.resource_status?.reason}
              />
              <OperationsCharts
                trend={summary.trend}
                locations={summary.top_locations}
                status={summary.collection_status}
              />
              <RecentRuns runs={summary.recent_runs ?? []} onView={() => navigate('collection')} />
              <div className="admin-health-strip">
                <span>
                  Collector{' '}
                  <strong>{summary.worker_healthy ? 'Operational' : 'Not reporting'}</strong>
                </span>
                <span>
                  Chat requests - 24h{' '}
                  <strong>
                    {Object.values(summary.chat_status).reduce((total, count) => total + count, 0)}
                  </strong>
                </span>
                <button className="table-link" onClick={() => navigate('planner')}>
                  View agent activity →
                </button>
              </div>
            </>
          ))}
        {page === 'collection' && summary && (
          <CollectionPulse
            runs={summary.current_run ? [summary.current_run] : []}
            statuses={{
              ...summary.collection_status,
              running: summary.queue_status?.running ?? 0,
              queued: summary.queue_status?.queued ?? 0,
            }}
            healthy={summary.worker_healthy}
                deferredReason={summary.resource_status?.reason}
          />
        )}
        {page === 'collection' && <JobCollection api={api} org="admin" />}
        {page === 'planner' && <DemandMonitor api={api} state={summary} stale={Boolean(error)} onChanged={() => setRevision((n) => n + 1)} onViewJobs={() => navigate('collection')} />}
        {page === 'users' && <AdminTable resource="users" api={api} />}
        {page === 'activity' && <AdminTable resource="activity" api={api} />}
        <AdminCopilot
          api={api}
          visible={page === 'copilot'}
          model={summary?.model.primary}
          jobs={summary?.jobs}
          users={summary?.users}
        />
      </main>
    </div>
  );
}
