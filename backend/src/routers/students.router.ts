import { Router } from "express";
import { authenticate } from "../libs/middlewares/authenticate";
import * as studentsController from "../controllers/students.controller";
import { validate } from "../libs/middlewares/validate";
import {
  studentIdParamSchema,
  studentApproveRejectSchema,
} from "../validations/students/students.validation";
import { UserRole } from "../types/auth.types";

const router = Router();

// Only admin can access these routes
router.use(authenticate(UserRole.ADMIN));

// GET /api/students
router.get("/", studentsController.listStudents);

// GET /api/students/stats
router.get("/stats", studentsController.getStudentsStats);

// GET /api/students/:id
router.get(
  "/:id",
  validate(studentIdParamSchema, "params"),
  studentsController.getStudentDetail
);

// POST /api/students/:id/approve
router.post(
  "/:id/approve",
  validate(studentApproveRejectSchema, "params"),
  studentsController.approveStudent
);

// POST /api/students/:id/reject
router.post(
  "/:id/reject",
  validate(studentApproveRejectSchema, "params"),
  studentsController.rejectStudent
);

// POST /api/students/:id/ban
router.post(
  "/:id/ban",
  validate(studentApproveRejectSchema, "params"),
  studentsController.banStudent
);

// POST /api/students/:id/unban
router.post(
  "/:id/unban",
  validate(studentApproveRejectSchema, "params"),
  studentsController.unbanStudent
);

export { router };
