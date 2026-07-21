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
import axios from "axios";
import { randomUUID } from "node:crypto";
import { prisma } from "../libs/config/prisma";
import { JWT_SECRET } from "../libs/config/jwt";
import {
  consumeHotelInviteToken,
  validateHotelInviteToken,
} from "../libs/utils/inviteToken";

const LINKEDIN_REDIRECT_URI = `${process.env.CLIENT_URL}/auth/linkedin/callback`;

// LinkedIn proves someone owns this email and has a LinkedIn account —
// it does NOT prove employment or that the email isn't a free consumer
// provider (LinkedIn accounts can be made with any Gmail address). Block
// the same free-domain providers here that would otherwise require ID
// verification, so LinkedIn can't be used to bypass that policy.
const FREE_EMAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "aol.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "comcast.net",
  "verizon.net",
  "att.net",
  "sbcglobal.net",
  "protonmail.com",
  "proton.me",
  "gmx.com",
  "mail.com",
  "yandex.com",
  "zoho.com",
];

function isFreeEmailDomain(email: string): boolean {
  const domain = email.toLowerCase().split("@")[1] ?? "";
  return FREE_EMAIL_DOMAINS.includes(domain);
}

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
    referralCode,
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

  // Credit whoever referred this signup, if their code is valid — before
  // approvalStatus is even known, since the referral itself doesn't
  // depend on the new account being approved.
  let referredBy: string | undefined;
  if (referralCode) {
    const referrer = await prisma.users.findFirst({
      where: { raw_user_meta_data: { path: ["referralCode"], equals: referralCode } },
    });
    if (referrer) {
      referredBy = referralCode;
      const referrerMeta = (referrer.raw_user_meta_data ?? {}) as Record<string, any>;
      await supabase.auth.admin.updateUserById(referrer.id, {
        user_metadata: {
          ...referrerMeta,
          referralCredit: (referrerMeta.referralCredit ?? 0) + 10,
        },
      });
    }
  }

  // update user_metadata
  const { error: metaError } = await supabase.auth.admin.updateUserById(
    data?.user?.id ?? "",
    {
      user_metadata: { studentIdUrl, approvalStatus, ...(referredBy && { referredBy }) },
      role: UserRole.STUDENT,
    },
  );
  if (metaError) {
    throw new CustomError(metaError.message, 400);
  }

  // No separate "under review" email here — this signup path already
  // triggers Supabase's own confirmation email (emailRedirectTo above),
  // and that template now carries the "you'll be reviewed" messaging
  // too, so the user gets one email instead of two back-to-back.

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

  if (data.user?.user_metadata?.banned) {
    throw new CustomError(
      "This account has been banned. Contact support if you believe this is a mistake.",
      403,
    );
  }

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

/**
 * Redirect the browser to LinkedIn's OAuth consent screen. Kept server-side
 * so the client ID/redirect URI live in one place (env vars) rather than
 * being duplicated in frontend config.
 */
export async function linkedinAuthorize(req: Request, res: Response) {
  if (!process.env.LINKEDIN_CLIENT_ID) {
    throw new CustomError("LinkedIn sign-in is not configured yet.", 503);
  }

  const returnUrl =
    typeof req.query.returnUrl === "string" ? req.query.returnUrl : "/";
  const state = Buffer.from(JSON.stringify({ returnUrl })).toString(
    "base64url",
  );

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID,
    redirect_uri: LINKEDIN_REDIRECT_URI,
    scope: "openid profile email",
    state,
  });

  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
}

/**
 * Exchange the LinkedIn authorization code for a verified email/name.
 * Doesn't create an account yet — LinkedIn proves email ownership, not
 * identity or employment, so this still goes through the same manual
 * admin review as an ID-upload signup. Returns a short-lived signed
 * token carrying the verified email/name for the completion step below.
 */
export async function linkedinCallback(req: Request, res: Response) {
  const { code } = req.body as { code: string };

  if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
    throw new CustomError("LinkedIn sign-in is not configured yet.", 503);
  }

  let linkedinAccessToken: string;
  try {
    const tokenResponse = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: LINKEDIN_REDIRECT_URI,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );
    linkedinAccessToken = tokenResponse.data.access_token;
  } catch (error: any) {
    throw new CustomError(
      error?.response?.data?.error_description ||
        "Could not verify your LinkedIn account. Please try again.",
      400,
    );
  }

  const { data: profile } = await axios.get(
    "https://api.linkedin.com/v2/userinfo",
    { headers: { Authorization: `Bearer ${linkedinAccessToken}` } },
  );

  const { email, email_verified: emailVerified, name } = profile as {
    email?: string;
    email_verified?: boolean;
    name?: string;
  };

  if (!email || !emailVerified) {
    throw new CustomError(
      "Your LinkedIn account must have a verified email to sign up this way.",
      400,
    );
  }

  if (isFreeEmailDomain(email)) {
    throw new CustomError(
      "LinkedIn sign-in is for work/professional emails only. Personal email providers (Gmail, Yahoo, etc.) still require ID verification — please sign up with your email and upload a government ID instead.",
      400,
    );
  }

  const { data: existingUser } = await supabase.rpc("get_user_by_email", {
    email,
  });
  if (existingUser?.id) {
    throw new CustomError(
      "An account with this email already exists. Please log in with your email and password instead.",
      409,
    );
  }

  const verificationToken = jwt.sign(
    { email, name: name || email },
    JWT_SECRET,
    { expiresIn: "15m" },
  );

  res.status(200).json({
    message: "LinkedIn account verified",
    data: { email, name: name || email, verificationToken },
  });
}

/**
 * Second step: set a password and submit a LinkedIn profile URL (LinkedIn's
 * API doesn't hand us a public profile link, so we ask for it directly).
 * Creates the account PENDING, same as an ID-upload signup — an admin
 * reviews the profile link and approves/rejects it from the dashboard.
 */
export async function linkedinComplete(req: Request, res: Response) {
  const { verificationToken, password, linkedinProfileUrl } = req.body as {
    verificationToken: string;
    password: string;
    linkedinProfileUrl: string;
  };

  let email: string;
  let name: string;
  try {
    const decoded = jwt.verify(
      verificationToken,
      JWT_SECRET,
    ) as { email: string; name: string };
    email = decoded.email;
    name = decoded.name;
  } catch {
    throw new CustomError(
      "Your LinkedIn verification has expired. Please try again.",
      400,
    );
  }

  const { data: existingUser } = await supabase.rpc("get_user_by_email", {
    email,
  });
  if (existingUser?.id) {
    throw new CustomError(
      "An account with this email already exists. Please log in with your email and password instead.",
      409,
    );
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
    { email, password, options: { data: { name } } },
  );
  if (signUpError) throw new CustomError(signUpError.message, 400);

  const userId = signUpData?.user?.id;
  if (!userId) throw new CustomError("Failed to create account", 500);

  const { error: metaError } = await supabase.auth.admin.updateUserById(
    userId,
    {
      // Email ownership already proven via LinkedIn OAuth — skip Supabase's
      // own confirmation email, but admin approval is still required.
      email_confirm: true,
      user_metadata: {
        name,
        approvalStatus: ApprovalStatus.PENDING,
        linkedinProfileUrl,
        verifiedVia: "linkedin",
      },
      role: UserRole.STUDENT,
    },
  );
  if (metaError) {
    await supabase.auth.admin.deleteUser(userId);
    throw new CustomError(metaError.message, 400);
  }

  await sendEmail({
    type: EmailType.ACCOUNT_REVIEW,
    to: email,
    subject: "Your account is under review",
    variables: { name, appName: "Deadline" },
  });

  res.status(201).json({
    message: "Account created. Verify your LinkedIn profile to continue.",
    data: { user: { approvalStatus: ApprovalStatus.PENDING } },
  });
}

export async function resubmit(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { token, studentIdUrl } = req.body;

  // Verify JWT to get student_id — must be jwt.verify, not jwt.decode.
  // decode() reads the payload without checking the signature at all, so
  // anyone could previously forge a token with an arbitrary `id` claim and
  // overwrite another student's ID document URL.
  let id = "";
  try {
    const decodedToken = jwt.verify(token, JWT_SECRET) as { id: string };
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

export async function createIdUploadUrl(req: Request, res: Response) {
  const { context, token, fileExt } = req.body;

  // Uploads happen before a real Supabase Auth session exists (signup) or
  // via a one-time link (resubmit), so we mint a short-lived signed upload
  // token here — the same jwt.verify() used in resubmit() above scopes the
  // resubmit path to the actual student the token was issued for — instead
  // of relying on a blanket anon-role INSERT policy on the bucket.
  let prefix = "signup";
  if (context === "resubmit") {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      prefix = `resubmit/${decoded.id}`;
    } catch {
      throw new CustomError("Invalid or expired token", 401);
    }
  }

  const path = `${prefix}/${randomUUID()}.${fileExt}`;
  const { data, error } = await supabase.storage
    .from("student-id-cards")
    .createSignedUploadUrl(path);

  if (error) {
    throw new CustomError("Failed to create upload URL", 500);
  }

  res.status(200).json({ message: "Upload URL created", data });
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

  const genericSuccessResponse = {
    message:
      "Password reset successfully. You can now login with your new password.",
  };

  const email = userData.user.email;
  if (!email) {
    return res.status(200).json(genericSuccessResponse);
  }

  // Log them straight in with the password they just set — same session
  // shape as /api/auth/login — instead of sending them to a login form to
  // retype what they just typed. Re-run the same banned/pending gating as
  // a normal login so this shortcut can't bypass those checks.
  const data = await supabasePasswordLogin({ email, password });

  if (data.user?.user_metadata?.banned) {
    return res.status(200).json(genericSuccessResponse);
  }

  if (
    data.user?.user_metadata?.approvalStatus === ApprovalStatus.PENDING &&
    data.user?.role === UserRole.STUDENT
  ) {
    return res.status(200).json(genericSuccessResponse);
  }

  let places: { id: string }[] = [];
  if (data.user?.role === UserRole.HOTEL_OWNER) {
    places = await prisma.place.findMany({
      where: { email },
      select: { id: true, name: true },
    });
  }

  return res.status(200).json({
    ...genericSuccessResponse,
    data: {
      user: {
        ...data.user,
        approvalStatus: data.user?.user_metadata?.approvalStatus,
        name: data.user?.user_metadata?.name,
        places,
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
