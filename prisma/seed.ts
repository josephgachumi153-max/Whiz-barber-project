import { PrismaClient, Role, UserStatus } from "@prisma/client";
import { hashPassword } from "../api/lib/auth.js";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_FULL_NAME?.trim() || "Administrator";

  if (!username || !password) {
    throw new Error(
      "Production seeding requires ADMIN_USERNAME and ADMIN_PASSWORD environment variables."
    );
  }
  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters long.");
  }

  const passwordHash = await hashPassword(password);
  const admin = await prisma.user.upsert({
    where: { username },
    update: {
      role: Role.ADMIN,
      status: UserStatus.APPROVED,
      isActive: true,
      fullName
    },
    create: {
      username,
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.APPROVED,
      isActive: true,
      fullName
    }
  });

  console.log(`Production Admin ready: ${admin.username}`);
  console.log("No demo users, customers, barbers, or services were created.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
