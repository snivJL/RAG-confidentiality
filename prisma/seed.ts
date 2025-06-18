import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const demoPassword = "kf@123";
  const hashed = await bcrypt.hash(demoPassword, 10);

  // 1. create two users
  const alice = await prisma.user.upsert({
    where: { email: "partner.demo@korefocus.com" },
    update: { name: "Partner Demo", hashedPassword: hashed },
    create: {
      email: "partner.demo@korefocus.com",
      name: "Partner Demo",
      hashedPassword: hashed,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "associate.demo@korefocus.com" },
    update: { name: "Associate Demo", hashedPassword: hashed },
    create: {
      email: "associate.demo@korefocus.com",
      name: "Associate Demo",
      hashedPassword: hashed,
    },
  });

  // 2. add roles
  await prisma.userRole.createMany({
    skipDuplicates: true,
    data: [
      { userId: alice.id, role: "Partner" },
      { userId: bob.id, role: "Associate" },
    ],
  });

  // 3. add projects
  await prisma.userProject.createMany({
    skipDuplicates: true,
    data: [
      { userId: alice.id, projectId: "pharma-fund-A" },
      { userId: bob.id, projectId: "pharma-fund-A" },
      { userId: bob.id, projectId: "logistics-deal-B" },
    ],
  });

  console.log("🌱 Demo users, roles, projects & passwords seeded.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
