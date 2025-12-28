import { NextFunction, Request, Response } from "express";
import { supabase } from "../libs/config/supabase";
import { supabasePasswordLogin } from "../libs/utils/supabasePasswordLogin";
import { CustomError } from "../libs/utils/CustomError";
import {
  ApprovalStatus,
  LoginRequest,
  SignupRequest,
  UserRole,
} from "../types/auth.types";

export async function signup(req: Request, res: Response, next: NextFunction) {
  const {
    email,
    password,
    name,
    studentIdUrl = "",
  } = req.body as SignupRequest;

  const approvalStatus = studentIdUrl
    ? ApprovalStatus.PENDING
    : ApprovalStatus.APPROVED;

  // Supabase sign up
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
      emailRedirectTo: `${process.env.CLIENT_URL}/redirect`,
    },
  });

  if (error) {
    throw new CustomError(error?.message, 400);
  } else {
    // Call the custom RPC function to get the full user by email
    const { data: rpcUser, error: rpcError } = await supabase.rpc(
      "get_user_by_email",
      { email }
    );
    if (rpcError) throw new CustomError(rpcError.message, 400);
    const user = rpcUser;
    if (user?.raw_user_meta_data?.approvalStatus) {
      const isNotApproved =
        user.raw_user_meta_data?.approvalStatus !== ApprovalStatus.APPROVED;
      if (isNotApproved) throw new CustomError("Account not approved yet", 400);
      else throw new CustomError("User already exists", 400);
    }
  }

  // update user_metadata
  const { error: metaError } = await supabase.auth.admin.updateUserById(
    data?.user?.id ?? "",
    {
      user_metadata: { studentIdUrl, approvalStatus },
      role: UserRole.STUDENT,
    }
  );
  if (metaError) {
    throw new CustomError(metaError.message, 400);
  }

  // Return user info and session (token)
  return res.status(201).json({
    message: "Signup successfully. Verify your email to continue.",
    data: { user: { approvalStatus } },
  });
}

export async function login(req: Request, res: Response, next: NextFunction) {
  const { email, password } = req.body as LoginRequest;
  const data = await supabasePasswordLogin({
    email,
    password,
  });

  if (
    data.user?.user_metadata?.approvalStatus === ApprovalStatus.PENDING &&
    data.user?.role === UserRole.STUDENT
  ) {
    return res.status(200).json({
      data: {
        user: {
          approvalStatus: data.user?.user_metadata?.approvalStatus,
          role: data.user?.role,
        },
      },
    });
  }
  // Return user info and session (token)
  return res.status(200).json({
    data: {
      user: {
        ...data.user,
        approvalStatus: data.user?.user_metadata?.approvalStatus,
        name: data.user?.user_metadata?.name,
      },
      token: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        token_type: data.token_type,
      },
    },
  });
}
