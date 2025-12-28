import { Session } from "@supabase/supabase-js";

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

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
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
  studentIdCard?: File;
  approvalStatus?: ApprovalStatus;
}

export interface AuthResponse {
  user: User;
  token: Session;
  message?: string;
}
