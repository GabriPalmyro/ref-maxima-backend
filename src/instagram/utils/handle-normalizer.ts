export function normalizeInstagramHandle(input: string): string | null {
  if (!input) return null;

  let handle = input.trim().toLowerCase();

  // Strip full URL: https://instagram.com/username or https://www.instagram.com/username/
  const urlMatch = handle.match(
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-z0-9_.]{1,30})\/?(?:\?.*)?$/i,
  );
  if (urlMatch) handle = urlMatch[1];

  // Strip @ prefix
  if (handle.startsWith('@')) handle = handle.slice(1);

  // Validate: 1-30 chars, letters, numbers, periods, underscores only
  const valid = /^[a-z0-9_.]{1,30}$/.test(handle);
  return valid ? handle : null;
}
