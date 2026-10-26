const authService = require('../services/authService');
const sessionStore = require('../session/sessionStore');
const { cookieName, setSessionCookie, clearSessionCookie } = require('../config/cookies');

async function login(req, res) {
  const { user, session } = await authService.login(req.body);
  setSessionCookie(res, session.id);
  return res.status(200).json({ data: user });
}

function me(req, res) {
  return res.status(200).json({ data: authService.toPublicUser(req.authenticatedUser) });
}

function logout(req, res) {
  const sessionId = req.signedCookies && req.signedCookies[cookieName];
  if (typeof sessionId === 'string' && sessionId) {
    sessionStore.destroy(sessionId);
  }

  clearSessionCookie(res);
  return res.status(204).send();
}

module.exports = { login, me, logout };
