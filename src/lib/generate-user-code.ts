/**
 * Generate a user code from a name: first 2 uppercase letters + 4 random digits.
 * Example: "Diego" → "DI4829"
 */
export function generateUserCode(name: string): string {
  const cleaned = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase();

  const prefix = cleaned.length >= 2
    ? cleaned.slice(0, 2)
    : cleaned.padEnd(2, "X");

  const digits = String(Math.floor(1000 + Math.random() * 9000));

  return `${prefix}${digits}`;
}
