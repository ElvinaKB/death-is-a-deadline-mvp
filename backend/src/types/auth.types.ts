import { User as SupabaseUser } from "@supabase/supabase-js";

export enum UserRole {
  STUDENT = "STUDENT",
  HOTEL_OWNER = "HOTEL_OWNER",
  ADMIN = "ADMIN",
}

export enum ApprovalStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  approvalStatus?: ApprovalStatus;
  studentIdUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  studentIdUrl?: string;
}

export interface RawUser extends SupabaseUser {
  raw_user_meta_data: {
    name: string;
    approvalStatus: ApprovalStatus;
    studentIdUrl?: string;
    rejectionReason?: string;
  };
}
