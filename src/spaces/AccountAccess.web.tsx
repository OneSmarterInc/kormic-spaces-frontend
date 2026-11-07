import { confirmSignOut } from './confirmSignOut';
import { useEffect, useState } from 'react';
import { SpacesClient, type SessionData } from './liveApi';

export function AccountAccess({
  api,
  mode,
  token = '',
  authenticated,
  done,
  signedIn,
}: {
  api: SpacesClient;
  mode: string;
  token?: string;
  authenticated: boolean;
  done: () => void;
  signedIn: (session: SessionData) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [existing, setExisting] = useState(false);
  const [step, setStep] = useState<'request' | 'verify' | 'password'>('request');
  const [proof, setProof] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [admin, setAdmin] = useState(mode === 'admin_invite');
  const invitation = mode === 'invite' || mode === 'admin_invite';
  const emailChange = mode === 'email_change';
  const verifying = (invitation || emailChange) && step !== 'password';
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const login = invitation && existing && !authenticated;
  const title = verifying
    ? 'Verify your email'
    : emailChange
      ? 'Approve your new email'
      : login
        ? 'Sign in to accept your invitation'
        : invitation
          ? 'Join your workspace'
          : mode === 'request_reset'
            ? 'Reset your password'
            : 'Choose a new password';
  return (
    <section className="login-form account-access">
      <style>{`.account-access{box-sizing:border-box;width:calc(100% - 32px);max-width:480px;margin:40px auto;padding:28px;background:#fff;border:1px solid #dde3eb;border-radius:12px;color:#253244;font:15px/1.6 "Segoe UI",Arial,sans-serif}.account-access h1{font-size:26px;line-height:1.25;margin:0 0 12px}.account-access p{margin:12px 0;color:#526277}.account-access form{display:grid;gap:16px}.account-access .field{display:grid;gap:6px;font-weight:600}.account-access input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #bbc7d5;border-radius:6px;color:#253244;font:inherit}.account-access button{padding:10px 14px;border:1px solid #cbd4df;border-radius:6px;background:#fff;color:#294f7c;font:inherit;cursor:pointer}.account-access button.primary{background:#294f7c;color:white;border-color:#294f7c}.account-access button:disabled{opacity:.55;cursor:default}.account-access :focus-visible{outline:2px solid #294f7c;outline-offset:3px}.account-access [role=alert]{color:#a52b27}.account-access .access-progress{font-size:13px;color:#526277;margin-bottom:20px}.account-access input[name=code]{font-size:24px;letter-spacing:6px;font-variant-numeric:tabular-nums}`}</style>
      <p style={{ fontWeight: 700, color: '#294f7c' }}>kormic / Spaces</p>
      {(invitation || emailChange) && (
        <p className="access-progress">
          {verifying ? 'Step 1 of 2 · Verify email' : 'Step 2 of 2 · Complete your account'}
        </p>
      )}
      <h1>{title}</h1>
      {invitation && authenticated && !verifying && (
        <button
          className="btn"
          onClick={async () => {
            if (!(await confirmSignOut())) return;
            signedIn(
              await api.request<SessionData>('session/', 'POST', {
                action: 'logout',
              }),
            );
            setExisting(true);
          }}
        >
          Use another account
        </button>
      )}
      <p>
        {invitation
          ? 'Your invitation is linked to your email and workspace role.'
          : 'Your password belongs to you. Workspace owners cannot see it.'}
      </p>
      {message ? (
        <>
          <p role="status">{message}</p>
          <button
            className="btn"
            onClick={() => (admin ? window.location.assign('/admin') : done())}
          >
            Return to sign in
          </button>
        </>
      ) : (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError('');
            const form = new FormData(event.currentTarget);
            const values = {
              email: form.get('email'),
              password: form.get('password'),
              currentPassword: form.get('currentPassword'),
            };
            try {
              if (verifying) {
                const result = await api.request<{
                  verificationToken?: string;
                }>('account/', 'POST', {
                  token,
                  action: step === 'request' ? 'request_code' : 'verify_code',
                  code: form.get('code'),
                });
                if (result.verificationToken) {
                  setProof(result.verificationToken);
                  setStep('password');
                } else {
                  setStep('verify');
                  setCooldown(60);
                }
                return;
              }
              if (
                !login &&
                !emailChange &&
                form.get('password') !== null &&
                form.get('password') !== form.get('confirmPassword')
              )
                throw new Error('Your passwords do not match.');
              if (login) {
                signedIn(
                  await api.request<SessionData>('account/', 'POST', {
                    ...values,
                    token,
                    verificationToken: proof,
                    action: 'invite_login',
                  }),
                );
                setExisting(false);
              } else {
                const result = await api.request<{
                  detail: string;
                  organizationId?: string;
                  admin?: boolean;
                }>('account/', 'POST', {
                  ...values,
                  token,
                  verificationToken: proof,
                  action: invitation ? 'accept' : mode,
                });
                if (result.organizationId) {
                  const url = new URL(window.location.href);
                  url.searchParams.set('workspace', result.organizationId);
                  window.history.replaceState(null, '', url.pathname + url.search);
                  signedIn(await api.request<SessionData>('session/'));
                }
                setAdmin(Boolean(result.admin));
                setMessage(result.detail);
                if (mode === 'change_password' || mode === 'reset')
                  signedIn(await api.request<SessionData>('session/'));
              }
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : 'Please try again.');
            } finally {
              setBusy(false);
            }
          }}
        >
          {verifying && (
            <p>
              {step === 'request'
                ? 'Send a verification code to the email address on your invitation.'
                : 'Enter the six-digit code from your latest email. It expires after 10 minutes.'}
            </p>
          )}
          {verifying && step === 'verify' && (
            <label className="field">
              Verification code
              <input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                minLength={6}
                maxLength={6}
                required
                autoFocus
              />
            </label>
          )}
          {((login && !verifying) || mode === 'request_reset') && (
            <label className="field">
              Work email
              <input name="email" type="email" autoComplete="username" required />
            </label>
          )}
          {(mode === 'change_password' || (emailChange && !verifying)) && (
            <label className="field">
              Current password
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
          )}
          {!verifying &&
            !emailChange &&
            mode !== 'request_reset' &&
            !(invitation && authenticated) && (
              <label className="field">
                {login ? 'Password' : 'New password'}
                <input
                  name="password"
                  type="password"
                  autoComplete={login ? 'current-password' : 'new-password'}
                  required
                  minLength={login ? 1 : 12}
                  maxLength={256}
                />
              </label>
            )}
          {!verifying &&
            !login &&
            !emailChange &&
            mode !== 'request_reset' &&
            !(invitation && authenticated) && (
              <label className="field">
                Confirm new password
                <input
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={256}
                />
                <small>Use at least 12 characters and avoid common passwords.</small>
              </label>
            )}
          {error && <p role="alert">{error}</p>}
          <button className="btn primary" disabled={busy}>
            {busy
              ? 'Please wait…'
              : verifying
                ? step === 'request'
                  ? 'Send verification code'
                  : 'Verify email'
                : emailChange
                  ? 'Approve email change'
                  : login
                    ? 'Sign in'
                    : invitation
                      ? 'Accept invitation'
                      : mode === 'request_reset'
                        ? 'Send reset link'
                        : 'Save password'}
          </button>
          {verifying && step === 'verify' && (
            <button
              type="button"
              disabled={busy || cooldown > 0}
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  await api.request('account/', 'POST', {
                    action: 'request_code',
                    token,
                  });
                  setCooldown(60);
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : 'Unable to resend code.');
                } finally {
                  setBusy(false);
                }
              }}
            >
              {cooldown ? `Resend code in ${cooldown}s` : 'Resend code'}
            </button>
          )}
          {invitation && !verifying && (
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => {
                setProof('');
                setStep('request');
                setError('');
              }}
            >
              Verify email again
            </button>
          )}
          {invitation && !verifying && !authenticated && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setExisting(!existing);
                setError('');
              }}
            >
              {existing ? 'Create my account' : 'I already have an account'}
            </button>
          )}
          <button type="button" className="btn" onClick={done}>
            Cancel
          </button>
        </form>
      )}
    </section>
  );
}
