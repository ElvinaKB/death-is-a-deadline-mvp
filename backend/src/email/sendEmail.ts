import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import { EmailType } from "./emailTypes";

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
  // Add more mappings as needed
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
  const html = await ejs.renderFile(templatePath, variables);

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
