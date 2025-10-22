const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const users = await prisma.user.findMany({ select: { id: true, email: true, role: true, displayName: true, createdAt: true, updatedAt: true } });
    console.log(JSON.stringify({ users }, null, 2));
  } catch (err) {
    console.error('Error querying users:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
