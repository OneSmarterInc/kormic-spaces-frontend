import { SpacesClient, SpacesHttpError } from './liveApi';

export interface AdminSession {
  authenticated: boolean;
  userId: number | null;
  name: string;
  email?: string;
  displayName?: string;
}

/** One authorization boundary for all admin tables, polls and mutations. */
export class AdminClient extends SpacesClient {
  onAdminSessionChange?: (session: AdminSession) => void;
  private identity?: string;
  private checkedAt = 0;
  private latest?: AdminSession;
  private generation = 0;
  private checking?: Promise<AdminSession>;
  private transition?: Promise<AdminSession>;
  private pending = new Set<AbortController>();

  private accept(session: AdminSession): AdminSession {
    // Fail closed if an older backend omits stable identity.
    const safe =
      session.authenticated && session.userId != null
        ? session
        : { authenticated: false, userId: null, name: '' };
    const identity = JSON.stringify([safe.authenticated, safe.userId]);
    if (this.identity !== identity) {
      this.identity = identity;
      this.generation++;
      for (const controller of this.pending) controller.abort();
      this.onAdminSessionChange?.(safe);
    }
    this.latest = safe;
    this.checkedAt = Date.now();
    return safe;
  }

  private session(maxAge = 0): Promise<AdminSession> {
    if (this.transition) return this.transition;
    if (!this.checking && this.latest && maxAge && Date.now() - this.checkedAt < maxAge)
      return Promise.resolve(this.latest);
    if (!this.checking) {
      this.checking = super
        .request<AdminSession>('admin/session/')
        .then((value) => this.accept(value))
        .catch((error: unknown) => {
          if (this.identity !== undefined)
            this.accept({ authenticated: false, userId: null, name: '' });
          throw error;
        })
        .finally(() => {
          this.checking = undefined;
        });
    }
    return this.checking;
  }

  override async request<T>(
    path: string,
    method = 'GET',
    body?: unknown,
    signal?: AbortSignal,
  ): Promise<T> {
    if (path === 'admin/session/') {
      if (method === 'GET') return (await this.session()) as T;
      // Serialize login/logout with checks so a poll cannot restore the old identity.
      await this.transition?.catch(() => undefined);
      const change = async () => {
        await this.checking?.catch(() => undefined);
        this.accept({ authenticated: false, userId: null, name: '' });
        return this.accept(await super.request<AdminSession>(path, method, body, signal));
      };
      this.transition = change();
      try {
        return (await this.transition) as T;
      } finally {
        this.transition = undefined;
      }
    }
    const previous = this.identity;
    const session = await this.session(method === 'GET' ? 1000 : 0);
    if (!session.authenticated) throw new Error('Your admin session ended. Sign in again.');
    if (previous !== undefined && previous !== this.identity)
      throw new Error('Your admin account changed. Review the page before trying again.');
    const generation = this.generation;
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) controller.abort();
    this.pending.add(controller);
    try {
      const value = await super.request<T>(path, method, body, controller.signal);
      await this.session(method === 'GET' ? 1000 : 0);
      if (generation !== this.generation || controller.signal.aborted)
        throw new Error('Previous admin session results were discarded.');
      return value;
    } catch (error) {
      if (error instanceof SpacesHttpError && [401, 403].includes(error.status))
        this.accept({ authenticated: false, userId: null, name: '' });
      throw error;
    } finally {
      this.pending.delete(controller);
      signal?.removeEventListener('abort', cancel);
    }
  }
}
