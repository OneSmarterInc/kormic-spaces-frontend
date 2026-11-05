import { useState, type FormEvent } from 'react';
import type { SpacesClient } from './liveApi';
import { AdminTable, Dialog, type Resource } from './AdminTable.web';
export function JobCollection({ api }: { api: SpacesClient; org: string }) {
  const [tab, setTab] = useState<Resource>('catalog'),
    [open, setOpen] = useState(false),
    [mode, setMode] = useState('once'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [revision, setRevision] = useState(0);
  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const split = (key: string) =>
      String(values.get(key) ?? '')
        .split(/[,\n]+/)
        .map((value) => value.trim())
        .filter(Boolean);
    setBusy(true);
    setError('');
    try {
      await api.request('admin/collection/', 'POST', {
        action: 'batch',
        mode,
        roles: split('roles'),
        locations: split('locations'),
        hours: Number(values.get('hours')),
        limit: Number(values.get('limit')),
        interval_minutes: Number(values.get('interval') ?? 60),
      });
      setOpen(false);
      setNotice(
        mode === 'once'
          ? 'Searches queued. Results will appear after collection.'
          : 'Recurring searches configured.',
      );
      setTab('runs');
      setRevision((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="admin-section-actions">
        <nav className="admin-tabs" aria-label="Job data views">
          {(
            [
              ['catalog', 'Jobs'],
              ['runs', 'Run history'],
              ['sources', 'Schedules'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              aria-current={tab === key ? 'page' : undefined}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </nav>
        <button
          onClick={() => {
            setOpen(true);
            setError('');
          }}
        >
          New search
        </button>
      </div>
      {notice && (
        <p className="admin-notice" role="status">
          {notice}
        </p>
      )}
      <AdminTable key={tab} resource={tab} api={api} revision={revision} />
      {open && (
        <Dialog
          title="New search"
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <form onSubmit={(e) => void search(e)} className="admin-search-form">
            <label>
              Roles
              <input
                name="roles"
                placeholder="Python developer, Data analyst"
                maxLength={3200}
                required
              />
              <small>Separate multiple roles with commas.</small>
            </label>
            <label>
              Locations
              <input name="locations" placeholder="Bengaluru, Hyderabad" maxLength={800} required />
            </label>
            <div className="admin-form-grid">
              <label>
                Mode
                <select value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="once">One-time search</option>
                  <option value="recurring">Recurring schedule</option>
                </select>
              </label>
              <label>
                Posted within (hours)
                <input name="hours" type="number" min={1} max={720} defaultValue={24} required />
              </label>
              <label>
                Maximum results
                <input name="limit" type="number" min={1} max={100} defaultValue={20} required />
              </label>
              {mode === 'recurring' && (
                <label>
                  Repeat every (minutes)
                  <input
                    name="interval"
                    type="number"
                    min={15}
                    max={1440}
                    defaultValue={60}
                    required
                  />
                </label>
              )}
            </div>
            {error && (
              <p className="portal-alert" role="alert">
                {error}
              </p>
            )}
            <div className="admin-dialog-actions">
              <button disabled={busy}>
                {busy ? 'Submitting…' : mode === 'once' ? 'Search now' : 'Create schedule'}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
