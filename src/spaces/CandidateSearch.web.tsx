import { useEffect, useState } from 'react';
import type { SpacesClient } from './liveApi';
import {
  candidateSearchTerms,
  linkedInPeopleUrl,
  publicProfileSearchUrl,
  indeedCandidatesUrl,
} from './candidateSearch';

type Job = {
  id: string;
  title: string;
  location: string;
  skills: string[];
  organization__name: string;
};

export function CandidateSearch({ api }: { api: SpacesClient }) {
  const [query, setQuery] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState('');
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');
  const [skills, setSkills] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);
  const [copied, setCopied] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await api.request<{ count: number; results: Job[] }>(
          `admin/applicant-agent/jobs/?${new URLSearchParams({ q: query, limit: '20' })}`,
          'GET',
          undefined,
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setJobs(data.results);
          setCount(data.count);
          setError('');
        }
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : 'Unable to load jobs.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [api, query]);
  const terms = candidateSearchTerms(role, location, skills);
  async function copy() {
    try {
      await navigator.clipboard.writeText(terms);
      setCopied('Search terms copied. Paste them into Indeed Smart Sourcing.');
    } catch {
      setCopied('Copy unavailable. Select and copy the search terms below.');
    }
  }
  return (
    <details className="candidate-search">
      <summary>Search LinkedIn &amp; Indeed</summary>
      <div>
        <p>
          Use a live company job or enter your own criteria. Searches open in a new tab; profiles
          are not imported.
        </p>
        <div className="candidate-search-grid">
          <label>
            Find a company job
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected('');
              }}
              placeholder="Job, company or location"
            />
          </label>
          <label>
            Use job requirements
            <select
              value={selected}
              disabled={loading}
              onChange={(e) => {
                setSelected(e.target.value);
                const job = jobs.find((j) => j.id === e.target.value);
                if (job) {
                  setRole(job.title);
                  setLocation(job.location);
                  setSkills(job.skills.join(', '));
                  setCopied('');
                }
              }}
            >
              <option value="">{loading ? 'Loading jobs…' : 'Choose a job (optional)'}</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} · {job.organization__name} · {job.location}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error && <p role="alert">{error} You can still enter criteria manually.</p>}
        {!loading && !error && (
          <small>
            {count > 20
              ? `Showing 20 of ${count} jobs. Narrow your search.`
              : `${count} live company jobs found.`}
          </small>
        )}
        <div className="candidate-search-grid">
          <label>
            Role
            <input
              value={role}
              maxLength={160}
              onChange={(e) => {
                setRole(e.target.value);
                setCopied('');
              }}
              placeholder="Python developer"
            />
          </label>
          <label>
            Location
            <input
              value={location}
              maxLength={160}
              onChange={(e) => {
                setLocation(e.target.value);
                setCopied('');
              }}
              placeholder="Bengaluru, India"
            />
          </label>
          <label>
            Skills, separated by commas
            <input
              value={skills}
              maxLength={280}
              onChange={(e) => {
                setSkills(e.target.value);
                setCopied('');
              }}
              placeholder="Python, Django, SQL"
            />
          </label>
        </div>
        <label>
          Search terms
          <textarea readOnly value={terms} aria-label="External candidate search terms" />
        </label>
        <div className="candidate-search-actions">
          {terms ? (
            <>
              <a
                className="secondary"
                href={linkedInPeopleUrl(terms)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Search LinkedIn ↗
              </a>
              <a
                className="secondary"
                href={publicProfileSearchUrl(terms)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Search public LinkedIn profiles ↗
              </a>
            </>
          ) : (
            <button disabled className="secondary">
              Enter search criteria
            </button>
          )}
          <button className="secondary" disabled={!terms} onClick={() => void copy()}>
            Copy terms for Indeed
          </button>
          <a
            className="secondary"
            href={indeedCandidatesUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Search Indeed ↗
          </a>
        </div>
        <small>
          LinkedIn may require sign-in. Indeed opens Smart Sourcing: paste the copied terms there;
          account access may be required. Public search results can be incomplete or outdated.
        </small>
        <span role="status">{copied}</span>
      </div>
      <style>{`.candidate-search-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(230px,100%),1fr));gap:12px}.candidate-search label{display:grid;gap:6px;min-width:0}.candidate-search input,.candidate-search select{width:100%;min-width:0}.candidate-search-actions{display:flex;flex-wrap:wrap;gap:8px}.candidate-search-actions a{display:inline-flex;align-items:center;text-decoration:none;padding:10px 12px;border:1px solid var(--line);border-radius:6px}.candidate-search p{margin:0}`}</style>
    </details>
  );
}
