import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

interface ValidationTarget {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

export function validate(schema: ValidationTarget) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedFields: Record<string, string[]> = {};
        error.errors.forEach((issue) => {
          const path = issue.path.join('.') || 'root';
          if (!formattedFields[path]) formattedFields[path] = [];
          formattedFields[path].push(issue.message);
        });

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            fields: formattedFields,
          },
        });
        return;
      }
      next(error);
    }
  };
}
