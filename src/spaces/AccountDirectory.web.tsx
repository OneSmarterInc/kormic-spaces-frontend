import { useState, type FormEvent } from 'react';
import type { SpacesClient } from './liveApi';
import { AdminTable, Dialog, type Row } from './AdminTable.web';
import { ManageAccount } from './ManageAccount.web';

export function AccountDirectory({ api }: { api: SpacesClient }) {
  const [tab, setTab] = useState<'users' | 'companies' | 'admins'>('users');
  const [editing, setEditing] = useState<Row>();
  const [action, setAction] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [managed, setManaged] = useState<{ resource: string; identifier: string }>();
  function open(next: string, row?: Row) {
    setAction(next);
    setEditing(row);
    setError('');
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const result = await api.request<{ detail: string }>('admin/accounts/', 'POST', {
        action,
        id: editing?.id,
        name: form.get('name'),
        email: form.get('email'),
        firstName: form.get('firstName'),
        lastName: form.get('lastName'),
        active: form.get('active') === 'true',
        currentPassword: form.get('currentPassword'),
      });
      setNotice(result.detail);
      setAction('');
      setRevision((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="account-directory">
      <div className="admin-section-actions">
        <nav className="admin-tabs" aria-label="Account directories">
          {(
            [
              ['users', 'Careers users'],
              ['companies', 'Companies'],
              ['admins', 'Admins'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              aria-current={tab === value ? 'page' : undefined}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
        </nav>
        {tab === 'admins' && <button onClick={() => open('invite')}>Invite administrator</button>}
      </div>
      {notice && (
        <p className="admin-notice" role="status">
          {notice}
        </p>
      )}
      <AdminTable
        key={tab}
        api={api}
        resource={tab}
        revision={revision}
        onManage={(row) =>
          tab === 'admins'
            ? open('update', row)
            : setManaged({
                resource: tab,
                identifier: String(tab === 'users' ? row.person_id : row.id),
              })
        }
      />
      {managed && (
        <ManageAccount
          api={api}
          {...managed}
          onClose={() => setManaged(undefined)}
          onSaved={() => {
            setRevision((value) => value + 1);
            setNotice('Account action completed.');
          }}
        />
      )}
      {tab === 'admins' && (
        <details style={{ marginTop: 16 }}>
          <summary>Pending administrator invitations</summary>
          <AdminTable
            api={api}
            resource="admin_invites"
            revision={revision}
            onManage={(row) => open('revoke_invite', row)}
          />
        </details>
      )}
      {action && (
        <Dialog
          title={
            action === 'invite'
              ? 'Invite administrator'
              : action === 'revoke_invite'
                ? 'Revoke invitation'
                : action === 'reset_password'
                  ? 'Send password reset email'
                  : 'Manage administrator'
          }
          onClose={() => {
            if (!busy) setAction('');
          }}
        >
          <form onSubmit={(event) => void submit(event)} style={{ display: 'grid', gap: 16 }}>
            {editing && <p>{editing.email}</p>}
            {action === 'invite' && (
              <>
                <p>
                  The recipient verifies their email with a code, then sets their own password.
                  Administrator access starts only after acceptance.
                </p>
                <label>
                  Full name
                  <input name="name" autoComplete="off" maxLength={150} required />
                </label>
                <label>
                  Email
                  <input name="email" type="email" autoComplete="off" maxLength={254} required />
                </label>
              </>
            )}
            {action === 'update' && (
              <>
                <div className="admin-form-grid">
                  <label>
                    First name
                    <input
                      name="firstName"
                      defaultValue={editing?.first_name}
                      maxLength={150}
                      required
                    />
                  </label>
                  <label>
                    Last name
                    <input name="lastName" defaultValue={editing?.last_name} maxLength={150} />
                  </label>
                </div>
                <label>
                  Account status
                  <select name="active" defaultValue={String(editing?.is_active)}>
                    <option value="true">Active</option>
                    <option value="false">Inactive — block sign-in</option>
                  </select>
                </label>
                <p className="muted">
                  Deactivating an account ends its sessions across Kormic Spaces. Email addresses
                  cannot be changed here.
                </p>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => open('reset_password', editing)}
                >
                  Send password reset email
                </button>
              </>
            )}
            {action === 'reset_password' && (
              <p>
                This sends a secure, single-use reset link. The current password stays valid until
                the recipient completes the reset.
              </p>
            )}
            {action === 'revoke_invite' && (
              <p>
                This invitation will no longer grant access. You can send a new invitation later.
              </p>
            )}
            <label>
              Your current password
              <input
                type="password"
                name="currentPassword"
                autoComplete="current-password"
                required
                maxLength={256}
              />
            </label>
            {error && (
              <p className="portal-alert" role="alert">
                {error}
              </p>
            )}
            <div className="admin-section-actions">
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => setAction('')}
              >
                Cancel
              </button>
              <button disabled={busy}>
                {busy
                  ? 'Please wait…'
                  : action === 'invite'
                    ? 'Send invitation'
                    : action === 'update'
                      ? 'Save changes'
                      : action === 'reset_password'
                        ? 'Send reset email'
                        : 'Revoke invitation'}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </section>
  );
}
