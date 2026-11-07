/** App-styled confirmation; no mutation occurs until the user explicitly accepts. */
let active = false;
export function confirmAction(message: string, action = 'Continue'): Promise<boolean> {
  if (typeof document === 'undefined' || active) return Promise.resolve(false);
  active = true;
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const dialog = document.createElement('dialog');
  dialog.setAttribute('aria-label', 'Confirm action');
  dialog.style.cssText =
    'padding:24px;border:1px solid #d4deea;border-radius:14px;background:white;color:#25394f;max-width:420px;width:calc(100vw - 40px);box-sizing:border-box;font:14px/1.6 Segoe UI,Arial,sans-serif;box-shadow:0 16px 60px #14253b30';
  const style = document.createElement('style');
  style.textContent = 'dialog::backdrop{background:rgba(20,37,59,.38)}';
  const text = document.createElement('p');
  text.textContent = message;
  text.style.margin = '0 0 20px';
  const controls = document.createElement('div');
  controls.style.cssText = 'display:flex;justify-content:flex-end;gap:10px';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.textContent = 'Cancel';
  const accept = document.createElement('button');
  accept.type = 'button';
  accept.textContent = action;
  for (const button of [cancel, accept])
    button.style.cssText =
      'border:1px solid #c8d5e5;border-radius:8px;padding:9px 16px;background:white;color:#25394f;font:600 13px Segoe UI,Arial,sans-serif;cursor:pointer';
  accept.style.background = '#2b5483';
  accept.style.color = 'white';
  controls.append(cancel, accept);
  dialog.append(style, text, controls);
  document.body.append(dialog);
  return new Promise((resolve) => {
    let done = false;
    const finish = (accepted: boolean) => {
      if (done) return;
      done = true;
      dialog.remove();
      active = false;
      if (previous?.isConnected) previous.focus();
      resolve(accepted);
    };
    cancel.onclick = () => finish(false);
    accept.onclick = () => finish(true);
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      finish(false);
    });
    dialog.addEventListener('close', () => finish(false));
    try {
      dialog.showModal();
      cancel.focus();
    } catch {
      finish(false);
    }
  });
}
export function confirmSignOut(): Promise<boolean> {
  return confirmAction(
    'Sign out of Kormic? You will need to sign in again to continue.',
    'Sign out',
  );
}
