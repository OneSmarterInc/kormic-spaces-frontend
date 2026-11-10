/** Every company route carries an explicit tenant; job/view IDs are scoped to it. */
export function workspaceUrl(
  path: string,
  workspace: string | undefined,
  context: { job?: string; view?: string } = {},
): string {
  if (!workspace) throw new Error('Select an authorized workspace before navigating.');
  const params = new URLSearchParams({ workspace });
  if (context.job) params.set('job', context.job);
  if (context.view) params.set('view', context.view);
  return `${path}?${params}`;
}
