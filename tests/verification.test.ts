import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canAccessWorkspace, type SessionData } from '../src/spaces/liveApi.ts';

test('workspace access requires authentication, verified email and approved company', () => {
  const ready: SessionData = {
    authenticated: true, csrfToken: '', emailVerified: true,
    organizations: [{ id: 'org', name: 'Company', role: 'Owner', displayName: 'Owner', verificationStatus: 'approved' }],
  };
  assert.equal(canAccessWorkspace(ready), true);
  assert.equal(canAccessWorkspace(undefined), false);
  assert.equal(canAccessWorkspace({ ...ready, authenticated: false }), false);
  assert.equal(canAccessWorkspace({ ...ready, emailVerified: false }), false);
  assert.equal(canAccessWorkspace({ ...ready, emailVerified: undefined }), false);
  assert.equal(canAccessWorkspace({ ...ready, organizations: [] }), false);
  for (const status of ['pending', 'rejected', undefined] as const) {
    assert.equal(canAccessWorkspace({ ...ready, organizations: ready.organizations.map(org => ({ ...org, verificationStatus: status })) }), false);
  }
});
