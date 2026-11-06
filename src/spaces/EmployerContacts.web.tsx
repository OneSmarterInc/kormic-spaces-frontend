import { useEffect, useRef, useState, type FormEvent } from "react";
import type { SpacesClient } from "./liveApi";
import { employerContactStyles } from "./employerContactStyles";

type Contact = {
  id: number;
  email: string;
  purpose: string;
  source_url: string;
  source_kind: string;
  evidence: string;
  scope: string;
  branch: string;
  status: string;
  review_note: string;
  last_seen_at: string;
  reviewed_at: string | null;
};
type Job = {
  id: string;
  company: string;
  title: string;
  location: string;
  url: string;
  platform: string;
  match: {
    status: string;
    name: string;
    identity_reference: string;
    official_domain: string;
    branch: string;
    evidence: string;
  };
  contacts: Contact[];
  pages: {
    url: string;
    status: string;
    error: string;
    next_check_at: string;
  }[];
  discovery: string;
  scanned_at: string | null;
};
type Summary = {
  jobs: number;
  missing: number;
  contacts: number;
  pending: number;
  approved_pages: number;
  worker_online: boolean;
};
type Observation = {
  job_id: string;
  company: string;
  title: string;
  location: string;
};
type Mailbox = {
  id: number;
  email: string;
  company: string;
  purpose: string;
  status: string;
  branch: string;
  sources: number;
  jobs: number;
  observations: Observation[];
  evidence_page: number;
  evidence_pages: number;
};
type Result<T = Job> = {
  results: T[];
  count: number;
  page: number;
  pages: number;
  summary: Summary;
};
const formValues = (element: HTMLFormElement, fields: string[]) => {
  const form = new FormData(element);
  return Object.fromEntries(fields.map((name) => [name, form.get(name)]));
};
const label = (value: string) => value.replaceAll("_", " ");
const safeUrl = (value: string) =>
  /^https?:\/\//i.test(value) ? value : undefined;

export function EmployerContacts({ api }: { api: SpacesClient }) {
  const [data, setData] = useState<Result>();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("company");
  const [missing, setMissing] = useState(true);
  const [view, setView] = useState<"companies" | "contacts">("companies");
  const [evidence, setEvidence] = useState<Result<Mailbox>>();
  const [mailbox, setMailbox] = useState<Mailbox>();
  const opener = useRef<HTMLButtonElement | null>(null);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<Job>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const reviewDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!selected || !reviewDialog.current) return;
    const dialog = reviewDialog.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      queueMicrotask(() => opener.current?.focus());
      document.body.style.overflow = previousOverflow;
    };
  }, [selected]);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let inFlight = false;
    async function load() {
      if (inFlight || controller.signal.aborted) return;
      inFlight = true;
      try {
        const params = new URLSearchParams({
          page: String(page),
          q: search,
          sort,
          missing: missing && view === "companies" ? "1" : "0",
        });
        if (view === "companies") {
          const result = await api.request<Result>(
            `admin/contacts/?${params}`,
            "GET",
            undefined,
            controller.signal,
          );
          if (!controller.signal.aborted) setData(result);
        } else {
          const result = await api.request<Result<Mailbox>>(
            `admin/contact-evidence/?${params}`,
            "GET",
            undefined,
            controller.signal,
          );
          if (!controller.signal.aborted) setEvidence(result);
        }
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Could not load contacts.");
      } finally {
        inFlight = false;
        if (!controller.signal.aborted)
          timer = setTimeout(() => {
            if (!document.hidden) void load();
          }, 15000);
      }
    }
    const resume = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        void load();
      }
    };
    void load();
    document.addEventListener("visibilitychange", resume);
    return () => {
      controller.abort();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [api, page, search, sort, missing, view, revision]);
  async function action(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      setRevision((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  async function scan() {
    const result = await api.request<{ processed: number; remaining: number }>(
      "admin/contacts/",
      "POST",
      {},
    );
    setNotice(
      `Checked ${result.processed} new or changed postings. ${result.remaining} pending. Unchanged postings were skipped. No emails sent.`,
    );
  }
  async function openCompany(job: Job) {
    const result = await api.request<Result>(`admin/contacts/?job=${job.id}`);
    if (!result.results[0]) throw new Error("This job is no longer available.");
    setMailbox(undefined);
    setSelected(result.results[0]);
  }
  async function openEvidence(record: Mailbox, jobId?: string) {
    const result = await api.request<Result>(
      `admin/contacts/?job=${jobId || record.observations[0]?.job_id}`,
    );
    if (!result.results[0]) throw new Error("This job is no longer available.");
    setMailbox(record);
    setSelected(result.results[0]);
  }
  async function changeEvidencePage(record: Mailbox, pageNumber: number) {
    const response = await api.request<Result<Mailbox>>(
      `admin/contact-evidence/?mailbox=${record.id}&evidence_page=${pageNumber}`,
    );
    if (response.results[0]) await openEvidence(response.results[0]);
  }
  function submitMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = formValues(event.currentTarget, [
      "name",
      "identity_reference",
      "official_domain",
      "branch",
      "evidence",
    ]);
    if (!selected) return;
    void action(async () => {
      await api.request(`admin/employers/jobs/${selected.id}/`, "POST", values);
      setSelected(undefined);
      setNotice("Employer association reviewed. Review contacts separately.");
    });
  }
  function sortBy(key: string) {
    setSort(sort === key ? `-${key}` : key);
    setPage(1);
  }
  const active = view === "companies" ? data : evidence;
  const summary = active?.summary;
  function heading(field: string, title: string) {
    return (
      <th
        key={field}
        scope="col"
        aria-sort={
          sort.replace("-", "") === field
            ? sort.startsWith("-")
              ? "descending"
              : "ascending"
            : "none"
        }
      >
        <button onClick={() => sortBy(field)}>
          {title}
          <svg
            width="12"
            height="16"
            viewBox="0 0 12 16"
            fill="none"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path d="m3 6 3-3 3 3m-6 4 3 3 3-3" />
          </svg>
        </button>
      </th>
    );
  }
  return (
    <section
      className="employer-contacts"
      aria-label="Employer contact registry"
    >
      <style>{employerContactStyles}</style>
      <div className="ec-overview">
        <span>
          <strong>{summary?.missing ?? "-"}</strong> jobs need recruitment
          contacts
        </span>
        <span>
          <strong>{summary?.contacts ?? "-"}</strong> unique email addresses
        </span>
        <span>
          <strong>{summary?.pending ?? "-"}</strong> changed postings pending
        </span>
        <span className="ec-email-off">Email sending off</span>
      </div>
      <div
        className="ec-tabs"
        role="tablist"
        aria-label="Contact registry tables"
      >
        <button
          role="tab"
          id="company-tab"
          aria-selected={view === "companies"}
          aria-controls="company-panel"
          onClick={() => {
            setView("companies");
            setPage(1);
            setSort("company");
          }}
        >
          Company matching
        </button>
        <button
          role="tab"
          id="contact-tab"
          aria-selected={view === "contacts"}
          aria-controls="contact-panel"
          onClick={() => {
            setView("contacts");
            setPage(1);
            setSort("company");
          }}
        >
          Contact evidence
        </button>
      </div>
      <div className="ec-toolbar">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(query);
            setPage(1);
          }}
        >
          <label className="ec-search">
            <span className="ec-sr">Search registry</span>
            <input
              aria-label="Search registry"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                view === "companies"
                  ? "Company, job or location"
                  : "Email, company or contact purpose"
              }
            />
          </label>
          <button>Search</button>
        </form>
        {view === "companies" && (
          <label className="ec-check">
            <input
              type="checkbox"
              checked={missing}
              onChange={(e) => {
                setMissing(e.target.checked);
                setPage(1);
              }}
            />
            Needs recruitment contact
          </label>
        )}
        <button disabled={busy} onClick={() => void action(scan)}>
          {busy ? "Working..." : "Check changed postings"}
        </button>
      </div>
      <div className="ec-discovery-note">
        <span>
          {summary?.worker_online
            ? "Contact worker online"
            : "Contact worker not reporting"}
        </span>
        <span>
          New/changed postings first. Approved pages cached. No name-only
          company matching.
        </span>
        <details>
          <summary>How discovery works</summary>
          <p>
            We read stored job descriptions first. A job with only fraud,
            support or accommodation emails still needs a recruitment contact.
            New or changed postings are processed automatically; unchanged
            descriptions are skipped. Official pages require a reviewed company
            domain, are shared across linked jobs and checked at most once daily
            (seven days when no email is found). A single resource-gated worker
            checks due sources, with a one-minute global fetch interval and
            backoff after failures. Missing identity evidence requires admin
            review.
          </p>
        </details>
      </div>
      {error && !selected && (
        <p role="alert" className="ec-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="ec-notice">
          {notice}
        </p>
      )}
      {!active ? (
        <p role="status">Loading registry...</p>
      ) : (
        <div
          role="tabpanel"
          id={view === "companies" ? "company-panel" : "contact-panel"}
          aria-labelledby={view === "companies" ? "company-tab" : "contact-tab"}
        >
          <div className="ec-table-scroll">
            <table>
              <caption>
                {active.count}{" "}
                {view === "companies" ? "job associations" : "unique contacts"}
                <span>
                  {view === "companies"
                    ? "Work location and contact branch are separate."
                    : "Purpose comes from source text, not the mailbox name."}
                </span>
              </caption>
              {view === "companies" ? (
                <>
                  <colgroup>
                    <col style={{ width: "29%" }} />
                    <col style={{ width: "19%" }} />
                    <col style={{ width: "19%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "9%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {heading("company", "Company / job")}
                      {heading("location", "Work location")}
                      {heading("branch", "Hiring branch")}
                      {heading("match", "Company match")}
                      {heading("platform", "Platform")}
                      <th scope="col">
                        <span className="ec-sr">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.results.map((job) => (
                      <tr key={job.id}>
                        <td>
                          <strong>{job.company || "Not provided"}</strong>
                          <span>{job.title}</span>
                        </td>
                        <td>{job.location || "Not provided"}</td>
                        <td>
                          {job.match.branch || (
                            <span className="ec-muted">Not established</span>
                          )}
                        </td>
                        <td>
                          <span className="ec-status">
                            {label(job.match.status)}
                          </span>
                          <small>{job.discovery}</small>
                        </td>
                        <td>{job.platform}</td>
                        <td>
                          <button
                            disabled={busy}
                            onClick={(e) => {
                              opener.current = e.currentTarget;
                              setMailbox(undefined);
                              void action(() => openCompany(job));
                              setError("");
                            }}
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              ) : (
                <>
                  <colgroup>
                    <col style={{ width: "27%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "11%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "9%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {heading("email", "Email")}
                      {heading("company", "Company evidence")}
                      {heading("purpose", "Contact purpose")}
                      {heading("status", "Verification")}
                      {heading("branch", "Branch")}
                      {heading("source", "Sources")}
                      <th scope="col">
                        <span className="ec-sr">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {evidence?.results.map((record) => (
                      <tr key={record.id}>
                        <td>
                          <strong>{record.email}</strong>
                          <small>
                            {record.jobs} linked{" "}
                            {record.jobs === 1 ? "job" : "jobs"}
                          </small>
                        </td>
                        <td>{record.company || "Unassigned"}</td>
                        <td>{label(record.purpose)}</td>
                        <td>
                          <span className="ec-status">
                            {label(record.status)}
                          </span>
                        </td>
                        <td>
                          {record.branch || (
                            <span className="ec-muted">Not established</span>
                          )}
                        </td>
                        <td>{record.sources}</td>
                        <td>
                          <button
                            disabled={busy || !record.observations.length}
                            onClick={(e) => {
                              opener.current = e.currentTarget;
                              void action(() => openEvidence(record));
                            }}
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
            </table>
            {!active.results.length && (
              <p className="ec-empty">
                No matching records. Try another search or include all job
                associations.
              </p>
            )}
          </div>
          <div className="ec-pagination">
            <span>
              {active.count} records - Page {active.page} of {active.pages}
            </span>
            <button
              disabled={active.page <= 1 || busy}
              onClick={() => setPage(active.page - 1)}
            >
              Previous
            </button>
            <button
              disabled={active.page >= active.pages || busy}
              onClick={() => setPage(active.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
      {selected && (
        <dialog
          ref={reviewDialog}
          className="ec-review"
          aria-labelledby="contact-review-title"
          onCancel={(event) => {
            event.preventDefault();
            if (!busy) setSelected(undefined);
          }}
        >
          {error && (
            <p role="alert" className="ec-error">
              {error}
            </p>
          )}
          <header>
            <div>
              <h2 id="contact-review-title">
                {mailbox?.email || selected.company}
              </h2>
              <p>
                {selected.title} · {selected.location}
              </p>
              <a href={safeUrl(selected.url)} target="_blank" rel="noreferrer">
                Open original posting
              </a>
            </div>
            <button
              autoFocus
              disabled={busy}
              onClick={() => setSelected(undefined)}
            >
              Close review
            </button>
          </header>
          {mailbox && mailbox.observations.length > 1 && (
            <label className="ec-context">
              Evidence context
              <select
                value={selected.id}
                disabled={busy}
                onChange={(e) =>
                  void action(() => openEvidence(mailbox, e.target.value))
                }
              >
                {Array.from(
                  new Map(
                    mailbox.observations.map((o) => [o.job_id, o]),
                  ).values(),
                ).map((o) => (
                  <option key={o.job_id} value={o.job_id}>
                    {o.company} - {o.title} - {o.location}
                  </option>
                ))}
              </select>
            </label>
          )}
          {mailbox && mailbox.evidence_pages > 1 && (
            <div className="ec-pagination">
              <span>
                Evidence page {mailbox.evidence_page} of{" "}
                {mailbox.evidence_pages}
              </span>
              <button
                disabled={busy || mailbox.evidence_page <= 1}
                onClick={() =>
                  void action(() =>
                    changeEvidencePage(mailbox, mailbox.evidence_page - 1),
                  )
                }
              >
                Previous evidence
              </button>
              <button
                disabled={
                  busy || mailbox.evidence_page >= mailbox.evidence_pages
                }
                onClick={() =>
                  void action(() =>
                    changeEvidencePage(mailbox, mailbox.evidence_page + 1),
                  )
                }
              >
                Next evidence
              </button>
            </div>
          )}
          <details open={!mailbox && selected.match.status !== "reviewed"}>
            <summary>
              Hiring entity and branch · {selected.match.status}
            </summary>
            <p>
              Names, shared domains and work locations are not sufficient
              identity evidence. Use a distinct official entity page; record the
              responsible hiring branch only when supported.
            </p>
            <form key={selected.id} onSubmit={submitMatch} className="ec-form">
              <label>
                Legal / hiring entity
                <input
                  name="name"
                  required
                  maxLength={500}
                  defaultValue={selected.match.name || selected.company}
                />
              </label>
              <label>
                Official entity evidence URL
                <input
                  name="identity_reference"
                  type="url"
                  required
                  defaultValue={selected.match.identity_reference}
                  placeholder="https://company.example/legal-entity"
                />
              </label>
              <label>
                Reviewed official domain
                <input
                  name="official_domain"
                  required
                  defaultValue={selected.match.official_domain}
                  placeholder="www.company.example"
                />
              </label>
              <label>
                Hiring branch / address, if established
                <input
                  name="branch"
                  maxLength={500}
                  defaultValue={selected.match.branch}
                />
              </label>
              <label className="ec-wide">
                Identity and branch evidence
                <textarea
                  name="evidence"
                  required
                  minLength={20}
                  maxLength={4000}
                  defaultValue={selected.match.evidence}
                />
              </label>
              <button disabled={busy}>Save reviewed association</button>
            </form>
          </details>
          {selected.match.status === "reviewed" && (
            <form
              className="ec-fetch"
              onSubmit={(event) => {
                event.preventDefault();
                const url = new FormData(event.currentTarget).get("url");
                void action(async () => {
                  const result = await api.request<{ found: number }>(
                    `admin/employers/jobs/${selected.id}/discover/`,
                    "POST",
                    { url },
                  );
                  setSelected(undefined);
                  setNotice(
                    `Found ${result.found} contact observations. The source is now cached and scheduled; open review to inspect the evidence.`,
                  );
                });
              }}
            >
              <label>
                Official careers or branch page
                <input
                  name="url"
                  required
                  type="url"
                  placeholder={`https://${selected.match.official_domain}/careers`}
                />
              </label>
              <button disabled={busy}>Extract page contacts</button>
            </form>
          )}
          {!!selected.pages?.length && (
            <details>
              <summary>
                Approved discovery sources ({selected.pages.length})
              </summary>
              {selected.pages.map((source) => (
                <p key={source.url}>
                  <a
                    href={safeUrl(source.url)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {source.url}
                  </a>
                  <br />
                  {label(source.status)} - Next check{" "}
                  {new Date(source.next_check_at).toLocaleString()}
                  {source.error && (
                    <span className="ec-error"> - {source.error}</span>
                  )}
                </p>
              ))}
            </details>
          )}
          <h3>Contact observations</h3>
          <p>
            Purpose is inferred from the quoted source text. Verification
            records an admin review, not mailbox deliverability.
            Restricted-purpose contacts remain unsuitable for candidate
            introductions.
          </p>
          {!selected.contacts.length && (
            <p>
              No emails found in the stored posting. Review the company domain
              to extract an official page.
            </p>
          )}
          {selected.contacts
            .filter((contact) => !mailbox || contact.email === mailbox.email)
            .map((contact) => (
              <article key={contact.id} className="ec-evidence">
                <h4>{contact.email}</h4>
                <p>
                  <strong>Contact purpose:</strong> {label(contact.purpose)} ·{" "}
                  {label(contact.status)}
                </p>
                <a
                  href={safeUrl(contact.source_url)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Source: {label(contact.source_kind)}
                </a>
                <blockquote>{contact.evidence}</blockquote>
                <small>
                  Last observed{" "}
                  {new Date(contact.last_seen_at).toLocaleString()}
                  {contact.reviewed_at &&
                    ` · Reviewed ${new Date(contact.reviewed_at).toLocaleString()}`}
                </small>
                <form
                  className="ec-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const values = formValues(event.currentTarget, [
                      "status",
                      "scope",
                      "branch",
                      "note",
                    ]);
                    void action(async () => {
                      await api.request(
                        `admin/contacts/${contact.id}/review/`,
                        "POST",
                        values,
                      );
                      setSelected(undefined);
                      setNotice(
                        "Contact review saved. Email delivery remains off.",
                      );
                    });
                  }}
                >
                  <label>
                    Verification status
                    <select
                      name="status"
                      defaultValue={
                        contact.status === "withdrawn"
                          ? "unverified"
                          : contact.status
                      }
                    >
                      <option value="unverified">Unverified</option>
                      <option value="verified">Verified by admin</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </label>
                  <label>
                    Contact scope
                    <select name="scope" defaultValue={contact.scope}>
                      <option value="unknown">Unknown</option>
                      <option value="exact_job">This exact job</option>
                      <option value="branch">Reviewed branch</option>
                      <option value="company">
                        Company-level; not branch-specific
                      </option>
                    </select>
                  </label>
                  <label>
                    Contact branch / address
                    <input
                      name="branch"
                      maxLength={500}
                      defaultValue={contact.branch}
                    />
                  </label>
                  <label className="ec-wide">
                    Evidence for this review
                    <textarea
                      name="note"
                      minLength={20}
                      maxLength={4000}
                      required
                      defaultValue={contact.review_note}
                    />
                  </label>
                  <button disabled={busy}>Save contact review</button>
                </form>
              </article>
            ))}
        </dialog>
      )}
    </section>
  );
}
