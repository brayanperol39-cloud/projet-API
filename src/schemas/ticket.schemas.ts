import { z } from "zod";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createTicketSchema = z
  .object({
    title: z.string().trim().min(3).max(150),
    description: z.string().trim().min(1).max(5000),
  })
  .strict(); // refuse les champs inconnus (ex: createdById, status)

export const updateStatusSchema = z
  .object({ status: z.enum(["open", "in_progress", "closed"]) })
  .strict();

export const listTicketsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["open", "in_progress", "closed"]).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  sortBy: z.enum(["id", "createdAt", "status", "title"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});