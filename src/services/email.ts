import { Resend } from "resend";

interface EmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  // Sans clé Resend : on affiche l'email dans la console (pratique en développement)
  if (!apiKey) {
    console.log("\n--- EMAIL (simulé, pas de RESEND_API_KEY) ---");
    console.log("À      :", to);
    console.log("Sujet  :", subject);
    console.log("Contenu:", html);
    console.log("---------------------------------------------\n");
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "onboarding@resend.dev",
    to,
    subject,
    html,
  });
  if (error) throw new Error(`Envoi d'email échoué : ${error.message}`);
}
