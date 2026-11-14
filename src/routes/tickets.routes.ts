import { Router } from "express";
import { prisma } from "../prisma";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router = Router();
const VALID_STATUSES = ["open", "in_progress", "closed"];
const STAFF_ROLES = ["AGENT", "ADMIN", "SUPER_ADMIN"];

const isStaff = (role: string) => STAFF_ROLES.includes(role);

// Toutes les routes tickets exigent d'être connecté
router.use(authenticate);

// Créer un ticket : tous les rôles connectés (le créateur est enregistré)
router.post("/", async (req, res) => {
  const { title, description } = req.body ?? {};
  if (!title || !description) {
    return res.status(400).json({ error: "title et description sont requis" });
  }
  const ticket = await prisma.ticket.create({
    data: { title, description, createdById: req.user!.id },
  });
  res.status(201).json(ticket);
});

// Lister : le personnel voit tout, un USER ne voit que ses propres tickets
router.get("/", async (req, res) => {
  const where = isStaff(req.user!.role) ? {} : { createdById: req.user!.id };
  res.json(await prisma.ticket.findMany({ where, orderBy: { id: "asc" } }));
});

// Un ticket par ID : un USER ne peut pas lire le ticket d'un autre (404, pas 403)
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "ID invalide" });

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket || (!isStaff(req.user!.role) && ticket.createdById !== req.user!.id)) {
    return res.status(404).json({ error: "Ticket introuvable" });
  }
  res.json(ticket);
});

// Changer le statut : Agent, Admin, Super Admin seulement
router.patch("/:id/status", requireRole("AGENT", "ADMIN", "SUPER_ADMIN"), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "ID invalide" });

  const { status } = req.body ?? {};
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status doit être parmi : ${VALID_STATUSES.join(", ")}` });
  }

  const existing = await prisma.ticket.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Ticket introuvable" });

  res.json(await prisma.ticket.update({ where: { id }, data: { status } }));
});

export default router;
