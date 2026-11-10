import {
  ChatHistory,
  ChatHistoryStyles,
  useChatHistory,
  type ChatMessage,
} from './ChatHistory.web';
import { CollapsibleSidebar } from './CollapsibleSidebar.web';
import { AssistantText } from './AssistantText.web';
import { TeamSettings } from './TeamSettings.web';
import { confirmAction, confirmSignOut } from './confirmSignOut';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { portalUrl, spacesPagePath, spacesPageSegment } from './deployment';
import { workspaceUrl } from './workspaceNavigation';
import { appConfig } from '../services/config';
import {
  SpacesClient,
  SpacesHttpError,
  canAccessWorkspace,
  type Conversation,
  type LiveCandidate,
  type LiveJob,
  type SessionData,
  type SharedView,
  type WorkspaceData,
} from './liveApi';
import { usePagedInbox, type ThreadPage, type MessagePage } from './usePagedInbox';
import { AccountAccess } from './AccountAccess.web';
import { ActivityLog } from './ActivityLog.web';
import { useDebouncedSearch } from './useDebouncedSearch';
import { isThemeId, themes, type ThemeId } from './themes';

const pageDescriptions: Record<string, string> = {
  'Job collection': 'Collect jobs, monitor source freshness and control your collection agents.',
  Overview: 'Your jobs, shortlist and next steps in one place.',
  Jobs: 'Define the role. Set clear requirements. Find the right match.',
  Messages: 'Keep candidate conversations connected to the role.',
  'Hiring copilot': 'Explore candidate evidence with Sage, your hiring assistant.',
  'Activity log': 'A read-only log of recorded hiring and workspace changes.',
  Settings: 'Manage your team and make this workspace your own.',
};
const navPaths: Record<string, string> = {
  'Job collection': 'M3 4h18v5H3z M3 12h8v8H3z M15 12h6 M15 16h6 M15 20h6',
  Overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  Jobs: 'M8 6V3h8v3 M3 7h18v14H3z M3 12h18 M10 12v3h4v-3',
  Candidates:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 7 M22 21v-2a4 4 0 0 0-3-4',
  Pipeline: 'M3 4h5v16H3z M10 4h5v11h-5z M17 4h4v7h-4z',
  Messages: 'M21 3H3v14h5l4 4 4-4h5z M7 8h10 M7 12h6',
  'Hiring copilot': 'm12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3z',
  'Activity log': 'M8 3h12v18H4V3h4 M8 8h8 M8 12h8 M8 16h5',
  Settings: 'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M9 15v6',
};
function NavIcon({ page }: { page: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={navPaths[page]} />
    </svg>
  );
}

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
  'Activity log',
  'Settings',
];
const paths = ['', 'jobs', 'candidates', 'pipeline', 'messages', 'copilot', 'activity', 'settings'];
const labelDate = (s: string) =>
  new Date(s).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...(new Date(s).getFullYear() !== new Date().getFullYear() ? { year: 'numeric' as const } : {}),
  });
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
  label,
  onClick,
  primary = false,
  disabled = false,
}: {
  children: ReactNode;
  label?: string;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      data-tooltip={label}
      className={`btn ${primary ? 'primary' : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="tag" data-status={typeof children === 'string' ? children : undefined}>
      {children}
    </span>
  );
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
  className = '',
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  className?: string;
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
      className={`live-dialog ${className}`}
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

type JobPage = {
  results: LiveJob[];
  count: number;
  offset: number;
  limit: number;
  nextOffset: number | null;
};
function useJobPage(
  api: SpacesClient,
  org: string | undefined,
  query: string,
  status: string,
  enabled: boolean,
  refresh?: unknown,
) {
  const [offset, setOffset] = useState(0);
  const [result, setResult] = useState<{ key: string; page: JobPage }>();
  const [error, setError] = useState('');
  const key = JSON.stringify([org, query, status]);
  const [previousKey, setPreviousKey] = useState(key);
  if (previousKey !== key) {
    setPreviousKey(key);
    setOffset(0);
  }
  useEffect(() => {
    if (!enabled || !org) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ q: query, status, limit: '25', offset: String(offset) });
      void api
        .request<JobPage>(`${org}/jobs/?${params}`, 'GET', undefined, controller.signal)
        .then((page) => {
          if (!controller.signal.aborted) {
            setResult({ key: `${key}:${offset}`, page });
            setError('');
          }
        })
        .catch((cause: unknown) => {
          if (!controller.signal.aborted) setError(errorText(cause));
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [api, org, query, status, enabled, offset, key, refresh]);
  const page = result?.key === `${key}:${offset}` ? result.page : undefined;
  return { page, offset, setOffset, error };
}
function JobPageControls({ paging }: { paging: ReturnType<typeof useJobPage> }) {
  return (
    <div className="live-toolbar">
      {paging.error && <p role="alert">{paging.error}</p>}
      <Button
        disabled={paging.offset === 0}
        onClick={() => paging.setOffset(Math.max(0, paging.offset - 25))}
      >
        Previous jobs
      </Button>
      <span role="status">
        {paging.page
          ? `${paging.offset + (paging.page.count ? 1 : 0)}–${paging.offset + paging.page.results.length} of ${paging.page.count} jobs`
          : 'Loading jobs…'}
      </span>
      <Button
        disabled={!paging.page || paging.page.nextOffset === null}
        onClick={() => paging.setOffset(paging.page!.nextOffset!)}
      >
        Next jobs
      </Button>
    </div>
  );
}

function JobSelector({
  api,
  org,
  jobs,
  selected,
  allowAll = false,
  allSelected = false,
  disabled,
  onSelect,
}: {
  api: SpacesClient;
  org?: string;
  jobs: LiveJob[];
  selected?: LiveJob;
  allowAll?: boolean;
  allSelected?: boolean;
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const paging = useJobPage(api, org, query, '', open);
  const options = [
    ...(allowAll ? [{ id: 'all', title: 'All jobs', status: 'All workspace candidates' }] : []),
    ...(paging.page?.results ?? (query ? [] : jobs)),
  ].filter((job) =>
    `${job.title} ${job.status}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const activeIndex = Math.min(active, Math.max(0, options.length - 1));
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);
  const choose = (id: string) => {
    setOpen(false);
    setQuery('');
    trigger.current?.focus();
    onSelect(id);
  };
  return (
    <div
      className="job-selector"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        className="job-selector-trigger"
        type="button"
        disabled={disabled}
        aria-label={`Job context: ${selected?.title ?? (allSelected ? 'All jobs' : 'No jobs yet')}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        onClick={() => {
          setOpen(!open);
          setQuery('');
          setActive(0);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span>
          {selected?.title ?? (allSelected ? 'All jobs' : 'No jobs yet')}
          {selected && <small>{selected.status}</small>}
        </span>
        <span aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div className="job-selector-popover">
          <input
            ref={input}
            type="search"
            role="combobox"
            aria-label="Search jobs"
            placeholder="Search jobs…"
            aria-expanded={true}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={options.length ? `${listId}-${activeIndex}` : undefined}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                setOpen(false);
                trigger.current?.focus();
              }
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                setActive(
                  Math.max(
                    0,
                    Math.min(
                      options.length - 1,
                      activeIndex + (event.key === 'ArrowDown' ? 1 : -1),
                    ),
                  ),
                );
              }
              if (event.key === 'Enter') {
                event.preventDefault();
                const option = options[activeIndex];
                if (option) choose(option.id);
              }
            }}
          />
          <ul id={listId} role="listbox" aria-label="Jobs">
            {options.map((job, index) => (
              <li
                key={job.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={job.id === (allSelected ? 'all' : selected?.id)}
                className={index === activeIndex ? 'is-active' : ''}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(job.id)}
              >
                <span>
                  {job.title}
                  <small>{job.status}</small>
                </span>
                {job.id === (allSelected ? 'all' : selected?.id) && (
                  <span aria-hidden="true">✓</span>
                )}
              </li>
            ))}
          </ul>
          <JobPageControls paging={paging} />
          {!options.length && paging.page && <p role="status">No jobs match your search.</p>}
        </div>
      )}
    </div>
  );
}

export function LiveSpaces({ host }: { host: HTMLDivElement }) {
  const api = useMemo(() => new SpacesClient(appConfig().apiHost), []);
  const [session, setSession] = useState<SessionData>();
  const [sessionRevision, setSessionRevision] = useState(0);
  const [access, setAccess] = useState(() => {
    if (typeof window === 'undefined') return { mode: '', token: '' };
    const params = new URLSearchParams(window.location.hash.slice(1));
    return {
      mode: params.get('access') || '',
      token: params.get('token') || '',
    };
  });
  useEffect(() => {
    if (access.token)
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, [access.token]);
  const [workspaceData, setData] = useState<WorkspaceData>();
  const [requestedWorkspace, setRequestedWorkspace] = useState(() =>
    new URLSearchParams(location.search).get('workspace'),
  );
  const [navigationRevision, setNavigationRevision] = useState(0);
  const [page, setPage] = useState(pageFromUrl);
  const [jobId, setJobId] = useState(new URLSearchParams(location.search).get('job') ?? '');
  const [query, setQuery] = useState('');
  const candidateQuery = useDebouncedSearch(query);
  const [sort, setSort] = useState('-fit');
  const [stageFilter, setStageFilter] = useState('');
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [pageSize, setPageSize] = useState(10);
  const [candidatePage, setCandidatePage] = useState({ key: '', index: 0 });
  const [candidateResult, setCandidateResult] = useState<{
    key: string;
    scope: string;
    count: number;
    results: LiveCandidate[];
  }>();
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidateError, setCandidateError] = useState('');
  const [candidateRetry, setCandidateRetry] = useState(0);
  const [error, setError] = useState('');
  const [workspaceError, setWorkspaceError] = useState('');
  const [sessionError, setSessionError] = useState('');
  const [receiptError, setReceiptError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<{
    workspaceId: string;
    job: LiveJob;
    requestId: string;
  }>();
  const [profileId, setProfileId] = useState('');
  const [reviewConflict, setReviewConflict] = useState<{
    path: string;
    body: Record<string, unknown>;
    current: { revision: number; stage: string; note: string };
  }>();
  const [contactId, setContactId] = useState('');
  const [copilotPrompt, setCopilotPrompt] = useState('');
  const [answers, setAnswers] = useState<ChatMessage[]>([]);
  const conversationRef = useRef<HTMLDivElement>(null);
  const copilotPending = useRef(false);
  useEffect(() => {
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }, [answers]);
  const [contextOpen, setContextOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [theme] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem('spaces-company-theme');
      return isThemeId(saved) ? saved : 'portal';
    } catch {
      return 'portal';
    }
  });
  const membership =
    requestedWorkspace !== null
      ? session?.organizations.find((item) => item.id === requestedWorkspace)
      : session?.organizations[0];
  const canAccess = canAccessWorkspace(session, membership?.id);
  const org = canAccess ? membership?.id : undefined;
  const activeOrg = useRef(org);
  activeOrg.current = org;
  const data = workspaceData?.organization.id === org ? workspaceData : undefined;
  useEffect(() => {
    if (!membership || requestedWorkspace !== null) return;
    const params = new URLSearchParams(location.search);
    params.set('workspace', membership.id);
    history.replaceState(null, '', `${location.pathname}?${params}`);
    setRequestedWorkspace(membership.id);
  }, [membership, requestedWorkspace]);
  const openJobEditor = (draft: LiveJob) => {
    if (org && data?.organization.id === org)
      setEditing({ workspaceId: org, job: draft, requestId: crypto.randomUUID() });
  };
  const inboxTransport = useMemo(
    () =>
      org && page === 'Messages'
        ? {
            threads: (params: URLSearchParams) =>
              api.request<ThreadPage<Conversation>>(`${org}/threads/?${params}`),
            messages: (id: string, params: URLSearchParams) =>
              api.request<MessagePage>(`${org}/threads/${id}/messages/?${params}`),
          }
        : undefined,
    [api, org, page],
  );
  const inbox = usePagedInbox<Conversation>(inboxTransport);
  const threads = inbox.threads;
  const threadId = inbox.selected ?? '';
  const { setSelected, clear: clearInbox, markRead } = inbox;
  useEffect(() => {
    setEditing(undefined);
    setProfileId('');
    setContactId('');
    setReviewConflict(undefined);
    setShareOpen(false);
    setError('');
    setNotice('');
    setAnswers([]);
    clearInbox();
  }, [org, clearInbox]);
  const setThreadId = useCallback((id: string) => setSelected(id || undefined), [setSelected]);
  const sendAttempt = useRef<
    { personId: string; jobId: string; text: string; requestId: string } | undefined
  >(undefined);
  const readPending = useRef(false);
  useEffect(() => {
    if (contactId) {
      const found = threads.find(
        (thread) => thread.personId === contactId && thread.jobId === jobId,
      );
      if (found) {
        setSelected(found.id);
        setContactId('');
      }
    }
  }, [contactId, threads, jobId, setSelected]);
  useEffect(() => {
    const thread = threads.find((value) => value.id === threadId);
    const ids =
      thread?.messages
        .filter((message) => message.unread)
        .map((message) => message.id)
        .slice(0, 100) ?? [];
    if (!org || !thread || !ids.length || readPending.current) return;
    readPending.current = true;
    let active = true;
    void api
      .request(`${org}/threads/${thread.id}/messages/`, 'POST', {
        messageIds: ids,
      })
      .then(() => {
        if (active) {
          markRead(ids);
          setReceiptError('');
        }
      })
      .catch((error: unknown) => {
        if (active) setReceiptError(errorText(error));
      })
      .finally(() => {
        readPending.current = false;
      });
    return () => {
      active = false;
    };
  }, [api, org, threadId, threads, markRead]);
  const job =
    jobId === 'all'
      ? undefined
      : (data?.jobs.find((j) => j.id === jobId) ?? data?.selectedJobData ?? data?.jobs[0]);
  const jobsPaging = useJobPage(api, org, query, stageFilter, page === 'Jobs', data?.jobs);
  const [pipelineOffset, setPipelineOffset] = useState(0);
  const copilotReady = !!data?.copilotConfigured && !loading;
  const candidateScope = JSON.stringify([org, jobId, candidateQuery, stageFilter]);
  const candidateKey = JSON.stringify([candidateScope, sort, pageSize]);
  const pageIndex = candidatePage.key === candidateKey ? candidatePage.index : 0;
  const resultKey = `${candidateKey}:${pageIndex}`;
  const currentCandidates = candidateResult?.key === resultKey ? candidateResult : undefined;
  // Keep the previous server page during a sort, without showing another job's results.
  const displayedCandidates =
    candidateResult?.scope === candidateScope ? candidateResult : undefined;
  const candidatesPending =
    page === 'Candidates' &&
    (candidateLoading || (!!org && !!data && !currentCandidates && !candidateError));
  const profile = (page === 'Candidates' ? displayedCandidates?.results : data?.candidates)?.find(
    (c) => c.id === profileId,
  );
  const pipelineQuery = page === 'Pipeline' ? candidateQuery : '';
  const requestVersion = useRef(0);
  const reload = useCallback(
    async (selected?: string) => {
      if (!org || activeOrg.current !== org) return;
      const version = ++requestVersion.current;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (page === 'Pipeline') {
          params.set('candidates_offset', String(pipelineOffset));
          params.set('candidates_q', pipelineQuery);
        }
        if (selected && selected !== 'all') params.set('job', selected);
        if (['Candidates', 'Activity log'].includes(page))
          params.set('include_candidates', 'false');
        const next = await api.request<WorkspaceData>(`${org}/workspace/?${params}`);
        if (version !== requestVersion.current || activeOrg.current !== org) return;
        if (next.organization.id !== org)
          throw new Error('Workspace response does not match the selected company.');
        setData(next);
        setJobId(selected === 'all' && page === 'Candidates' ? 'all' : (next.selectedJob ?? ''));
        setWorkspaceError('');
      } catch (failure) {
        if (version === requestVersion.current) setWorkspaceError(errorText(failure));
      } finally {
        if (version === requestVersion.current) setLoading(false);
      }
    },
    [api, org, page, pipelineOffset, pipelineQuery],
  );
  useEffect(() => {
    if (page !== 'Candidates' || !org || !data) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    setCandidateLoading(true);
    setCandidateError('');
    const controller = new AbortController();
    {
      const params = new URLSearchParams({
        q: candidateQuery,
        stage: jobId === 'all' ? '' : stageFilter,
        sort:
          jobId === 'all' && ['fit', 'stage', 'assessment'].includes(sort.replace('-', ''))
            ? 'name'
            : sort,
        limit: String(pageSize),
        offset: String(pageIndex * pageSize),
      });
      if (jobId && jobId !== 'all') params.set('job', jobId);
      void api
        .request<{ count: number; results: LiveCandidate[] }>(
          `${org}/candidates/?${params}`,
          'GET',
          undefined,
          controller.signal,
        )
        .then((response) => {
          if (cancelled) return;
          const lastPage = Math.max(0, Math.ceil(response.count / pageSize) - 1);
          if (pageIndex > lastPage) setCandidatePage({ key: candidateKey, index: lastPage });
          else
            setCandidateResult({
              ...response,
              key: resultKey,
              scope: candidateScope,
            });
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setCandidateError(errorText(error));
            if (error instanceof SpacesHttpError && error.status === 503) {
              setCandidateResult(undefined);
              retryTimer = setTimeout(() => setCandidateRetry((value) => value + 1), 2000);
            }
          }
        })
        .finally(() => {
          if (!cancelled) setCandidateLoading(false);
        });
    }
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      controller.abort();
    };
  }, [
    api,
    org,
    page,
    data,
    jobId,
    candidateQuery,
    candidateRetry,
    candidateScope,
    stageFilter,
    sort,
    pageSize,
    pageIndex,
    candidateKey,
    resultKey,
  ]);
  useEffect(() => {
    let active = true;
    let checking = false;
    api.onSessionChange = (next) => {
      if (!active) return;
      requestVersion.current++;
      setData(undefined);
      clearInbox();
      setAnswers([]);
      setCandidateResult(undefined);
      setCandidateError('');
      setJobId('');
      setProfileId('');
      setThreadId('');
      setContactId('');
      setEditing(undefined);
      setContextOpen(false);
      setShareOpen(false);
      setReviewConflict(undefined);
      setError('');
      setWorkspaceError('');
      setSessionError('');
      setReceiptError('');
      setSession(next);
      setSessionRevision((revision) => revision + 1);
    };
    const refreshSession = async () => {
      if (checking) return;
      checking = true;
      try {
        const next = await api.request<SessionData>('session/');
        if (active) {
          setSession(next);
          setSessionError('');
        }
      } catch (error) {
        if (active) setSessionError(errorText(error));
      } finally {
        checking = false;
      }
    };
    const onFocus = () => {
      if (!document.hidden) void refreshSession();
    };
    void refreshSession();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    const timer = setInterval(onFocus, 30000);
    return () => {
      active = false;
      api.onSessionChange = undefined;
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [api, clearInbox, setThreadId]);
  useEffect(() => {
    if (org) void reload(new URLSearchParams(location.search).get('job') ?? '');
    const versionRef = requestVersion;
    return () => {
      versionRef.current++;
    };
  }, [org, reload, session?.userId, sessionRevision, navigationRevision]);
  useEffect(() => {
    const palette = themes.find((t) => t.id === theme)!;
    host.dataset.theme = theme;
    host.dataset.palette = 'extended';
    host.style.setProperty('--palette-header', palette.header);
    host.style.setProperty('--palette-accent', palette.accent);
    host.style.setProperty('--palette-wash', palette.wash);
    try {
      localStorage.setItem('spaces-company-theme', theme);
    } catch {
      /* Theme still works for this session. */
    }
  }, [host, theme]);
  useEffect(() => {
    const back = () => {
      const params = new URLSearchParams(location.search);
      setRequestedWorkspace(params.get('workspace'));
      setPage(pageFromUrl());
      setJobId(params.get('job') ?? '');
      setNavigationRevision((value) => value + 1);
    };
    window.addEventListener('popstate', back);
    return () => window.removeEventListener('popstate', back);
  }, []);
  const navigate = (next: string) => {
    setPage(next);
    setQuery('');
    setStageFilter('');
    setSort('-fit');
    setCandidatePage({ key: '', index: 0 });
    history.pushState(
      null,
      '',
      workspaceUrl(spacesPagePath(paths[pages.indexOf(next)] ?? ''), org, { job: jobId }),
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
    try {
      if (
        !org ||
        activeOrg.current !== org ||
        data?.organization.id !== org ||
        new URLSearchParams(location.search).get('workspace') !== org
      ) {
        throw new Error('Workspace changed. Reopen this action in the intended company.');
      }
      await api.request(`${org}/${path}`, method, body);
    } catch (failure) {
      if (
        failure instanceof SpacesHttpError &&
        failure.status === 409 &&
        failure.details?.current
      ) {
        const current = failure.details.current as {
          revision: number;
          stage: string;
          note: string;
        };
        setReviewConflict({
          path,
          body: body as Record<string, unknown>,
          current,
        });
      }
      throw failure;
    }
    if (activeOrg.current !== org) return;
    await reload(jobId);
    setNotice(success);
  };
  const [chatPanel, setChatPanel] = useState<'context' | 'history'>('context');
  const chatHistory = useChatHistory({
    api,
    path: `${org}/copilot/history/`,
    scope: `${session?.userId}:${org}`,
    setMessages: setAnswers,
    waiting: answers.some((item) => item.status === 'pending') && !copilotPending.current,
    onOpen: (chat) => {
      setCopilotPrompt('');
      if (chat.jobId !== jobId) void reload(chat.jobId || 'all');
    },
  });
  const chatBusy = busy || chatHistory.loading || answers.some((item) => item.status === 'pending');
  const newChat = () => {
    if (chatBusy || copilotPending.current) return;
    chatHistory.reset();
    setCopilotPrompt('');
  };
  const selectJob = (id: string) => {
    if (
      copilotPending.current ||
      chatHistory.loading ||
      answers.some((item) => item.status === 'pending')
    )
      return;
    chatHistory.reset();
    if (id === 'all') {
      setSort('name');
      setStageFilter('');
    }
    setAnswers([]);
    setProfileId('');
    setLimits({});
    setPipelineOffset(0);
    history.replaceState(
      null,
      '',
      workspaceUrl(spacesPagePath(paths[pages.indexOf(page)] ?? ''), org, { job: id }),
    );
    void reload(id);
  };
  const rows = useMemo(() => {
    if (page === 'Candidates') return displayedCandidates?.results ?? [];
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
            : field === 'assessment'
              ? (a.fit?.eligibility ?? 'No job context')
              : String(a[field as 'name' | 'city' | 'stage']);
      const bv =
        field === 'fit'
          ? (b.fit?.score ?? -1)
          : field === 'years'
            ? (b.years ?? -1)
            : field === 'assessment'
              ? (b.fit?.eligibility ?? 'No job context')
              : String(b[field as 'name' | 'city' | 'stage']);
      const order =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv));
      return (sort.startsWith('-') ? -order : order) || a.id.localeCompare(b.id);
    });
  }, [data, query, stageFilter, sort, page, displayedCandidates]);
  const review = (candidate: LiveCandidate, stage: string | undefined, note?: string) =>
    run(() =>
      mutate(
        `jobs/${job!.id}/candidates/${candidate.id}/`,
        'POST',
        {
          ...(stage === undefined ? {} : { stage }),
          ...(note === undefined ? {} : { note }),
          revision: candidate.reviewRevision ?? 0,
        },
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
      workspaceUrl(spacesPagePath('candidates'), org, {
        job: view.filters.job ?? jobId,
        view: view.id,
      }),
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
    <JobSelector
      key={org}
      api={api}
      org={org}
      jobs={data?.jobs ?? []}
      selected={job}
      allowAll={page === 'Candidates'}
      allSelected={jobId === 'all'}
      disabled={busy || loading || !data?.jobs.length}
      onSelect={selectJob}
    />
  );
  const table = (compact = false) => (
    <div
      className="table-wrap candidate-table-wrap"
      aria-busy={!compact && page === 'Candidates' && candidatesPending}
    >
      <table className="candidate-table">
        <colgroup>
          <col style={{ width: '34%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '14%' }} />
        </colgroup>
        <thead>
          <tr>
            {[
              ['name', 'Candidate'],
              ['fit', 'Job fit'],
              ['years', 'Experience'],
              ['city', 'Location'],
              ['stage', 'Stage'],
              ['assessment', 'Assessment'],
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
                  disabled={jobId === 'all' && ['fit', 'stage', 'assessment'].includes(field ?? '')}
                  onClick={() => setSort((current) => (current === field ? `-${field}` : field!))}
                >
                  {label}{' '}
                  <span aria-hidden="true">
                    {sort.replace('-', '') === field ? (sort.startsWith('-') ? '↓' : '↑') : '↕'}
                  </span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(compact ? rows.slice(0, 5) : rows).map((c) => (
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
      {!rows.length && !candidatesPending && !candidateError && (
        <Empty>
          Profiles appear when candidates share their profile or apply to one of your jobs.
        </Empty>
      )}
    </div>
  );
  const canManage = (permission: string) =>
    data?.organization.role === 'Owner' ||
    Boolean(data?.organization.permissions?.includes(permission));
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
          {canManage('jobs_edit') && <Button onClick={() => openJobEditor(j)}>Edit</Button>}
          {page === 'Jobs' && canManage('jobs_delete') && (
            <Button
              disabled={busy}
              onClick={async () => {
                if (
                  !(await confirmAction(
                    `Delete ${j.title}? Applications, messages and activity history will be retained.`,
                    'Delete job',
                  ))
                )
                  return;
                void run(async () => {
                  await api.request(`${org}/jobs/${j.id}/`, 'DELETE', { revision: j.revision });
                  await reload('');
                  setNotice('Job deleted. Historical records are retained.');
                });
              }}
            >
              Delete
            </Button>
          )}
        </div>
      </div>
      {page !== 'Overview' && (
        <p className="tiny muted">
          Status: {j.status} · Revision {j.revision}
        </p>
      )}
    </article>
  );
  if (access.mode && session)
    return (
      <AccountAccess
        api={api}
        mode={access.mode}
        token={access.token}
        authenticated={session.authenticated}
        signedIn={setSession}
        done={() => setAccess({ mode: '', token: '' })}
      />
    );
  if (session?.authenticated && membership && !canAccess)
    return (
      <div className="verification-page">
        <section className="verification-intro">
          <h2>kormic spaces</h2>
          <h1>Verify your workspace</h1>
          <p>
            We verify email access and review company identity separately to protect candidates.
          </p>
        </section>
        <section className="login-form-side">
          <div className="login-form">
            <h2>{membership.name}</h2>
            <h3>1. Verify your work email</h3>
            <p>
              {session.emailVerified
                ? 'Work email verified.'
                : 'Verify your work email to continue.'}
            </p>
            {!session.emailVerified && (
              <>
                <Button
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await api.request('verification/', 'POST', {
                        action: 'send',
                      });
                      setNotice('Check your work email. The code expires in 10 minutes.');
                    })
                  }
                >
                  Send verification code
                </Button>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const code = new FormData(event.currentTarget).get('code');
                    void run(async () => {
                      await api.request('verification/', 'POST', {
                        action: 'verify',
                        code,
                      });
                      setSession(await api.request<SessionData>('session/'));
                      setNotice('Your work email is verified.');
                    });
                  }}
                >
                  <label className="field">
                    Verification code
                    <input
                      name="code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                    />
                  </label>
                  <button className="btn primary" disabled={busy} type="submit">
                    Verify email
                  </button>
                </form>
              </>
            )}
            <h3>2. Company review</h3>
            <p>
              {membership.verificationStatus === 'rejected'
                ? 'Your company review was not approved. Contact your Kormic administrator for the next steps.'
                : membership.verificationStatus === 'approved'
                  ? 'Company review approved. Each team member must verify their own email.'
                  : 'Company review pending. Your Kormic administrator must review the company before candidate access is enabled.'}
            </p>
            <p>Email verification alone does not verify a company’s identity.</p>
            {notice && <p role="status">{notice}</p>}
            {error && <p role="alert">{error}</p>}
            <Button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  setSession(await api.request<SessionData>('session/'));
                })
              }
            >
              Check verification status
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (!(await confirmSignOut())) return;
                  setSession(
                    await api.request<SessionData>('session/', 'POST', {
                      action: 'logout',
                    }),
                  );
                })
              }
            >
              Sign out
            </Button>
          </div>
        </section>
      </div>
    );
  if (session?.authenticated && !membership)
    return (
      <div className="login">
        <section className="login-entry">
          <div className="login-form">
            <h1>Workspace access unavailable</h1>
            <p>
              The requested workspace is unavailable to this account. Open a valid company link or
              contact its owner.
            </p>
            {session.organizations.map((item) => (
              <Button
                key={item.id}
                onClick={() => window.location.assign(workspaceUrl(spacesPagePath(''), item.id))}
              >
                Open {item.name}
              </Button>
            ))}
            {error && <p role="alert">{error}</p>}
            <Button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (!(await confirmSignOut())) return;
                  setSession(
                    await api.request<SessionData>('session/', 'POST', {
                      action: 'logout',
                    }),
                  );
                })
              }
            >
              Sign out
            </Button>
          </div>
        </section>
      </div>
    );
  if (!session?.authenticated || !org)
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
          <p>A focused workspace for thoughtful hiring.</p>
          <ul className="login-benefits">
            <li>Review profiles with supporting evidence</li>
            <li>Keep your team and pipeline in sync</li>
            <li>Move from shortlist to conversation</li>
          </ul>
          {portalUrl('careers') && <a href={portalUrl('careers')}>Go to the candidate portal</a>}
        </section>
        <section className="login-form-side">
          <AuthForm
            busy={busy}
            error={error || sessionError}
            ready={!!session}
            recover={() => setAccess({ mode: 'request_reset', token: '' })}
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
      <a className="skip" href="#spaces-main">
        Skip to content
      </a>
      <CollapsibleSidebar className="workspace-sidebar">
        <button
          className="home-brand"
          onClick={() => navigate('Overview')}
          aria-label="Kormic Spaces home"
        >
          <span className="brand-mark" aria-hidden="true">
            k
          </span>
          <span>
            <strong>kormic</strong>
            <small>SPACES</small>
          </span>
        </button>
        <p className="nav-label">WORKSPACE</p>
        <nav className="workspace-nav" aria-label="Workspace navigation">
          {pages.map((p) => (
            <button
              key={p}
              className={`nav-item ${page === p ? 'active' : ''}`}
              aria-current={page === p ? 'page' : undefined}
              onClick={() => navigate(p)}
            >
              <NavIcon page={p} />
              <span>{p}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom company-account-footer">
          <div className="company-footer-identity">
            <span className="workspace-avatar" aria-hidden="true">
              {(
                data?.members.find((m) => m.userId === session.userId)?.display_name ||
                session.organizations.find((m) => m.id === org)?.displayName ||
                'U'
              ).slice(0, 1)}
            </span>
            <div>
              <strong>
                {data?.members.find((m) => m.userId === session.userId)?.display_name ||
                  session.organizations.find((m) => m.id === org)?.displayName}
              </strong>
              <small>
                {data?.organization.name || session.organizations.find((m) => m.id === org)?.name}
              </small>
            </div>
          </div>
          <Button
            label="Sign out"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                if (!(await confirmSignOut())) return;
                setSession(
                  await api.request<SessionData>('session/', 'POST', {
                    action: 'logout',
                  }),
                );
                setData(undefined);
                clearInbox();
                setAnswers([]);
              })
            }
          >
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M10 17v3H4V4h6v3M8 12h12m-4-4 4 4-4 4" />
            </svg>
          </Button>
        </div>
      </CollapsibleSidebar>
      <main
        id="spaces-main"
        tabIndex={-1}
        className={`main page-${paths[pages.indexOf(page)] || 'overview'}`}
        aria-busy={busy || loading}
      >
        {error && (
          <div className="live-alert" role="alert">
            {error} <Button onClick={() => setError('')}>Dismiss</Button>
          </div>
        )}
        {workspaceError && (
          <div className="live-alert" role="alert">
            Workspace refresh: {workspaceError}{' '}
            <Button disabled={loading} onClick={() => void reload(jobId)}>
              Retry workspace refresh
            </Button>
          </div>
        )}
        {sessionError && (
          <div className="live-alert" role="alert">
            Session refresh: {sessionError}
          </div>
        )}
        {receiptError && page === 'Messages' && (
          <div className="live-alert" role="alert">
            Message receipts: {receiptError}
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
            <div className="page-head">
              <div>
                <h1>{page === 'Overview' ? 'Hiring overview' : page}</h1>
                {!['Overview', 'Activity log', 'Settings'].includes(page) && (
                  <p>
                    {page === 'Candidates'
                      ? `${data.overview.candidates} shared profiles · job fit is based on current evidence`
                      : page === 'Pipeline'
                        ? 'Track progress and move candidates through your hiring process.'
                        : pageDescriptions[page]}
                  </p>
                )}
              </div>
              <div className="page-actions">
                {['Overview', 'Candidates', 'Pipeline', 'Hiring copilot'].includes(page) &&
                  selector}
                {!['Activity log', 'Job collection', 'Settings'].includes(page) && (
                  <Button disabled={loading || busy} onClick={() => void reload(jobId)}>
                    Refresh
                  </Button>
                )}
                {['Overview', 'Jobs'].includes(page) && canManage('jobs_create') && (
                  <Button primary onClick={() => openJobEditor({ ...emptyJob })}>
                    + Create a job
                  </Button>
                )}
              </div>
            </div>
            {loading && (
              <p className="context-loading" role="status">
                Updating job context…
              </p>
            )}
            {page === 'Overview' && (
              <>
                <section className="metrics-strip">
                  {[
                    ['Active jobs', data.overview.liveJobs],
                    [
                      'Eligible people',
                      data.overview.matchesUpdating ? 'Updating…' : data.overview.eligible,
                    ],
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
                      JOB SNAPSHOT · {job?.title ?? 'YOUR NEXT OPPORTUNITY'}
                    </div>
                    <h2>
                      {!job
                        ? 'Start with the role you want to fill'
                        : data.overview.matchesUpdating
                          ? 'Updating candidate matches…'
                          : `${data.overview.eligible} eligible profiles to explore`}
                    </h2>
                  </div>
                  <Button
                    primary
                    onClick={() =>
                      job ? navigate('Hiring copilot') : openJobEditor({ ...emptyJob })
                    }
                  >
                    {job ? 'Explore with Sage' : 'Create your first job'}
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
                <div className="activity-shortcut">
                  <div>
                    <h2>Workspace activity</h2>
                    <p className="muted">Review who changed what, and when.</p>
                  </div>
                  <Button onClick={() => navigate('Activity log')}>View activity log →</Button>
                </div>
              </>
            )}

            {page === 'Activity log' && org && <ActivityLog key={org} api={api} org={org} />}
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
                  {(jobsPaging.page?.results ?? []).map(jobCard)}
                </section>
                <JobPageControls paging={jobsPaging} />
                {jobsPaging.page?.count === 0 && (
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
                    disabled={jobId === 'all'}
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
                <div className="candidate-update-status" role="status">
                  {candidatesPending ? 'Updating results…' : ''}
                </div>
                {table()}
                {candidateError && <p role="alert">{candidateError}</p>}
                <div className="candidate-pagination" aria-label="Candidate pagination">
                  <span role="status">
                    {candidatesPending
                      ? 'Updating candidates…'
                      : currentCandidates
                        ? `${currentCandidates.count ? pageIndex * pageSize + 1 : 0}–${Math.min((pageIndex + 1) * pageSize, currentCandidates.count)} of ${currentCandidates.count} candidates`
                        : 'No candidates loaded'}
                  </span>
                  <label>
                    Per page{' '}
                    <select
                      value={pageSize}
                      onChange={(event) => setPageSize(Number(event.target.value))}
                    >
                      {[10, 25, 50].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button
                    disabled={candidateLoading || pageIndex === 0}
                    onClick={() =>
                      setCandidatePage({
                        key: candidateKey,
                        index: pageIndex - 1,
                      })
                    }
                  >
                    Previous
                  </Button>
                  <span>
                    Page {pageIndex + 1} of{' '}
                    {Math.max(1, Math.ceil((currentCandidates?.count ?? 0) / pageSize))}
                  </span>
                  <Button
                    disabled={
                      candidateLoading ||
                      !currentCandidates ||
                      (pageIndex + 1) * pageSize >= currentCandidates.count
                    }
                    onClick={() =>
                      setCandidatePage({
                        key: candidateKey,
                        index: pageIndex + 1,
                      })
                    }
                  >
                    Next
                  </Button>
                </div>
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
                      setPipelineOffset(0);
                      setLimits({});
                    }}
                  />
                </div>
                <div className="live-board">
                  {stages
                    .filter((stage) => stage !== 'Rejected')
                    .map((stage) => {
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
                <div className="live-toolbar">
                  <Button
                    disabled={loading || pipelineOffset === 0}
                    onClick={() => setPipelineOffset(Math.max(0, pipelineOffset - 50))}
                  >
                    Previous candidates
                  </Button>
                  <span>
                    {data.candidatesPage
                      ? `${pipelineOffset + (data.candidatesPage.count ? 1 : 0)}–${pipelineOffset + data.candidates.length} of ${data.candidatesPage.count} candidates`
                      : ''}
                  </span>
                  <Button
                    disabled={
                      loading ||
                      !data.candidatesPage ||
                      pipelineOffset + 50 >= data.candidatesPage.count
                    }
                    onClick={() => setPipelineOffset(pipelineOffset + 50)}
                  >
                    Next candidates
                  </Button>
                </div>
              </>
            )}
            {page === 'Messages' && (
              <>
                <div className="live-toolbar">
                  <Search label="Search messages" value={inbox.query} onChange={inbox.setQuery} />
                </div>
                <div className="live-messages">
                  <aside>
                    {inbox.error && <p role="alert">{inbox.error}</p>}
                    {inbox.loading && <p role="status">Loading messages…</p>}
                    {threads.map((t) => (
                      <button
                        key={t.id}
                        className={`thread ${threadId === t.id ? 'active' : ''}`}
                        onClick={() => {
                          setThreadId(t.id);
                          setContactId('');
                        }}
                      >
                        <strong>
                          {t.name}
                          {!!t.unreadCount && ` · ${t.unreadCount} unread`}
                        </strong>
                        <span>{t.jobTitle}</span>
                      </button>
                    ))}
                    {!threads.length && !inbox.loading && (
                      <Empty>Open a candidate profile to start a conversation.</Empty>
                    )}
                    <div className="row">
                      <Button
                        disabled={!inbox.offset}
                        onClick={() => inbox.setOffset(Math.max(0, inbox.offset - 25))}
                      >
                        Previous
                      </Button>
                      <span>{inbox.count} conversations</span>
                      <Button
                        disabled={inbox.next === null}
                        onClick={() => inbox.setOffset(inbox.next!)}
                      >
                        Next
                      </Button>
                    </div>
                  </aside>
                  <section>
                    {inbox.before !== null && (
                      <Button disabled={inbox.olderBusy} onClick={() => void inbox.older()}>
                        Load older messages
                      </Button>
                    )}
                    <ConversationPanel
                      key={threadId || contactId}
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
                          const targetJob = contactId ? job!.id : thread!.jobId;
                          if (
                            !sendAttempt.current ||
                            sendAttempt.current.personId !== personId ||
                            sendAttempt.current.jobId !== targetJob ||
                            sendAttempt.current.text !== text
                          )
                            sendAttempt.current = {
                              personId,
                              jobId: targetJob,
                              text,
                              requestId: crypto.randomUUID(),
                            };
                          const result = await api.request<{
                            applicationId: string;
                          }>(`${org}/messages/`, 'POST', sendAttempt.current);
                          sendAttempt.current = undefined;
                          inbox.refresh();
                          inbox.setSelected(result.applicationId);
                          setNotice('Message sent.');
                        })
                      }
                    />
                  </section>
                </div>
              </>
            )}
            {page === 'Hiring copilot' && (
              <div className="hiring-chat-layout">
                <ChatHistoryStyles />
                <section className="live-panel copilot-panel">
                  <div className="row between hiring-chat-header">
                    <div>
                      <h2>Sage, your hiring copilot</h2>
                      <p className="muted">
                        Company-scoped assistance. Review and confirm any proposed changes.
                      </p>
                    </div>
                    <div className="chat-header-actions">
                      <Button onClick={() => setChatPanel('context')}>Job context</Button>
                      <Button onClick={() => setChatPanel('history')}>Chat history</Button>
                      <Button disabled={chatBusy} onClick={newChat}>
                        New chat
                      </Button>
                    </div>
                  </div>
                  <div className="chat-history-status" aria-live="polite">
                    {chatHistory.loading ? 'Opening chat…' : chatHistory.active?.title}
                  </div>
                  {chatHistory.error && <p role="alert">{chatHistory.error}</p>}
                  {chatHistory.active?.jobUnavailable && (
                    <p role="status">This job was deleted. Start a new chat to use another job.</p>
                  )}
                  <div
                    className="live-answer-list"
                    ref={conversationRef}
                    role="log"
                    aria-label="Conversation with Sage"
                    aria-live="polite"
                  >
                    {chatHistory.nextOffset !== null && (
                      <Button
                        disabled={chatBusy}
                        onClick={() => void chatHistory.open(chatHistory.active!.id, true)}
                      >
                        Load older messages
                      </Button>
                    )}
                    {!job && !answers.length ? (
                      <div role="status">
                        <h3>Create a job to get started</h3>
                        <p>
                          Sage needs a role and its requirements before it can help you assess
                          candidates.
                        </p>
                        <Button primary onClick={() => openJobEditor({ ...emptyJob })}>
                          Create your first job
                        </Button>
                      </div>
                    ) : !data.copilotConfigured ? (
                      <p role="status">
                        Sage is unavailable. Your workspace administrator can enable it. You can
                        still review candidates and manage this job.
                      </p>
                    ) : !data.candidates.some((c) => c.aiConsent) ? (
                      <div role="status">
                        <h3>No candidate evidence available for Sage yet</h3>
                        <p>
                          Candidate assistance becomes available when profiles shared with your
                          workspace allow AI assistance. You can still ask about jobs and request
                          permitted workspace changes.
                        </p>
                        <Button onClick={() => navigate('Candidates')}>Review candidates</Button>
                      </div>
                    ) : null}
                    {copilotReady &&
                      !!job &&
                      data.candidates.some((c) => c.aiConsent) &&
                      !answers.length && (
                        <div className="copilot-welcome">
                          <span className="copilot-symbol" aria-hidden="true">
                            ✦
                          </span>
                          <h3>A second perspective on your shortlist</h3>
                          <p>Compare evidence, identify gaps, or prepare your next conversation.</p>
                        </div>
                      )}
                    {answers.map((a) => (
                      <article key={a.id} className="chat-exchange">
                        <div className="chat-user-bubble" role="group" aria-label="Your message">
                          <p>{a.question}</p>
                        </div>
                        <div className="chat-agent-reply" role="group" aria-label="Agent response">
                          {a.status === 'pending' ? (
                            <p role="status" className="copilot-pending">
                              Sage is thinking…
                            </p>
                          ) : a.status === 'failed' ? (
                            <div role="alert">
                              <p>{a.answer}</p>
                              <button
                                className="btn"
                                disabled={busy}
                                onClick={() => setCopilotPrompt(a.question)}
                              >
                                Restore question to retry
                              </button>
                            </div>
                          ) : (
                            <AssistantText text={a.answer} />
                          )}
                          {a.action && (
                            <section
                              className="agent-proposal"
                              aria-label="Proposed company action"
                            >
                              <h3>{a.action.type.replaceAll('_', ' ')}</h3>
                              <p>
                                <strong>{a.action.target}</strong>
                              </p>
                              <dl>
                                {Object.entries(a.action.data)
                                  .filter(
                                    ([key]) => !['revision', 'jobId', 'personId'].includes(key),
                                  )
                                  .map(([key, value]) => (
                                    <div key={key}>
                                      <dt>{key.replace(/([A-Z])/g, ' $1')}</dt>
                                      <dd>
                                        {Array.isArray(value) ? value.join(', ') : String(value)}
                                      </dd>
                                    </div>
                                  ))}
                              </dl>
                              {a.action.status === 'pending' ? (
                                <>
                                  <p>
                                    Review every detail. Nothing changes until you confirm. This
                                    proposal expires in 10 minutes.
                                  </p>
                                  <div className="actions">
                                    {(['confirm', 'cancel'] as const).map((decision) => (
                                      <button
                                        key={decision}
                                        className={decision === 'confirm' ? 'btn primary' : 'btn'}
                                        disabled={busy}
                                        onClick={() =>
                                          void run(async () => {
                                            const result = await api.request<{ status: string }>(
                                              `${org}/copilot/actions/${a.action!.id}/`,
                                              'POST',
                                              { decision },
                                            );
                                            setAnswers((items) =>
                                              items.map((item) =>
                                                item.action?.id === a.action!.id
                                                  ? {
                                                      ...item,
                                                      action: {
                                                        ...item.action,
                                                        status: result.status,
                                                      },
                                                    }
                                                  : item,
                                              ),
                                            );
                                            if (result.status === 'completed') await reload(jobId);
                                          })
                                        }
                                      >
                                        {decision === 'confirm' ? 'Confirm action' : 'Cancel'}
                                      </button>
                                    ))}
                                  </div>
                                </>
                              ) : (
                                <p role="status">Action {a.action.status}.</p>
                              )}
                            </section>
                          )}
                        </div>
                      </article>
                    ))}
                    {copilotReady &&
                      !!job &&
                      data.candidates.some((c) => c.aiConsent) &&
                      !answers.length && (
                        <div className="hiring-chat-suggestions">
                          {[
                            'Who meets this job’s minimum threshold?',
                            'Which evidence should I clarify?',
                            'Draft a thoughtful interview invitation.',
                          ].map((p) => (
                            <Button
                              key={p}
                              disabled={!copilotReady || busy}
                              onClick={() => setCopilotPrompt(p)}
                            >
                              {p}
                            </Button>
                          ))}
                        </div>
                      )}
                  </div>
                  <form
                    className="hiring-chat-composer"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (
                        !copilotReady ||
                        chatBusy ||
                        chatHistory.active?.jobUnavailable ||
                        copilotPending.current ||
                        !copilotPrompt.trim()
                      )
                        return;
                      const id = crypto.randomUUID();
                      const prompt = copilotPrompt.trim();
                      copilotPending.current = true;
                      void run(async () => {
                        setAnswers((items) => [
                          ...items,
                          { id, question: prompt, answer: '', status: 'pending' },
                        ]);
                        setCopilotPrompt('');
                        try {
                          const result = await api.request<{
                            answer: string;
                            action?: (typeof answers)[number]['action'];
                            conversationId?: string;
                          }>(`${org}/copilot/`, 'POST', {
                            jobId: job?.id,
                            prompt,
                            requestId: id,
                            conversationId: chatHistory.active?.id,
                          });
                          if (!chatHistory.isCurrent()) return;
                          chatHistory.recorded(result.conversationId, prompt, job?.id || null);
                          setAnswers((items) =>
                            items.map((item) =>
                              item.id === id
                                ? {
                                    ...item,
                                    answer: result.answer,
                                    action: result.action,
                                    status: 'completed',
                                  }
                                : item,
                            ),
                          );
                        } catch (failure) {
                          if (!chatHistory.isCurrent()) return;
                          chatHistory.failed(failure, prompt, job?.id || null);
                          setAnswers((items) =>
                            items.map((item) =>
                              item.id === id
                                ? { ...item, answer: errorText(failure), status: 'failed' }
                                : item,
                            ),
                          );
                        } finally {
                          copilotPending.current = false;
                        }
                      });
                    }}
                  >
                    <label className="field">
                      Ask about this job
                      <textarea
                        rows={2}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            e.currentTarget.form?.requestSubmit();
                          }
                        }}
                        readOnly={chatBusy}
                        aria-describedby="copilot-composer-help"
                        required
                        maxLength={2000}
                        value={copilotPrompt}
                        onChange={(e) => setCopilotPrompt(e.target.value)}
                        placeholder="Ask about fit, evidence gaps, or your next conversation…"
                      />
                    </label>
                    <button
                      className="btn primary"
                      disabled={
                        chatBusy ||
                        chatHistory.active?.jobUnavailable ||
                        !copilotReady ||
                        !copilotPrompt.trim()
                      }
                    >
                      {chatBusy ? 'Sage is thinking…' : 'Ask Sage'}
                    </button>
                    <small id="copilot-composer-help">
                      {copilotReady
                        ? 'Enter to send · Shift + Enter for a new line. Review answers before acting.'
                        : loading
                          ? 'You can draft a question while job context loads.'
                          : !job
                            ? 'You can draft a question. Select or create a job before sending.'
                            : !data?.copilotConfigured
                              ? 'You can draft a question. Sending is unavailable while Sage is offline.'
                              : 'You can draft a question. Sending requires candidate profiles that allow AI assistance.'}
                    </small>
                  </form>
                </section>
                {chatPanel === 'history' ? (
                  <ChatHistory
                    api={api}
                    path={`${org}/copilot/history/`}
                    activeId={chatHistory.active?.id}
                    disabled={chatBusy}
                    version={chatHistory.version}
                    onOpen={(id) => void chatHistory.open(id)}
                    onRename={chatHistory.renamed}
                    onDelete={chatHistory.deleted}
                  />
                ) : (
                  <aside className="hiring-chat-context" aria-label="Selected job context">
                    <h2>Job context</h2>
                    <h3>{job?.title ?? 'No job selected'}</h3>
                    {job && (
                      <>
                        <p>
                          {job.location} · {job.work}
                        </p>
                        <dl>
                          <div>
                            <dt>Minimum fit</dt>
                            <dd>{job.threshold}%</dd>
                          </div>
                          <div>
                            <dt>Experience</dt>
                            <dd>{job.years}+ years</dd>
                          </div>
                        </dl>
                        <h3>Required skills</h3>
                        <div className="opportunity-skills">
                          {job.skills.map((skill) => (
                            <span key={skill}>{skill}</span>
                          ))}
                        </div>
                      </>
                    )}
                    <h3>Evidence and privacy</h3>
                    <p>
                      Sage uses up to 25 currently eligible profiles for this job that allow AI
                      assistance. Private chats and screening details are excluded.
                    </p>
                    <p>
                      Answers and drafts support your review. You make hiring decisions and send
                      messages yourself.
                    </p>
                  </aside>
                )}
              </div>
            )}
            {page === 'Settings' && org && (
              <TeamSettings
                api={api}
                org={org}
                companyName={data.organization.name}
                changed={() => reload(jobId)}
              />
            )}
          </>
        )}
      </main>
      {reviewConflict && (
        <Modal title="Review changed" close={() => setReviewConflict(undefined)}>
          <p>Another reviewer changed this record. Compare before saving your changes.</p>
          <p>
            Current stage: <strong>{reviewConflict.current.stage}</strong>
          </p>
          <h3>Current note</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{reviewConflict.current.note || 'No note'}</p>
          {'note' in reviewConflict.body && (
            <>
              <h3>Your draft</h3>
              <p style={{ whiteSpace: 'pre-wrap' }}>
                {String(reviewConflict.body.note) || 'Empty note'}
              </p>
            </>
          )}
          {'stage' in reviewConflict.body && <p>Your stage: {String(reviewConflict.body.stage)}</p>}
          <Button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await mutate(
                  reviewConflict.path,
                  'POST',
                  {
                    ...reviewConflict.body,
                    revision: reviewConflict.current.revision,
                  },
                  'Review saved.',
                );
                setReviewConflict(undefined);
              })
            }
          >
            Save my changes against this version
          </Button>
          <Button onClick={() => setReviewConflict(undefined)}>Keep editing</Button>
        </Modal>
      )}
      {editing && editing.workspaceId === org && (
        <Modal
          title={editing.job.id ? 'Edit job' : 'Create a job'}
          close={() => setEditing(undefined)}
        >
          <p className="muted">Company: {data?.organization.name}</p>
          <JobForm
            initial={editing.job}
            busy={busy}
            error={error}
            save={(draft) =>
              run(async () => {
                if (editing.workspaceId !== org || activeOrg.current !== editing.workspaceId)
                  throw new Error('Workspace changed. Reopen the job form.');
                await mutate(
                  `jobs/${draft.id ? `${draft.id}/` : ''}`,
                  draft.id ? 'PATCH' : 'POST',
                  draft.id ? draft : { ...draft, requestId: editing.requestId },
                  `Job saved as ${draft.status}.`,
                );
                setEditing(undefined);
              })
            }
          />
        </Modal>
      )}
      {profile && (
        <Modal title={profile.name} className="candidate-dialog" close={() => setProfileId('')}>
          <CandidateProfile
            key={`${profile.id}:${job?.id ?? 'directory'}`}
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
                  workspaceUrl(spacesPagePath('candidates'), org, { job: jobId, view: v.id }),
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
    </div>
  );
}

function AuthForm({
  recover,
  busy,
  error,
  ready,
  submit,
}: {
  busy: boolean;
  error: string;
  ready: boolean;
  submit: (body: unknown) => Promise<boolean>;
  recover: () => void;
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
          void submit({
            ...formValues(e.currentTarget),
            action: register ? 'register' : 'login',
          });
        }}
      >
        {register && (
          <>
            <label className="field">
              Your name
              <input name="name" required autoComplete="name" maxLength={160} />
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
      <Button onClick={recover}>Forgot your password?</Button>
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
    <form className="job-form" onSubmit={submit}>
      <h3 className="form-section-title">Role details</h3>
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
      <h3 className="form-section-title">Matching requirements</h3>
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
      <h3 className="form-section-title">Fit weights</h3>
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
  review: (c: LiveCandidate, stage: string | undefined, note?: string) => Promise<boolean>;
  contact: () => void;
  ask: () => void;
}) {
  const [note, setNote] = useState(c.note);
  const [noteRevision, setNoteRevision] = useState(c.reviewRevision ?? 0);
  useEffect(() => {
    if (note === c.note) setNoteRevision(c.reviewRevision ?? 0);
  }, [note, c.note, c.reviewRevision]);
  return (
    <div className="candidate-profile">
      <div className="candidate-intro">
        <span className="candidate-avatar" aria-hidden="true">
          {c.name
            .split(' ')
            .slice(0, 2)
            .map((part) => part[0])
            .join('')}
        </span>
        <div>
          <p className="candidate-role">{c.role || 'Role not specified'}</p>
          <p className="candidate-meta">
            {c.city || 'Location not specified'} ·{' '}
            {c.years === null ? 'Experience not evidenced' : `${c.years}+ years evidenced`}
          </p>
        </div>
        <Tag>{c.stage}</Tag>
      </div>
      <div className="candidate-fit">
        <div className="candidate-fit-summary">
          <p className="candidate-eyebrow">Job match</p>
          <h3>{job?.title ?? 'Choose a job to assess fit'}</h3>
          <strong className="big-score">{c.fit ? `${c.fit.score}%` : '—'}</strong>
          <Tag>{c.fit?.eligibility ?? 'No job context'}</Tag>
        </div>
        <div className="candidate-criteria">
          {c.fit?.criteria.map((label, i) => {
            const value = c.fit?.breakdown[i];
            const percent = value == null ? null : Math.round(value * 100);
            return (
              <div className="candidate-criterion" key={label}>
                <div>
                  <span>{label}</span>
                  <strong>{percent === null ? 'Unknown' : `${percent}%`}</strong>
                </div>
                {percent !== null && <progress aria-label={label} max={100} value={percent} />}
              </div>
            );
          })}
        </div>
        <div className="candidate-fit-reasons">
          {c.fit?.reasons.map((r) => (
            <p key={r}>{r}</p>
          ))}
        </div>
      </div>
      <section className="profile-section">
        <h3>Application preferences</h3>
        <dl className="candidate-preferences">
          <div>
            <dt>Preferred roles</dt>
            <dd>{c.preferences.roles.join(', ') || 'Not specified'}</dd>
          </div>
          <div>
            <dt>Locations</dt>
            <dd>{c.preferences.locations.join(', ') || 'Not specified'}</dd>
          </div>
          <div>
            <dt>Work arrangement</dt>
            <dd>
              {[...c.preferences.workModes, ...c.preferences.jobTypes].join(' · ') ||
                'Not specified'}
            </dd>
          </div>
          <div>
            <dt>Availability</dt>
            <dd>
              {c.preferences.availableDays === null
                ? 'Not specified'
                : c.preferences.availableDays === 0
                  ? 'Available immediately'
                  : `Within ${c.preferences.availableDays} days`}
            </dd>
          </div>
        </dl>
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
        <div className="candidate-evidence-list">
          {c.records.map((r) => (
            <details
              className="candidate-evidence"
              key={r.id}
              open={['work_experience_entries', 'experience', 'experiences'].includes(r.section)}
            >
              <summary>
                <span>
                  <span className="candidate-eyebrow">
                    {['work_experience_entries', 'experiences'].includes(r.section)
                      ? 'Work experience'
                      : r.section.replaceAll('_', ' ')}
                  </span>
                  <strong>
                    {String(
                      r.details.title ||
                        r.details.name ||
                        r.details.value ||
                        r.details.degree ||
                        'Profile record',
                    )}
                  </strong>
                </span>
                <Tag>{r.method.replaceAll('_', ' ')}</Tag>
              </summary>
              <dl className="candidate-record-details">
                {Object.entries(r.details)
                  .filter(([, value]) => value !== null && value !== '')
                  .map(([key, value]) => (
                    <div key={key}>
                      <dt>{key.replaceAll('_', ' ')}</dt>
                      <dd>{Array.isArray(value) ? value.join(', ') : String(value ?? '')}</dd>
                    </div>
                  ))}
              </dl>
              <small className="candidate-evidence-meta">
                {r.method.replaceAll('_', ' ')} · {r.status} · Checked {labelDate(r.checkedAt)}
              </small>
            </details>
          ))}
        </div>
        {!c.records.length && <p>No profile evidence shared yet.</p>}
        <p className="tiny muted">
          Source checked means the supplied source supports that fact; it does not mean the issuing
          authority confirmed it.
        </p>
      </section>
      <label className="field candidate-note">
        Private team note
        <textarea
          rows={3}
          placeholder="Add context for your hiring team…"
          maxLength={5000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <div className="candidate-actions">
        <Button
          disabled={busy || !job}
          onClick={() => void review({ ...c, reviewRevision: noteRevision }, undefined, note)}
        >
          Save note
        </Button>
        <label>
          Review stage
          <select
            disabled={busy || !job}
            value={c.stage}
            onChange={(e) => void review(c, e.target.value)}
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
    </div>
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
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              if (!busy && text.trim()) event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Write a thoughtful message…"
        />
        <button className="btn primary" disabled={busy || !text.trim()}>
          Send message
        </button>
      </form>
    </>
  );
}
