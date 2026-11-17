import { HttpError } from "../utils/httpError";

export async function askAI(prompt: string): Promise<string> {
  // le code viendra ici
  const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new HttpError(503, "IA non configurée", "SERVICE_UNAVAILABLE");
}
const res = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  }),
});
if (!res.ok) {
  throw new HttpError(res.status, "Erreur lors de la requête à l'IA", "INTERNAL_SERVER_ERROR");
}
const data = await res.json();
return data.choices[0].message.content;
}