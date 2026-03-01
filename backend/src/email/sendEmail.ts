import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import { EmailType } from "./emailTypes";
import { CustomError } from "../libs/utils/CustomError";

const EMAIL_NAME = process.env.EMAIL_NAME;
const EMAIL_MAIL = process.env.EMAIL_MAIL;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_SECURE = process.env.EMAIL_SECURE === "true";
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_HOST = process.env.EMAIL_HOST;
const EMAIL_PORT = Number(process.env.EMAIL_PORT);

const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: EMAIL_SECURE,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

const templateMap: Record<EmailType, string> = {
  [EmailType.ACCOUNT_REVIEW]: "account_review.ejs",
  [EmailType.ACCOUNT_APPROVED]: "account_approved.ejs",
  [EmailType.ACCOUNT_REJECTED]: "account_rejected.ejs",
  [EmailType.BOOKING_CONFIRMED_STUDENT]: "booking_confirmed_student.ejs",
  [EmailType.BOOKING_CONFIRMED_PLACE]: "booking_confirmed_place.ejs",
  [EmailType.PAYOUT_SENT]: "payout_sent.ejs",
  [EmailType.HOTEL_INVITE]: "hotel_invite.ejs",
  [EmailType.HOTEL_PLACE_CREATED]: "hotel_place_created.ejs",
};

export async function sendEmail({
  type,
  to,
  subject,
  variables,
}: {
  type: EmailType;
  to: string;
  subject: string;
  variables: Record<string, any>;
}) {
  const templateFile = templateMap[type];
  if (!templateFile) throw new Error("Unknown email type");

  const templatePath = path.join(__dirname, "templates", templateFile);
  let html;
  try {
    console.log(templatePath, type, templateFile);
    html = await ejs.renderFile(templatePath, variables);
  } catch (err: any) {
    throw new CustomError("Failed to read email template: " + err.message, 500);
  }

  const mailOptions = {
    from: EMAIL_MAIL,
    to,
    subject,
    html,
  };

  return transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
      throw new Error("Failed to send email");
    }
    console.log("Email sent successfully:", info.messageId);
  });
}
