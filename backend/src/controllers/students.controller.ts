import { Request, Response, NextFunction } from "express";
import { supabase } from "../libs/config/supabase";
import { CustomError } from "../libs/utils/CustomError";
import { User } from "@supabase/supabase-js";
import { RawUser } from "../types/auth.types";
import { sendEmail } from "../email/sendEmail";
import { EmailType } from "../email/emailTypes";
import jwt from "jsonwebtoken";

export const getRawStudent = (item: RawUser) => ({
  id: item.id,
  email: item.email,
  name: item.raw_user_meta_data?.name,
  approvalStatus: item.raw_user_meta_data?.approvalStatus,
  studentIdUrl: item.raw_user_meta_data?.studentIdUrl,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
  rejectionReason: item.raw_user_meta_data?.rejectionReason,
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

export async function approveStudent(req: Request, res: Response) {
  const { id } = req.params;
  console.log(id);

  const student = await getStudentDetails(id);
  if (!student) throw new CustomError("Student not found", 404);

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
