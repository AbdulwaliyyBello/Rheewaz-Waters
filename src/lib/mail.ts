import { randomBytes } from "crypto";

export function generateVerificationToken(): { token: string; expiresAt: Date } {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
  return { token, expiresAt };
}

export async function sendVerificationEmail(opts: { to: string; name: string; token: string }) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${opts.token}`;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Rheewaz Waters <onboarding@resend.dev>";
  const subject = "Verify your Rheewaz Waters account";
  const html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
    <h2 style="font-style:italic;">Rheewaz Waters</h2>
    <p>Hi ${opts.name},</p>
    <p>Verify your email to activate your account:</p>
    <p><a href="${verifyUrl}" style="background:#0F6E77;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block;">Verify my account</a></p>
    <p style="color:#666;font-size:12px;">${verifyUrl}</p>
    <p style="color:#666;font-size:12px;">This link expires in 24 hours.</p></div>`;

  if (!apiKey) {
    console.log("\n[Rheewaz Waters] RESEND_API_KEY not set — verification link:");
    console.log(`  To: ${opts.to}\n  Link: ${verifyUrl}\n`);
    return { delivered: false, verifyUrl };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: opts.to, subject, html }),
  });
  if (!res.ok) {
    console.error("[Rheewaz Waters] Failed to send verification email:", res.status, await res.text().catch(() => ""));
    return { delivered: false, verifyUrl };
  }
  return { delivered: true, verifyUrl };
}
