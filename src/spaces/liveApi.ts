export interface LiveJob {
  id: string;
  title: string;
  department: string;
  location: string;
  work: string;
  type: string;
  salary: string;
  description: string;
  skills: string[];
  years: number;
  threshold: number;
  hardSkills: boolean;
  hardYears: boolean;
  availableDays: number;
  weights: number[];
  status: 'Live' | 'Draft' | 'Paused' | 'Closed';
  revision: number;
}
export interface LiveCandidate {
  id: string;
  name: string;
  city: string;
  role: string;
  skills: string[];
  years: number | null;
  experienceBasis: string;
  stage: string;
  note: string;
  reviewRevision?: number;
  source: string;
  aiConsent: boolean;
  preferences: {
    roles: string[];
    locations: string[];
    workModes: string[];
    jobTypes: string[];
    availableDays: number | null;
  };
  records: {
    id: number;
    section: string;
    details: Record<string, unknown>;
    method: string;
    status: string;
    checkedAt: string;
  }[];
  fit: {
    score: number;
    eligibility: string;
    reasons: string[];
    breakdown: (number | null)[];
    criteria: string[];
  } | null;
}
export interface SharedView {
  id: string;
  name: string;
  filters: { job?: string; q?: string; sort?: string; stage?: string };
}
export interface WorkspaceData {
  organization: { id: string; name: string; role: string; permissions?: string[] };
  jobs: LiveJob[];
  selectedJob: string | null;
  selectedJobData?: LiveJob | null;
  jobsPage?: { count: number; offset: number; limit: number };
  candidatesPage?: { count: number; offset: number; limit: number };
  candidates: LiveCandidate[];
  overview: {
    liveJobs: number;
    candidates: number;
    eligible: number;
    matchesUpdating?: boolean;
    shortlisted: number;
    conversations: number;
  };
  activity: {
    id: number;
    text: string;
    created_at: string;
    event_type?: string;
    actor_name?: string;
    candidate_name?: string;
    job_title?: string;
    previous_stage?: string;
    new_stage?: string;
    changes?: Record<string, unknown>;
  }[];
  members: {
    id: number;
    userId?: number;
    email?: string;
    display_name: string;
    role: string;
    designation?: string;
    permissions?: string[];
  }[];
  sharedViews: SharedView[];
  copilotConfigured: boolean;
}
export interface SessionData {
  emailVerified?: boolean;
  userId?: number | null;
  authenticated: boolean;
  csrfToken: string;
  organizations: {
    id: string;
    name: string;
    role: string;
    displayName: string;
    verificationStatus?: 'pending' | 'approved' | 'rejected';
  }[];
}
export interface Conversation {
  id: string;
  personId: string;
  name: string;
  jobId: string;
  jobTitle: string;
  unreadCount?: number;
  latest?: { id: string; author: string; text: string; time: string };
  messages: {
    id: string;
    author: string;
    text: string;
    time: string;
    ordinal?: number;
    unread?: boolean;
  }[];
}

export function canAccessWorkspace(session?: SessionData, workspaceId?: string): boolean {
  return (
    session?.authenticated === true &&
    session.emailVerified === true &&
    (workspaceId
      ? session.organizations.find((item) => item.id === workspaceId)
      : session.organizations[0]
    )?.verificationStatus === 'approved'
  );
}

export class SpacesHttpError extends Error {
  readonly status: number;
  details?: Record<string, unknown>;
  constructor(message: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export class SpacesClient {
  private csrf = '';
  private sessionIdentity?: string;
  onSessionChange?: (session: SessionData) => void;
  private host: string;
  constructor(host: string) {
    this.host = host;
  }
  async request<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
    // Opt-in for the employer workspace. Never replay a mutation after an account switch.
    if (this.onSessionChange && method !== 'GET') {
      const previous = this.sessionIdentity;
      await this.request<SessionData>('session/', 'GET', undefined, signal);
      if (previous !== undefined && previous !== this.sessionIdentity)
        throw new Error(
          'Your sign-in changed in another tab. Review the current workspace and try again.',
        );
    }
    const identityAtStart = this.sessionIdentity;
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) controller.abort();
    const timeout = setTimeout(() => controller.abort(), path.includes('copilot') ? 110000 : 20000);
    try {
      const response = await fetch(`${this.host.replace(/\/$/, '')}/spaces/${path}`, {
        method,
        credentials: 'include',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': this.csrf,
          Accept: 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!response.headers.get('content-type')?.includes('application/json')) {
        if ([401, 403].includes(response.status))
          throw new SpacesHttpError('Your session is no longer authorized.', response.status);
        throw new Error(
          'Spaces could not reach its API. Check the backend URL or proxy configuration.',
        );
      }
      const value: unknown = await response.json();
      if (!response.ok) {
        if (
          this.onSessionChange &&
          path !== 'session/' &&
          [401, 403, 404].includes(response.status)
        ) {
          await this.request<SessionData>('session/', 'GET', undefined, signal);
          if (identityAtStart !== this.sessionIdentity)
            throw new Error(
              'Your sign-in changed in another tab. The workspace has been refreshed.',
            );
        }
        const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
        const detail =
          record.detail ??
          record.error ??
          Object.entries(record)
            .map(([k, v]) => `${k}: ${String(v)}`)
            .join(' ');
        throw new SpacesHttpError(
          typeof detail === 'string' ? detail : `Request failed (${response.status}).`,
          response.status,
          record,
        );
      }
      if (
        value &&
        typeof value === 'object' &&
        'csrfToken' in value &&
        typeof value.csrfToken === 'string'
      )
        this.csrf = value.csrfToken;
      if (path === 'session/' && value && typeof value === 'object' && 'authenticated' in value) {
        const session = value as SessionData;
        const identity = JSON.stringify([
          session.userId,
          session.authenticated,
          session.emailVerified,
          (session.organizations ?? [])
            .map(({ id, role, verificationStatus }) => [id, role, verificationStatus ?? 'pending'])
            .sort((a, b) => a[0]!.localeCompare(b[0]!)),
        ]);
        const changed = this.sessionIdentity !== undefined && this.sessionIdentity !== identity;
        this.sessionIdentity = identity;
        if (changed) this.onSessionChange?.(session);
      } else if (this.onSessionChange && identityAtStart !== this.sessionIdentity) {
        throw new Error('Your sign-in changed. Previous workspace results were discarded.');
      }
      return value as T;
    } catch (error) {
      if (signal?.aborted) throw error;
      if (error instanceof Error && error.name === 'AbortError')
        throw new Error(
          'The request timed out. Refresh to check whether it completed before retrying.',
        );
      throw error;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', cancel);
    }
  }
}
