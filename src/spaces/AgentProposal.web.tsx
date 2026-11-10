import { useRef, useState } from 'react';
import type { ChatMessage } from './ChatHistory.web';
import type { SpacesClient } from './liveApi';

export function AgentProposal({
  api,
  action,
  disabled,
  busyChanged,
  changed,
}: {
  api: SpacesClient;
  action: NonNullable<ChatMessage['action']>;
  disabled: boolean;
  busyChanged: (busy: boolean) => void;
  changed: (status: string) => void;
}) {
  const [password, setPassword] = useState(''),
    [error, setError] = useState('');
  const pending = useRef(false);
  const expired = Date.parse(action.expiresAt) <= Date.now();
  async function decide(decision: 'confirm' | 'cancel') {
    if (pending.current || disabled) return;
    pending.current = true;
    busyChanged(true);
    setError('');
    try {
      const result = await api.request<{ status: string }>(
        `admin/copilot/actions/${action.id}/`,
        'POST',
        {
          decision,
          ...(decision === 'confirm' && action.requiresPassword
            ? { currentPassword: password }
            : {}),
        },
      );
      changed(result.status);
      setPassword('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The action could not be completed.');
    } finally {
      pending.current = false;
      busyChanged(false);
    }
  }
  return (
    <section
      className="agent-proposal"
      aria-label="Proposed admin action"
      style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 16, marginTop: 16 }}
    >
      <h3 style={{ fontSize: 15, marginBottom: 8 }}>{action.type.replaceAll('_', ' ')}</h3>
      <strong>{action.target}</strong>
      <dl>
        {Object.entries(action.data).map(([key, value]) => (
          <div key={key} style={{ marginTop: 8 }}>
            <dt>{key}</dt>
            <dd style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
            </dd>
          </div>
        ))}
      </dl>
      {action.status === 'pending' && !expired ? (
        <>
          <p>Review these exact changes before confirming.</p>
          {action.requiresPassword && (
            <label>
              Confirm with your current password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                disabled={disabled}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              disabled={disabled || (action.requiresPassword && !password)}
              onClick={() => void decide('confirm')}
            >
              Confirm action
            </button>
            <button disabled={disabled} onClick={() => void decide('cancel')}>
              Cancel action
            </button>
          </div>
        </>
      ) : (
        <p role="status">
          {expired && action.status === 'pending'
            ? 'Expired — request a new proposal.'
            : `Action ${action.status}.`}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
