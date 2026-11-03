/** Employer UI routes never overlap the backend's /spaces/ namespace. */
export function spacesPagePath(segment = ''): string {
  return `/${segment}`;
}

export function spacesPageSegment(path: string): string {
  return path.replace(/^\/|\/$/g, '');
}

export function portalUrl(portal: 'careers' | 'spaces'): string | undefined {
  const value = portal === 'careers'
    ? import.meta.env?.VITE_CAREERS_URL
    : import.meta.env?.VITE_SPACES_URL;
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
      return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}
