export function normalizeName(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, " ");
}

export function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .toLocaleLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "member";
}

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
