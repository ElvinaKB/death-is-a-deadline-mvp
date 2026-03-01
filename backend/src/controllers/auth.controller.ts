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
import { sendEmail } from "../email/sendEmail";
import { EmailType } from "../email/emailTypes";
import jwt from "jsonwebtoken";
import { prisma } from "../libs/config/prisma";
import {
  consumeHotelInviteToken,
  validateHotelInviteToken,
} from "../libs/utils/inviteToken";

export async function hotelSignup(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { name, password, token } = req.body;

  if (!token) {
    throw new CustomError("Invite token is required", 400);
  }

  if (!name || !password) {
    throw new CustomError("Name and password are required", 400);
  }

  // Validate the token — checks expiry and whether it's been used
  const invite = await validateHotelInviteToken(token);
  if (!invite) {
    throw new CustomError(
      "This invite link is invalid, expired, or has already been used",
      400,
    );
  }

  const { email } = invite;

  // Guard: hotel account should not already exist
  const { data: rpcUser } = await supabase.rpc("get_user_by_email", { email });
  if (rpcUser) {
    // Token is dangling — clean it up and reject
    await consumeHotelInviteToken(token);
    throw new CustomError(
      "An account for this hotel already exists. Please log in.",
      400,
    );
  }

  // Use a new Supabase instance for this signup
  const { createClient } = await import("@supabase/supabase-js");
  const tempSupabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Create the Supabase user — no email confirmation needed since this is an
  // admin-initiated invite flow (the email address is already trusted)
  const { data, error } = await tempSupabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      // No emailRedirectTo — we confirm programmatically below
    },
  });

  if (error) {
    throw new CustomError(error.message, 400);
  }

  const userId = data?.user?.id;
  if (!userId) {
    throw new CustomError("Failed to create user account", 500);
  }

  // Immediately confirm the email and set role + approval — no manual review needed
  const { error: metaError } = await tempSupabase.auth.admin.updateUserById(
    userId,
    {
      email_confirm: true,
      user_metadata: {
        name,
        approvalStatus: ApprovalStatus.APPROVED,
      },
      role: UserRole.HOTEL_OWNER,
    },
  );

  if (metaError) {
    // Attempt to clean up the half-created Supabase user
    await supabase.auth.admin.deleteUser(userId);
    throw new CustomError(metaError.message, 400);
  }

  // Token is valid and user is created — consume it now so it can't be reused
  await consumeHotelInviteToken(token);

  // Sign the user in immediately so the frontend gets a session token
  const { data: sessionData, error: sessionError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (sessionError) {
    throw new CustomError(sessionError.message, 400);
  }

  const session = sessionData?.session;

  // First, find all places owned by this hotel user
  const places = await prisma.place.findMany({
    where: { email }, // or however ownership is modeled
    select: { id: true, name: true },
  });

  return res.status(201).json({
    message: "Hotel account created successfully.",
    data: {
      token: session?.access_token,
      user: {
        id: userId,
        email,
        name,
        role: UserRole.HOTEL_OWNER,
        approvalStatus: ApprovalStatus.APPROVED,
        places,
      },
    },
  });
}

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
      { email },
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
    },
  );
  if (metaError) {
    throw new CustomError(metaError.message, 400);
  }

  // send email to user that their account is under review if status is pending
  if (approvalStatus === ApprovalStatus.PENDING && !!studentIdUrl) {
    await sendEmail({
      type: EmailType.ACCOUNT_REVIEW,
      to: email,
      subject: "Your account is under review",
      variables: { name, appName: "Student Bidding" },
    });
  }

  // Return user info and session (token)
  return res.status(201).json({
    message: "Signup successfully. Verify your email to continue.",
    data: { user: { approvalStatus } },
  });
}

export async function login(req: Request, res: Response, next: NextFunction) {
  const { email, password } = req.body as LoginRequest;

  let places: { id: string }[] = [];

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

  if (data.user?.role === UserRole.HOTEL_OWNER) {
    // First, find all places owned by this hotel user
    places = await prisma.place.findMany({
      where: { email }, // or however ownership is modeled
      select: { id: true, name: true },
    });
  }
  // Return user info and session (token)
  return res.status(200).json({
    data: {
      user: {
        ...data.user,
        approvalStatus: data.user?.user_metadata?.approvalStatus,
        name: data.user?.user_metadata?.name,
        places: places,
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

export async function resubmit(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { token, studentIdUrl } = req.body;

  // Decode JWT to get student_id
  let id = "";
  try {
    const decodedToken = jwt.decode(token) as { id: string };
    if (!decodedToken?.id) {
      throw new CustomError("Invalid token", 400);
    }
    id = decodedToken.id;
  } catch (err) {
    throw new CustomError("Invalid token", 400);
  }

  // Call the Supabase function to resubmit the ID
  const { data, error } = await supabase.rpc("resubmit_id", {
    student_id: id,
    student_id_url: studentIdUrl,
  });

  if (error) {
    throw new CustomError(error.message, 400);
  }

  return res.status(200).json({
    message: "ID resubmitted successfully",
    data,
  });
}

export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { email } = req.body;

  // Use Supabase to send password reset email
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.CLIENT_URL}/reset-password`,
  });

  if (error) {
    throw new CustomError(error.message, 400);
  }

  return res.status(200).json({
    message: "Password reset email sent successfully. Please check your inbox.",
  });
}

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { password } = req.body;
  const accessToken = req.headers.authorization?.replace("Bearer ", "");

  if (!accessToken) {
    throw new CustomError("Access token is required", 400);
  }

  // Get user from session using the access token
  const { data: userData, error: userError } =
    await supabase.auth.getUser(accessToken);

  if (userError || !userData.user) {
    throw new CustomError("Invalid or expired token", 400);
  }

  // Update the user's password
  const { error } = await supabase.auth.admin.updateUserById(userData.user.id, {
    password,
  });

  if (error) {
    throw new CustomError(error.message, 400);
  }

  return res.status(200).json({
    message:
      "Password reset successfully. You can now login with your new password.",
  });
}
