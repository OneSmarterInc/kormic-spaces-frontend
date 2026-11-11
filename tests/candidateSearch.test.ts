import assert from 'node:assert/strict';
import test from 'node:test';
import {
  candidateSearchTerms,
  linkedInPeopleUrl,
  publicProfileSearchUrl,
  indeedCandidatesUrl,
} from '../src/spaces/candidateSearch.ts';

test('candidate search safely encodes role, location and skills', () => {
  const terms = candidateSearchTerms('C++ developer', 'Bengaluru & Remote', 'C#, SQL, ');
  assert.equal(terms, 'C++ developer C# SQL Bengaluru & Remote');
  const url = new URL(linkedInPeopleUrl(terms));
  assert.equal(url.hostname, 'www.linkedin.com');
  assert.equal(url.searchParams.get('keywords'), terms);
  assert.equal(
    new URL(publicProfileSearchUrl(terms)).searchParams.get('q'),
    `site:linkedin.com/in/ ${terms}`,
  );
  assert.equal(indeedCandidatesUrl, 'https://www.indeed.com/candidates/');
});
test('empty search and whitespace are handled without fabricated terms', () => {
  assert.equal(candidateSearchTerms('', '', ', '), '');
  assert.equal(candidateSearchTerms('Python\ndeveloper', '', ''), 'Python developer');
  assert.equal(candidateSearchTerms('a'.repeat(1000), '', '').length, 600);
});
