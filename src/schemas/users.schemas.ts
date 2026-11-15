import { z } from "zod";

export const changeRoleSchema = z
  .object({ role: z.enum(["SUPER_ADMIN", "ADMIN", "AGENT", "USER"]) })
  .strict();