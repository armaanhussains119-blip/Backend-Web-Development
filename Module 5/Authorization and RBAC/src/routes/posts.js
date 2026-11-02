'use strict';

const router = require('express').Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const { posts } = require('../data');

function findPost(req, res) {
  const post = posts.find((item) => item.id === req.params.id);
  if (!post) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Post not found' },
    });
    return null;
  }
  return post;
}

function canManagePost(post, user) {
  const isOwner = post.authorId === user.id;
  const isPrivileged = ['moderator', 'admin'].includes(user.role);
  return isOwner || isPrivileged;
}

function requirePostPermission(post, req, res) {
  if (!canManagePost(post, req.user)) {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'You cannot modify this post' },
    });
    return false;
  }
  return true;
}

router.patch('/:id', requireAuth, (req, res) => {
  const post = findPost(req, res);
  if (!post) return;
  if (!requirePostPermission(post, req, res)) return;

  for (const field of ['title', 'content']) {
    if (typeof req.body[field] === 'string') {
      post[field] = req.body[field];
    }
  }

  return res.status(200).json({ post });
});

router.delete('/:id', requireAuth, (req, res) => {
  const post = findPost(req, res);
  if (!post) return;
  if (!requirePostPermission(post, req, res)) return;

  posts.splice(posts.indexOf(post), 1);
  return res.status(200).json({ message: 'Post deleted' });
});

router.post('/:id/hide', requireAuth, requireRole('moderator', 'admin'), (req, res) => {
  const post = findPost(req, res);
  if (!post) return;

  post.hidden = true;
  return res.status(200).json({ post });
});

module.exports = router;
