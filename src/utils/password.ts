const COMMON = new Set([
  "1234567890", "123456789012", "passwordpassword", "password123456",
  "azertyuiop", "qwertyuiop", "motdepasse123", "administrator",
]);

export function validatePassword(pwd: string): string | null {
  if (pwd.length < 12) return "Le mot de passe doit contenir au moins 12 caractères";
  // bcrypt ne lit que les 72 premiers octets : on refuse plus long
  if (Buffer.byteLength(pwd, "utf8") > 72) return "Le mot de passe est trop long (72 octets maximum)";
  if (!/[a-z]/.test(pwd) || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) {
    return "Le mot de passe doit contenir une minuscule, une majuscule et un chiffre";
  }
  if (/^(.)\1+$/.test(pwd)) return "Le mot de passe ne doit pas répéter un seul caractère";
  if (COMMON.has(pwd.toLowerCase())) return "Mot de passe trop courant";
  return null;
}