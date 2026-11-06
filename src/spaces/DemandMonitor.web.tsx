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
    <>
      {error && (
        <p className="portal-alert" role="alert">
          {error}
          <button onClick={() => { setError(''); onChanged(); }}>Dismiss and check status</button>
        </p>
      )}
      <WeeklyCoverage data={state?.weekly_coverage} />
      <section className="agent-console" aria-label="Search agent operations">
        <header>
          <div><h2>Automatic discovery</h2><p>Demand-led planning and job collection</p></div>
          {stale && <span className="table-live is-stale" role="status">Updates interrupted</span>}
          <button className="secondary" disabled={busy || !state} onClick={() => void toggle()}>
            {busy ? 'Saving…' : state?.profiles_enabled ? 'Pause agent' : 'Enable agent'}
          </button>
        </header>
        <div className="agent-current" role="status">
          <strong>{!state ? 'Connecting to search agent…' : !state.profiles_enabled ? 'Automatic planning is paused' : state.planner_status === 'thinking' ? 'Reviewing Careers demand' : state.planner_status === 'failed' ? 'Planning needs attention' : state.planner_status === 'idle' ? 'Waiting for demand signals' : state.planner_status === 'completed' ? 'Search plan ready' : 'Waiting for the next planning cycle'}</strong>
          <p>{!state ? 'Loading the latest recorded status.' : !state.profiles_enabled ? 'Manual schedules, weekly coverage and work already queued may continue.' : state.planner_status === 'thinking' ? 'Evaluating chat requests, profile preferences, job interest and catalog coverage to select searches.' : 'The agent selects role and location searches from Careers demand. Recorded selection reasons appear in the search table below.'}</p>
        </div>
        <dl className="agent-facts">
          <div><dt>Demand combinations</dt><dd>{state?.profile_pair_count ?? '—'}</dd></div>
          <div><dt>Scheduled searches · all sources</dt><dd>{state?.active_searches ?? '—'}</dd></div>
          <div><dt>New jobs · 24h</dt><dd>{state?.new_jobs_24h ?? '—'}</dd></div>
          <div><dt>Last plan</dt><dd>{displayDate(state?.last_agent_plan)}</dd></div>
          <div><dt>Next planning cycle</dt><dd>{state?.profiles_enabled ? displayDate(state.next_agent_plan) : state ? 'Paused' : '—'}</dd></div>
        </dl>
      </section>
      {state && <p className="admin-notice" role="status">
        Collection limits: {state.collection_limits?.running ?? 1} concurrent · {state.collection_limits?.queued ?? 20} queued · {state.collection_limits?.sources ?? 400} searches.
        {state.resource_status?.available_mb !== undefined && ` Available RAM: ${state.resource_status.available_mb} MB. CPU: ${state.resource_status.cpu_percent}%.`}
        {state.resource_status?.reason && ` ${state.resource_status.reason}`}
      </p>}
      {state?.apify_budget && <p className="admin-notice">
        Monster · Apify: {state.apify_budget.configured ? `$${state.apify_budget.remaining_usd.toFixed(2)} available of $${state.apify_budget.monthly_limit_usd.toFixed(2)} this month` : 'API token not configured'}.
        {' '}Daily limit ${state.apify_budget.daily_limit_usd.toFixed(2)} · Per run ${state.apify_budget.run_limit_usd.toFixed(2)}.
        {' '}Budget includes reserved run limits; actual charges may be lower.
      </p>}
      {state && <CollectionPulse runs={state.current_run ? [state.current_run] : []} statuses={{...state.collection_status, ...state.queue_status}} healthy={state.worker_healthy} deferredReason={state.resource_status?.reason} />}
      {state?.planner_error && (
        <p className="portal-alert" role="alert">
          {state.planner_error}
        </p>
      )}
      <AdminTable resource="plans" api={api} revision={revision} />
      {state && <RecentRuns runs={state.recent_runs} onView={onViewJobs} />}
      <details className="admin-method">
        <summary>Planning method and model</summary>
        <p>
          The agent weighs chat requests, job-link activity, profile preferences and catalog
          coverage. It selects bounded searches and refresh intervals. Current decision model:{' '}
          {state?.planner_model || 'Not yet recorded'}.
        </p>
      </details>
    </>
  );
}
