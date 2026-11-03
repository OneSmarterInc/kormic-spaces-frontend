/** Employer UI routes never overlap the backend's /spaces/ namespace. */
export function spacesPagePath(segment = ''): string {
  return `/${segment}`;
}

export function spacesPageSegment(path: string): string {
  return path.replace(/^\/|\/$/g, '');
}
