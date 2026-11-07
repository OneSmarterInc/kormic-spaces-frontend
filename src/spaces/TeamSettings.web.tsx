import { confirmAction } from './confirmSignOut';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SpacesClient, SpacesHttpError } from './liveApi';

const permissions = [
  ['jobs_create', 'Create jobs'],
  ['jobs_edit', 'Edit jobs'],
  ['jobs_delete', 'Delete jobs'],
  ['members_create', 'Invite members'],
  ['members_edit', 'Edit member profiles'],
  ['members_delete', 'Remove members'],
] as const;
type Member = {
  id: number;
  userId: number;
  display_name: string;
  email: string;
  role: string;
  designation: string;
  permissions: string[];
  revision: number;
};
type Team = {
  members: Member[];
  current: Member;
  permissions: string[];
  invitations: {
    id: number;
    email: string;
    display_name: string;
    role: string;
    metadata: { designation?: string };
    expires_at: string;
  }[];
};
type Draft = {
  id?: number;
  revision?: number;
  name: string;
  email: string;
  designation: string;
  role: string;
  permissions: string[];
};
const empty: Draft = {
  name: '',
  email: '',
  designation: '',
  role: 'Recruiter',
  permissions: [],
};

export function TeamSettings({
  api,
  org,
  companyName,
  changed,
}: {
  api: SpacesClient;
  org: string;
  companyName: string;
  changed: () => Promise<void>;
}) {
  const [team, setTeam] = useState<Team>();
  const [draft, setDraft] = useState<Draft>();
  const [own, setOwn] = useState(false);
  const [company, setCompany] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [backgroundError, setBackgroundError] = useState('');
  const [notice, setNotice] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const version = useRef(0);
  const reload = useCallback(
    async (signal?: AbortSignal) => {
      const current = ++version.current;
      const result = await api.request<Team>(`${org}/team/`, 'GET', undefined, signal);
      if (!signal?.aborted && current === version.current) {
        setTeam(result);
        setBackgroundError('');
      }
    },
    [api, org],
  );
  useEffect(() => {
    const controller = new AbortController();
    void reload(controller.signal).catch((e) => {
      if (!controller.signal.aborted) setError(e.message);
    });
    const refresh = () => {
      if (document.visibilityState === 'visible')
        void reload(controller.signal).catch((cause: unknown) => {
          if (controller.signal.aborted) return;
          setBackgroundError(cause instanceof Error ? cause.message : 'Team refresh failed.');
          if (cause instanceof SpacesHttpError && [401, 403, 404].includes(cause.status)) {
            setTeam(undefined);
            setDraft(undefined);
            setOwn(false);
            setCompany(undefined);
          }
        });
    };
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => {
      controller.abort();
      window.removeEventListener('focus', refresh);
      window.clearInterval(timer);
    };
  }, [reload]);
  const open = Boolean(draft || own || company !== undefined);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  function close() {
    if (!busy) {
      setDraft(undefined);
      setOwn(false);
      setCompany(undefined);
      setError('');
    }
  }
  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await work();
      await reload();
      await changed();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save. Try again.');
    } finally {
      setBusy(false);
    }
  }
  const owner = team?.current.role === 'Owner';
  const can = (permission: string) => team?.permissions.includes(permission);
  const members = [...(team?.members ?? [])].sort(
    (a, b) =>
      Number(b.role === 'Owner') - Number(a.role === 'Owner') ||
      a.display_name.localeCompare(b.display_name),
  );
  return (
    <section className="team-settings" aria-label="Team settings">
      {backgroundError && (
        <p className="live-alert" role="alert">
          {backgroundError}
        </p>
      )}
      <header className="team-company">
        <div>
          <span className="team-eyebrow">COMPANY</span>
          <h2>{companyName}</h2>
          <p>{members.find((m) => m.role === 'Owner')?.email}</p>
        </div>
        <div className="row">
          {owner && (
            <button
              className="btn"
              onClick={() => {
                setError('');
                setCompany(companyName);
              }}
            >
              Edit company
            </button>
          )}
          <button
            className="btn"
            disabled={!team}
            onClick={() => {
              setError('');
              setOwn(true);
            }}
          >
            Edit my profile
          </button>
        </div>
      </header>
      <div className="team-table-heading">
        <h2>
          Team members <span>{members.length}</span>
        </h2>
        {can('members_create') && (
          <button
            className="btn primary"
            onClick={() => {
              setError('');
              setDraft({ ...empty });
            }}
          >
            Invite member
          </button>
        )}
      </div>
      {notice && (
        <p className="team-notice" role="status">
          {notice}
        </p>
      )}
      {error && !open && (
        <p className="live-alert" role="alert">
          {error}{' '}
          <button className="btn" onClick={() => void run(async () => {})}>
            Retry
          </button>
        </p>
      )}
      <div className="team-table-scroll" tabIndex={0} role="region" aria-label="Workspace members">
        <table className="team-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Designation</th>
              <th>Access</th>
              <th>Permissions</th>
              <th>
                <span className="audit-sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const self = member.userId === team?.current.userId;
              const protectedOwner = member.role === 'Owner' && !owner;
              return (
                <tr key={member.id}>
                  <td>
                    <strong>
                      {member.display_name}
                      {self && <small className="team-you">You</small>}
                    </strong>
                    <small>{member.email}</small>
                  </td>
                  <td>{member.designation}</td>
                  <td>
                    <span className="tag">{member.role}</span>
                  </td>
                  <td>
                    {member.role === 'Owner'
                      ? 'Full workspace access'
                      : member.permissions.length
                        ? member.permissions
                            .map((p) => permissions.find(([key]) => key === p)?.[1])
                            .filter(Boolean)
                            .join(', ')
                        : 'Review candidates and conversations'}
                  </td>
                  <td>
                    <div className="team-row-actions">
                      {!self && !protectedOwner && can('members_edit') && (
                        <button
                          className="btn sm"
                          aria-label={`Edit ${member.display_name}`}
                          onClick={() => {
                            setError('');
                            setDraft({
                              id: member.id,
                              revision: member.revision,
                              name: member.display_name,
                              email: member.email,
                              designation: member.designation,
                              role: member.role,
                              permissions: member.permissions,
                            });
                          }}
                        >
                          Edit
                        </button>
                      )}
                      {!self && !protectedOwner && can('members_delete') && (
                        <button
                          className="btn sm"
                          aria-label={`Remove ${member.display_name}`}
                          disabled={busy}
                          onClick={async () => {
                            if (
                              await confirmAction(
                                `Remove ${member.display_name}'s access to this workspace? Their activity history will be retained.`,
                              )
                            )
                              void run(async () => {
                                await api.request(`${org}/team/${member.id}/`, 'DELETE');
                                setNotice('Workspace access removed.');
                              });
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!team && !error && (
        <p className="team-notice" role="status">
          Loading your team…
        </p>
      )}
      {!!team?.invitations.length && (
        <div className="team-invitations">
          <h3>Pending invitations</h3>
          <div className="team-table-scroll">
            <table className="team-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Designation</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {team.invitations.map((invite) => (
                  <tr key={invite.id}>
                    <td>{invite.display_name}</td>
                    <td>{invite.email}</td>
                    <td>{invite.metadata.designation || invite.role}</td>
                    <td>
                      Awaiting acceptance{' '}
                      <small>Expires {new Date(invite.expires_at).toLocaleDateString()}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <dialog
        className="team-dialog"
        ref={dialog}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        aria-labelledby="team-dialog-title"
      >
        <header>
          <h2 id="team-dialog-title">
            {draft
              ? draft.id
                ? 'Edit member'
                : 'Invite member'
              : own
                ? 'My profile'
                : 'Company details'}
          </h2>
          <button className="btn" aria-label="Close dialog" disabled={busy} onClick={close}>
            ×
          </button>
        </header>
        {error && (
          <p className="live-alert" role="alert">
            {error}
          </p>
        )}
        {draft && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await api.request(
                  `${org}/team/${draft.id ? `${draft.id}/` : ''}`,
                  draft.id ? 'PATCH' : 'POST',
                  draft,
                );
                setNotice(
                  draft.id
                    ? 'Profile saved. Any email change requires verification and the recipient’s current password.'
                    : 'Invitation sent. The recipient verifies their email and sets their own password.',
                );
                setDraft(undefined);
              });
            }}
          >
            <label className="field">
              Full name
              <input
                value={draft.name}
                name="name"
                required
                maxLength={160}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label className="field">
              Work email
              <input
                type="email"
                required
                maxLength={150}
                value={draft.email}
                name="email"
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </label>
            <label className="field">
              Designation
              <input
                required
                maxLength={120}
                placeholder="e.g. Talent Acquisition Lead"
                value={draft.designation}
                name="designation"
                onChange={(e) => setDraft({ ...draft, designation: e.target.value })}
              />
            </label>
            {owner && (
              <label className="field">
                Workspace role
                <select
                  value={draft.role}
                  onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                >
                  {(draft.id ? ['Owner', 'Manager', 'Recruiter'] : ['Manager', 'Recruiter']).map(
                    (role) => (
                      <option key={role}>{role}</option>
                    ),
                  )}
                </select>
              </label>
            )}
            {owner && (
              <fieldset className="team-permissions">
                <legend>Permissions</legend>
                {draft.role === 'Owner' ? (
                  <p>Owners have full access. Only another owner can manage their membership.</p>
                ) : (
                  permissions.map(([key, label]) => (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={draft.permissions.includes(key)}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            permissions: e.target.checked
                              ? [...draft.permissions, key]
                              : draft.permissions.filter((p) => p !== key),
                          })
                        }
                      />
                      {label}
                    </label>
                  ))
                )}
              </fieldset>
            )}
            <p className="muted">
              Only owners can delegate permissions. Changing an email does not change the password.
            </p>
            <footer>
              <button type="button" className="btn" disabled={busy} onClick={close}>
                Cancel
              </button>
              <button className="btn primary" disabled={busy}>
                {busy ? 'Saving…' : draft.id ? 'Save changes' : 'Send invitation'}
              </button>
            </footer>
          </form>
        )}
        {own && team && (
          <div className="team-own-profile">
            <dl>
              <dt>Name</dt>
              <dd>{team.current.display_name}</dd>
              <dt>Email</dt>
              <dd>{team.current.email}</dd>
              <dt>Designation</dt>
              <dd>{team.current.designation}</dd>
            </dl>
            <p>
              We’ll email you a secure password-reset link. Profile and access changes are managed
              by an authorized teammate.
            </p>
            <button
              className="btn primary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await api.request('account/', 'POST', {
                    action: 'request_reset',
                    email: team.current.email,
                  });
                  setOwn(false);
                  setNotice(
                    'If delivery is available, a password-reset link will arrive in your inbox shortly.',
                  );
                })
              }
            >
              Send password reset email
            </button>
          </div>
        )}
        {company !== undefined && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await api.request(`${org}/workspace/`, 'PATCH', {
                  name: company,
                });
                setCompany(undefined);
                setNotice('Company name updated.');
              });
            }}
          >
            <label className="field">
              Company name
              <input
                required
                maxLength={160}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </label>
            <footer>
              <button className="btn" type="button" disabled={busy} onClick={close}>
                Cancel
              </button>
              <button className="btn primary" disabled={busy}>
                Save company
              </button>
            </footer>
          </form>
        )}
      </dialog>
    </section>
  );
}
