import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SpacesClient } from '../src/spaces/liveApi.ts';
import { spacesPagePath, spacesPageSegment } from '../src/spaces/deployment.ts';

test('standalone employer routes are independent of API routes', () => {
  assert.equal(spacesPagePath(), '/');
  for (const page of ['jobs', 'candidates', 'pipeline', 'messages', 'copilot', 'activity', 'settings']) {
    assert.equal(spacesPagePath(page), `/${page}`);
    assert.equal(spacesPageSegment(`/${page}/`), page);
  }
});

test('session cookies and CSRF are retained for employer writes', async (t) => {
  const calls: { url: string; options?: RequestInit }[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string, options?: RequestInit) => {
    calls.push({ url, options });
    return Response.json({ csrfToken: 'test-csrf', authenticated: false });
  });
  const api = new SpacesClient('https://api.example.test/');
  await api.request('session/');
  await api.request('session/', 'POST', { action: 'login' });
  assert.equal(calls[0].url, 'https://api.example.test/spaces/session/');
  assert.equal(calls[1].options?.credentials, 'include');
  assert.equal(new Headers(calls[1].options?.headers).get('X-CSRFToken'), 'test-csrf');
  assert.equal(calls[1].options?.body, JSON.stringify({ action: 'login' }));
});

test('same-origin proxy and API validation errors remain visible', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    assert.equal(url, '/spaces/session/');
    return Response.json({ detail: 'Invalid credentials.' }, { status: 400 });
  });
  await assert.rejects(new SpacesClient('').request('session/'), /Invalid credentials/);
});

test('SPA fallback HTML produces an actionable API error', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    new Response('<!doctype html>', { headers: { 'Content-Type': 'text/html' } }),
  );
  await assert.rejects(new SpacesClient('').request('session/'), /backend URL or proxy/);
});


test('account switch refreshes membership and blocks a stale write', async (t) => {
  let account = 1;
  const writes: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string, options?: RequestInit) => {
    if (options?.method !== 'GET') writes.push(url);
    return Response.json({ authenticated: true, userId: account, csrfToken: `csrf-${account}`,
      organizations: [{ id: `org-${account}`, name: 'Workspace', role: 'Owner', displayName: '' }] });
  });
  const api = new SpacesClient('');
  let refreshed = 0;
  api.onSessionChange = (session) => { refreshed = session.userId ?? 0; };
  await api.request('session/');
  account = 2;
  await assert.rejects(api.request('org-1/jobs/', 'POST', {}), /sign-in changed/);
  assert.equal(refreshed, 2);
  assert.deepEqual(writes, []);
  await api.request('session/', 'POST', { action: 'logout' });
  assert.equal(writes.length, 1);
});

test('missing membership rechecks the session without retrying the request', async (t) => {
  let switched = false;
  let checks = 0;
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    if (url.endsWith('session/')) {
      checks++;
      return Response.json({ authenticated: true, userId: checks, csrfToken: 'fresh', organizations: [] });
    }
    return Response.json({ detail: 'No Membership matches the given query.' }, { status: 404 });
  });
  const api = new SpacesClient('');
  api.onSessionChange = () => { switched = true; };
  await api.request('session/');
  await assert.rejects(api.request('old-org/workspace/'), /workspace has been refreshed/);
  assert.equal(switched, true);
  assert.equal(checks, 2);
});


test('role changes and revocation refresh the same account and block stale writes', async (t) => {
  let role: string | null = 'Owner';
  const writes: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string, options?: RequestInit) => {
    if (options?.method !== 'GET') writes.push(url);
    return Response.json({ authenticated: true, userId: 7, csrfToken: 'csrf', emailVerified: true,
      organizations: role ? [{ id: 'workspace', name: 'Team', role, displayName: 'Member', verificationStatus: 'approved' }] : [] });
  });
  const api = new SpacesClient('');
  let changes = 0;
  api.onSessionChange = () => { changes++; };
  await api.request('session/');
  role = 'Recruiter';
  await assert.rejects(api.request('workspace/team/2/', 'DELETE'), /sign-in changed/);
  role = null;
  await assert.rejects(api.request('workspace/messages/', 'POST', {}), /sign-in changed/);
  assert.equal(changes, 2);
  assert.deepEqual(writes, []);
});

test('workspace metadata and ordering changes do not discard an in-flight response', async (t) => {
  let renamed = false;
  let release!: (value: Response) => void;
  const org = (id: string) => ({ id, role: 'Owner', verificationStatus: 'approved',
    name: renamed ? 'New company name' : 'Company', displayName: renamed ? 'Updated name' : 'Owner' });
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    if (url.endsWith('session/')) return Response.json({ authenticated: true, userId: 1,
      csrfToken: renamed ? 'rotated' : 'initial', emailVerified: true,
      organizations: renamed ? [org('b'), org('a')] : [org('a'), org('b')] });
    return new Promise<Response>((resolve) => { release = resolve; });
  });
  const api = new SpacesClient('');
  let changes = 0;
  api.onSessionChange = () => { changes++; };
  await api.request('session/');
  const pending = api.request('a/workspace/');
  renamed = true;
  await api.request('session/');
  release(Response.json({ jobs: [] }));
  assert.deepEqual(await pending, { jobs: [] });
  assert.equal(changes, 0);
});

test('a real account switch still discards an old in-flight response', async (t) => {
  let userId = 1;
  let release!: (value: Response) => void;
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    if (url.endsWith('session/')) return Response.json({ authenticated: true, userId, csrfToken: '', organizations: [] });
    return new Promise<Response>((resolve) => { release = resolve; });
  });
  const api = new SpacesClient('');
  api.onSessionChange = () => {};
  await api.request('session/');
  const pending = api.request('old/workspace/');
  userId = 2;
  await api.request('session/');
  release(Response.json({ private: 'old account' }));
  await assert.rejects(pending, /Previous workspace results were discarded/);
});
