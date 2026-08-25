export function greeting(name?: string | null, hi = "Hi"): string {
  const normalizedName = name?.trim();
  return normalizedName ? `${hi} ${normalizedName},` : `${hi},`;
}

export function linkFallback(label: string, url: string): string {
  return `${label}:\n${url}`;
}
