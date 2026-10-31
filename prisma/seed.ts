import { PrismaClient, Role, UserStatus } from "@prisma/client";
import { hashPassword } from "../api/lib/auth.js";

const prisma = new PrismaClient();

async function main() {
  const adminHash = await hashPassword("Admin@12345");
  const managerHash = await hashPassword("Manager@12345");
  const barberHash = await hashPassword("Barber@12345");
  const shampooHash = await hashPassword("Shampoo@12345");

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: adminHash,
      role: Role.ADMIN,
      status: UserStatus.APPROVED,
      fullName: "System Admin"
    }
  });

  const manager = await prisma.user.upsert({
    where: { username: "manager" },
    update: {},
    create: {
      username: "manager",
      passwordHash: managerHash,
      role: Role.MANAGER,
      status: UserStatus.APPROVED,
      fullName: "Demo Manager"
    }
  });

  const barberUser = await prisma.user.upsert({
    where: { username: "barber" },
    update: {},
    create: {
      username: "barber",
      passwordHash: barberHash,
      role: Role.BARBER,
      status: UserStatus.APPROVED,
      fullName: "Demo Barber"
    }
  });

  await prisma.barber.upsert({
    where: { userId: barberUser.id },
    update: {},
    create: {
      userId: barberUser.id,
      name: "Demo Barber",
      commissionPct: 35
    }
  });

  // Shampoo assistant in the shared staff pool
  const shampooUser = await prisma.user.upsert({
    where: { username: "shampoo" },
    update: {},
    create: {
      username: "shampoo",
      passwordHash: shampooHash,
      role: Role.BARBER,
      status: UserStatus.APPROVED,
      fullName: "Shampoo Assistant"
    }
  });

  await prisma.barber.upsert({
    where: { userId: shampooUser.id },
    update: { name: "Shampoo Assistant" },
    create: {
      userId: shampooUser.id,
      name: "Shampoo Assistant",
      commissionPct: 20
    }
  });

  const customers = [
    { name: "Amina Wanjiku", phone: "0712000001" },
    { name: "Brian Otieno", phone: "0712000002" },
    { name: "Kevin Mwangi", phone: "0712000003" }
  ];

  for (const customer of customers) {
    const exists = await prisma.customer.findFirst({
      where: { managerId: manager.id, name: customer.name }
    });
    if (!exists) {
      await prisma.customer.create({
        data: { ...customer, managerId: manager.id }
      });
    }
  }

  const services = [
    // Core services
    { name: "Haircut", price: 250, commissionPct: 35, durationMinutes: 30 },
    { name: "Kids Haircut", price: 100, commissionPct: 35, durationMinutes: 20 },
    { name: "Beard Trim", price: 100, commissionPct: 30, durationMinutes: 15 },
    { name: "Cut / Line-up", price: 50, commissionPct: 30, durationMinutes: 10 },
    { name: "Hair Dye", price: 300, commissionPct: 25, durationMinutes: 45 },
    { name: "Dye & Haircut", price: 500, commissionPct: 30, durationMinutes: 60 },
    { name: "Hair Relaxing", price: 300, commissionPct: 25, durationMinutes: 45 },
    // Nail, facial and body-care services from the supplied price catalogue
    { name: "Manicure", price: 400, commissionPct: 25, durationMinutes: 45 },
    { name: "Pedicure", price: 600, commissionPct: 25, durationMinutes: 60 },
    { name: "Full Facial", price: 500, commissionPct: 25, durationMinutes: 45 },
    { name: "Nails Cut & Filing", price: 200, commissionPct: 25, durationMinutes: 25 },
    { name: "Scrubbing", price: 100, commissionPct: 20, durationMinutes: 20 },
    { name: "Back Massage", price: 300, commissionPct: 25, durationMinutes: 30 },
    { name: "Stick-ons", price: 500, commissionPct: 25, durationMinutes: 45 },
    { name: "Gum Gel", price: 800, commissionPct: 25, durationMinutes: 60 },
    { name: "Gel Polish", price: 300, commissionPct: 25, durationMinutes: 40 },
    { name: "Nail Tips", price: 600, commissionPct: 25, durationMinutes: 60 },
    { name: "Eyebrows", price: 100, commissionPct: 20, durationMinutes: 15 },
    { name: "Steaming", price: 300, commissionPct: 20, durationMinutes: 25 },
    // Useful shampoo-assistant service
    { name: "Hair Shampoo & Wash", price: 100, commissionPct: 20, durationMinutes: 15 }
  ];

  for (const service of services) {
    const exists = await prisma.service.findFirst({
      where: { managerId: manager.id, name: service.name }
    });
    if (!exists) {
      await prisma.service.create({
        data: { ...service, managerId: manager.id }
      });
    }
  }

  console.log(
    `Seed complete. Admin: ${admin.username}; manager: ${manager.username}; barber: ${barberUser.username}; shampoo assistant: ${shampooUser.username}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
