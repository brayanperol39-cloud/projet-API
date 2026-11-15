import "dotenv/config";
import express from "express";
import authRouter from "./routes/auth.routes";
import invitationRouter from "./routes/invitation.routes";
import usersRouter from "./routes/users.routes";
import ticketsRouter from "./routes/tickets.routes";
import auditRouter from "./routes/audit.routes";
import { errorHandler } from "./middleware/errorHandler";
import { globalLimiter } from "./middleware/rateLimiters";

const app = express();
app.use(globalLimiter);
app.use(express.json());
app.use(express.static("public"));

app.use("/auth", authRouter);
app.use("/auth", invitationRouter);
app.use("/users", usersRouter);
app.use("/tickets", ticketsRouter);
app.use("/audit-logs", auditRouter);

// Gestion centralisée des erreurs (toujours en dernier)
app.use(errorHandler);

export default app;