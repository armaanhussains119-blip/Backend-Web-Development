const userRepository = require('../repositories/userRepository');
const sessionStore = require('../session/sessionStore');
const { cookieName } = require('../config/cookies');

function rejectAuthentication(res) {
  return res.status(401).json({
    error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
  });
}

module.exports = async function requireSession(req, res, next) {
  const sessionId = req.signedCookies && req.signedCookies[cookieName];
  if (typeof sessionId !== 'string' || !sessionId) {
    return rejectAuthentication(res);
  }

  const session = sessionStore.get(sessionId);
  if (!session) {
    return rejectAuthentication(res);
  }

  const user = await userRepository.findById(session.userId);
  if (!user) {
    sessionStore.destroy(sessionId);
    return rejectAuthentication(res);
  }

  req.authenticatedUser = user;
  return next();
};
