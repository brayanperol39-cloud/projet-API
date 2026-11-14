import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import authRouter from "./routes/auth.routes";
import invitationRouter from "./routes/invitation.routes";
import usersRouter from "./routes/users.routes";
import ticketsRouter from "./routes/tickets.routes";
<<<<<<< HEAD
=======
import usersRouter from "./routes/users.routes";
import { errorHandler } from "./middleware/errorHandler";
>>>>>>> 4f61916 (update/base saine)

const app = express();
app.use(express.json());
app.use(express.static("public"));

app.use("/auth", authRouter);
app.use("/auth", invitationRouter);
app.use("/users", usersRouter);
app.use("/tickets", ticketsRouter);
<<<<<<< HEAD
=======
app.use("/users", usersRouter);

app.use(errorHandler);
>>>>>>> 4f61916 (update/base saine)

// Filet de sécurité : une erreur inattendue ne fait pas tomber le serveur
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Erreur interne du serveur" });
});

export default app;
