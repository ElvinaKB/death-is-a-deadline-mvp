import { Request, Response, NextFunction } from "express";
import { supabase } from "../libs/config/supabase";
import { CustomError } from "../libs/utils/CustomError";
import { User } from "@supabase/supabase-js";
import { RawUser } from "../types/auth.types";

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
  const { data, error } = await supabase.rpc("get_student_detail", {
    student_id: id,
  });
  if (error) throw new CustomError(error.message, 400);
  if (!data) throw new CustomError("Student not found", 404);

  const student = getRawStudent(data);
  res.status(200).json({ data: { student } });
}

export async function approveStudent(req: Request, res: Response) {
  const { id } = req.params;
  const { error } = await supabase.rpc("approve_student", {
    student_id: id,
  });
  if (error) throw new CustomError(error.message, 400);
  res.status(200).json({ message: "Student approved" });
}

export async function rejectStudent(req: Request, res: Response) {
  const { id } = req.params;
  const { reason } = req.body;
  const { error } = await supabase.rpc("reject_student", {
    student_id: id,
    reason,
  });
  if (error) throw new CustomError(error.message, 400);
  res.status(200).json({ message: "Student rejected" });
}

export async function getStudentsStats(req: Request, res: Response) {
  const { data, error } = await supabase.rpc("students_stats");
  if (error) throw new CustomError(error.message, 400);
  res.status(200).json({ data });
}
