'use strict';

const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.ACCESS_SECRET || 'lu-5-1-test-secret-do-not-use-in-production';

function signToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { algorithm: 'HS256', expiresIn: '15m' });
}

function verifyToken(token) {
  return jwt.verify(token, ACCESS_SECRET, { algorithms: ['HS256'] });
}

module.exports = { signToken, verifyToken };
