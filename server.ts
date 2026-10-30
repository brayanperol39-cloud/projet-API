import express, { Request, Response } from "express";

const app = express();
app.use(express.json());
app.use(express.static("public"));

type TicketStatus = "open" | "in_progress" | "closed";

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  createdAt: string;
}

const VALID_STATUSES: TicketStatus[] = ["open", "in_progress", "closed"];

const tickets: Ticket[] = [];
let nextId = 1;

// 1. Créer un ticket
app.post("/tickets", (req: Request, res: Response) => {
  const { title, description } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: "title et description sont requis" });
  }
  const ticket: Ticket = {
    id: nextId++,
    title,
    description,
    status: "open",
    createdAt: new Date().toISOString(),
  };
  tickets.push(ticket);
  res.status(201).json(ticket);
});

// 2. Lister les tickets
app.get("/tickets", (_req: Request, res: Response) => {
  res.json(tickets);
});

// 3. Récupérer un ticket par ID
app.get("/tickets/:id", (req: Request, res: Response) => {
  const ticket = tickets.find((t) => t.id === Number(req.params.id));
  if (!ticket) return res.status(404).json({ error: "Ticket introuvable" });
  res.json(ticket);
});

// 4. Mettre à jour le statut
app.patch("/tickets/:id/status", (req: Request, res: Response) => {
  const ticket = tickets.find((t) => t.id === Number(req.params.id));
  if (!ticket) return res.status(404).json({ error: "Ticket introuvable" });

  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res
      .status(400)
      .json({ error: `status doit être parmi : ${VALID_STATUSES.join(", ")}` });
  }
  ticket.status = status;
  res.json(ticket);
});

const PORT = 3000;
app.listen(PORT, () => console.log(`API sur http://localhost:${PORT}`));
