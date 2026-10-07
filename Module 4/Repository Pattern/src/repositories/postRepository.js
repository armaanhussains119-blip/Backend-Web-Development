const initialPosts = [
  { id: 1, title: 'First post', body: 'Repository boundaries protect change.', authorId: 7 },
  { id: 2, title: 'Second post', body: 'Services should speak in domain language.', authorId: 8 },
];

// Prisma can replace this Map and its ID allocation with database queries and generated IDs.
// The five-operation contract and the records returned to services/controllers stay unchanged.
const posts = new Map(initialPosts.map((post) => [post.id, { ...post }]));
let nextId = Math.max(...posts.keys()) + 1;

function findAll() {
  return Array.from(posts.values(), (post) => ({ ...post }));
}

function findById(id) {
  const post = posts.get(Number(id));
  return post ? { ...post } : null;
}

function create(fields) {
  const post = { ...fields, id: nextId++ };
  posts.set(post.id, post);
  return { ...post };
}

function update(id, patch) {
  const post = posts.get(Number(id));
  if (!post) return null;
  Object.assign(post, patch);
  return { ...post };
}

function remove(id) {
  return posts.delete(Number(id));
}

module.exports = { findAll, findById, create, update, remove };