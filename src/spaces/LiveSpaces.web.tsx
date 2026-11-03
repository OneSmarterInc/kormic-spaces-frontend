import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { spacesPagePath, spacesPageSegment } from './deployment';
import { appConfig } from '../services/config';
import {
  SpacesClient,
  type Conversation,
  type LiveCandidate,
  type LiveJob,
  type SessionData,
  type SharedView,
  type WorkspaceData,
} from './liveApi';
import { isThemeId, themes, type ThemeId } from './themes';

function formValues(form: HTMLFormElement): Record<string, string> {
  const data = new FormData(form);
  return Object.fromEntries(
    ['name', 'company', 'email', 'password', 'role'].map((key) => [
      key,
      String(data.get(key) ?? ''),
    ]),
  );
}
const stages = ['New', 'In review', 'Shortlisted', 'Interview', 'Accepted', 'Rejected'];
const pages = [
  'Overview',
  'Jobs',
  'Candidates',
  'Pipeline',
  'Messages',
  'Hiring copilot',
  'Settings',
];
const paths = ['', 'jobs', 'candidates', 'pipeline', 'messages', 'copilot', 'settings'];
const labelDate = (s: string) => new Date(s).toLocaleString();
const errorText = (e: unknown) =>
  e instanceof Error ? e.message : 'The request could not be completed.';
const emptyJob: LiveJob = {
  id: '',
  title: '',
  department: '',
  location: '',
  work: 'Hybrid',
  type: 'Full-time',
  salary: '',
  description: '',
  skills: [],
  years: 0,
  threshold: 70,
  hardSkills: false,
  hardYears: false,
  availableDays: 90,
  weights: [50, 25, 15, 10],
  status: 'Draft',
  revision: 1,
};
function pageFromUrl() {
  return pages[paths.indexOf(spacesPageSegment(location.pathname))] ?? 'Overview';
}
function Button({
  children,
  onClick,
  primary = false,
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`btn ${primary ? 'primary' : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
function Tag({ children }: { children: ReactNode }) {
  return <span className="tag">{children}</span>;
}
function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <h3>Nothing here yet</h3>
      <p>{children}</p>
    </div>
  );
}
function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="live-dialog"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <Button onClick={close}>Close ×</Button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}
function Search({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <input
      className="live-search"
      type="search"
      aria-label={label}
      placeholder={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function LiveSpaces({ host }: { host: HTMLDivElement }) {
  const api = useMemo(() => new SpacesClient(appConfig().apiHost), []);
  const [session, setSession] = useState<SessionData>();
  const [data, setData] = useState<WorkspaceData>();
  const [page, setPage] = useState(pageFromUrl);
  const [jobId, setJobId] = useState(new URLSearchParams(location.search).get('job') ?? '');
  const [query, setQuery] = useState('');
  const [jobQuery, setJobQuery] = useState('');
  const [sort, setSort] = useState('-fit');
  const [stageFilter, setStageFilter] = useState('');
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [tableLimit, setTableLimit] = useState(50);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<LiveJob>();
  const [profileId, setProfileId] = useState('');
  const [threads, setThreads] = useState<Conversation[]>([]);
  const [threadId, setThreadId] = useState('');
  const [contactId, setContactId] = useState('');
  const [copilotPrompt, setCopilotPrompt] = useState('');
  const [answers, setAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [contextOpen, setContextOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem('spaces-theme');
      return isThemeId(saved) ? saved : 'iris';
    } catch {
      return 'iris';
    }
  });
  const org = session?.organizations[0]?.id;
  const job = data?.jobs.find((j) => j.id === jobId) ?? data?.jobs[0];
  const profile = data?.candidates.find((c) => c.id === profileId);
  const requestVersion = useRef(0);
  const reload = useCallback(
    async (selected?: string) => {
      if (!org) return;
      const version = ++requestVersion.current;
      setLoading(true);
      try {
        const next = await api.request<WorkspaceData>(
          `${org}/workspace/${selected ? `?job=${selected}` : ''}`,
        );
        if (version !== requestVersion.current) return;
        setData(next);
        setJobId(next.selectedJob ?? '');
        const conversations = await api.request<Conversation[]>(`${org}/messages/`);
        if (version === requestVersion.current) setThreads(conversations);
      } finally {
        if (version === requestVersion.current) setLoading(false);
      }
    },
    [api, org],
  );
  useEffect(() => {
    let active = true;
    void api
      .request<SessionData>('session/')
      .then((s) => {
        if (active) setSession(s);
      })
      .catch((e: unknown) => {
        if (active) setError(errorText(e));
      });
    return () => {
      active = false;
    };
  }, [api]);
  useEffect(() => {
    if (org)
      void reload(new URLSearchParams(location.search).get('job') ?? '').catch((e: unknown) =>
        setError(errorText(e)),
      );
    const versionRef = requestVersion;
    return () => {
      versionRef.current++;
    };
  }, [org, reload]);
  useEffect(() => {
    const palette = themes.find((t) => t.id === theme)!;
    host.dataset.theme = theme;
    host.dataset.palette = 'extended';
    host.style.setProperty('--palette-header', palette.header);
    host.style.setProperty('--palette-accent', palette.accent);
    host.style.setProperty('--palette-wash', palette.wash);
    try {
      localStorage.setItem('spaces-theme', theme);
    } catch {
      /* Theme still works for this session. */
    }
  }, [host, theme]);
  useEffect(() => {
    const back = () => {
      setPage(pageFromUrl());
      const id = new URLSearchParams(location.search).get('job') ?? '';
      if (org) void reload(id).catch((e: unknown) => setError(errorText(e)));
    };
    window.addEventListener('popstate', back);
    return () => window.removeEventListener('popstate', back);
  }, [org, reload]);
  const navigate = (next: string) => {
    setPage(next);
    setQuery('');
    setStageFilter('');
    setTableLimit(50);
    history.pushState(
      null,
      '',
      `${spacesPagePath(paths[pages.indexOf(next)] ?? '')}${jobId ? `?job=${jobId}` : ''}`,
    );
    window.scrollTo(0, 0);
  };
  const run = async (action: () => Promise<void>): Promise<boolean> => {
    if (busy) return false;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    } finally {
      setBusy(false);
    }
  };
  const mutate = async (path: string, method: string, body: unknown, success: string) => {
    await api.request(`${org}/${path}`, method, body);
    await reload(jobId);
    setNotice(success);
  };
  const selectJob = (id: string) => {
    setAnswers([]);
    setProfileId('');
    setLimits({});
    history.replaceState(null, '', `${spacesPagePath(paths[pages.indexOf(page)] ?? '')}?job=${id}`);
    void run(() => reload(id));
  };
  const rows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const values = (data?.candidates ?? []).filter(
      (c) =>
        (!stageFilter || c.stage === stageFilter) &&
        `${c.name} ${c.role} ${c.city} ${c.skills.join(' ')}`.toLocaleLowerCase().includes(needle),
    );
    const field = sort.replace('-', '');
    return values.sort((a, b) => {
      const av =
        field === 'fit'
          ? (a.fit?.score ?? -1)
          : field === 'years'
            ? (a.years ?? -1)
            : String(a[field as 'name' | 'city' | 'stage']);
      const bv =
        field === 'fit'
          ? (b.fit?.score ?? -1)
          : field === 'years'
            ? (b.years ?? -1)
            : String(b[field as 'name' | 'city' | 'stage']);
      const order =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv));
      return (sort.startsWith('-') ? -order : order) || a.id.localeCompare(b.id);
    });
  }, [data, query, stageFilter, sort]);
  const review = (candidate: LiveCandidate, stage: string, note = candidate.note) =>
    run(() =>
      mutate(
        `jobs/${job!.id}/candidates/${candidate.id}/`,
        'POST',
        { stage, note },
        'Review saved.',
      ),
    );
  const applyView = (view: SharedView) => {
    setQuery(view.filters.q ?? '');
    setSort(view.filters.sort ?? '-fit');
    setStageFilter(view.filters.stage ?? '');
    if (view.filters.job) selectJob(view.filters.job);
    history.replaceState(
      null,
      '',
      `${spacesPagePath('candidates')}?job=${view.filters.job ?? jobId}&view=${view.id}`,
    );
  };
  useEffect(() => {
    const viewId = new URLSearchParams(location.search).get('view');
    const view = data?.sharedViews.find((v) => v.id === viewId);
    if (view) {
      setQuery(view.filters.q ?? '');
      setSort(view.filters.sort ?? '-fit');
      setStageFilter(view.filters.stage ?? '');
    }
  }, [data?.sharedViews]);
  const selector = (
    <div className="live-job-picker">
      <Search label="Search jobs" value={jobQuery} onChange={setJobQuery} />
      <select
        aria-label="Job context"
        disabled={busy || loading || !data?.jobs.length}
        value={job?.id ?? ''}
        onChange={(e) => selectJob(e.target.value)}
      >
        {!data?.jobs.length && <option value="">No jobs yet</option>}
        {data?.jobs
          .filter((j) => j.id === job?.id || j.title.toLowerCase().includes(jobQuery.toLowerCase()))
          .map((j) => (
            <option key={j.id} value={j.id}>
              {j.title} · {j.status}
            </option>
          ))}
      </select>
    </div>
  );
  const table = (compact = false) => (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {[
              ['name', 'Candidate'],
              ['fit', 'Job fit'],
              ['years', 'Experience'],
              ['city', 'Location'],
              ['stage', 'Stage'],
            ].map(([field, label]) => (
              <th
                key={field}
                aria-sort={
                  sort.replace('-', '') === field
                    ? sort.startsWith('-')
                      ? 'descending'
                      : 'ascending'
                    : 'none'
                }
              >
                <button
                  className="live-sort"
                  onClick={() => setSort(sort === field ? `-${field}` : field!)}
                >
                  {label}{' '}
                  <span aria-hidden="true">
                    {sort.replace('-', '') === field ? (sort.startsWith('-') ? '↓' : '↑') : '↕'}
                  </span>
                </button>
              </th>
            ))}
            <th>Assessment</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, compact ? 5 : tableLimit).map((c) => (
            <tr key={c.id}>
              <td>
                <button className="person-cell" onClick={() => setProfileId(c.id)}>
                  <span className="avatar">
                    {c.name
                      .split(' ')
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join('')}
                  </span>
                  <span>
                    <strong>{c.name}</strong>
                    <small className="role" style={{ display: 'block' }}>
                      {c.role || 'Role not selected'}
                    </small>
                  </span>
                </button>
              </td>
              <td>
                <strong className="fit">{c.fit ? `${c.fit.score}%` : 'Select a job'}</strong>
              </td>
              <td>{c.years === null ? 'Not evidenced' : `${c.years}+ years`}</td>
              <td>{c.city || 'Not provided'}</td>
              <td>
                <Tag>{c.stage}</Tag>
              </td>
              <td>
                <Tag>{c.fit?.eligibility ?? 'No job context'}</Tag>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <Empty>
          Profiles appear when candidates share their profile or apply to one of your jobs.
        </Empty>
      )}
      {!compact && rows.length > tableLimit && (
        <Button onClick={() => setTableLimit((n) => n + 50)}>
          Show more ({rows.length - tableLimit} remaining)
        </Button>
      )}
    </div>
  );
  const jobCard = (j: LiveJob) => (
    <article className="opportunity-card" key={j.id}>
      <div className="row between">
        <Tag>{j.department || 'Opportunity'}</Tag>
        <Tag>{j.status}</Tag>
      </div>
      <h3 className="opportunity-title">{j.title}</h3>
      <p>
        {j.location} · {j.work} · {j.type}
      </p>
      <p className="muted">{j.salary || 'Compensation not specified'}</p>
      <div className="opportunity-skills">
        {j.skills.map((skill) => (
          <span key={skill}>{skill}</span>
        ))}
      </div>
      <div className="opportunity-bottom">
        <span>{j.threshold}% minimum fit</span>
        <div className="row">
          <Button
            onClick={() => {
              navigate('Candidates');
              selectJob(j.id);
            }}
          >
            Matches
          </Button>
          <Button onClick={() => setEditing(j)}>Edit</Button>
        </div>
      </div>
      <p className="tiny muted">
        Status: {j.status} · Revision {j.revision}
      </p>
    </article>
  );
  if (!session?.authenticated)
    return (
      <div className="login">
        <section className="login-story">
          <h2>kormic spaces</h2>
          <h1>
            Find potential.
            <br />
            See the evidence.
            <br />
            <em>Make your move.</em>
          </h1>
          <p>A considered space to find your next hire.</p>
        </section>
        <section className="login-form-side">
          <AuthForm
            busy={busy}
            error={error}
            ready={!!session}
            submit={(body) =>
              run(async () => {
                setSession(await api.request<SessionData>('session/', 'POST', body));
              })
            }
          />
        </section>
      </div>
    );
  return (
    <div className="shell">
      <header className="global-header">
        <div className="global-header-inner">
          <button className="home-brand" onClick={() => navigate('Overview')}>
            <strong>kormic</strong> spaces
          </button>
          <span className="brand-separator" />
          <span>{data?.organization.name ?? session.organizations[0]?.name}</span>
          <span className="header-spacer" />
          <Button onClick={() => navigate('Candidates')}>Search people</Button>
          <Button onClick={() => navigate('Settings')}>Settings</Button>
          <Button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                setSession(
                  await api.request<SessionData>('session/', 'POST', { action: 'logout' }),
                );
                setData(undefined);
                setThreads([]);
                setAnswers([]);
              })
            }
          >
            Sign out
          </Button>
        </div>
      </header>
      <div className="horizontal-nav-wrap">
        <nav className="horizontal-nav" aria-label="Workspace navigation">
          {pages
            .filter((p) => p !== 'Settings')
            .map((p) => (
              <button
                key={p}
                className={`horizontal-nav-item ${page === p ? 'active' : ''}`}
                aria-current={page === p ? 'page' : undefined}
                onClick={() => navigate(p)}
              >
                {p}
              </button>
            ))}
        </nav>
      </div>
      <main className="main" aria-busy={busy || loading}>
        {error && (
          <div className="live-alert" role="alert">
            {error}{' '}
            <Button disabled={busy} onClick={() => void run(() => reload(jobId))}>
              Refresh
            </Button>
          </div>
        )}
        {notice && (
          <div role="status" className="info-box">
            {notice}
          </div>
        )}
        {!data ? (
          <div role="status">Loading workspace…</div>
        ) : (
          <>
            <div className="workspace-kicker">
              <span>YOUR WORKSPACE</span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
            <div className="page-head">
              <div>
                <h1>{page === 'Overview' ? 'Your hiring, in focus.' : page}</h1>
                <p>
                  {page === 'Candidates'
                    ? `${data.candidates.length} shared profiles · job fit is based on current evidence`
                    : page === 'Pipeline'
                      ? 'One search across every stage. Five people per column to keep reviews focused.'
                      : 'The right context. The right people. Your next move.'}
                </p>
              </div>
              <div className="row">
                <Button disabled={loading || busy} onClick={() => void run(() => reload(jobId))}>
                  Refresh
                </Button>
                {['Overview', 'Jobs'].includes(page) && (
                  <Button primary onClick={() => setEditing({ ...emptyJob })}>
                    + Create a job
                  </Button>
                )}
              </div>
            </div>
            {['Overview', 'Candidates', 'Pipeline', 'Hiring copilot'].includes(page) && (
              <div className="live-toolbar">
                {selector}
                {loading && <span role="status">Updating job context…</span>}
              </div>
            )}
            {page === 'Overview' && (
              <>
                <section className="metrics-strip">
                  {[
                    ['Active jobs', data.overview.liveJobs],
                    ['Eligible people', data.overview.eligible],
                    ['Shortlisted', data.overview.shortlisted],
                    ['Conversations', data.overview.conversations],
                  ].map(([label, value]) => (
                    <div className="strip-metric" key={label}>
                      <div>
                        <div className="metric-label">{label}</div>
                        <div className="metric-number">{value}</div>
                        <div className="metric-caption">
                          {label === 'Eligible people'
                            ? 'For the selected job'
                            : 'Across your workspace'}
                        </div>
                      </div>
                    </div>
                  ))}
                </section>
                <section className="insight-banner">
                  <div>
                    <div className="insight-label">
                      SAGE INSIGHT · {job?.title ?? 'YOUR NEXT OPPORTUNITY'}
                    </div>
                    <h2>{data.overview.eligible} matches. A clearer next step.</h2>
                    <p>
                      {data.candidates.filter((c) => c.fit?.eligibility === 'Needs review').length}{' '}
                      profiles need an evidence check.
                    </p>
                  </div>
                  <Button primary onClick={() => navigate('Hiring copilot')}>
                    Explore with Sage
                  </Button>
                </section>
                <div className="section-heading">
                  <h2>Your opportunities</h2>
                  <Button onClick={() => navigate('Jobs')}>Manage jobs →</Button>
                </div>
                <section className="opportunity-grid">{data.jobs.slice(0, 3).map(jobCard)}</section>
                {!data.jobs.length && (
                  <Empty>Create your first job to define requirements and start matching.</Empty>
                )}
                <div className="section-heading">
                  <h2>People to consider</h2>
                  <Button onClick={() => navigate('Candidates')}>All candidates →</Button>
                </div>
                {table(true)}
                <section className="live-panel">
                  <h2>Workspace activity</h2>
                  {data.activity.length ? (
                    data.activity.map((a) => (
                      <p key={a.id}>
                        {a.text} <small className="muted">{labelDate(a.created_at)}</small>
                      </p>
                    ))
                  ) : (
                    <p className="muted">Saved changes will appear here.</p>
                  )}
                </section>
              </>
            )}
            {page === 'Jobs' && (
              <>
                <div className="live-toolbar">
                  <Search
                    label="Search job title or department"
                    value={query}
                    onChange={setQuery}
                  />
                  <select
                    aria-label="Filter jobs by status"
                    value={stageFilter}
                    onChange={(e) => setStageFilter(e.target.value)}
                  >
                    <option value="">All statuses</option>
                    {['Live', 'Draft', 'Paused', 'Closed'].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <section className="opportunity-grid">
                  {data.jobs
                    .filter(
                      (j) =>
                        `${j.title} ${j.department}`.toLowerCase().includes(query.toLowerCase()) &&
                        (!stageFilter || j.status === stageFilter),
                    )
                    .map(jobCard)}
                </section>
                {!data.jobs.length && (
                  <Empty>
                    Create a job. Drafts remain private; live jobs appear in the candidate portal.
                  </Empty>
                )}
              </>
            )}
            {page === 'Candidates' && (
              <>
                <div className="live-toolbar">
                  <Search
                    label="Search all candidates, skills or location"
                    value={query}
                    onChange={setQuery}
                  />
                  <select
                    aria-label="Candidate stage"
                    value={stageFilter}
                    onChange={(e) => setStageFilter(e.target.value)}
                  >
                    <option value="">All stages</option>
                    {stages.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <Button onClick={() => setShareOpen(true)}>Save shared view</Button>
                  <select
                    aria-label="Open shared view"
                    value=""
                    onChange={(e) => {
                      const view = data.sharedViews.find((v) => v.id === e.target.value);
                      if (view) applyView(view);
                    }}
                  >
                    <option value="">Team shared views</option>
                    {data.sharedViews.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
                {table()}
                <p className="muted small">
                  Showing {Math.min(tableLimit, rows.length)} of {rows.length}. Shared views are
                  available only to signed-in workspace members.
                </p>
              </>
            )}
            {page === 'Pipeline' && (
              <>
                <div className="live-toolbar">
                  <Search
                    label="Search candidates across all stages"
                    value={query}
                    onChange={(v) => {
                      setQuery(v);
                      setLimits({});
                    }}
                  />
                </div>
                <div className="live-board">
                  {stages.map((stage) => {
                    const column = rows.filter((c) => c.stage === stage);
                    const limit = limits[stage] ?? 5;
                    return (
                      <section className="live-column" key={stage}>
                        <h3>
                          {stage} <Tag>{column.length}</Tag>
                        </h3>
                        {column.slice(0, limit).map((c) => (
                          <article className="live-pipeline-card" key={c.id}>
                            <button className="link-btn" onClick={() => setProfileId(c.id)}>
                              {c.name}
                            </button>
                            <p className="muted small">{c.role}</p>
                            <p>
                              {c.fit?.score ?? '—'}% fit · {c.city}
                            </p>
                            <select
                              disabled={busy || loading || !job}
                              aria-label={`Stage for ${c.name}`}
                              value={c.stage}
                              onChange={(e) => void review(c, e.target.value)}
                            >
                              {stages.map((s) => (
                                <option key={s}>{s}</option>
                              ))}
                            </select>
                          </article>
                        ))}
                        {!column.length && <p className="muted small">No matching candidates.</p>}
                        {column.length > limit && (
                          <Button onClick={() => setLimits({ ...limits, [stage]: limit + 5 })}>
                            Show more ({column.length - limit})
                          </Button>
                        )}
                      </section>
                    );
                  })}
                </div>
              </>
            )}
            {page === 'Messages' && (
              <>
                <div className="live-toolbar">
                  <Search label="Search message profiles" value={query} onChange={setQuery} />
                </div>
                <div className="live-messages">
                  <aside>
                    {threads
                      .filter((t) =>
                        `${t.name} ${t.jobTitle}`.toLowerCase().includes(query.toLowerCase()),
                      )
                      .map((t) => (
                        <button
                          key={t.id}
                          className={`thread ${threadId === t.id ? 'active' : ''}`}
                          onClick={() => {
                            setThreadId(t.id);
                            setContactId('');
                          }}
                        >
                          <strong>{t.name}</strong>
                          <span>{t.jobTitle}</span>
                        </button>
                      ))}
                    {!threads.length && (
                      <Empty>Open a candidate profile to start a conversation.</Empty>
                    )}
                  </aside>
                  <section>
                    <ConversationPanel
                      thread={threads.find((t) =>
                        contactId
                          ? t.personId === contactId && t.jobId === job?.id
                          : t.id === threadId,
                      )}
                      contact={data.candidates.find((c) => c.id === contactId)}
                      job={job}
                      busy={busy}
                      send={(text) =>
                        run(async () => {
                          const thread = threads.find((t) => t.id === threadId);
                          const personId = contactId || thread?.personId;
                          if (!personId || (!job && !thread)) return;
                          await mutate(
                            'messages/',
                            'POST',
                            {
                              personId,
                              jobId: contactId ? job!.id : thread!.jobId,
                              text,
                              requestId: crypto.randomUUID(),
                            },
                            'Message sent.',
                          );
                        })
                      }
                    />
                  </section>
                </div>
              </>
            )}
            {page === 'Hiring copilot' && (
              <section className="live-panel">
                <div className="row between">
                  <div>
                    <h2>Sage, your hiring copilot</h2>
                    <p className="muted">
                      Evidence-led answers and message drafts. You make the decisions.
                    </p>
                  </div>
                  <Button disabled={!job} onClick={() => setContextOpen(true)}>
                    Job context
                  </Button>
                </div>
                {!data.copilotConfigured && (
                  <p role="status">The server needs an Anthropic API key.</p>
                )}
                <p className="small muted">
                  Context includes up to 25 visible candidates who allow AI assistance. Private
                  candidate conversations and screening details are excluded.
                </p>
                <div className="live-answer-list" aria-live="polite">
                  {answers.map((a, i) => (
                    <article key={i}>
                      <strong>You</strong>
                      <p>{a.question}</p>
                      <strong>Sage</strong>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{a.answer}</p>
                    </article>
                  ))}
                </div>
                <div className="row wrap">
                  {[
                    'Who meets this job’s minimum threshold?',
                    'Which evidence should I clarify?',
                    'Draft a thoughtful interview invitation.',
                  ].map((p) => (
                    <Button key={p} onClick={() => setCopilotPrompt(p)}>
                      {p}
                    </Button>
                  ))}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      const prompt = copilotPrompt;
                      const result = await api.request<{ answer: string }>(
                        `${org}/copilot/`,
                        'POST',
                        { jobId: job!.id, prompt, requestId: crypto.randomUUID() },
                      );
                      setAnswers((a) => [...a, { question: prompt, answer: result.answer }]);
                      setCopilotPrompt('');
                    });
                  }}
                >
                  <label className="field">
                    Ask about this job
                    <textarea
                      required
                      maxLength={2000}
                      value={copilotPrompt}
                      onChange={(e) => setCopilotPrompt(e.target.value)}
                      placeholder="Ask about fit, evidence gaps, or your next conversation…"
                    />
                  </label>
                  <button
                    className="btn primary"
                    disabled={busy || loading || !job || !data.copilotConfigured}
                  >
                    {busy ? 'Sage is thinking…' : 'Ask Sage'}
                  </button>
                </form>
              </section>
            )}
            {page === 'Settings' && (
              <>
                <section className="live-panel">
                  <div className="row between">
                    <h2>Your team</h2>
                    {data.organization.role === 'Owner' && (
                      <Button onClick={() => setTeamOpen(true)}>Add team member</Button>
                    )}
                  </div>
                  {data.members.map((m) => (
                    <div className="evidence-row" key={m.id}>
                      <strong>{m.display_name}</strong>
                      <Tag>{m.role}</Tag>
                    </div>
                  ))}
                </section>
                <section className="live-panel">
                  <h2>Workspace appearance</h2>
                  <div className="live-theme-grid">
                    {themes.map((t) => (
                      <button
                        className="live-theme"
                        key={t.id}
                        aria-pressed={theme === t.id}
                        onClick={() => setTheme(t.id)}
                      >
                        <span style={{ background: t.header }} />
                        <span style={{ background: t.accent }} />
                        <span style={{ background: t.wash }} />
                        <strong>{t.name}</strong>
                        <small>{t.description}</small>
                      </button>
                    ))}
                  </div>
                </section>
                <section className="live-panel">
                  <h2>Prototype data</h2>
                  <p>
                    Clear the earlier browser prototype. Saved workspace jobs, applications and
                    messages are retained.
                  </p>
                  <Button
                    onClick={() => {
                      localStorage.removeItem('kormic-spaces-local-v1');
                      setNotice('Earlier browser prototype data cleared.');
                    }}
                  >
                    Reset demo data
                  </Button>
                </section>
              </>
            )}
          </>
        )}
      </main>
      <footer className="workspace-footer">
        <span>
          <span className="saved-dot" />
          {busy ? 'Saving or requesting…' : 'Connected to your workspace'}
        </span>
      </footer>
      {editing && (
        <Modal title={editing.id ? 'Edit job' : 'Create a job'} close={() => setEditing(undefined)}>
          <JobForm
            initial={editing}
            busy={busy}
            error={error}
            save={(draft) =>
              run(async () => {
                await mutate(
                  `jobs/${draft.id ? `${draft.id}/` : ''}`,
                  draft.id ? 'PATCH' : 'POST',
                  draft,
                  `Job saved as ${draft.status}.`,
                );
                setEditing(undefined);
              })
            }
          />
        </Modal>
      )}
      {profile && (
        <Modal title={profile.name} close={() => setProfileId('')}>
          <CandidateProfile
            candidate={profile}
            job={job}
            busy={busy || loading}
            review={review}
            contact={() => {
              setContactId(profile.id);
              setThreadId('');
              setProfileId('');
              navigate('Messages');
            }}
            ask={() => {
              setCopilotPrompt(
                `Explain ${profile.name}'s fit for this job and identify evidence gaps.`,
              );
              setProfileId('');
              navigate('Hiring copilot');
            }}
          />
        </Modal>
      )}
      {contextOpen && job && (
        <Modal title="Job context" close={() => setContextOpen(false)}>
          <h3>{job.title}</h3>
          <p>{job.description}</p>
          <p>
            {job.location} · {job.work} · {job.type}
          </p>
          <p>
            Minimum fit: {job.threshold}% · Experience: {job.years} years
          </p>
          <p>Skills: {job.skills.join(', ') || 'None specified'}</p>
          <p>
            Weights: skills {job.weights[0]}%, experience {job.weights[1]}%, preferences{' '}
            {job.weights[2]}%, availability {job.weights[3]}%.
          </p>
          <p>
            Required skills: {job.hardSkills ? 'Yes' : 'No'} · Required experience:{' '}
            {job.hardYears ? 'Yes' : 'No'}
          </p>
          <p>Status: {job.status}</p>
        </Modal>
      )}
      {shareOpen && (
        <Modal title="Save a team shared view" close={() => setShareOpen(false)}>
          <p>Your current job, search and sort settings will be shared with this workspace.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const name = String(new FormData(e.currentTarget).get('name'));
              void run(async () => {
                const v = await api.request<SharedView>(`${org}/views/`, 'POST', {
                  name,
                  filters: { job: jobId, q: query, sort, stage: stageFilter },
                });
                await reload(jobId);
                setShareOpen(false);
                history.replaceState(
                  null,
                  '',
                  `${spacesPagePath('candidates')}?job=${jobId}&view=${v.id}`,
                );
                setNotice(`Shared view saved. Copy this page’s URL to share with your team.`);
              });
            }}
          >
            <label className="field">
              View name
              <input name="name" required maxLength={100} />
            </label>
            <button disabled={busy} className="btn primary">
              Save shared view
            </button>
          </form>
        </Modal>
      )}
      {teamOpen && (
        <Modal title="Add team member" close={() => setTeamOpen(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const body = formValues(e.currentTarget);
              void run(async () => {
                await mutate(
                  'team/',
                  'POST',
                  body,
                  'Team member added. Share their credentials securely.',
                );
                setTeamOpen(false);
              });
            }}
          >
            <p>Create a local workspace login. No email invitation is sent.</p>
            <label className="field">
              Name
              <input name="name" defaultValue="Akshay Kumar" required maxLength={160} />
            </label>
            <label className="field">
              Email
              <input name="email" type="email" required autoComplete="off" />
            </label>
            <label className="field">
              Password
              <input
                name="password"
                type="password"
                minLength={12}
                required
                autoComplete="new-password"
              />
            </label>
            <label className="field">
              Role
              <select name="role">
                <option>Manager</option>
                <option>Recruiter</option>
              </select>
            </label>
            {error && <p role="alert">{error}</p>}
            <button disabled={busy} className="btn primary">
              Create login
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function AuthForm({
  busy,
  error,
  ready,
  submit,
}: {
  busy: boolean;
  error: string;
  ready: boolean;
  submit: (body: unknown) => Promise<boolean>;
}) {
  const [register, setRegister] = useState(false);
  return (
    <div className="login-form">
      <div className="eyebrow">THE EMPLOYER WORKSPACE</div>
      <h2>{register ? 'Create your workspace' : 'Welcome to Spaces'}</h2>
      <p>Secure access for your hiring team.</p>
      {error && <p role="alert">{error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit({ ...formValues(e.currentTarget), action: register ? 'register' : 'login' });
        }}
      >
        {register && (
          <>
            <label className="field">
              Your name
              <input name="name" required defaultValue="Dr. Vikram Sethi" maxLength={160} />
            </label>
            <label className="field">
              Company
              <input name="company" required maxLength={160} />
            </label>
          </>
        )}
        <label className="field">
          Work email
          <input name="email" type="email" required autoComplete="username" />
        </label>
        <label className="field">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={register ? 12 : 1}
            autoComplete={register ? 'new-password' : 'current-password'}
          />
        </label>
        <button className="btn primary" disabled={busy || !ready}>
          {busy ? 'Please wait…' : register ? 'Create workspace' : 'Sign in'}
        </button>
      </form>
      <Button onClick={() => setRegister(!register)}>
        {register ? 'Already have an account? Sign in' : 'Create a company workspace'}
      </Button>
    </div>
  );
}

function JobForm({
  initial,
  busy,
  error,
  save,
}: {
  initial: LiveJob;
  busy: boolean;
  error: string;
  save: (job: LiveJob) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(initial);
  const [skills, setSkills] = useState(initial.skills.join(', '));
  const change = (key: keyof LiveJob, value: unknown) => setDraft((d) => ({ ...d, [key]: value }));
  const total = draft.weights.reduce((a, b) => a + b, 0);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void save({
      ...draft,
      skills: skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
  };
  return (
    <form onSubmit={submit}>
      <div className="live-form-grid">
        {(['title', 'department', 'location', 'salary'] as const).map((key) => (
          <label className="field" key={key}>
            {key.charAt(0).toUpperCase() + key.slice(1)}
            <input
              value={draft[key]}
              maxLength={key === 'department' ? 100 : 160}
              required={key === 'title' || key === 'location'}
              onChange={(e) => change(key, e.target.value)}
            />
          </label>
        ))}
        <label className="field">
          Work arrangement
          <select value={draft.work} onChange={(e) => change('work', e.target.value)}>
            {['Hybrid', 'Remote', 'On-site'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Employment type
          <select value={draft.type} onChange={(e) => change('type', e.target.value)}>
            {['Full-time', 'Part-time', 'Contract', 'Internship'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        Job description
        <textarea
          value={draft.description}
          maxLength={10000}
          onChange={(e) => change('description', e.target.value)}
        />
      </label>
      <label className="field">
        Skills, separated by commas
        <input value={skills} onChange={(e) => setSkills(e.target.value)} />
      </label>
      <div className="live-form-grid">
        {(
          [
            ['years', 'Minimum years'],
            ['threshold', 'Minimum fit (%)'],
            ['availableDays', 'Available within (days)'],
          ] as const
        ).map(([key, label]) => (
          <label className="field" key={key}>
            {label}
            <input
              type="number"
              min={0}
              max={key === 'threshold' ? 100 : key === 'years' ? 60 : 730}
              step={key === 'years' ? 0.5 : 1}
              required
              value={draft[key]}
              onChange={(e) => change(key, Number(e.target.value))}
            />
          </label>
        ))}
      </div>
      <div className="row wrap">
        <label>
          <input
            type="checkbox"
            checked={draft.hardSkills}
            onChange={(e) => change('hardSkills', e.target.checked)}
          />{' '}
          Require all skills to be evidenced
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.hardYears}
            onChange={(e) => change('hardYears', e.target.checked)}
          />{' '}
          Require experience evidence
        </label>
      </div>
      <h3>Fit weights</h3>
      <p className="muted small">Total must equal 100. Missing evidence is marked for review.</p>
      <div className="live-form-grid">
        {['Skills', 'Experience', 'Preferences', 'Availability'].map((label, i) => (
          <label className="field" key={label}>
            {label} (%)
            <input
              type="number"
              min={0}
              max={100}
              required
              value={draft.weights[i]}
              onChange={(e) =>
                change(
                  'weights',
                  draft.weights.map((v, n) => (n === i ? Number(e.target.value) : v)),
                )
              }
            />
          </label>
        ))}
      </div>
      <label className="field">
        Job status
        <select value={draft.status} onChange={(e) => change('status', e.target.value)}>
          {['Draft', 'Live', 'Paused', 'Closed'].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      {total !== 100 && <p role="alert">Weights total {total}%; change them to 100%.</p>}
      <div className="row wrap">
        <button className="btn primary" disabled={busy || total !== 100}>
          Save job
        </button>
        {initial.id && initial.status === 'Live' && (
          <Button disabled={busy} onClick={() => void save({ ...initial, status: 'Paused' })}>
            Stop live / Pause job
          </Button>
        )}
      </div>
    </form>
  );
}

function CandidateProfile({
  candidate: c,
  job,
  busy,
  review,
  contact,
  ask,
}: {
  candidate: LiveCandidate;
  job?: LiveJob;
  busy: boolean;
  review: (c: LiveCandidate, stage: string, note?: string) => Promise<boolean>;
  contact: () => void;
  ask: () => void;
}) {
  const [note, setNote] = useState(c.note);
  return (
    <>
      <p>
        {c.role} · {c.city}
      </p>
      <div className="fit-panel">
        <h3>{job?.title ?? 'Choose a job to assess fit'}</h3>
        <strong className="big-score">{c.fit?.score ?? '—'}%</strong>
        <Tag>{c.fit?.eligibility ?? 'No job context'}</Tag>
        {c.fit?.reasons.map((r) => (
          <p key={r}>{r}</p>
        ))}
        {c.fit?.criteria.map((label, i) => (
          <p key={label}>
            {label}:{' '}
            {c.fit?.breakdown[i] == null ? 'Unknown' : `${Math.round(c.fit.breakdown[i]! * 100)}%`}
          </p>
        ))}
      </div>
      <section className="profile-section">
        <h3>Application preferences</h3>
        <p>Roles: {c.preferences.roles.join(', ') || 'Not specified'}</p>
        <p>Locations: {c.preferences.locations.join(', ') || 'Not specified'}</p>
        <p>
          Work: {c.preferences.workModes.join(', ') || 'Not specified'} ·{' '}
          {c.preferences.jobTypes.join(', ')}
        </p>
        <p>
          Availability:{' '}
          {c.preferences.availableDays === null
            ? 'Not specified'
            : `${c.preferences.availableDays} days`}
        </p>
      </section>
      <section className="profile-section">
        <h3>Profile evidence</h3>
        <p>
          {c.years === null ? 'Experience dates not evidenced.' : `${c.years}+ years evidenced.`}{' '}
          {c.experienceBasis}
        </p>
        <div className="row wrap">
          {c.skills.map((s) => (
            <Tag key={s}>{s}</Tag>
          ))}
        </div>
        {c.records.map((r) => (
          <article className="live-evidence" key={r.id}>
            <h4>{r.section.replaceAll('_', ' ')}</h4>
            {Object.entries(r.details).map(([key, value]) => (
              <p key={key}>
                <strong>{key.replaceAll('_', ' ')}:</strong>{' '}
                {Array.isArray(value) ? value.join(', ') : String(value ?? '')}
              </p>
            ))}
            <small>
              {r.method.replaceAll('_', ' ')} · {r.status} · Checked {labelDate(r.checkedAt)}
            </small>
          </article>
        ))}
        <p className="tiny muted">
          Source checked means the supplied source supports that fact; it does not mean the issuing
          authority confirmed it.
        </p>
      </section>
      <label className="field">
        Private team note
        <textarea maxLength={5000} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <div className="row wrap">
        <Button disabled={busy || !job} onClick={() => void review(c, c.stage, note)}>
          Save note
        </Button>
        <label>
          Review stage
          <select
            disabled={busy || !job}
            value={c.stage}
            onChange={(e) => void review(c, e.target.value, note)}
          >
            {stages.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <Button primary disabled={!job} onClick={contact}>
          Message
        </Button>
        <Button disabled={!job || !c.aiConsent} onClick={ask}>
          Ask Sage
        </Button>
      </div>
      <p className="tiny muted">
        Decisions update the pipeline. Send a separate message to notify the candidate.
      </p>
    </>
  );
}

function ConversationPanel({
  thread,
  contact,
  job,
  busy,
  send,
}: {
  thread?: Conversation;
  contact?: LiveCandidate;
  job?: LiveJob;
  busy: boolean;
  send: (text: string) => Promise<boolean>;
}) {
  const [text, setText] = useState('');
  if (!thread && !contact) return <Empty>Select a conversation or open a candidate profile.</Empty>;
  return (
    <>
      <h2>{contact?.name ?? thread?.name}</h2>
      <p className="muted">{contact ? job?.title : thread?.jobTitle}</p>
      <div className="message-list">
        {thread?.messages.map((m) => (
          <div key={m.id} className={`bubble ${m.author === 'company' ? 'mine' : ''}`}>
            {m.text}
            <time>
              {m.author === 'company' ? 'Your team' : 'Candidate'} · {labelDate(m.time)}
            </time>
          </div>
        ))}
      </div>
      <form
        className="message-compose"
        onSubmit={(e) => {
          e.preventDefault();
          void send(text).then((ok) => {
            if (ok) setText('');
          });
        }}
      >
        <textarea
          aria-label="Message"
          required
          maxLength={5000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a thoughtful message…"
        />
        <button className="btn primary" disabled={busy}>
          Send message
        </button>
      </form>
    </>
  );
}
