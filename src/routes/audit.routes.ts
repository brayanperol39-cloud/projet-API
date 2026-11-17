import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router = Router();
router.use(authenticate, requireRole("SUPER_ADMIN", "ADMIN"));

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().max(50).optional(),
  actorId: z.coerce.number().int().optional(),
});

router.get("/", async (req, res) => {
  const { page, limit, action, actorId } = querySchema.parse(req.query);
  const where = { ...(action ? { action } : {}), ...(actorId ? { actorId } : {}) };

  const [items, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({ data: items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

export default router;