import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@playutsav.com';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existingAdmin) {
    console.log('✅ Admin user already exists');
  } else {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);
    const admin = await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        passwordHash,
        role: 'ADMIN',
        displayName: 'Platform Administrator',
      },
    });
    console.log(`✅ Created admin user: ${admin.email}`);
  }

  // Optionally create a demo host user
  const DEMO_HOST_EMAIL = 'host@demo.com';
  const existingHost = await prisma.user.findUnique({
    where: { email: DEMO_HOST_EMAIL },
  });

  if (!existingHost) {
    const hostPasswordHash = await bcrypt.hash('Host@123', BCRYPT_ROUNDS);
    const host = await prisma.user.create({
      data: {
        email: DEMO_HOST_EMAIL,
        passwordHash: hostPasswordHash,
        role: 'HOST',
        displayName: 'Demo Host',
        hostProfile: {
          create: {
            organization: 'Demo Organization',
            contactEmail: DEMO_HOST_EMAIL,
          },
        },
      },
    });
    console.log(`✅ Created demo host user: ${host.email}`);
  } else {
    console.log('✅ Demo host user already exists');
  }

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
