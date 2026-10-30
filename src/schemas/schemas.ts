import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email(),
});

export const createAdminSchema = z.object({
  email: z.string().email(),
});

// strict() refuse les champs inconnus (par exemple "role" ou "isActive")
export const updateUserSchema = z
  .object({
    email: z.string().email().optional(),
  })
  .strict();
