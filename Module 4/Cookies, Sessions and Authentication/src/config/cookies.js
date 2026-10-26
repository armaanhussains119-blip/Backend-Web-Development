const cookieSecret = process.env.COOKIE_SECRET;
const insecureSecret = /replace|placeholder|change[-_ ]?me|example/i;

if (typeof cookieSecret !== 'string' || cookieSecret.length < 32 || insecureSecret.test(cookieSecret)) {
  throw new Error('COOKIE_SECRET must be a non-placeholder secret of at least 32 characters');
}

const secureSetting = process.env.COOKIE_SECURE || 'false';
if (secureSetting !== 'true' && secureSetting !== 'false') {
  throw new Error('COOKIE_SECURE must be either "true" or "false"');
}

const sessionTtlMs = Number(process.env.SESSION_TTL_MS || 60 * 60 * 1000);
if (!Number.isSafeInteger(sessionTtlMs) || sessionTtlMs < 60_000 || sessionTtlMs > 24 * 60 * 60 * 1000) {
  throw new Error('SESSION_TTL_MS must be between 60000 and 86400000');
}

const cookieName = 'sid';
const cookieOptions = Object.freeze({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production' || secureSetting === 'true',
  path: '/',
  signed: true,
  maxAge: sessionTtlMs,
});

function setSessionCookie(res, sessionId) {
  res.cookie(cookieName, sessionId, cookieOptions);
}

function clearSessionCookie(res) {
  const options = { ...cookieOptions };
  delete options.maxAge;
  res.clearCookie(cookieName, options);
}

module.exports = {
  cookieName,
  cookieOptions,
  cookieSecret,
  sessionTtlMs,
  setSessionCookie,
  clearSessionCookie,
};
