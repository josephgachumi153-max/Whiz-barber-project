import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import sensible from "@fastify/sensible";
import { Role, OrderStatus, PaymentMethod, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./lib/prisma.js";
import { hashPassword, verifyPassword } from "./lib/auth.js";

const app = Fastify({ logger: true });

const PORT = Number(process.env.PORT ?? 3000);
const JWT_SECRET = process.env.JWT_SECRET ??
  (process.env.NODE_ENV === "production"
    ? (() => {
        throw new Error("JWT_SECRET must be configured in production");
      })()
    : "development-only-secret-change-before-deploy");
const LOYALTY_RATE = Number(process.env.LOYALTY_POINTS_PER_KES ?? 0.01);

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; username: string; role: Role };
    user: { sub: string; username: string; role: Role };
  }
}

// Support JSON payload parsing whether running under Vercel serverless or local Node
app.removeAllContentTypeParsers();
app.addContentTypeParser("application/json", {}, (req, payload, done) => {
  if ((req as any).body) {
    done(null, (req as any).body);
    return;
  }
  let data = "";
  payload.on("data", (chunk) => {
    data += chunk;
  });
  payload.on("end", () => {
    try {
      done(null, data ? JSON.parse(data) : {});
    } catch (e) {
      done(e as Error, undefined);
    }
  });
});

await app.register(cors, {
  origin: process.env.ALLOWED_ORIGIN
    ? process.env.ALLOWED_ORIGIN.split(",").map((origin) => origin.trim())
    : true
});
await app.register(sensible);
await app.register(jwt, {
  secret: JWT_SECRET,
  sign: { expiresIn: process.env.JWT_EXPIRES_IN ?? "8h" }
});

type AuthedRequest = FastifyRequest;

async function auth(req: AuthedRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.code(401).send({ message: "Unauthorized" });
  }
}

function role(...roles: Role[]) {
  return async (req: AuthedRequest, reply: FastifyReply) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return reply.code(403).send({ message: "Forbidden" });
    }
  };
}

const managerIdFor = (req: AuthedRequest) =>
  req.user.role === Role.ADMIN ? undefined : req.user.sub;

const customerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(30).optional(),
  email: z.string().email().optional().or(z.literal(""))
});

const serviceSchema = z.object({
  name: z.string().trim().min(1).max(100),
  price: z.coerce.number().positive(),
  commissionPct: z.coerce.number().min(0).max(100).optional(),
  durationMinutes: z.coerce.number().int().min(1).max(600).default(30)
});

const orderSchema = z.object({
  customerId: z.string().min(1),
  serviceId: z.string().min(1),
  barberId: z.string().min(1),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  notes: z.string().max(500).optional()
});

const idSchema = z.object({ id: z.string().min(1) });

app.get("/health", async () => ({ status: "ok" }));
app.get("/api", async () => ({
  status: "ok",
  message: "Whiz Barbershop API",
  version: "1.0.0"
}));

app.post("/api/auth/login", async (req, reply) => {
  const schema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
    role: z.enum(["ADMIN", "MANAGER", "BARBER", "SHAMPOO_ASSISTANT"])
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ message: "Username and password are required" });
  }

  const user = await prisma.user.findUnique({
    where: { username: parsed.data.username }
  });

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return reply.code(401).send({ message: "Invalid credentials" });
  }

  if (user.role !== parsed.data.role) {
    return reply.code(401).send({ message: "Selected account type does not match this account" });
  }

  if (!user.isActive || user.status !== "APPROVED") {
    return reply.code(403).send({ message: "Inactive or suspended account" });
  }

  const token = app.jwt.sign({
    sub: user.id,
    username: user.username,
    role: user.role
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role
    }
  };
});

app.get("/api/auth/me", { preHandler: auth }, async (req) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.user.sub },
    select: { id: true, username: true, fullName: true, role: true }
  });
  return user;
});

app.post("/api/auth/managers", { preHandler: [auth, role(Role.ADMIN)] }, async (req, reply) => {
  const parsed = z
    .object({
      username: z.string().min(3).max(40),
      password: z.string().min(10),
      fullName: z.string().max(100).optional(),
      email: z.string().email().optional()
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return reply.code(400).send({
      message: "Invalid manager details",
      issues: parsed.error.flatten()
    });
  }

  try {
    const user = await prisma.user.create({
      data: {
        ...parsed.data,
        passwordHash: await hashPassword(parsed.data.password),
        role: Role.MANAGER
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true
      }
    });
    return reply.code(201).send(user);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return reply.code(409).send({ message: "Username already exists" });
    }
    throw e;
  }
});

app.get("/api/customers", { preHandler: auth }, async (req) => {
  const managerId = managerIdFor(req);
  return prisma.customer.findMany({
    where: { ...(managerId ? { managerId } : {}), isActive: true },
    orderBy: { name: "asc" }
  });
});

app.post("/api/customers", { preHandler: [auth, role(Role.ADMIN, Role.MANAGER)] }, async (req, reply) => {
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ message: "Invalid customer", issues: parsed.error.flatten() });
  }

  const body = parsed.data;
  const ownerId = req.user.role === Role.ADMIN ? (req.body as any).managerId : req.user.sub;
  if (!ownerId) return reply.code(400).send({ message: "Admin must supply managerId" });

  const owner = await prisma.user.findUnique({ where: { id: ownerId } });
  if (!owner || owner.role !== Role.MANAGER) {
    return reply.code(400).send({ message: "Invalid managerId" });
  }

  const customer = await prisma.customer.create({
    data: {
      ...body,
      email: body.email || null,
      managerId: ownerId
    }
  });
  return reply.code(201).send(customer);
});

app.delete("/api/customers/:id", { preHandler: [auth, role(Role.ADMIN, Role.MANAGER)] }, async (req, reply) => {
  const { id } = idSchema.parse(req.params);
  const row = await prisma.customer.findUnique({ where: { id } });
  if (!row) return reply.code(404).send({ message: "Customer not found" });

  if (req.user.role !== Role.ADMIN && row.managerId !== req.user.sub) {
    return reply.code(403).send({ message: "Not your record" });
  }

  await prisma.customer.update({ where: { id }, data: { isActive: false } });
  return { success: true };
});

app.get("/api/services", { preHandler: auth }, async (req) => {
  const managerId = managerIdFor(req);
  return prisma.service.findMany({
    where: { ...(managerId ? { managerId } : {}), isActive: true },
    orderBy: { name: "asc" }
  });
});

app.post("/api/services", { preHandler: [auth, role(Role.ADMIN, Role.MANAGER)] }, async (req, reply) => {
  const parsed = serviceSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ message: "Invalid service", issues: parsed.error.flatten() });
  }

  const ownerId = req.user.role === Role.ADMIN ? (req.body as any).managerId : req.user.sub;
  if (!ownerId) return reply.code(400).send({ message: "Admin must supply managerId" });

  try {
    const service = await prisma.service.create({
      data: { ...parsed.data, managerId: ownerId }
    });
    return reply.code(201).send(service);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return reply.code(409).send({ message: "You already have this service" });
    }
    throw e;
  }
});

app.delete("/api/services/:id", { preHandler: [auth, role(Role.ADMIN, Role.MANAGER)] }, async (req, reply) => {
  const { id } = idSchema.parse(req.params);
  const row = await prisma.service.findUnique({ where: { id } });
  if (!row) return reply.code(404).send({ message: "Service not found" });

  if (req.user.role !== Role.ADMIN && row.managerId !== req.user.sub) {
    return reply.code(403).send({ message: "Not your record" });
  }

  await prisma.service.update({ where: { id }, data: { isActive: false } });
  return { success: true };
});

app.get("/api/barbers", { preHandler: auth }, async () => {
  return prisma.barber.findMany({
    where: { isActive: true },
    include: { user: { select: { username: true } } },
    orderBy: { name: "asc" }
  });
});

app.get("/api/barbers/available", { preHandler: auth }, async () => {
  const busy = await prisma.serviceOrder.findMany({
    where: { status: { in: [OrderStatus.ASSIGNED, OrderStatus.IN_PROGRESS] } },
    select: { barberId: true }
  });
  return prisma.barber.findMany({
    where: { isActive: true, id: { notIn: busy.map((x) => x.barberId) } },
    orderBy: { name: "asc" }
  });
});

app.get("/api/orders", { preHandler: auth }, async (req) => {
  // Barbers are scoped by their Barber profile, not by managerId.
  const managerId =
    req.user.role === Role.ADMIN || req.user.role === Role.BARBER || req.user.role === Role.SHAMPOO_ASSISTANT
      ? undefined
      : req.user.sub;

  const where: Prisma.ServiceOrderWhereInput = {
    ...(managerId ? { managerId } : {}),
    ...((req.user.role === Role.BARBER || req.user.role === Role.SHAMPOO_ASSISTANT)
      ? { barber: { userId: req.user.sub } }
      : {})
  };

  return prisma.serviceOrder.findMany({
    where,
    include: { customer: true, service: true, barber: true, transaction: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });
});

app.post("/api/orders", { preHandler: [auth, role(Role.ADMIN, Role.MANAGER)] }, async (req, reply) => {
  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ message: "Invalid order", issues: parsed.error.flatten() });
  }

  const input = parsed.data;
  const managerId = req.user.role === Role.ADMIN ? (req.body as any).managerId : req.user.sub;
  if (!managerId) return reply.code(400).send({ message: "Admin must supply managerId" });

  const [customer, service, barber] = await Promise.all([
    prisma.customer.findFirst({
      where: {
        id: input.customerId,
        isActive: true,
        ...(req.user.role === Role.ADMIN ? {} : { managerId })
      }
    }),
    prisma.service.findFirst({
      where: {
        id: input.serviceId,
        isActive: true,
        ...(req.user.role === Role.ADMIN ? {} : { managerId })
      }
    }),
    prisma.barber.findFirst({ where: { id: input.barberId, isActive: true } })
  ]);

  if (!customer) return reply.code(404).send({ message: "Active customer not found in your book" });
  if (!service) return reply.code(404).send({ message: "Active service not found in your catalogue" });
  if (!barber) return reply.code(404).send({ message: "Barber not found" });

  const price = Number(service.price);
  const pct =
    service.commissionPct !== null
      ? Number(service.commissionPct)
      : Number(barber.commissionPct);
  const commission = Math.round(price * pct) / 100;

  try {
    const order = await prisma.serviceOrder.create({
      data: {
        managerId,
        customerId: customer.id,
        serviceId: service.id,
        barberId: barber.id,
        servicePrice: price,
        commissionAmt: commission,
        paymentMethod: input.paymentMethod,
        notes: input.notes
      },
      include: { customer: true, service: true, barber: true }
    });
    return reply.code(201).send(order);
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      (e.code === "P2002" || e.code === "P2034")
    ) {
      return reply.code(409).send({ message: `Barber "${barber.name}" is busy` });
    }
    throw e;
  }
});

app.post("/api/orders/:id/start", { preHandler: [auth, role(Role.BARBER, Role.SHAMPOO_ASSISTANT, Role.ADMIN)] }, async (req, reply) => {
  const { id } = idSchema.parse(req.params);
  const order = await prisma.serviceOrder.findUnique({ where: { id } });
  if (!order) return reply.code(404).send({ message: "Order not found" });

  if (req.user.role === Role.BARBER || req.user.role === Role.SHAMPOO_ASSISTANT) {
    const barber = await prisma.barber.findUnique({ where: { userId: req.user.sub } });
    if (!barber || barber.id !== order.barberId) {
      return reply.code(403).send({ message: "Not your order" });
    }
  }

  if (order.status !== OrderStatus.ASSIGNED) {
    return reply.code(400).send({ message: `Cannot start a ${order.status} order` });
  }

  return prisma.serviceOrder.update({
    where: { id },
    data: { status: OrderStatus.IN_PROGRESS, startedAt: new Date() }
  });
});

app.post("/api/orders/:id/complete", { preHandler: [auth, role(Role.BARBER, Role.SHAMPOO_ASSISTANT, Role.ADMIN)] }, async (req, reply) => {
  const { id } = idSchema.parse(req.params);
  const order = await prisma.serviceOrder.findUnique({
    where: { id },
    include: { customer: true }
  });
  if (!order) return reply.code(404).send({ message: "Order not found" });

  if (req.user.role === Role.BARBER || req.user.role === Role.SHAMPOO_ASSISTANT) {
    const barber = await prisma.barber.findUnique({ where: { userId: req.user.sub } });
    if (!barber || barber.id !== order.barberId) {
      return reply.code(403).send({ message: "Not your order" });
    }
  }

  if (order.status !== OrderStatus.IN_PROGRESS) {
    return reply.code(400).send({ message: "Order must be IN_PROGRESS" });
  }

  const price = Number(order.servicePrice);
  const points = Math.floor(price * LOYALTY_RATE);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const fresh = await tx.serviceOrder.findUniqueOrThrow({ where: { id } });
      if (fresh.status !== OrderStatus.IN_PROGRESS) {
        throw new Error("ORDER_STATE_CHANGED");
      }

      const transaction = await tx.transaction.create({
        data: {
          orderId: order.id,
          managerId: order.managerId,
          customerId: order.customerId,
          barberId: order.barberId,
          serviceId: order.serviceId,
          amount: order.servicePrice,
          commissionAmount: order.commissionAmt,
          paymentMethod: order.paymentMethod
        }
      });

      const completed = await tx.serviceOrder.update({
        where: { id },
        data: { status: OrderStatus.COMPLETED, completedAt: new Date() }
      });

      await tx.customer.update({
        where: { id: order.customerId },
        data: {
          totalVisits: { increment: 1 },
          totalSpent: { increment: price },
          loyaltyPoints: { increment: points }
        }
      });

      return { order: completed, transaction };
    });

    return result;
  } catch (e) {
    if (e instanceof Error && e.message === "ORDER_STATE_CHANGED") {
      return reply.code(400).send({ message: "Order is no longer in progress" });
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return reply.code(409).send({ message: "Transaction already exists for this order" });
    }
    throw e;
  }
});

app.post("/api/orders/:id/cancel", { preHandler: [auth, role(Role.MANAGER, Role.ADMIN)] }, async (req, reply) => {
  const { id } = idSchema.parse(req.params);
  const body = z.object({ reason: z.string().max(300).optional() }).safeParse(req.body ?? {});
  const order = await prisma.serviceOrder.findUnique({ where: { id } });
  if (!order) return reply.code(404).send({ message: "Order not found" });

  if (req.user.role === Role.MANAGER && order.managerId !== req.user.sub) {
    return reply.code(403).send({ message: "Not your record" });
  }

  if (![OrderStatus.ASSIGNED, OrderStatus.IN_PROGRESS].includes(order.status)) {
    return reply.code(400).send({ message: "Order already closed" });
  }

  return prisma.serviceOrder.update({
    where: { id },
    data: {
      status: OrderStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelReason: body.success ? body.data.reason : undefined
    }
  });
});

app.get("/api/transactions", { preHandler: auth }, async (req) => {
  const managerId = managerIdFor(req);
  return prisma.transaction.findMany({
    where: managerId ? { managerId } : {},
    include: { customer: true, service: true, barber: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });
});

app.get("/api/dashboard", { preHandler: auth }, async (req) => {
  const managerId = managerIdFor(req);
  const orderWhere: Prisma.ServiceOrderWhereInput = managerId ? { managerId } : {};

  const [customers, services, orders, transactions] = await Promise.all([
    prisma.customer.count({
      where: managerId ? { managerId, isActive: true } : { isActive: true }
    }),
    prisma.service.count({
      where: managerId ? { managerId, isActive: true } : { isActive: true }
    }),
    prisma.serviceOrder.count({ where: orderWhere }),
    prisma.transaction.findMany({
      where: managerId ? { managerId } : {},
      select: { amount: true }
    })
  ]);

  return {
    customers,
    services,
    orders,
    salesKes: transactions.reduce((sum, t) => sum + Number(t.amount), 0)
  };
});

app.setErrorHandler((error, _req, reply) => {
  app.log.error(error);
  const status = (error as any).statusCode;
  if (status && status >= 400 && status < 500) {
    return reply.code(status).send({ message: error.message });
  }
  return reply.code(500).send({ message: "Internal server error" });
});

// Prepare the Fastify app
await app.ready();

// Export default handler for Vercel Serverless Functions
export default async function handler(req: any, res: any) {
  await app.ready();
  app.server.emit("request", req, res);
}

// Standalone listener for local development outside Vercel CLI
if (!process.env.VERCEL) {
  app.listen({ port: PORT, host: "0.0.0.0" }).catch((err) => {
    app.log.error(err);
  });
}
