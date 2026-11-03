'use strict';

const users = [
  { id: 'member-a', name: 'Member A', role: 'member' },
  { id: 'member-b', name: 'Member B', role: 'member' },
  { id: 'moderator-1', name: 'Moderator', role: 'moderator' },
  { id: 'admin-1', name: 'Admin', role: 'admin' },
];

const posts = [
  { id: 'post-a', authorId: 'member-a', title: 'Member A post', content: 'First post', hidden: false },
  { id: 'post-b', authorId: 'member-a', title: 'Another post', content: 'Second post', hidden: false },
  { id: 'post-c', authorId: 'member-a', title: 'A third post', content: 'Third post', hidden: false },
  { id: 'post-d', authorId: 'member-a', title: 'A hidden-test post', content: 'Fourth post', hidden: false },
];

module.exports = { users, posts };
