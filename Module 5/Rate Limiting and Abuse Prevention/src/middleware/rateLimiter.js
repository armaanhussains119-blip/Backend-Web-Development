'use strict';

const rateLimit = require('express-rate-limit');

// In production, a RedisStore from rate-limit-redis can replace MemoryStore.
// MemoryStore keeps counters in each Node.js process, so instances behind a
// load balancer each enforce a separate limit; a client could receive the limit
// once per instance. Redis provides one shared counter for all instances.
module.exports = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, _next, options) => {
    const resetTime = req.rateLimit.resetTime;
    const retryAfterSeconds = Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000));

    res.setHeader('Retry-After', retryAfterSeconds);
    res.status(options.statusCode).send(options.message);
  },
});
