import { Request, Response } from "express";
import { sendPlainEmail } from "../email/sendEmail";
import { ContactRequest } from "../validations/contact/contact.validation";

const CONTACT_INBOX =
  process.env.CONTACT_INBOX_EMAIL || "deadline@podshare.com";

const topicLabels: Record<ContactRequest["topic"], string> = {
  general: "General inquiry",
  hotel: "List your hotel",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function submitContact(req: Request, res: Response) {
  const { name, email, topic, subject, message } = req.body as ContactRequest;
  const topicLabel = topicLabels[topic];
  const emailSubject =
    subject?.trim() ||
    `${topicLabel} from ${name}`;

  const html = `
    <h2>New contact form submission</h2>
    <p><strong>Topic:</strong> ${escapeHtml(topicLabel)}</p>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Subject:</strong> ${escapeHtml(emailSubject)}</p>
    <hr />
    <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
  `;

  const text = [
    `Topic: ${topicLabel}`,
    `Name: ${name}`,
    `Email: ${email}`,
    `Subject: ${emailSubject}`,
    "",
    message,
  ].join("\n");

  await sendPlainEmail({
    to: CONTACT_INBOX,
    subject: `[Deadline Contact] ${emailSubject}`,
    html,
    text,
    replyTo: email,
  });

  res.json({ success: true, message: "Your message has been sent." });
}
