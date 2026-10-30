import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";

export function validate(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((i) => ({
        champ: i.path.join("."),
        message: i.message,
      }));
      return res.status(400).json({ errors });
    }
    req.body = result.data;
    next();
  };
}
