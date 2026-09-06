export function apiUrl(path: string) {
  const base = String(import.meta.env.VITE_API_BASE_URL ?? "").replace(
    /\/$/,
    "",
  );
  return `${base}${path}`;
}
