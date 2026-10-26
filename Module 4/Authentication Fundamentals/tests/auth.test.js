const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const prisma = require('../src/db/prisma');
const userRepository = require('../src/repositories/userRepository');

const originalRepository = {
  findByEmail: userRepository.findByEmail,
  create: userRepository.create,
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

async function request(path, body, options = {}) {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: options.method || 'POST',
      headers: { 'content-type': 'application/json' },
      body: options.rawBody === undefined ? JSON.stringify(body) : options.rawBody,
    });
    const responseBody = await response.json();
    return { status: response.status, body: responseBody };
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test('registration normalizes identity, hashes the password, and returns only public fields', async () => {
  let savedUser;
  let lookedUpEmail;

  await withRepository({
    async findByEmail(email) {
      lookedUpEmail = email;
      return null;
    },
    async create(fields) {
      savedUser = fields;
      return { id: 47, name: fields.name, email: fields.email, passwordHash: fields.passwordHash };
    },
  }, async () => {
    const result = await request('/auth/register', {
      name: '  Sam  ',
      email: '  SAM@Example.COM ',
      password: 'correct horse battery staple',
    });

    assert.equal(result.status, 201);
    assert.deepEqual(result.body, {
      data: { id: 47, name: 'Sam', email: 'sam@example.com' },
    });
    assert.equal(lookedUpEmail, 'sam@example.com');
    assert.equal(savedUser.name, 'Sam');
    assert.equal(savedUser.email, 'sam@example.com');
    assert.notEqual(savedUser.passwordHash, 'correct horse battery staple');
    assert.equal(
      await bcrypt.compare('correct horse battery staple', savedUser.passwordHash),
      true,
    );
    assert.deepEqual(Object.keys(result.body.data).sort(), ['email', 'id', 'name']);
  });
});

test('duplicate normalized email returns 409 without creating another user', async () => {
  let createCalled = false;
  await withRepository({
    async findByEmail(email) {
      assert.equal(email, 'sam@example.com');
      return { id: 1 };
    },
    async create() {
      createCalled = true;
      throw new Error('Create should not be called');
    },
  }, async () => {
    const result = await request('/auth/register', {
      name: 'Sam',
      email: ' SAM@EXAMPLE.COM ',
      password: 'not-a-real-password',
    });
    assert.equal(result.status, 409);
    assert.equal(createCalled, false);
  });
});

test('database uniqueness race maps to the same 409 conflict', async () => {
  const originalCreate = prisma.user.create;
  const error = new Error('Database constraint details');
  error.code = 'P2002';
  prisma.user.create = async () => {
    throw error;
  };

  try {
    await withRepository({
      async findByEmail() {
        return null;
      },
      create: originalRepository.create,
    }, async () => {
      const result = await request('/auth/register', {
        name: 'Sam',
        email: 'sam@example.com',
        password: 'not-a-real-password',
      });
      assert.equal(result.status, 409);
      assert.equal(result.body.error.code, 'EMAIL_ALREADY_EXISTS');
      assert.doesNotMatch(JSON.stringify(result.body), /Database constraint details/);
    });
  } finally {
    prisma.user.create = originalCreate;
  }
});

test('login normalizes email and returns a public user for valid credentials', async () => {
  const passwordHash = await bcrypt.hash('correct horse battery staple', 10);
  let lookedUpEmail;
  await withRepository({
    async findByEmail(email) {
      lookedUpEmail = email;
      return { id: 47, name: 'Sam', email, passwordHash };
    },
  }, async () => {
    const result = await request('/auth/login', {
      email: ' SAM@Example.COM ',
      password: 'correct horse battery staple',
    });
    assert.equal(result.status, 200);
    assert.equal(lookedUpEmail, 'sam@example.com');
    assert.deepEqual(result.body, {
      data: { id: 47, name: 'Sam', email: 'sam@example.com' },
    });
    assert.deepEqual(Object.keys(result.body.data).sort(), ['email', 'id', 'name']);
  });
});

test('wrong password and unknown email have identical generic 401 responses', async () => {
  const passwordHash = await bcrypt.hash('the-correct-password', 10);
  const responses = [];

  await withRepository({
    async findByEmail(email) {
      if (email === 'known@example.com') {
        return { id: 1, name: 'Sam', email, passwordHash };
      }
      return null;
    },
  }, async () => {
    responses.push(await request('/auth/login', {
      email: 'known@example.com',
      password: 'wrong-password',
    }));
    responses.push(await request('/auth/login', {
      email: 'unknown@example.com',
      password: 'wrong-password',
    }));
  });

  assert.equal(responses[0].status, 401);
  assert.equal(responses[1].status, 401);
  assert.deepEqual(responses[0].body, {
    error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
  });
  assert.deepEqual(responses[1].body, responses[0].body);
});

test('invalid registration fields return 400 before repository or hash work', async () => {
  const invalidRequests = [
    {},
    { name: 'Sam', email: 'sam@example.com' },
    { name: '  ', email: 'sam@example.com', password: 'password' },
    { name: 'Sam', email: 'not-an-email', password: 'password' },
    { name: 'Sam', email: 'sam@example.com', password: '' },
    { name: 7, email: 'sam@example.com', password: 'password' },
  ];
  let repositoryCalls = 0;
  let hashCalls = 0;
  const originalHash = bcrypt.hash;
  bcrypt.hash = async (...args) => {
    hashCalls += 1;
    return originalHash(...args);
  };

  try {
    await withRepository({
      async findByEmail() {
        repositoryCalls += 1;
        return null;
      },
      async create() {
        repositoryCalls += 1;
        throw new Error('Create should not be called');
      },
    }, async () => {
      for (const body of invalidRequests) {
        const result = await request('/auth/register', body);
        assert.equal(result.status, 400);
      }
    });
  } finally {
    bcrypt.hash = originalHash;
  }

  assert.equal(repositoryCalls, 0);
  assert.equal(hashCalls, 0);
});

test('invalid login fields return 400 before repository lookups', async () => {
  let repositoryCalls = 0;
  const invalidRequests = [
    {},
    { email: 'sam@example.com' },
    { email: 'sam@example.com', password: '' },
    { email: 'bad-email', password: 'password' },
    { email: 4, password: 'password' },
  ];

  await withRepository({
    async findByEmail() {
      repositoryCalls += 1;
      return null;
    },
  }, async () => {
    for (const body of invalidRequests) {
      const result = await request('/auth/login', body);
      assert.equal(result.status, 400);
    }
  });

  assert.equal(repositoryCalls, 0);
});

test('unexpected database errors return a controlled response without leaking details', async () => {
  await withRepository({
    async findByEmail() {
      throw new Error('private database connection details');
    },
  }, async () => {
    const result = await request('/auth/login', {
      email: 'sam@example.com',
      password: 'not-a-real-password',
    });
    assert.equal(result.status, 500);
    assert.deepEqual(result.body, {
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' },
    });
    assert.doesNotMatch(JSON.stringify(result.body), /private database connection details/);
  });
});

test('malformed JSON returns a controlled 400 response', async () => {
  const result = await request('/auth/login', undefined, { rawBody: '{"email":' });
  assert.equal(result.status, 400);
  assert.deepEqual(result.body, {
    error: { code: 'INVALID_REQUEST', message: 'Request body must contain valid JSON' },
  });
});
