import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Pipeline stages
  const stages = [
    "Sourced",
    "Submitted",
    "Client Review",
    "Interview",
    "Offer",
    "Placed",
    "Rejected",
  ];
  for (let i = 0; i < stages.length; i++) {
    await prisma.pipelineStage.upsert({
      where: { name: stages[i] },
      update: {},
      create: { name: stages[i], order: i + 1 },
    });
  }
  console.log("✓ Pipeline stages seeded");

  // Contract modes
  const modes = ["C2C", "W2", "C2H"];
  for (let i = 0; i < modes.length; i++) {
    await prisma.contractMode.upsert({
      where: { label: modes[i] },
      update: {},
      create: { label: modes[i], order: i + 1 },
    });
  }
  console.log("✓ Contract modes seeded");

  // Users
  const users = [
    { name: "Admin User", email: "admin@sietrix.com", role: "admin" as const, password: "Admin@123" },
    { name: "Alice Sales", email: "alice@sietrix.com", role: "sales" as const, password: "Sales@123" },
    { name: "Bob Sales", email: "bob@sietrix.com", role: "sales" as const, password: "Sales@123" },
    { name: "Carol Sales", email: "carol@sietrix.com", role: "sales" as const, password: "Sales@123" },
    { name: "Dave Sales", email: "dave@sietrix.com", role: "sales" as const, password: "Sales@123" },
    { name: "Eve Sales", email: "eve@sietrix.com", role: "sales" as const, password: "Sales@123" },
    { name: "Frank Sales", email: "frank@sietrix.com", role: "sales" as const, password: "Sales@123" },
    { name: "Grace HR", email: "grace@sietrix.com", role: "hr" as const, password: "HR@123456" },
    { name: "Hank HR", email: "hank@sietrix.com", role: "hr" as const, password: "HR@123456" },
    { name: "Iris HR", email: "iris@sietrix.com", role: "hr" as const, password: "HR@123456" },
    { name: "Jack HR", email: "jack@sietrix.com", role: "hr" as const, password: "HR@123456" },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, role: u.role, passwordHash: hash },
    });
  }
  console.log("✓ Users seeded");
  console.log("");
  console.log("Demo credentials:");
  console.log("  Admin  → admin@sietrix.com / Admin@123");
  console.log("  Sales  → alice@sietrix.com / Sales@123");
  console.log("  HR     → grace@sietrix.com / HR@123456");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
