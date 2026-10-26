require('dotenv').config();

const express = require('express');
const { ApplicationError } = require('./errors');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(express.json());
app.use('/auth', authRoutes);

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof ApplicationError) {
    return res.status(error.statusCode).json({
      error: { code: error.code, message: error.message },
    });
  }

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      error: { code: 'INVALID_REQUEST', message: 'Request body must contain valid JSON' },
    });
  }

  console.error('Unhandled request error');
  return res.status(500).json({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' },
  });
});

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log(`API listening on ${port}`));
}

module.exports = app;
