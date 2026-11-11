import { CollapsibleSidebar } from './CollapsibleSidebar.web';
import { confirmSignOut } from './confirmSignOut';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { appConfig } from '../services/config';
import { AdminClient, type AdminSession as Session } from './adminApi';
import { JobCollection } from './JobCollection.web';
import { AdminCopilot } from './AdminCopilot.web';
import { CollectionPulse, RecentRuns, type RunSummary } from './OperationsStatus.web';
import { AccountSettings } from './AccountSettings.web';
import { AccountDirectory } from './AccountDirectory.web';
import { AdminTable } from './AdminTable.web';
import { DemandMonitor, type AgentState } from './DemandMonitor.web';
import { OperationsCharts, type TrendPoint } from './OperationsCharts.web';
import { spacesPagePath, spacesPageSegment } from './deployment';
import { portalStyles } from './portalStyles';
import { EmployerContacts } from './EmployerContacts.web';
import { ApplicantAgent } from './ApplicantAgent.web';

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
  degraded_runs_24h: number;
  source_failures_24h: number;
  chat_status: Record<string, number>;
  model: { primary: string; fallback: string | null };
};
const pages = {
  overview: 'Overview',
  collection: 'Job data',
  applicants: 'Applicant Agent',
  contacts: 'Companies & contacts',
  planner: 'Search agents',
  users: 'Users',
  copilot: 'Admin copilot',
  activity: 'Activity log',
  settings: 'Settings',
};
type Page = keyof typeof pages;
const currentPage = (): Page => {
  const path = spacesPageSegment(location.pathname).replace(/^admin(?:\/|$)/, '') || 'overview';
  return path in pages ? (path as Page) : 'overview';
};
const failure = (e: unknown) =>
  e instanceof Error ? e.message : 'The request could not be completed.';

export function PortalConsole() {
  const api = useMemo(() => new AdminClient(appConfig().apiHost), []);
  const [session, setSession] = useState<Session>();
  const [page, setPage] = useState<Page>(currentPage);
  const [summary, setSummary] = useState<Summary>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<Date>();
  useEffect(() => {
    let active = true;
    api.onAdminSessionChange = (next) => {
      if (!active) return;
      setSummary(undefined);
      setUpdatedAt(undefined);
      setError('');
      setBusy(false);
      setRevision((value) => value + 1);
      setSession(next);
    };
    const refresh = () => {
      if (document.hidden) return;
      void api
        .request<Session>('admin/session/')
        .then((next) => {
          if (active) setSession(next);
        })
        .catch((error: unknown) => {
          if (active) setError(failure(error));
        });
    };
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = setInterval(refresh, 15000);
    return () => {
      active = false;
      api.onAdminSessionChange = undefined;
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      clearInterval(timer);
    };
  }, [api]);
  useEffect(() => {
    const back = () => setPage(currentPage());
    window.addEventListener('popstate', back);
    return () => window.removeEventListener('popstate', back);
  }, []);
  useEffect(() => {
    if (!session?.authenticated || !['overview', 'planner', 'copilot'].includes(page)) return;
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
        if (!controller.signal.aborted) timer = setTimeout(() => void refresh(), 15000);
      }
    }
    const resume = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', resume);
    void refresh();
    return () => {
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('online', resume);
      controller.abort();
      clearTimeout(timer);
    };
  }, [api, session?.authenticated, session?.userId, revision, page]);
  function navigate(next: Page) {
    setPage(next);
    history.pushState({}, '', spacesPagePath(next === 'overview' ? 'admin' : `admin/${next}`));
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
        await api.request<Session>('admin/session/', 'POST', {
          action: 'login',
          email: form.get('email'),
          password: form.get('password'),
        }),
      );
    });
  }
  const styles = <style>{portalStyles}</style>;
  if (!session)
    return (
      <div className="portal-login">
        {styles}
        <section aria-busy={!error}>
          <h1>Kormic Administration</h1>
          {error ? (
            <>
              <p role="alert">{error}</p>
              <button onClick={() => window.location.reload()}>Retry connection</button>
            </>
          ) : (
            <p role="status">Checking your session…</p>
          )}
        </section>
      </div>
    );
  if (!session.authenticated)
    return (
      <div className="portal-login">
        {styles}
        <section>
          <h1>Kormic Administration</h1>
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
              {busy ? 'Signing in…' : 'Sign in as administrator'}
            </button>
          </form>
          {error && <p role="alert">{error}</p>}
          <small>
            Restricted to authorized portal administrators. New administrators join by invitation.
          </small>
        </section>
      </div>
    );
  return (
    <div className="portal-shell" key={`${session.userId}:${revision}`}>
      {styles}
      <a className="portal-skip" href="#portal-main">
        Skip to content
      </a>
      <CollapsibleSidebar className="portal-sidebar">
        <div className="portal-brand">
          <b>
            kormic<span> / Spaces</span>
          </b>
          <small>Administration</small>
        </div>
        <nav aria-label="Administration">
          {Object.entries(pages)
            .filter(([key]) => !['settings', 'contacts', 'planner'].includes(key))
            .map(([key, label]) => (
              <button
                key={key}
                aria-current={
                  page === key || (key === 'collection' && ['contacts', 'planner'].includes(page))
                    ? 'page'
                    : undefined
                }
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
                        applicants: 'M16 7a4 4 0 1 1-8 0a4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2',
                        contacts: 'M4 21V3h12v18 M8 7h4 M8 11h4 M8 15h4 M16 9h4v12 M2 21h20',
                        planner: 'M8 3h8v4H8z M3 17h6v4H3z M15 17h6v4h-6z M12 7v5 M6 17v-5h12v5',
                        users: 'M16 7a4 4 0 1 1-8 0a4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2',
                        copilot: 'M4 4h16v12H9l-5 4z M8 8h8 M8 12h5',
                        settings: 'M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8',
                        activity: 'M5 3h14v18H5z M9 7h6 M9 12h6 M9 17h4',
                      }[key as Page]
                    }
                  />
                </svg>
                <span>{key === 'collection' ? 'Job Agent' : label}</span>
              </button>
            ))}
        </nav>
        <div className="portal-account">
          <div className="portal-profile">
            <span className="portal-profile-avatar" aria-hidden="true">
              {session.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>Administrator</strong>
              <span data-tooltip={session.name}>{session.name}</span>
              <small>OneSmarter Inc.</small>
            </div>
          </div>
          <button
            className="portal-settings-link"
            aria-current={page === 'settings' ? 'page' : undefined}
            onClick={() => navigate('settings')}
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19.17,9.81 L21.36,10.35 L21.36,13.65 L19.17,14.19 L18.62,15.52 L19.78,17.45 L17.45,19.78 L15.52,18.62 L14.19,19.17 L13.65,21.36 L10.35,21.36 L9.81,19.17 L8.48,18.62 L6.55,19.78 L4.22,17.45 L5.38,15.52 L4.83,14.19 L2.64,13.65 L2.64,10.35 L4.83,9.81 L5.38,8.48 L4.22,6.55 L6.55,4.22 L8.48,5.38 L9.81,4.83 L10.35,2.64 L13.65,2.64 L14.19,4.83 L15.52,5.38 L17.45,4.22 L19.78,6.55 L18.62,8.48 Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Settings
          </button>
          <button
            className="portal-signout"
            title="Sign out"
            aria-label="Sign out"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                if (!(await confirmSignOut())) return;
                setSession(
                  await api.request<Session>('admin/session/', 'POST', {
                    action: 'logout',
                  }),
                );
                setSummary(undefined);
              })
            }
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 4H4v16h5M14 8l4 4-4 4M8 12h12" />
            </svg>
          </button>
        </div>
      </CollapsibleSidebar>
      <main id="portal-main">
        <header className="portal-top">
          <span>
            Kormic Careers <span aria-hidden="true">/</span> Administration
          </span>
          <span className={summary?.worker_healthy ? 'portal-status good' : 'portal-status'}>
            {!summary
              ? 'Administration'
              : summary.worker_healthy
                ? 'Collector online'
                : 'Collector not reporting'}
          </span>
        </header>
        <div className="portal-title">
          <div>
            <h1>
              {['collection', 'contacts', 'planner'].includes(page) ? 'Job Agent' : pages[page]}
            </h1>
            {!['collection', 'contacts', 'planner', 'applicants', 'copilot'].includes(page) && (
              <p>
                {page === 'overview'
                  ? 'Your portal, agents and data at a glance.'
                  : page === 'contacts'
                    ? 'Review employer identity, contact purpose and source evidence.'
                    : page === 'planner'
                      ? 'Review search decisions and control automatic discovery.'
                      : page === 'users'
                        ? 'Manage Careers users, company workspaces and administrators.'
                        : page === 'settings'
                          ? 'Your administrator profile and security.'
                          : page === 'copilot'
                            ? 'Ask about portal health, collection activity and recommendation processing.'
                            : 'A record of administrative actions across the portal.'}
              </p>
            )}
          </div>
          {page === 'overview' && (
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
          )}
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
                degraded={summary.degraded_runs_24h}
                sourceFailures={summary.source_failures_24h}
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
        {['collection', 'contacts', 'planner'].includes(page) && (
          <nav
            className="admin-tabs"
            aria-label="Job Agent views"
            style={{
              marginBottom: 16,
              width: 'fit-content',
              maxWidth: '100%',
              overflowX: 'auto',
            }}
          >
            {(['collection', 'contacts', 'planner'] as const).map((tab) => (
              <button
                key={tab}
                aria-current={page === tab ? 'page' : undefined}
                onClick={() => navigate(tab)}
              >
                {pages[tab]}
              </button>
            ))}
          </nav>
        )}
        {page === 'applicants' && <ApplicantAgent api={api} key={session.userId} />}
        {page === 'collection' && <JobCollection api={api} org="admin" />}
        {page === 'planner' && (
          <DemandMonitor
            api={api}
            state={summary}
            stale={Boolean(error)}
            onChanged={() => setRevision((n) => n + 1)}
            onViewJobs={() => navigate('collection')}
          />
        )}
        {page === 'settings' && <AccountSettings api={api} />}
        {page === 'users' && <AccountDirectory api={api} />}
        {page === 'activity' && <AdminTable resource="activity" api={api} />}
        {page === 'contacts' && <EmployerContacts api={api} />}
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
