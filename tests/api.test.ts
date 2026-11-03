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
