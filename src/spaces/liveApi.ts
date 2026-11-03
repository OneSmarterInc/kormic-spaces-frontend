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
  organization: { id: string; name: string; role: string };
  jobs: LiveJob[];
  selectedJob: string | null;
  candidates: LiveCandidate[];
  overview: {
    liveJobs: number;
    candidates: number;
    eligible: number;
    shortlisted: number;
    conversations: number;
  };
  activity: { id: number; text: string; created_at: string }[];
  members: { id: number; display_name: string; role: string }[];
  sharedViews: SharedView[];
  copilotConfigured: boolean;
}
export interface SessionData {
  authenticated: boolean;
  csrfToken: string;
  organizations: { id: string; name: string; role: string; displayName: string }[];
}
export interface Conversation {
  id: string;
  personId: string;
  name: string;
  jobId: string;
  jobTitle: string;
  messages: { id: string; author: string; text: string; time: string }[];
}

export class SpacesClient {
  private csrf = '';
  private host: string;
  constructor(host: string) {
    this.host = host;
  }
  async request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const controller = new AbortController();
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
        throw new Error('Spaces could not reach its API. Check the backend URL or proxy configuration.');
      }
      const value: unknown = await response.json();
      if (!response.ok) {
        const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
        const detail =
          record.detail ??
          record.error ??
          Object.entries(record)
            .map(([k, v]) => `${k}: ${String(v)}`)
            .join(' ');
        throw new Error(
          typeof detail === 'string' ? detail : `Request failed (${response.status}).`,
        );
      }
      if (
        value &&
        typeof value === 'object' &&
        'csrfToken' in value &&
        typeof value.csrfToken === 'string'
      )
        this.csrf = value.csrfToken;
      return value as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError')
        throw new Error(
          'The request timed out. Refresh to check whether it completed before retrying.',
        );
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
