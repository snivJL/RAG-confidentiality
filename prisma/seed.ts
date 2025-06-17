import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // 1. create two users
  const alice = await prisma.user.create({
    data: { email: "alice@example.com", name: "Alice Partner" },
  });

  const bob = await prisma.user.create({
    data: { email: "bob@example.com", name: "Bob Associate" },
  });

  // 2. add roles
  await prisma.userRole.createMany({
    data: [
      { userId: alice.id, role: "Partner" },
      { userId: bob.id, role: "Associate" },
    ],
  });

  // 3. add projects
  await prisma.userProject.createMany({
    data: [
      { userId: alice.id, projectId: "pharma-fund-A" },
      { userId: bob.id, projectId: "pharma-fund-A" },
      { userId: bob.id, projectId: "logistics-deal-B" },
    ],
  });

  console.log("🌱  Demo users, roles & projects seeded.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
