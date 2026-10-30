import { Router } from "express";
import { prisma } from "../prisma";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router = Router();
const VALID_STATUSES = ["open", "in_progress", "closed"];

// Toutes les routes tickets exigent d'être connecté
router.use(authenticate);

// Créer un ticket : tous les rôles connectés
router.post("/", async (req, res) => {
  const { title, description } = req.body ?? {};
  if (!title || !description) {
    return res.status(400).json({ error: "title et description sont requis" });
  }
  const ticket = await prisma.ticket.create({ data: { title, description } });
  res.status(201).json(ticket);
});

// Lister les tickets
router.get("/", async (_req, res) => {
  res.json(await prisma.ticket.findMany({ orderBy: { id: "asc" } }));
});

// Récupérer un ticket par ID
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "ID invalide" });

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return res.status(404).json({ error: "Ticket introuvable" });
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
