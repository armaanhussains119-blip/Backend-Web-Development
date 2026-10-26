process.env.COOKIE_SECRET = 'test-only-cookie-signing-secret-at-least-32-characters';
process.env.COOKIE_SECURE = 'false';
process.env.NODE_ENV = 'test';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { after, test } = require('node:test');
const bcrypt = require('bcryptjs');
const cookieSignature = require('cookie-signature');
const app = require('../src/app');
const cookieConfig = require('../src/config/cookies');
const userRepository = require('../src/repositories/userRepository');
const sessionStore = require('../src/session/sessionStore');

const originalRepository = {
  findByEmail: userRepository.findByEmail,
  findById: userRepository.findById,
};

after(() => {
  Object.assign(userRepository, originalRepository);
});

async function withRepository(overrides, callback) {
  Object.assign(userRepository, overrides);
  try {
    await callback();
  } finally {
    Object.assign(userRepository, originalRepository);
  }
}

async function request(path, options = {}) {
  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body,
    });
    return {
      status: response.status,
      body: response.status === 204 ? null : await response.json(),
      setCookie: response.headers.get('set-cookie'),
    };
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

function signedCookie(sessionId) {
  const value = `s:${cookieSignature.sign(sessionId, cookieConfig.cookieSecret)}`;
  return `${cookieConfig.cookieName}=${encodeURIComponent(value)}`;
}

function cookieFromLogin(setCookie) {
  assert.ok(setCookie);
  return setCookie.split(';', 1)[0];
}

function loginRequest(email = 'sam@example.com', password = 'correct horse battery staple') {
  return request('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

test('valid login normalizes email, verifies password, and sets a signed opaque cookie', async () => {
  const passwordHash = await bcrypt.hash('correct horse battery staple', 10);
  let lookedUpEmail;

  await withRepository({
    async findByEmail(email) {
      lookedUpEmail = email;
      return {
        id: 12,
        name: 'Sam',
        email,
        passwordHash,
        privateNote: 'must not be returned',
      };
    },
  }, async () => {
    const result = await loginRequest(' SAM@Example.COM ');
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, {
      data: { id: 12, name: 'Sam', email: 'sam@example.com' },
    });
    assert.equal(lookedUpEmail, 'sam@example.com');

    const cookie = cookieFromLogin(result.setCookie);
    const attributes = result.setCookie.toLowerCase();
    assert.match(attributes, /httponly/);
    assert.match(attributes, /samesite=lax/);
    assert.match(attributes, /path=\//);
    assert.match(attributes, /max-age=3600/);
    assert.doesNotMatch(attributes, /;\s*secure(?:;|$)/);

    const value = decodeURIComponent(cookie.split('=', 2)[1]);
    assert.ok(value.startsWith('s:'));
    const sessionId = cookieSignature.unsign(value.slice(2), cookieConfig.cookieSecret);
    assert.match(sessionId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.doesNotMatch(cookie, /sam@example\.com|passwordHash|correct horse/i);
    sessionStore.destroy(sessionId);
  });
});

test('unknown email and wrong password return identical generic failures and create no session', async () => {
  const passwordHash = await bcrypt.hash('the-correct-password', 10);
  let sessionCreations = 0;
  const originalCreate = sessionStore.create;
  sessionStore.create = (...args) => {
    sessionCreations += 1;
    return originalCreate(...args);
  };

  try {
    await withRepository({
      async findByEmail(email) {
        if (email === 'known@example.com') {
          return { id: 1, name: 'Sam', email, passwordHash };
        }
        return null;
      },
    }, async () => {
      const wrongPassword = await loginRequest('known@example.com', 'wrong password');
      const unknownEmail = await loginRequest('unknown@example.com', 'wrong password');
      const expected = {
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      };

      assert.equal(wrongPassword.status, 401);
      assert.equal(unknownEmail.status, 401);
      assert.deepEqual(wrongPassword.body, expected);
      assert.deepEqual(unknownEmail.body, expected);
      assert.equal(wrongPassword.setCookie, null);
      assert.equal(unknownEmail.setCookie, null);
    });
  } finally {
    sessionStore.create = originalCreate;
  }

  assert.equal(sessionCreations, 0);
});

test('invalid login input returns 400 before repository lookup or session creation', async () => {
  let repositoryCalls = 0;
  let sessionCreations = 0;
  const originalCreate = sessionStore.create;
  sessionStore.create = (...args) => {
    sessionCreations += 1;
    return originalCreate(...args);
  };

  try {
    await withRepository({
      async findByEmail() {
        repositoryCalls += 1;
        return null;
      },
    }, async () => {
      for (const body of [
        {},
        { email: 'sam@example.com' },
        { email: 'sam@example.com', password: '' },
        { email: 'not-an-email', password: 'password' },
        { email: 7, password: 'password' },
      ]) {
        const result = await request('/auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        assert.equal(result.status, 400);
      }
    });
  } finally {
    sessionStore.create = originalCreate;
  }

  assert.equal(repositoryCalls, 0);
  assert.equal(sessionCreations, 0);
});

test('valid signed cookie and active server session return the safe profile', async () => {
  const session = sessionStore.create(21);
  await withRepository({
    async findById(id) {
      assert.equal(id, 21);
      return {
        id,
        name: 'Sam',
        email: 'sam@example.com',
        passwordHash: 'private-hash',
        role: 'private-role',
      };
    },
  }, async () => {
    const result = await request('/auth/me', {
      headers: { cookie: signedCookie(session.id) },
    });
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, {
      data: { id: 21, name: 'Sam', email: 'sam@example.com' },
    });
  });
  sessionStore.destroy(session.id);
});

test('missing, tampered, and unknown session cookies receive the same generic 401', async () => {
  const sessionId = '08fd00a5-f686-4baa-a4ca-5ed2a1487a7e';
  const validCookie = signedCookie(sessionId);
  const signedValue = decodeURIComponent(validCookie.split('=', 2)[1]);
  const tamperedValue = `${signedValue.slice(0, -1)}${signedValue.endsWith('A') ? 'B' : 'A'}`;
  const expected = {
    error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
  };
  const responses = [
    await request('/auth/me'),
    await request('/auth/me', { headers: { cookie: `sid=${encodeURIComponent(tamperedValue)}` } }),
    await request('/auth/me', { headers: { cookie: validCookie } }),
  ];

  for (const response of responses) {
    assert.equal(response.status, 401);
    assert.deepEqual(response.body, expected);
  }
});

test('expired sessions are rejected and removed from the store', async () => {
  const session = sessionStore.create(22, -1);
  await withRepository({
    async findById() {
      assert.fail('Expired sessions must not trigger a user lookup');
    },
  }, async () => {
    const result = await request('/auth/me', {
      headers: { cookie: signedCookie(session.id) },
    });
    assert.equal(result.status, 401);
    assert.deepEqual(result.body, {
      error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
    });
  });
  assert.equal(sessionStore.get(session.id), null);
});

test('sessions for deleted users are revoked and return generic authentication failure', async () => {
  const session = sessionStore.create(23);
  await withRepository({
    async findById(id) {
      assert.equal(id, 23);
      return null;
    },
  }, async () => {
    const result = await request('/auth/me', {
      headers: { cookie: signedCookie(session.id) },
    });
    assert.equal(result.status, 401);
    assert.deepEqual(result.body, {
      error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
    });
  });
  assert.equal(sessionStore.get(session.id), null);
});

test('logout revokes the session, clears cookie scope, and makes replay fail', async () => {
  const session = sessionStore.create(24);
  const cookie = signedCookie(session.id);
  const result = await request('/auth/logout', {
    method: 'POST',
    headers: { cookie },
  });

  assert.equal(result.status, 204);
  assert.equal(result.body, null);
  assert.equal(sessionStore.get(session.id), null);
  assert.match(result.setCookie.toLowerCase(), /httponly/);
  assert.match(result.setCookie.toLowerCase(), /samesite=lax/);
  assert.match(result.setCookie.toLowerCase(), /path=\//);
  assert.match(result.setCookie.toLowerCase(), /expires=thu, 01 jan 1970/);

  const replayed = await request('/auth/me', { headers: { cookie } });
  assert.equal(replayed.status, 401);
  assert.deepEqual(replayed.body, {
    error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
  });

  const repeated = await request('/auth/logout', {
    method: 'POST',
    headers: { cookie },
  });
  assert.equal(repeated.status, 204);
  assert.equal(repeated.body, null);
});

test('logout without a valid cookie remains idempotent', async () => {
  const result = await request('/auth/logout', { method: 'POST' });
  assert.equal(result.status, 204);
  assert.equal(result.body, null);
  assert.ok(result.setCookie);
});

test('unexpected repository errors return controlled responses without leaking details', async () => {
  const originalConsoleError = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args.join(' '));

  try {
    await withRepository({
      async findByEmail() {
        throw new Error('private database connection details');
      },
    }, async () => {
      const result = await loginRequest();
      assert.equal(result.status, 500);
      assert.deepEqual(result.body, {
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      });
      assert.doesNotMatch(JSON.stringify(result.body), /private database connection details/);
    });
  } finally {
    console.error = originalConsoleError;
  }

  assert.deepEqual(logged, ['Unhandled request error']);
});

test('invalid JSON returns a controlled 400 response', async () => {
  const result = await request('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{"email":',
  });
  assert.equal(result.status, 400);
  assert.deepEqual(result.body, {
    error: { code: 'INVALID_REQUEST', message: 'Request body must contain valid JSON' },
  });
});

test('production cookie configuration is always Secure', () => {
  const script = "process.env.COOKIE_SECRET='production-test-secret-with-at-least-32-characters'; process.env.NODE_ENV='production'; process.env.COOKIE_SECURE='false'; process.stdout.write(String(require('./src/config/cookies').cookieOptions.secure));";
  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: require('node:path').join(__dirname, '..'),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'true');
});

test('cookie secret must be configured with a non-placeholder secret', () => {
  const script = "process.env.COOKIE_SECRET='replace-this-with-a-random-secret-at-least-32-characters'; require('./src/config/cookies');";
  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: require('node:path').join(__dirname, '..'),
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /COOKIE_SECRET must be a non-placeholder secret/);
});
