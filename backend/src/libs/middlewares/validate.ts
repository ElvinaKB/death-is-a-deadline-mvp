import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { CustomError } from "../utils/CustomError";

/**
 * validate(schema, field?)
 * field: 'body' | 'params' | 'query' (default: 'body')
 */
export function validate(
  schema: ZodSchema<any>,
  field: "body" | "params" | "query" = "body"
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req[field] = schema.parse(req[field]);
      next();
    } catch (err: any) {
      const message =
        err.errors
          ?.map((error: any) => `${error.path.join(".")} ${error.message}`)
          .join(", ") || "Invalid request";
      next(new CustomError(message, 400));
    }
  };
}
