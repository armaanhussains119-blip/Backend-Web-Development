const prisma = require('../db/prisma');
const { Prisma } = require('@prisma/client');

const postFields = {
  id: true,
  title: true,
  body: true,
  authorId: true,
};

function numericId(id) {
  const value = Number(id);
  return Number.isSafeInteger(value) ? value : null;
}

function mapConstraintError(error) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) throw error;

  if (error.code === 'P2002') {
    const conflict = new Error('A record with these values already exists');
    conflict.statusCode = 409;
    throw conflict;
  }

  if (error.code === 'P2003' || error.code === 'P2014') {
    const invalidRelation = new Error('A related record does not exist');
    invalidRelation.statusCode = 422;
    throw invalidRelation;
  }

  throw error;
}

async function findAll() {
  return prisma.post.findMany({
    orderBy: { id: 'asc' },
    select: postFields,
  });
}

async function findById(id) {
  const postId = numericId(id);
  if (postId === null) return null;

  return prisma.post.findUnique({
    where: { id: postId },
    select: postFields,
  });
}

async function create(fields) {
  try {
    return await prisma.post.create({
      data: {
        title: fields.title,
        body: fields.body || '',
        authorId: fields.authorId,
      },
      select: postFields,
    });
  } catch (error) {
    mapConstraintError(error);
  }
}

async function update(id, patch) {
  const postId = numericId(id);
  if (postId === null) return null;

  try {
    return await prisma.post.update({
      where: { id: postId },
      data: {
        ...(patch.title !== undefined && { title: patch.title }),
        ...(patch.body !== undefined && { body: patch.body }),
      },
      select: postFields,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return null;
    }
    mapConstraintError(error);
  }
}

async function remove(id) {
  const postId = numericId(id);
  if (postId === null) return false;

  try {
    await prisma.post.delete({ where: { id: postId } });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return false;
    }
    mapConstraintError(error);
  }
}

module.exports = { findAll, findById, create, update, remove };
