import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { notFound } from "../utils/httpError";
import {
  idParamSchema,
  createTicketSchema,
  updateStatusSchema,
  listTicketsQuerySchema,
} from "../schemas/ticket.schemas";

const router = Router();
const STAFF_ROLES = ["AGENT", "ADMIN", "SUPER_ADMIN"];
const isStaff = (role: string) => STAFF_ROLES.includes(role);

router.use(authenticate);

// Créer un ticket
router.post("/", async (req, res) => {
  const { title, description } = createTicketSchema.parse(req.body ?? {});
  const ticket = await prisma.ticket.create({
    data: { title, description, createdById: req.user!.id },
  });
  res.status(201).json({ data: ticket });
});

// Lister : pagination, filtre, recherche, tri
router.get("/", async (req, res) => {
  const { page, limit, status, q, sortBy, order } = listTicketsQuerySchema.parse(req.query);

  const where: Prisma.TicketWhereInput = {
    // règle d'accès : un USER ne voit que ses tickets
    ...(isStaff(req.user!.role) ? {} : { createdById: req.user!.id }),
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.ticket.findMany({
      where,
      orderBy: [{ [sortBy]: order }, { id: "asc" }], // id en second critère : tri stable
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.ticket.count({ where }),
  ]);

  res.json({
    data: items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// Un ticket par ID (404 si pas le droit : on ne révèle pas son existence)
router.get("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket || (!isStaff(req.user!.role) && ticket.createdById !== req.user!.id)) {
    throw notFound("Ticket introuvable");
  }
  res.json({ data: ticket });
});

// Changer le statut : personnel seulement
router.patch("/:id/status", requireRole("AGENT", "ADMIN", "SUPER_ADMIN"), async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const { status } = updateStatusSchema.parse(req.body ?? {});

  const existing = await prisma.ticket.findUnique({ where: { id } });
  if (!existing) throw notFound("Ticket introuvable");

  res.json({ data: await prisma.ticket.update({ where: { id }, data: { status } }) });
});

export default router;