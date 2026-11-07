import { useEffect, useState, type FormEvent } from 'react';
import type { SpacesClient } from './liveApi';

interface Profile {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  active: boolean;
  company: string;
  accountType: string;
  lastLogin: string | null;
}
export function AccountSettings({ api }: { api: SpacesClient }) {
  const [profile, setProfile] = useState<Profile>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void api
      .request<Profile>('admin/accounts/', 'GET', undefined, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          setProfile(value);
          setError('');
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : 'Unable to load your profile.');
      });
    return () => controller.abort();
  }, [api, revision]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    const form = new FormData(event.currentTarget);
    const native = event.nativeEvent as SubmitEvent;
    const action = (native.submitter as HTMLButtonElement | null)?.value || 'update';
    const element = event.currentTarget;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api.request<{ detail: string }>('admin/accounts/', 'POST', {
        action,
        id: profile.id,
        active: true,
        firstName: form.get('firstName'),
        lastName: form.get('lastName'),
        currentPassword: form.get('currentPassword'),
      });
      setNotice(result.detail);
      setRevision((value) => value + 1);
      const password = element.elements.namedItem('currentPassword') as HTMLInputElement;
      password.value = '';
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save your changes.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="account-settings" aria-label="Your profile">
      <header>
        <h2>Profile & security</h2>
        <p>Manage your administrator profile and account recovery.</p>
      </header>
      {error && (
        <p role="alert" className="portal-alert">
          {error}
          <button className="secondary" onClick={() => setRevision((value) => value + 1)}>
            Retry
          </button>
        </p>
      )}
      {notice && (
        <p role="status" className="admin-notice">
          {notice}
        </p>
      )}
      {!profile ? (
        <p role="status">Loading your profile…</p>
      ) : (
        <form onSubmit={(event) => void submit(event)}>
          <div className="admin-form-grid">
            <label>
              First name
              <input name="firstName" defaultValue={profile.firstName} maxLength={150} required />
            </label>
            <label>
              Last name
              <input name="lastName" defaultValue={profile.lastName} maxLength={150} />
            </label>
          </div>
          <label>
            Email
            <input type="email" value={profile.email} readOnly aria-describedby="email-readonly" />
            <small id="email-readonly">Your verified sign-in email cannot be edited here.</small>
          </label>
          <dl className="profile-facts">
            <div>
              <dt>Company</dt>
              <dd>{profile.company}</dd>
            </div>
            <div>
              <dt>Account type</dt>
              <dd>{profile.accountType}</dd>
            </div>
            <div>
              <dt>Last sign-in</dt>
              <dd>
                {profile.lastLogin ? new Date(profile.lastLogin).toLocaleString() : 'Not recorded'}
              </dd>
            </div>
          </dl>
          <label>
            Current password
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              maxLength={256}
            />
            <small>Confirm your password to save changes or request a reset email.</small>
          </label>
          <div className="settings-actions">
            <button name="action" value="update" disabled={busy}>
              {busy ? 'Please wait…' : 'Save profile'}
            </button>
            <button
              name="action"
              value="reset_password"
              className="secondary"
              disabled={busy}
              formNoValidate
            >
              Send password reset email
            </button>
          </div>
          <p className="muted">
            A reset link is sent to your email. Your current password remains valid until you
            complete the reset.
          </p>
        </form>
      )}
    </section>
  );
}
