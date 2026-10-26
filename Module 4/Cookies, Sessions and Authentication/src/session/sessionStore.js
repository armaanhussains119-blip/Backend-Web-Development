const { randomUUID } = require('node:crypto');
const { sessionTtlMs } = require('../config/cookies');

const sessions = new Map();

function create(userId, ttlMs = sessionTtlMs) {
  const session = {
    id: randomUUID(),
    userId,
    expiresAt: new Date(Date.now() + ttlMs),
  };
  sessions.set(session.id, { userId: session.userId, expiresAt: session.expiresAt });
  return { ...session };
}

function get(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    sessions.delete(sessionId);
    return null;
  }

  return { ...session };
}

function destroy(sessionId) {
  sessions.delete(sessionId);
}

module.exports = { create, get, destroy };
