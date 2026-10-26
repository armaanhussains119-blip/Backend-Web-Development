const { randomBytes } = require('node:crypto');
const bcrypt = require('bcryptjs');
const { bcryptRounds } = require('../config');
const { ApplicationError, EmailConflictError } = require('../errors');
const userRepository = require('../repositories/userRepository');

let dummyPasswordHashPromise;

function requireObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApplicationError(400, 'INVALID_REQUEST', 'A JSON object is required');
  }
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateRegistration(body) {
  requireObject(body);

  const { name, email, password } = body;
  if (typeof name !== 'string' || !name.trim()
    || typeof email !== 'string' || !email.trim()
    || typeof password !== 'string' || password.length === 0) {
    throw new ApplicationError(
      400,
      'INVALID_REQUEST',
      'Name, email, and password must be non-empty strings',
    );
  }

  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    throw new ApplicationError(400, 'INVALID_REQUEST', 'Email must be a valid email address');
  }

  return { name: name.trim(), email: normalizedEmail, password };
}

function validateLogin(body) {
  requireObject(body);

  const { email, password } = body;
  if (typeof email !== 'string' || !email.trim()
    || typeof password !== 'string' || password.length === 0) {
    throw new ApplicationError(
      400,
      'INVALID_REQUEST',
      'Email and password must be non-empty strings',
    );
  }

  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    throw new ApplicationError(400, 'INVALID_REQUEST', 'Email must be a valid email address');
  }

  return { email: normalizedEmail, password };
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

function getDummyPasswordHash() {
  if (!dummyPasswordHashPromise) {
    const randomPassword = randomBytes(32).toString('hex');
    dummyPasswordHashPromise = bcrypt.hash(randomPassword, bcryptRounds);
  }
  return dummyPasswordHashPromise;
}

async function register(body) {
  const input = validateRegistration(body);
  const existingUser = await userRepository.findByEmail(input.email);
  if (existingUser) {
    throw new EmailConflictError();
  }

  const passwordHash = await bcrypt.hash(input.password, bcryptRounds);
  const user = await userRepository.create({
    name: input.name,
    email: input.email,
    passwordHash,
  });
  return publicUser(user);
}

async function login(body) {
  const input = validateLogin(body);
  const user = await userRepository.findByEmail(input.email);
  const passwordHash = user ? user.passwordHash : await getDummyPasswordHash();
  const passwordMatches = await bcrypt.compare(input.password, passwordHash);

  if (!user || !passwordMatches) {
    throw new ApplicationError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  return publicUser(user);
}

module.exports = { register, login };
