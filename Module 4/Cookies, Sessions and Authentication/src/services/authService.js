const { randomBytes } = require('node:crypto');
const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const sessionStore = require('../session/sessionStore');

let dummyPasswordHashPromise;

function invalidRequest() {
  const error = new Error('Email and password must be non-empty strings');
  error.statusCode = 400;
  error.code = 'INVALID_REQUEST';
  return error;
}

function normalizeCredentials(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw invalidRequest();
  }

  const { email, password } = body;
  if (typeof email !== 'string' || !email.trim()
    || typeof password !== 'string' || password.length === 0) {
    throw invalidRequest();
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw invalidRequest();
  }

  return { email: normalizedEmail, password };
}

function toPublicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

function getDummyPasswordHash() {
  if (!dummyPasswordHashPromise) {
    dummyPasswordHashPromise = bcrypt.hash(randomBytes(32).toString('hex'), 10);
  }
  return dummyPasswordHashPromise;
}

async function login(body) {
  const credentials = normalizeCredentials(body);
  const user = await userRepository.findByEmail(credentials.email);
  const passwordHash = user ? user.passwordHash : await getDummyPasswordHash();
  const passwordMatches = await bcrypt.compare(credentials.password, passwordHash);

  if (!user || !passwordMatches) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  const session = sessionStore.create(user.id);
  return { user: toPublicUser(user), session };
}

module.exports = { login, toPublicUser };
