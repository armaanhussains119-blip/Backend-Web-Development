'use strict';

require('dotenv').config();

const express = require('express');
const requireAuth = require('./middleware/requireAuth');
const requireRole = require('./middleware/requireRole');
const { users } = require('./data');
const postsRoutes = require('./routes/posts');

const app = express();
app.use(express.json());

app.use('/posts', postsRoutes);

app.delete('/users/:id', requireAuth, requireRole('admin'), (req, res) => {
  const userIndex = users.findIndex((user) => user.id === req.params.id);
  if (userIndex === -1) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'User not found' },
    });
  }

  users.splice(userIndex, 1);
  return res.status(200).json({ message: 'User deleted' });
});

app.use((error, req, res, next) => {
  console.error(error.message);
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
});

const port = Number(process.env.PORT || 3000);
if (require.main === module) {
  app.listen(port, () => console.log(`Authorization and RBAC server listening on port ${port}`));
}

module.exports = app;
