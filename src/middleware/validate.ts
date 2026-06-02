import type { Request, Response, NextFunction } from 'express';
import * as z from "zod";

export const validate = (schema: z.ZodObject) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.issues.map(e => ({
          field:   e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }
    req.body = result.data; 
    next();
  };
};