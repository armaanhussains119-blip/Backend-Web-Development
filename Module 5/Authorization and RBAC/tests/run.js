'use strict';

process.env.NODE_ENV = 'test';
process.env.ACCESS_SECRET = 'lu-5-1-test-secret-do-not-use-in-production';

const assert = require('assert');
const http = require('http');
const app = require('../src/app');
const { signToken } = require('../src/utils/jwt');
const { posts, users } = require('../src/data');

const server = app.listen(0, '127.0.0.1');

function request(method, path, user, body) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const headers = {};
    if (user) {
      headers.Authorization = `Bearer ${signToken({ id: user.id, role: user.role })}`;
    }
    if (body) headers['Content-Type'] = 'application/json';

    const req = http.request({
      hostname: '127.0.0.1',
      port: address.port,
      method,
      path,
      headers,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  await new Promise((resolve) => {
    if (server.listening) {
      resolve();
    } else {
      server.once('listening', resolve);
    }
  });

  const memberA = { id: 'member-a', role: 'member' };
  const memberB = { id: 'member-b', role: 'member' };
  const moderator = { id: 'moderator-1', role: 'moderator' };
  const admin = { id: 'admin-1', role: 'admin' };

  try {
    console.log('\nLU 5.1 — Authorization & RBAC tests\n');

    let response = await request('PATCH', '/posts/post-a', memberA, { title: 'Updated by owner' });
    assert.strictEqual(response.status, 200, 'Member A can edit their own post');
    assert.strictEqual(response.body.post.title, 'Updated by owner');

    response = await request('PATCH', '/posts/post-b', memberB, { title: 'Unauthorized edit' });
    assert.strictEqual(response.status, 403, 'Member B cannot edit Member A post');
    assert.strictEqual(response.body.error.code, 'FORBIDDEN');

    response = await request('DELETE', '/posts/post-c', moderator);
    assert.strictEqual(response.status, 200, 'Moderator can delete any post');
    assert.strictEqual(posts.some((post) => post.id === 'post-c'), false);

    response = await request('POST', '/posts/post-d/hide', memberA);
    assert.strictEqual(response.status, 403, 'Member cannot hide a post');
    assert.strictEqual(response.body.error.code, 'FORBIDDEN');

    response = await request('POST', '/posts/post-d/hide', moderator);
    assert.strictEqual(response.status, 200, 'Moderator can hide a post');
    assert.strictEqual(response.body.post.hidden, true);

    response = await request('POST', '/posts/post-d/hide', admin);
    assert.strictEqual(response.status, 200, 'Admin can hide a post');

    response = await request('DELETE', '/users/member-b', memberA);
    assert.strictEqual(response.status, 403, 'Member cannot delete a user');
    assert.strictEqual(users.some((user) => user.id === 'member-b'), true);

    response = await request('DELETE', '/users/member-b', admin);
    assert.strictEqual(response.status, 200, 'Admin can delete a user');
    assert.strictEqual(users.some((user) => user.id === 'member-b'), false);

    response = await request('PATCH', '/posts/missing-post', memberA, { title: 'No post' });
    assert.strictEqual(response.status, 404, 'Missing post returns 404 before authorization');
    assert.strictEqual(response.body.error.code, 'NOT_FOUND');

    response = await request('PATCH', '/posts/post-a', null, { title: 'No token' });
    assert.strictEqual(response.status, 401, 'Missing token returns 401');
    assert.strictEqual(response.body.error.code, 'UNAUTHENTICATED');

    response = await request('POST', '/posts/post-d/hide', memberA, { role: 'admin' });
    assert.strictEqual(response.status, 403, 'Client-provided role cannot grant access');

    response = await request('PATCH', '/posts/post-a', memberA, {
      authorId: 'member-b',
      title: 'Allowed field update',
    });
    assert.strictEqual(response.status, 200, 'Owner update succeeds');
    assert.strictEqual(response.body.post.authorId, 'member-a', 'Post ownership cannot be reassigned by the client');

    console.log('\nAll 12 authorization and ownership scenarios passed.');
  } finally {
    server.close();
  }
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
