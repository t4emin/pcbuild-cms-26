export function normalizeAffiliateUrl(value?: string) {
  const raw = value?.trim() ?? "";
  if (!raw) return "";
  const markdownTarget = raw.match(/\((https:\/\/[^\s)]+)\)/i)?.[1];
  const pastedUrl = raw.match(/https:\/\/[^\s\])]+/i)?.[0];
  if (markdownTarget || pastedUrl) return markdownTarget ?? pastedUrl ?? "";
  if (/^[\w.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(raw)) return `https://${raw}`;
  return raw;
}
