import { AgentProposal } from './AgentProposal.web';
import {
  ChatHistory,
  ChatHistoryStyles,
  useChatHistory,
  type ChatMessage,
} from './ChatHistory.web';
import { AssistantText } from './AssistantText.web';
import { useEffect, useRef, useState } from 'react';
import { LiveOperations } from './LiveOperations.web';
import type { SpacesClient } from './liveApi';

export function AdminCopilot({
  api,
  visible,
  model,
}: {
  api: SpacesClient;
  visible: boolean;
  model?: string;
  jobs?: number;
  users?: number;
}) {
  const [draft, setDraft] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const pending = useRef(false),
    controller = useRef<AbortController | null>(null);
  const log = useRef<HTMLDivElement>(null),
    input = useRef<HTMLTextAreaElement>(null),
    stick = useRef(true);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (stick.current && log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages, visible]);
  const [panel, setPanel] = useState<'context' | 'history'>('context');
  const history = useChatHistory({
    api,
    path: 'admin/copilot/history/',
    scope: 'admin',
    setMessages,
    waiting: messages.some((m) => m.status === 'pending') && !pending.current,
  });
  const newChat = () => {
    if (pending.current || history.loading) return;
    history.reset();
    setDraft('');
  };
  async function send() {
    const question = draft.trim();
    if (
      !question ||
      pending.current ||
      actionBusy ||
      history.loading ||
      messages.some((m) => m.status === 'pending')
    )
      return;
    const id = crypto.randomUUID();
    pending.current = true;
    stick.current = true;
    controller.current = new AbortController();
    setDraft('');
    setMessages((items) => [...items, { id, question, answer: '', status: 'pending' }]);
    if (input.current) input.current.style.height = 'auto';
    try {
      const result = await api.request<{
        answer: string;
        conversationId?: string;
        action?: ChatMessage['action'];
        model?: { provider: string };
      }>(
        'admin/copilot/',
        'POST',
        {
          prompt: question,
          requestId: id,
          conversationId: history.active?.id,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        controller.current.signal,
      );
      if (controller.current.signal.aborted) return;
      history.recorded(result.conversationId, question);
      setMessages((items) =>
        items.map((m) =>
          m.id === id
            ? {
                ...m,
                answer: result.answer,
                action: result.action,
                source: result.model?.provider,
                status: 'completed',
              }
            : m,
        ),
      );
    } catch (error) {
      if (controller.current.signal.aborted) return;
      history.failed(error, question);
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
  const busy = actionBusy || history.loading || messages.some((m) => m.status === 'pending');
  return (
    <div className="copilot-layout" hidden={!visible}>
      <ChatHistoryStyles />
      <section className="copilot-thread" aria-label="Admin conversation">
        <header className="copilot-thread-header">
          <div>
            <strong>Operations assistant</strong>
            <span>Platform visibility · Changes require confirmation</span>
          </div>
          <div className="chat-header-actions">
            <button
              type="button"
              aria-pressed={panel === 'context'}
              onClick={() => setPanel('context')}
            >
              Live operations
            </button>
            <button
              type="button"
              aria-pressed={panel === 'history'}
              onClick={() => setPanel('history')}
            >
              Chat history
            </button>
            <button type="button" disabled={busy} onClick={newChat}>
              New chat
            </button>
          </div>
        </header>
        <div className="chat-history-status" aria-live="polite">
          {history.loading ? 'Opening chat…' : history.active?.title}
        </div>
        {history.error && <p role="alert">{history.error}</p>}
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
          {history.nextOffset !== null && (
            <button disabled={busy} onClick={() => void history.open(history.active!.id, true)}>
              Load older messages
            </button>
          )}
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
              <div
                className="copilot-message user-message chat-user-bubble"
                role="group"
                aria-label="Your message"
              >
                <p>{message.question}</p>
              </div>
              <div
                className="copilot-message assistant-message chat-agent-reply"
                role="group"
                aria-label="Agent response"
              >
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
                {message.action && (
                  <AgentProposal
                    api={api}
                    action={message.action}
                    disabled={busy}
                    busyChanged={setActionBusy}
                    changed={(status) =>
                      setMessages((items) =>
                        items.map((item) =>
                          item.id === message.id && item.action
                            ? { ...item, action: { ...item.action, status } }
                            : item,
                        ),
                      )
                    }
                  />
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
            rows={1}
            readOnly={busy}
            aria-busy={busy}
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
      {panel === 'history' ? (
        <ChatHistory
          api={api}
          path="admin/copilot/history/"
          activeId={history.active?.id}
          disabled={busy}
          version={history.version}
          onOpen={(id) => {
            setDraft('');
            void history.open(id);
          }}
          onRename={history.renamed}
          onDelete={history.deleted}
        />
      ) : (
        <LiveOperations api={api} visible={visible} />
      )}
    </div>
  );
}
