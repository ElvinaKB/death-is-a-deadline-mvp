import { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase";
import { CustomError } from "../utils/CustomError";
import { UserRole } from "../../types/auth.types";

/**
 * Middleware to authenticate and authorize users based on Supabase JWT token and roles.
 * Usage: authenticate(UserRole.STUDENT, UserRole.ADMIN)
 * If no roles are passed, only checks for valid authentication.
 */
export function authenticate(...allowedRoles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader =
        req.headers["authorization"] || req.headers["Authorization"];
      if (
        !authHeader ||
        typeof authHeader !== "string" ||
        !authHeader.startsWith("Bearer ")
      ) {
        throw new CustomError("Missing or invalid Authorization header", 401);
      }
      const token = authHeader.replace("Bearer ", "").trim();
      // Validate token with Supabase
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data?.user) {
        throw new CustomError("Invalid or expired token", 401);
      }
      // Attach user to request for downstream use
      (req as any).user = data.user;
      // If roles are specified, check user role
      if (allowedRoles.length > 0) {
        const userRole = data.user.role || data.user.user_metadata?.role;
        if (!allowedRoles.includes(userRole)) {
          throw new CustomError("Forbidden: insufficient role", 403);
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
