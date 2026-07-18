import { Request, Response, NextFunction } from "express";
import { supabase } from "../libs/config/supabase";
import { prisma } from "../libs/config/prisma";
import { CustomError } from "../libs/utils/CustomError";
import { User } from "@supabase/supabase-js";
import { RawUser } from "../types/auth.types";
import { ApprovalStatus, UserRole } from "../types/auth.types";
import { sendEmail } from "../email/sendEmail";
import { EmailType } from "../email/emailTypes";
import jwt from "jsonwebtoken";
import crypto from "crypto";

export const getRawStudent = (item: RawUser) => ({
  id: item.id,
  email: item.email,
  name: item.raw_user_meta_data?.name,
  approvalStatus: item.raw_user_meta_data?.approvalStatus,
  studentIdUrl: item.raw_user_meta_data?.studentIdUrl,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
  rejectionReason: item.raw_user_meta_data?.rejectionReason,
  emailConfirmedAt: item.email_confirmed_at ?? null,
  banned: item.raw_user_meta_data?.banned ?? false,
  banReason: item.raw_user_meta_data?.banReason ?? null,
  linkedinProfileUrl: item.raw_user_meta_data?.linkedinProfileUrl ?? null,
  verifiedVia: item.raw_user_meta_data?.verifiedVia ?? null,
});

export const getStudentDetails = async (id: string) => {
  const { data, error: studentERror } = await supabase.rpc(
    "get_student_detail",
    {
      student_id: id,
    },
  );
  const student = getRawStudent(data);

  if (studentERror) throw new CustomError(studentERror.message, 400);
  if (!student) throw new CustomError("Student not found", 404);

  return student;
};

export async function listStudents(req: Request, res: Response) {
  const status = req.query.status as string | undefined;
  const { data, error } = await supabase.rpc("list_students", {
    status: status ?? null,
  });

  console.log(error);
  if (error) throw new CustomError(error.message, 400);

  const students = data.map(getRawStudent);

  res.status(200).json({ data: { students } });
}

export async function getStudentDetail(req: Request, res: Response) {
  const { id } = req.params;
  const student = await getStudentDetails(id);
  res.status(200).json({ data: { student } });
}

/**
 * Admin-only: every successful login for this student, pulled from the
 * existing request audit log (no separate tracking needed — the login
 * endpoint's response already carries the user id, IP, and user agent).
 */
export async function getStudentLoginEvents(req: Request, res: Response) {
  const { id } = req.params;

  const events = await prisma.auditLog.findMany({
    where: {
      path: "/api/auth/login",
      statusCode: 200,
      responseBody: {
        path: ["data", "user", "id"],
        equals: id,
      },
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, ipAddress: true, userAgent: true },
    take: 50,
  });

  res.status(200).json({
    data: {
      events: events.map((e) => ({
        loggedInAt: e.createdAt,
        ipAddress: e.ipAddress,
        userAgent: e.userAgent,
      })),
    },
  });
}

export async function approveStudent(req: Request, res: Response) {
  const { id } = req.params;
  console.log(id);

  const student = await getStudentDetails(id);
  if (!student) throw new CustomError("Student not found", 404);

  if (!student.emailConfirmedAt)
    throw new CustomError("Student has not verified their email address", 400);

  const { error } = await supabase.rpc("approve_student", {
    student_id: id,
  });
  if (error) throw new CustomError(error.message, 400);

  await sendEmail({
    type: EmailType.ACCOUNT_APPROVED,
    to: student.email ?? "",
    subject: "Your student account has been approved!",
    variables: {
      name: student.name || student.email,
      appName: process.env.EMAIL_NAME,
      loginUrl: `${process.env.CLIENT_URL}/login`,
    },
  });

  res.status(200).json({ message: "Student approved" });
}

export async function rejectStudent(req: Request, res: Response) {
  const { id } = req.params;
  const { reason } = req.body;

  const student = await getStudentDetails(id);
  if (!student) throw new CustomError("Student not found", 404);

  const { error } = await supabase.rpc("reject_student", {
    student_id: id,
    reason,
  });
  if (error) throw new CustomError(error.message, 400);

  // generate jwt token expiry in 1 day
  const token = await jwt.sign(
    { id: student.id },
    process.env.JWT_SECRET ?? "jwt_secret",
    {
      expiresIn: "1d",
    },
  );

  await sendEmail({
    type: EmailType.ACCOUNT_REJECTED,
    to: student.email ?? "",
    subject: "Your student account has been rejected!",
    variables: {
      name: student.name || student.email,
      appName: process.env.EMAIL_NAME,
      loginUrl: `${process.env.CLIENT_URL}/resubmit?token=${token}`,
      rejectionReason: student.rejectionReason || reason || "",
    },
  });

  res.status(200).json({ message: "Student rejected" });
}

export async function banStudent(req: Request, res: Response) {
  const { id } = req.params;
  const { reason } = req.body;

  const student = await getStudentDetails(id);
  if (!student) throw new CustomError("Student not found", 404);

  const { error } = await supabase.rpc("ban_student", {
    student_id: id,
    reason: reason ?? null,
  });
  if (error) throw new CustomError(error.message, 400);

  res.status(200).json({ message: "Traveler banned" });
}

export async function unbanStudent(req: Request, res: Response) {
  const { id } = req.params;

  const student = await getStudentDetails(id);
  if (!student) throw new CustomError("Student not found", 404);

  const { error } = await supabase.rpc("unban_student", {
    student_id: id,
  });
  if (error) throw new CustomError(error.message, 400);

  res.status(200).json({ message: "Traveler unbanned" });
}

/**
 * Admin-only: manually add an already-verified traveler (e.g. a friend
 * bypassing normal ID/LinkedIn verification). Creates the account
 * pre-approved and sends them a password-setup email — same flow as a
 * self-service "forgot password" — so they can actually log in.
 */
export async function addStudent(req: Request, res: Response) {
  const { name, email, linkedinProfileUrl } = req.body as {
    name: string;
    email: string;
    linkedinProfileUrl?: string;
  };

  const { data: existingUser } = await supabase.rpc("get_user_by_email", {
    email,
  });
  if (existingUser?.id) {
    throw new CustomError("An account with this email already exists.", 409);
  }

  const password = crypto.randomBytes(24).toString("hex");
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
    { email, password, options: { data: { name } } },
  );
  if (signUpError) throw new CustomError(signUpError.message, 400);

  const userId = signUpData?.user?.id;
  if (!userId) throw new CustomError("Failed to create account", 500);

  const { error: metaError } = await supabase.auth.admin.updateUserById(
    userId,
    {
      email_confirm: true,
      user_metadata: {
        name,
        approvalStatus: ApprovalStatus.APPROVED,
        linkedinProfileUrl: linkedinProfileUrl || null,
        verifiedVia: "admin",
      },
      role: UserRole.STUDENT,
    },
  );
  if (metaError) {
    await supabase.auth.admin.deleteUser(userId);
    throw new CustomError(metaError.message, 400);
  }

  const { error: resetError } = await supabase.auth.resetPasswordForEmail(
    email,
    { redirectTo: `${process.env.CLIENT_URL}/reset-password` },
  );
  if (resetError) {
    console.error("Failed to send password setup email:", resetError.message);
  }

  res.status(201).json({ message: "Traveler added and pre-approved" });
}

/**
 * Admin-only: permanently delete a traveler account. Their bids/payments
 * cascade-delete with them (foreign key ON DELETE CASCADE) — this is for
 * test accounts or bounced/invalid signups, not a substitute for Ban.
 */
export async function deleteStudent(req: Request, res: Response) {
  const { id } = req.params;

  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) throw new CustomError(error.message, 400);

  res.status(200).json({ message: "Traveler deleted" });
}

export async function getStudentsStats(req: Request, res: Response) {
  const [studentStats, bidStats, hotelStats, topProperties] = await Promise.all(
    [
      supabase.rpc("students_stats"),
      supabase.rpc("bid_stats"),
      supabase.rpc("hotel_stats"),
      supabase.rpc("top_properties"),
    ],
  );

  if (studentStats.error)
    throw new CustomError(studentStats.error.message, 400);
  if (bidStats.error) throw new CustomError(bidStats.error.message, 400);
  if (hotelStats.error) throw new CustomError(hotelStats.error.message, 400);
  if (topProperties.error)
    throw new CustomError(topProperties.error.message, 400);

  const data = {
    ...studentStats.data,
    ...bidStats.data,
    ...hotelStats.data,
    topProperties: topProperties.data,
  };

  res.status(200).json({ data });
}
