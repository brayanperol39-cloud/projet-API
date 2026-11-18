import "dotenv/config";
import express from "express";
import helmet from "helmet"; 
import authRouter from "./routes/auth.routes";
import invitationRouter from "./routes/invitation.routes";
import usersRouter from "./routes/users.routes";
import ticketsRouter from "./routes/tickets.routes";
import auditRouter from "./routes/audit.routes";
import { errorHandler } from "./middleware/errorHandler";
import { globalLimiter } from "./middleware/rateLimiters";
import swaggerUi from "swagger-ui-express";
import { openapi } from "./docs/openapi";

const app = express(); 

// ✅ VULN-001 : On active Helmet et on cache Express
app.disable("x-powered-by");
app.use(helmet());

app.use(globalLimiter);
app.use(express.json()); 
app.use(express.static("public"));

// ✅ VULN-002 : Swagger caché (on force le "false" pour être sûr)
if (process.env.NODE_ENV !== "production") {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapi));
}

app.use("/auth", authRouter);
app.use("/auth", invitationRouter);
app.use("/users", usersRouter);
app.use("/tickets", ticketsRouter);
app.use("/audit-logs", auditRouter);

app.use(errorHandler);

export default app;