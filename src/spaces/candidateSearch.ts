export function candidateSearchTerms(role: string, location: string, skills: string): string {
  return [role, ...skills.split(','), location]
    .map((value) => value.replace(/[\r\n\t]+/g, ' ').trim())
    .filter(Boolean)
    .join(' ')
    .slice(0, 600);
}

export function linkedInPeopleUrl(terms: string): string {
  return `https://www.linkedin.com/search/results/people/?${new URLSearchParams({ keywords: terms })}`;
}

export function publicProfileSearchUrl(terms: string): string {
  return `https://www.google.com/search?${new URLSearchParams({ q: `site:linkedin.com/in/ ${terms}` })}`;
}

export const indeedCandidatesUrl = 'https://www.indeed.com/candidates/';
