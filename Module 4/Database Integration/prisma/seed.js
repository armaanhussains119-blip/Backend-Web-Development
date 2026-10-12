const prisma = require('../src/db/prisma');
const posts = require('../src/data/postSeed');

async function main() {
  await prisma.user.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'Community Member' },
  });

  for (const post of posts) {
    await prisma.post.upsert({
      where: { id: post.id },
      update: {},
      create: post,
    });
  }

  await prisma.$queryRaw`
    SELECT setval(pg_get_serial_sequence('"User"', 'id'),
      COALESCE((SELECT MAX("id") FROM "User"), 1))
  `;
  await prisma.$queryRaw`
    SELECT setval(pg_get_serial_sequence('"Post"', 'id'),
      COALESCE((SELECT MAX("id") FROM "Post"), 1))
  `;
}

main()
  .catch((error) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
