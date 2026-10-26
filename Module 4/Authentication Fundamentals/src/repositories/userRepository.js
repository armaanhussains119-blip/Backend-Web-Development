const prisma = require('../db/prisma');
const { EmailConflictError } = require('../errors');

const userFields = {
  id: true,
  name: true,
  email: true,
  passwordHash: true,
};

async function findByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
    select: userFields,
  });
}

async function create({ name, email, passwordHash }) {
  try {
    return await prisma.user.create({
      data: { name, email, passwordHash },
      select: userFields,
    });
  } catch (error) {
    if (error && error.code === 'P2002') {
      throw new EmailConflictError();
    }
    throw error;
  }
}

module.exports = { findByEmail, create };
