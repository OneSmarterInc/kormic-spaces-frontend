/** Empty origin uses the same-origin backend proxy (recommended for sessions). */
export function appConfig(): { apiHost: string } {
  return { apiHost: (import.meta.env.VITE_API_HOST ?? '').trim().replace(/\/$/, '') };
}
