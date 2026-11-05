import { useEffect, useRef, useState } from 'react';
import type { SpacesClient } from './liveApi';

function AssistantText({ text }: { text: string }) {
  const inline = (line: string) =>
    line
      .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
      .map((part, index) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={index}>{part.slice(2, -2)}</strong>
        ) : part.startsWith('`') && part.endsWith('`') ? (
          <code key={index}>{part.slice(1, -1)}</code>
        ) : (
          part
        ),
      );
  return (
    <div className="assistant-copy">
      {text.split(/\n\s*\n/).map((block, index) => {
        const lines = block.split('\n');
        return lines.every((line) => /^[-*]\s/.test(line)) ? (
          <ul key={index}>
            {lines.map((line, i) => (
              <li key={i}>{inline(line.slice(2))}</li>
            ))}
          </ul>
        ) : (
          <p key={index}>{inline(block)}</p>
        );
      })}
    </div>
  );
}

type Message = {
  id: string;
  question: string;
  answer: string;
  source?: string;
  status: 'pending' | 'completed' | 'failed';
};
export function AdminCopilot({
  api,
  visible,
  model,
  jobs,
  users,
}: {
  api: SpacesClient;
  visible: boolean;
  model?: string;
  jobs?: number;
  users?: number;
}) {
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const pending = useRef(false),
    controller = useRef<AbortController | null>(null);
  const log = useRef<HTMLDivElement>(null),
    input = useRef<HTMLTextAreaElement>(null),
    stick = useRef(true);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (stick.current && log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages, visible]);
  async function send() {
    const question = draft.trim();
    if (!question || pending.current) return;
    pending.current = true;
    stick.current = true;
    const id = crypto.randomUUID();
    controller.current = new AbortController();
    setDraft('');
    setMessages((items) => [...items, { id, question, answer: '', status: 'pending' }]);
    if (input.current) input.current.style.height = 'auto';
    try {
      const result = await api.request<{ answer: string; model?: { provider: string } }>(
        'admin/copilot/',
        'POST',
        { prompt: question, requestId: id },
        controller.current.signal,
      );
      setMessages((items) =>
        items.map((m) =>
          m.id === id
            ? { ...m, answer: result.answer, source: result.model?.provider, status: 'completed' }
            : m,
        ),
      );
    } catch (error) {
      if (!controller.current.signal.aborted)
        setMessages((items) =>
          items.map((m) =>
            m.id === id
              ? {
                  ...m,
                  answer:
                    error instanceof Error ? error.message : 'Could not complete the request.',
                  status: 'failed',
                }
              : m,
          ),
        );
    } finally {
      pending.current = false;
      input.current?.focus();
    }
  }
  const busy = messages.some((m) => m.status === 'pending');
  return (
    <div className="copilot-layout" hidden={!visible}>
      <section className="copilot-thread" aria-label="Admin conversation">
        <header className="copilot-thread-header">
          <div>
            <strong>Operations assistant</strong>
            <span>Read-only access to portal metrics</span>
          </div>
          <span className="admin-badge">{model || 'Model not reported'}</span>
        </header>
        <div
          className="copilot-log"
          role="log"
          aria-live="polite"
          ref={log}
          onScroll={(e) => {
            const el = e.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          }}
        >
          {!messages.length && (
            <div className="copilot-welcome">
              <div className="assistant-mark" aria-hidden="true">
                K
              </div>
              <h2>What would you like to check?</h2>
              <p>Review job collection, search demand and recommendation health.</p>
              <div className="copilot-prompts">
                {[
                  'Is job collection healthy?',
                  'Which searches need attention?',
                  'Summarize Careers chat activity.',
                ].map((text) => (
                  <button
                    className="secondary"
                    key={text}
                    onClick={() => {
                      setDraft(text);
                      input.current?.focus();
                    }}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((message) => (
            <div className="copilot-exchange" key={message.id}>
              <div className="copilot-message user-message">
                <span>You</span>
                <p>{message.question}</p>
              </div>
              <div className="copilot-message assistant-message">
                <span>
                  {message.source === 'portal' ? 'Portal metrics' : 'Operations assistant'}
                </span>
                {message.status === 'pending' ? (
                  <p role="status" className="copilot-pending">
                    Reviewing portal activity…
                  </p>
                ) : (
                  <div
                    className="portal-answer"
                    role={message.status === 'failed' ? 'alert' : undefined}
                  >
                    <AssistantText text={message.answer} />
                  </div>
                )}
                {message.status === 'failed' && (
                  <button
                    className="table-link"
                    onClick={() => {
                      setDraft(message.question);
                      input.current?.focus();
                    }}
                  >
                    Restore question to retry
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <form
          className="copilot-composer"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <label className="sr-only" htmlFor="admin-question">
            Ask the admin agent
          </label>
          <textarea
            id="admin-question"
            ref={input}
            rows={2}
            maxLength={2000}
            value={draft}
            placeholder="Ask about your portal…"
            onChange={(e) => {
              setDraft(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <div>
            <span>Enter to send · Shift+Enter for a new line</span>
            <button type="submit" disabled={busy || !draft.trim()}>
              {busy ? 'Working…' : 'Send'}
            </button>
          </div>
        </form>
      </section>
      <aside className="copilot-context">
        <h2>Available context</h2>
        <dl>
          <dt>Collected jobs</dt>
          <dd>{jobs?.toLocaleString() ?? '—'}</dd>
          <dt>Careers users</dt>
          <dd>{users?.toLocaleString() ?? '—'}</dd>
        </dl>
        <h3>What you can ask</h3>
        <ul>
          <li>Collection outcomes and failures</li>
          <li>Search demand and agent decisions</li>
          <li>Recommendation service activity</li>
        </ul>
        <p>
          The assistant explains current metrics. Use the search controls to change collection
          settings.
        </p>
      </aside>
    </div>
  );
}
