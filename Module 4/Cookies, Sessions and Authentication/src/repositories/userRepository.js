const prisma = require('../db/prisma');

const authenticationFields = {
  id: true,
  name: true,
  email: true,
  passwordHash: true,
};

async function findByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
    select: authenticationFields,
  });
}

async function findById(id) {
  return prisma.user.findUnique({
    where: { id },
    select: authenticationFields,
  });
}

module.exports = { findByEmail, findById };
