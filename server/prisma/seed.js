const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🌱 Seeding database...");

    // Ensure the database is connected
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connection successful!");

    // Seed Roles
    const roles = ['Admin', 'Administrator', 'Registered'];

    for (const roleName of roles) {
      await prisma.role.upsert({
        where: { name: roleName },
        update: {},
        create: { name: roleName },
      });
    }

    console.log("✅ Roles have been seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
