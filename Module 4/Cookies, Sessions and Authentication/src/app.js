require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const { cookieSecret } = require('./config/cookies');

const app = express();
app.use(express.json());
app.use(cookieParser(cookieSecret));
app.use('/auth', authRoutes);
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error.statusCode === 400 && error.code === 'INVALID_REQUEST') {
    return res.status(400).json({
      error: { code: 'INVALID_REQUEST', message: 'Email and password must be valid' },
    });
  }

  if (error.statusCode === 401 && error.code === 'INVALID_CREDENTIALS') {
    return res.status(401).json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    });
  }

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      error: { code: 'INVALID_REQUEST', message: 'Request body must contain valid JSON' },
    });
  }

  console.error('Unhandled request error');
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
});

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log(`API listening on ${port}`));
}

module.exports = app;
