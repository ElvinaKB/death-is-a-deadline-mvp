import { Request, Response, NextFunction } from "express";
import { CustomError } from "../utils/CustomError";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof CustomError) {
    return res.status(err.statusCode).json({
      message: err.message,
      statusCode: err.statusCode,
      ...(err.code && { code: err.code }),
      data: err.data ?? null,
    });
  }
  console.error(err);
  res.status(500).json({ message: "Internal Server Error" });
}
