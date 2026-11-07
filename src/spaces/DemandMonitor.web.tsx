import { WeeklyCoverage, type CoverageState } from './WeeklyCoverage.web';
import { useState } from 'react';
import { CollectionPulse, RecentRuns, type RunSummary } from './OperationsStatus.web';
import type { SpacesClient } from './liveApi';
import { AdminTable, displayDate } from './AdminTable.web';
export interface AgentState {
  weekly_coverage?: CoverageState;
  apify_budget?: { configured: boolean; monthly_limit_usd: number; reserved_usd: number; remaining_usd: number; daily_limit_usd: number; run_limit_usd: number };
  resource_status: { allowed?: boolean; reason?: string; available_mb?: number; cpu_percent?: number; checked_at?: string };
  collection_limits: { running: number; queued: number; sources: number };
  recent_runs: RunSummary[];
  current_run: RunSummary | null;
  queue_status: Record<string, number>;
  new_jobs_24h: number;
  worker_healthy: boolean;
  collection_status: Record<string, number>;
  active_searches: number;
  profile_pair_count: number;
  profiles_enabled: boolean;
  planner_status: string;
  planner_model: string;
  planner_error: string;
  last_agent_plan: string | null;
  next_agent_plan: string;
}
export function DemandMonitor({ api, state, stale, onChanged, onViewJobs }: {
  api: SpacesClient;
  state?: AgentState;
  stale: boolean;
  onChanged: () => void;
  onViewJobs: () => void;
}) {
  const views = ['Overview', 'Search decisions', 'Weekly coverage', 'Recent runs', 'Limits & budget'] as const;
  const [view, setView] = useState<typeof views[number]>('Overview');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  async function toggle() {
    if (!state) return;
    setBusy(true);
    try {
      await api.request('admin/collection/', 'POST', {
        action: 'profiles',
        enabled: !state.profiles_enabled,
      });
      setRevision((n) => n + 1);
      setError('');
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the agent.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="discovery-workspace">
      <style>{`
        .portal-shell main:has(.discovery-workspace){height:100dvh;display:flex;flex-direction:column;overflow:hidden}
        .discovery-workspace{display:flex;flex-direction:column;gap:12px;flex:1;min-height:0}
        .discovery-workspace .collection-pulse{margin:0;flex-shrink:0;padding:12px 16px}
        .discovery-nav{display:flex;gap:4px;flex-wrap:wrap;border-bottom:1px solid var(--line);flex-shrink:0}
        .discovery-nav button{background:transparent;color:var(--muted);border:0;border-radius:0;padding:10px 14px;border-bottom:2px solid transparent;font-size:12px}
        .discovery-nav button[aria-current=true]{color:#244f80;border-bottom-color:#244f80;font-weight:650}
        .discovery-nav button:hover{background:#e9eef5;color:#244f80}
        .discovery-nav button:focus-visible{outline:2px solid #244f80;outline-offset:-3px}
        .discovery-content{flex:1;min-height:0;overflow:auto;scrollbar-gutter:stable}
        .discovery-content>.admin-data-panel,.discovery-content>.weekly-coverage{height:100%;display:flex;flex-direction:column;margin:0}
        .discovery-content .admin-table-scroll,.discovery-content .coverage-scroll{flex:1;min-height:0;max-height:none;overflow:auto}
        .discovery-content .admin-table-footer,.discovery-content .weekly-coverage footer{flex-shrink:0}
        .discovery-content .agent-console{margin:0}
        .discovery-content .admin-method{margin-top:12px}
        .discovery-content .agent-facts{flex-wrap:wrap}
        .discovery-limits{background:white;border:1px solid var(--line);border-radius:7px;padding:20px}
        .discovery-limits h2{font-size:15px}.discovery-limits h3{font-size:13px;margin-top:24px}
        .discovery-limits p{color:var(--muted);margin-top:6px;max-width:75ch}
        .discovery-limits dl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin:20px 0}
        .discovery-limits dt{font-size:12px;color:var(--muted)}.discovery-limits dd{font-size:17px;font-weight:600;margin:4px 0;font-variant-numeric:tabular-nums}
        .agent-overview{background:white;border:1px solid var(--line);border-radius:7px;overflow:hidden}
        .agent-overview-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px;border-bottom:1px solid var(--line)}
        .agent-overview h2,.agent-coverage-summary h2{font-size:15px;margin:0}.agent-overview p,.agent-coverage-summary p{font-size:12px;color:var(--muted);margin:5px 0;max-width:65ch}
        .agent-overview-columns{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(260px,1fr)}
        .agent-plan-status,.agent-plan-timing{padding:20px}.agent-plan-timing{border-left:1px solid var(--line);background:#fafbfd}
        .agent-overview h3{font-size:14px;margin:12px 0 6px}.agent-plan-timing h3{margin-top:0}
        .agent-plan-status .table-link{margin-top:12px;padding:4px 0}
        .agent-plan-timing dl{margin:14px 0 0;display:grid;gap:12px}.agent-plan-timing dl>div{display:flex;justify-content:space-between;gap:16px}
        .agent-overview dt{color:var(--muted);font-size:12px}.agent-overview dd{margin:0;font-weight:600;font-variant-numeric:tabular-nums}
        .agent-overview-totals{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line);margin:0;padding:16px 20px;gap:20px}.agent-overview-totals dd{font-size:20px;margin-top:4px}
        .agent-coverage-summary{display:flex;align-items:center;gap:32px;padding:18px 20px;background:white;border:1px solid var(--line);border-radius:7px;margin-top:12px}
        .agent-coverage-summary>div:first-child{flex:1}.agent-coverage-summary strong{display:block;font-size:17px;font-variant-numeric:tabular-nums}.agent-coverage-summary span{font-size:11px;color:var(--muted)}
        @media(max-width:900px){.agent-overview-columns{grid-template-columns:1fr}.agent-plan-timing{border-left:0;border-top:1px solid var(--line)}.agent-coverage-summary{flex-wrap:wrap;gap:16px}.agent-overview-header{flex-wrap:wrap}.agent-overview-totals{gap:12px}}
        @media(max-width:700px){.portal-shell main:has(.discovery-workspace){height:auto;min-height:100dvh;overflow:visible}.discovery-content{min-height:360px}.discovery-content>.admin-data-panel,.discovery-content>.weekly-coverage{height:65dvh;min-height:360px}.discovery-nav button{padding:10px;font-size:11px}.discovery-limits dl{grid-template-columns:repeat(2,minmax(0,1fr))}}
      `}</style>
      {state && <CollectionPulse runs={state.current_run ? [state.current_run] : []} statuses={{...state.collection_status, ...state.queue_status}} healthy={state.worker_healthy} deferredReason={state.resource_status?.reason} />}
      <nav className="discovery-nav" aria-label="Search agent views">
        {views.map(name => <button key={name} aria-current={view === name ? 'true' : undefined} aria-controls="discovery-content" onClick={() => setView(name)}>{name}</button>)}
      </nav>
      {stale && <p role="status">Updates interrupted. Reconnecting automatically…</p>}
      {error && (
        <p className="portal-alert" role="alert">
          {error}
          <button onClick={() => { setError(''); onChanged(); }}>Dismiss and check status</button>
        </p>
      )}
      <div id="discovery-content" className="discovery-content" role="region" aria-label={view}>
      {view === 'Weekly coverage' && (state?.weekly_coverage ? <WeeklyCoverage data={state.weekly_coverage} /> : <p role="status">Weekly coverage data is not available yet.</p>)}
      {view === 'Overview' && <>
      <section className="agent-overview" aria-label="Automatic discovery overview">
        <header className="agent-overview-header">
          <div><h2>Automatic discovery</h2><p>Plans searches from Careers demand and queues jobs for collection.</p></div>
          <button className="secondary" disabled={busy || !state} onClick={() => void toggle()}>{busy ? 'Saving…' : state?.profiles_enabled ? 'Pause planning' : 'Enable planning'}</button>
        </header>
        <div className="agent-overview-columns">
          <section className="agent-plan-status">
            <span className={`admin-badge status-${state?.planner_status === 'failed' ? 'failed' : state?.profiles_enabled ? 'succeeded' : 'queued'}`}>{!state ? 'Connecting' : state.profiles_enabled ? 'Planning enabled' : 'Planning paused'}</span>
            <h3>{!state ? 'Loading agent status' : !state.profiles_enabled ? 'Demand planning is paused' : state.planner_status === 'thinking' ? 'Reviewing Careers demand' : state.planner_status === 'failed' ? 'Planning needs attention' : state.planner_status === 'completed' ? 'Search plan ready' : 'Waiting for demand signals'}</h3>
            <p>{state?.profiles_enabled ? 'Chat requests, profile preferences and job interest guide which roles and locations to search next.' : 'Manual schedules, weekly coverage and jobs already queued can still run.'}</p>
            <button className="table-link" onClick={() => setView('Search decisions')}>Review search decisions →</button>
            {state?.planner_error && <p className="portal-alert" role="alert">{state.planner_error}</p>}
          </section>
          <section className="agent-plan-timing" aria-label="Planning schedule">
            <h3>Planning schedule</h3>
            <dl><div><dt>Last plan</dt><dd>{displayDate(state?.last_agent_plan)}</dd></div><div><dt>Next cycle</dt><dd>{state?.profiles_enabled ? displayDate(state.next_agent_plan) : state ? 'Paused' : '—'}</dd></div><div><dt>Decision model</dt><dd>{state?.planner_model || 'Not recorded yet'}</dd></div></dl>
          </section>
        </div>
        <dl className="agent-overview-totals">
          <div><dt>Role & location signals</dt><dd>{state?.profile_pair_count?.toLocaleString() ?? '—'}</dd></div>
          <div><dt>Scheduled searches · all sources</dt><dd>{state?.active_searches?.toLocaleString() ?? '—'}</dd></div>
          <div><dt>New jobs · past 24 hours</dt><dd>{state?.new_jobs_24h?.toLocaleString() ?? '—'}</dd></div>
        </dl>
      </section>
      <section className="agent-coverage-summary" aria-label="Weekly collection summary">
        <div><h2>Weekly state coverage</h2><p>India and USA · {state?.weekly_coverage?.target ?? '—'} jobs per state</p></div>
        <div><strong>{state?.weekly_coverage ? `${state.weekly_coverage.states.filter(row => row.status === 'complete').length} / ${state.weekly_coverage.states.length}` : '—'}</strong><span>states complete</span></div>
        <div><strong>{state?.weekly_coverage?.states.filter(row => row.status === 'shortfall').length ?? '—'}</strong><span>below target</span></div>
        <button className="secondary" onClick={() => setView('Weekly coverage')}>View state coverage</button>
      </section>
      </>}
      {view === 'Search decisions' && <AdminTable resource="plans" api={api} revision={revision} />}
      {view === 'Recent runs' && (state ? <RecentRuns runs={state.recent_runs} onView={onViewJobs} /> : <p role="status">Loading recent runs…</p>)}
      {view === 'Limits & budget' && <section className="discovery-limits" aria-label="Collection limits and budget">
        <h2>Collection capacity</h2><p>Limits apply across weekly coverage, demand-led searches and manual collection.</p>
        <dl>
          <div><dt>Concurrent runs</dt><dd>{state?.collection_limits?.running ?? '—'}</dd></div>
          <div><dt>Queue capacity</dt><dd>{state?.collection_limits?.queued ?? '—'}</dd></div>
          <div><dt>Search limit</dt><dd>{state?.collection_limits?.sources ?? '—'}</dd></div>
          <div><dt>Available RAM</dt><dd>{state?.resource_status?.available_mb !== undefined ? `${state.resource_status.available_mb} MB` : 'Not reported'}</dd></div>
          <div><dt>CPU usage</dt><dd>{state?.resource_status?.cpu_percent !== undefined ? `${state.resource_status.cpu_percent}%` : 'Not reported'}</dd></div>
        </dl>
        {state?.resource_status?.reason && <p role="status">{state.resource_status.reason}</p>}
        <h3>Monster collection · Apify</h3>
        {state?.apify_budget ? <>
          <p>{state.apify_budget.configured ? 'Connected' : 'API token not configured'} · Budget includes reserved runs; actual charges may be lower.</p>
          <dl>{[['Monthly limit', state.apify_budget.monthly_limit_usd], ['Remaining this month', state.apify_budget.remaining_usd], ['Reserved this month', state.apify_budget.reserved_usd], ['Daily limit', state.apify_budget.daily_limit_usd], ['Per-run limit', state.apify_budget.run_limit_usd]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>${Number(value).toFixed(2)}</dd></div>)}</dl>
        </> : <p>Budget data is not available yet.</p>}
      </section>}
      </div>
    </div>
  );
}
