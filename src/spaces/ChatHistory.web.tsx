import { useCallback, useEffect, useRef, useState } from 'react';
import { SpacesHttpError, type SpacesClient } from './liveApi';

export type ChatMessage = {
  id: string;
  question: string;
  answer: string;
  status: 'pending' | 'completed' | 'failed';
  action?: {
    id: string;
    type: string;
    target: string;
    data: Record<string, unknown>;
    status: string;
    expiresAt: string;
  };
};
export type ChatConversation = {
  id: string;
  title: string;
  jobId: string | null;
  jobTitle: string;
  jobUnavailable?: boolean;
  updatedAt: string;
};
type Detail = { conversation: ChatConversation; results: ChatMessage[]; nextOffset: number | null };
type HistoryPage = { results: ChatConversation[]; count: number; nextOffset: number | null };
const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Could not load chat history.';

export function useChatHistory({
  api,
  path,
  scope,
  setMessages,
  onOpen,
  waiting,
}: {
  api: SpacesClient;
  path: string;
  scope: string;
  setMessages: (messages: ChatMessage[] | ((items: ChatMessage[]) => ChatMessage[])) => void;
  onOpen?: (chat: ChatConversation) => void;
  waiting: boolean;
}) {
  const [active, setActive] = useState<ChatConversation | null>(null);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const callbacks = useRef({ setMessages, onOpen });
  callbacks.current = { setMessages, onOpen };
  const reset = useCallback(() => {
    generation.current++;
    request.current?.abort();
    setActive(null);
    setNextOffset(null);
    setLoading(false);
    setError('');
    callbacks.current.setMessages([]);
  }, []);
  useEffect(() => {
    reset();
    return () => {
      generation.current++;
      request.current?.abort();
    };
  }, [scope, reset]);
  const open = useCallback(
    async (id: string, older = false, poll = false) => {
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      const epoch = ++generation.current;
      if (!poll) setLoading(true);
      setError('');
      try {
        const data = await api.request<Detail>(
          `${path}${id}/${older ? `?offset=${nextOffset}` : ''}`,
          'GET',
          undefined,
          controller.signal,
        );
        if (controller.signal.aborted || epoch !== generation.current) return;
        setActive(data.conversation);
        if (!poll) setNextOffset(data.nextOffset);
        if (older)
          callbacks.current.setMessages((items) => [
            ...data.results,
            ...items.filter((item) => !data.results.some((old) => old.id === item.id)),
          ]);
        else if (poll)
          callbacks.current.setMessages((items) => [
            ...items.filter((item) => !data.results.some((fresh) => fresh.id === item.id)),
            ...data.results,
          ]);
        else {
          callbacks.current.setMessages(data.results);
          callbacks.current.onOpen?.(data.conversation);
        }
      } catch (failure) {
        if (!controller.signal.aborted && epoch === generation.current) setError(message(failure));
      } finally {
        if (epoch === generation.current) setLoading(false);
      }
    },
    [api, path, nextOffset],
  );
  useEffect(() => {
    if (!waiting || !active) return;
    const timer = setTimeout(() => {
      void open(active.id, false, true);
    }, 4000);
    return () => clearTimeout(timer);
  }, [waiting, active, open, error]);
  function recorded(id: string | undefined, question: string, jobId: string | null = null) {
    if (id)
      setActive((previous) =>
        previous?.id === id
          ? previous
          : {
              id,
              title: question.slice(0, 100),
              jobId,
              jobTitle: '',
              updatedAt: new Date().toISOString(),
            },
      );
    setVersion((value) => value + 1);
  }
  function failed(failure: unknown, question: string, jobId: string | null = null) {
    if (failure instanceof SpacesHttpError && typeof failure.details?.conversationId === 'string')
      recorded(failure.details.conversationId, question, jobId);
    else setVersion((value) => value + 1);
  }
  return {
    active,
    loading,
    error,
    version,
    nextOffset,
    open,
    reset,
    recorded,
    failed,
    isCurrent: () => scope === currentScope.current,
    renamed: (chat: ChatConversation) => {
      if (active?.id === chat.id) setActive(chat);
    },
    deleted: (id: string) => {
      if (active?.id === id) reset();
      setVersion((value) => value + 1);
    },
  };
}

export function ChatHistory({
  api,
  path,
  activeId,
  disabled,
  version,
  onOpen,
  onRename,
  onDelete,
}: {
  api: SpacesClient;
  path: string;
  activeId?: string;
  disabled: boolean;
  version: number;
  onOpen: (id: string) => void;
  onRename: (chat: ChatConversation) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState(''),
    [query, setQuery] = useState('');
  const [page, setPage] = useState<HistoryPage>({ results: [], count: 0, nextOffset: null });
  const [offset, setOffset] = useState(0),
    [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState('');
  const [editing, setEditing] = useState(''),
    [title, setTitle] = useState(''),
    [deleting, setDeleting] = useState('');
  const mutation = useRef<AbortController | null>(null);
  useEffect(() => () => mutation.current?.abort(), []);
  useEffect(() => {
    setOffset(0);
  }, [version]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api
      .request<HistoryPage>(
        `${path}?q=${encodeURIComponent(query)}&offset=${offset}`,
        'GET',
        undefined,
        controller.signal,
      )
      .then((data) => {
        if (!controller.signal.aborted)
          setPage((previous) =>
            offset
              ? {
                  ...data,
                  results: [
                    ...previous.results,
                    ...data.results.filter(
                      (row) => !previous.results.some((old) => old.id === row.id),
                    ),
                  ],
                }
              : data,
          );
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(message(failure));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [api, path, query, offset, reload, version]);
  async function change(id: string, remove: boolean) {
    if (saving || disabled) return;
    const controller = new AbortController();
    mutation.current = controller;
    setSaving(true);
    setError('');
    try {
      const result = await api.request<ChatConversation>(
        `${path}${id}/`,
        remove ? 'DELETE' : 'PATCH',
        remove ? undefined : { title: title.trim() },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      if (remove) {
        onDelete(id);
        setDeleting('');
      } else {
        onRename(result);
        setEditing('');
      }
      setOffset(0);
      setReload((value) => value + 1);
    } catch (failure) {
      if (!controller.signal.aborted) setError(message(failure));
    } finally {
      if (!controller.signal.aborted) setSaving(false);
    }
  }
  return (
    <aside className="agent-history" aria-label="Chat history">
      <style>{historyStyles}</style>
      <header>
        <h2>Chat history</h2>
        <p>Your saved conversations</p>
      </header>
      <form
        className="history-search"
        onSubmit={(event) => {
          event.preventDefault();
          setOffset(0);
          setQuery(draft.trim());
          setReload((value) => value + 1);
        }}
      >
        <input
          aria-label="Search chats"
          placeholder="Search chats…"
          value={draft}
          maxLength={200}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" aria-label="Search chat history" title="Search">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m16 16 5 5" />
          </svg>
        </button>
      </form>
      {error && (
        <p role="alert">
          {error} <button onClick={() => setReload((value) => value + 1)}>Retry</button>
        </p>
      )}
      <div className="history-list" aria-busy={loading}>
        {!loading && !page.results.length && (
          <p className="history-empty">
            {query
              ? 'No chats match your search.'
              : 'Your conversations will appear here after your first message.'}
          </p>
        )}
        {page.results.map((chat) => (
          <article key={chat.id} className={activeId === chat.id ? 'selected' : ''}>
            {editing === chat.id ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void change(chat.id, false);
                }}
              >
                <label>
                  Chat name
                  <input
                    autoFocus
                    aria-label="Chat name"
                    maxLength={160}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </label>
                <div className="history-actions">
                  <button disabled={saving || disabled || !title.trim()}>Save</button>
                  <button type="button" disabled={saving} onClick={() => setEditing('')}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <button
                  className="history-open"
                  disabled={disabled || saving}
                  aria-current={activeId === chat.id ? 'true' : undefined}
                  onClick={() => onOpen(chat.id)}
                >
                  <strong>{chat.title}</strong>
                  <small>
                    {chat.jobTitle || 'Conversation'} ·{' '}
                    {new Date(chat.updatedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </small>
                </button>
                <div className="history-actions">
                  <button
                    disabled={disabled || saving}
                    aria-label={`Rename ${chat.title}`}
                    onClick={() => {
                      setEditing(chat.id);
                      setTitle(chat.title);
                      setDeleting('');
                    }}
                  >
                    Rename
                  </button>
                  <button
                    disabled={disabled || saving}
                    aria-label={`Delete ${chat.title}`}
                    onClick={() => {
                      setDeleting(chat.id);
                      setEditing('');
                    }}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
            {deleting === chat.id && (
              <div className="history-confirm" role="group" aria-label="Confirm chat deletion">
                <p>
                  Delete this chat? It will be removed from your history. Completed action records
                  remain in the activity log.
                </p>
                <button disabled={disabled || saving} onClick={() => void change(chat.id, true)}>
                  Delete chat
                </button>
                <button disabled={saving} onClick={() => setDeleting('')}>
                  Cancel
                </button>
              </div>
            )}
          </article>
        ))}
        {loading && <p role="status">Loading chats…</p>}
        {page.nextOffset !== null && (
          <button disabled={loading} onClick={() => setOffset(page.nextOffset!)}>
            Load more chats
          </button>
        )}
      </div>
    </aside>
  );
}
export function ChatHistoryStyles() {
  return <style>{historyStyles}</style>;
}
const historyStyles = `
.agent-history{background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px;min-width:0;display:flex;flex-direction:column;gap:14px;max-height:100%;overflow:hidden;box-sizing:border-box}
.agent-history h2{font-size:16px;margin:0}.agent-history header p{font-size:12px;color:var(--muted);margin:4px 0 0}
.history-search{display:flex;gap:6px}.history-search input{min-width:0;width:100%}.history-search button{padding:8px;display:grid;place-items:center}
.history-list{overflow-y:auto;min-height:0;flex:1}.history-list article{padding:10px;border-radius:8px;margin-bottom:6px;border:1px solid transparent}.history-list article.selected{background:var(--wash,#edf2f8);border-color:var(--line)}
.history-open{display:block;width:100%;text-align:left;background:transparent!important;border:0!important;padding:0!important;color:inherit!important}.history-open strong{display:block;overflow-wrap:anywhere;font-size:13px;font-weight:600}.history-open small{display:block;color:var(--muted);font-size:11px;margin-top:5px}
.history-actions{display:flex;gap:12px;margin-top:9px}.history-actions button{font-size:11px;padding:2px 0;background:none;border:0;color:var(--accent,#2b5483)}
.history-confirm{font-size:12px;margin-top:10px}.history-confirm button{margin:8px 6px 0 0}.history-list label{display:grid;gap:6px}.history-list input{width:100%;min-width:0}.history-empty{font-size:13px;color:var(--muted);line-height:1.6}
.chat-header-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.chat-header-actions button{font-size:12px;white-space:nowrap}.chat-history-status{padding:8px 16px;font-size:12px}.chat-history-status:empty{display:none}
@media(max-width:900px){.agent-history{max-height:420px;min-height:260px}}
`;
