import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Dialog } from './AdminTable.web';
import type { SpacesClient } from './liveApi';

type Detail = {
  values: Record<string, string | boolean>;
  revision: string;
  email: string;
  recovery: string | null;
  members: {
    id: number;
    display_name: string;
    role: string;
    user__email: string;
    user__is_active: boolean;
  }[];
};
const labels: Record<string, string> = {
  name: 'Company name',
  full_name: 'Full name',
  phone: 'Phone',
  city: 'City',
  region: 'State / region',
  country: 'Country',
  display_name: 'Full name',
  designation: 'Designation',
  active: 'Account access',
  verification_status: 'Company access',
};

export function ManageAccount({
  api,
  resource,
  identifier,
  onClose,
  onSaved,
}: {
  api: SpacesClient;
  resource: string;
  identifier: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [detail, setDetail] = useState<Detail>();
  const [values, setValues] = useState<Detail['values']>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [operation, setOperation] = useState<'update' | 'recover'>('update');
  const [member, setMember] = useState<number>();
  const pending = useRef(false);
  const path = `admin/manage/${resource}/${encodeURIComponent(identifier)}/`;
  useEffect(() => {
    let cancelled = false;
    api
      .request<Detail>(path)
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
          setValues(data.values);
        }
      })
      .catch((cause) => {
        if (!cancelled) setError(String(cause.message || cause));
      });
    return () => {
      cancelled = true;
    };
  }, [api, path]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    const currentPassword = new FormData(event.currentTarget).get('currentPassword');
    try {
      await api.request(path, 'POST', {
        action: operation,
        revision: detail.revision,
        values,
        currentPassword,
      });
      onSaved();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update this account.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  if (member !== undefined)
    return (
      <ManageAccount
        api={api}
        resource="members"
        identifier={String(member)}
        onClose={() => setMember(undefined)}
        onSaved={onSaved}
      />
    );
  return (
    <Dialog
      title={resource === 'companies' ? 'Manage company' : 'Manage account'}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      {!detail && !error && <p role="status">Loading account…</p>}
      {detail && (
        <form onSubmit={(event) => void save(event)} style={{ display: 'grid', gap: 16 }}>
          {detail.email && (
            <p>
              <strong>Email</strong>
              <br />
              {detail.email}
            </p>
          )}
          {operation === 'update' ? (
            <>
              <div className="admin-form-grid">
                {Object.entries(values).map(([key, value]) => (
                  <label key={key}>
                    {labels[key] || key}
                    {key === 'active' ? (
                      <select
                        value={String(value)}
                        onChange={(e) => setValues({ ...values, [key]: e.target.value === 'true' })}
                      >
                        <option value="true">Active</option>
                        <option value="false">Blocked — revoke sign-in access</option>
                      </select>
                    ) : key === 'verification_status' ? (
                      <select
                        value={String(value)}
                        onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                      >
                        <option value="approved">Approved</option>
                        <option value="pending">Pending review — access restricted</option>
                        <option value="rejected">Blocked — access restricted</option>
                      </select>
                    ) : (
                      <input
                        value={String(value)}
                        maxLength={
                          key === 'phone'
                            ? 64
                            : key === 'designation'
                              ? 120
                              : key === 'name' || key === 'display_name'
                                ? 160
                                : 255
                        }
                        required={['name', 'full_name', 'display_name'].includes(key)}
                        onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                      />
                    )}
                  </label>
                ))}
              </div>
              {detail.members.length > 0 && (
                <section>
                  <h3>Company accounts</h3>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {detail.members.map((item) => (
                        <tr key={item.id}>
                          <td>
                            {item.display_name}
                            <br />
                            <small>{item.user__email}</small>
                          </td>
                          <td>{item.role}</td>
                          <td>{item.user__is_active ? 'Active' : 'Blocked'}</td>
                          <td>
                            <button type="button" onClick={() => setMember(item.id)}>
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}
              {detail.recovery && (
                <button type="button" className="secondary" onClick={() => setOperation('recover')}>
                  {detail.recovery === 'sign_in_code'
                    ? 'Send sign-in code'
                    : 'Send password reset email'}
                </button>
              )}
            </>
          ) : (
            <p>
              {detail.recovery === 'sign_in_code'
                ? 'Send a single-use email sign-in code. Careers uses passwordless sign-in.'
                : 'Send a secure reset link. The recipient verifies their email and chooses their own password.'}
            </p>
          )}
          <p className="muted">
            Review the changes before confirming. Changes are recorded in the activity log. Blocking
            an account revokes its sessions across Kormic.
          </p>
          <label>
            Your current password
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              maxLength={256}
              required
            />
          </label>
          <div className="admin-section-actions">
            <button type="button" className="secondary" disabled={busy} onClick={onClose}>
              Cancel
            </button>
            <button disabled={busy}>
              {busy
                ? 'Saving…'
                : operation === 'recover'
                  ? 'Confirm and send email'
                  : 'Confirm changes'}
            </button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="portal-alert">
          {error}
        </p>
      )}
    </Dialog>
  );
}
