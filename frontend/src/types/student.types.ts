import { ApprovalStatus } from "./auth.types";

export interface Student {
  id: string;
  name: string;
  email: string;
  approvalStatus: ApprovalStatus;
  studentIdUrl?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentsListResponse {
  students: Student[];
  total: number;
  page: number;
  limit: number;
}

export interface StudentDetailResponse {
  student: Student;
}

export interface ApproveStudentRequest {
  id: string;
}

export interface RejectStudentRequest {
  id: string;
  reason?: string;
}
