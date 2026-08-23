export function greeting(name?: string | null): string {
  const normalizedName = name?.trim();
  return normalizedName ? `Hi ${normalizedName},` : "Hi,";
}

export function linkFallback(label: string, url: string): string {
  return `${label}:\n${url}`;
}
