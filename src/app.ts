import "dotenv/config";
import express from "express";
import authRouter from "./routes/auth.routes";
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
app.use("/tickets", ticketsRouter);
<<<<<<< HEAD
=======
app.use("/users", usersRouter);

app.use(errorHandler);
>>>>>>> 4f61916 (update/base saine)

export default app;
