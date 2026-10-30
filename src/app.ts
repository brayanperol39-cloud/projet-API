import "dotenv/config";
import express from "express";
import authRouter from "./routes/auth.routes";
import ticketsRouter from "./routes/tickets.routes";

const app = express();
app.use(express.json());
app.use(express.static("public"));

app.use("/auth", authRouter);
app.use("/tickets", ticketsRouter);

export default app;
