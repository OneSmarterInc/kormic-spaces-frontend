import { useCallback, useEffect, useRef, useState } from 'react';

export interface InboxMessage {
  id: string;
  text: string;
  time: string;
  author: string;
  ordinal?: number;
  unread?: boolean;
}
export interface ThreadSummary {
  id: string;
  messages: InboxMessage[];
  latest?: InboxMessage;
  unreadCount?: number;
  lastOrdinal?: number;
}
export interface ThreadPage<T> {
  results: T[];
  count: number;
  next: number | null;
  unreadCount: number;
  version: string;
  unchanged?: boolean;
}
export interface MessagePage {
  results: InboxMessage[];
  before: number | null;
  after: number;
  hasMore: boolean;
}
export interface InboxTransport<T> {
  threads(params: URLSearchParams): Promise<ThreadPage<T>>;
  messages(id: string, params: URLSearchParams): Promise<MessagePage>;
}

export function mergeMessages(previous: InboxMessage[], incoming: InboxMessage[]) {
  if (!incoming.length) return previous;
  const values = new Map(previous.map((message) => [message.id, message]));
  for (const message of incoming) values.set(message.id, message);
  return [...values.values()].sort(
    (a, b) =>
      (a.ordinal ?? 0) - (b.ordinal ?? 0) ||
      a.time.localeCompare(b.time) ||
      a.id.localeCompare(b.id),
  );
}

export function usePagedInbox<T extends ThreadSummary>(transport?: InboxTransport<T>) {
  const [threads, setThreads] = useState<T[]>([]);
  const [selected, setSelected] = useState<string>();
  const [query, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [next, setNext] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [olderBusy, setOlderBusy] = useState(false);
  const [before, setBefore] = useState<number | null>(null);
  const history = useRef(
    new Map<string, { messages: InboxMessage[]; before: number | null; after: number }>(),
  );
  const identity = useRef(transport);
  identity.current = transport;
  const selection = useRef(selected);
  selection.current = selected;
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const clear = useCallback(() => {
    history.current.clear();
    setThreads([]);
    setSelected(undefined);
    setUnread(0);
    setBefore(null);
  }, []);
  useEffect(() => {
    clear();
    setOffset(0);
    setSearch('');
  }, [transport, clear]);
  useEffect(() => {
    if (!transport || typeof document === 'undefined') {
      setLoading(false);
      return;
    }
    let active = true;
    let pending = false;
    let version = '';
    setLoading(true);
    setError('');
    const load = async () => {
      if (pending || document.hidden) return;
      pending = true;
      try {
        const params = new URLSearchParams({
          q: query,
          offset: String(offset),
          limit: '25',
          version,
        });
        const page = await transport.threads(params);
        if (!active) return;
        version = page.version;
        setCount(page.count);
        setNext(page.next);
        setUnread(page.unreadCount);
        if (!page.unchanged) {
          setThreads((previous) =>
            page.results.map((item) => {
              const cached = history.current.get(item.id);
              const value = { ...item, messages: cached?.messages ?? item.messages };
              const old = previous.find((thread) => thread.id === item.id);
              return old && JSON.stringify(old) === JSON.stringify(value) ? old : value;
            }),
          );
          if (selected && !page.results.some((thread) => thread.id === selected))
            setSelected(undefined);
        }
        if (selected && (page.unchanged || page.results.some((thread) => thread.id === selected))) {
          const old = history.current.get(selected);
          const result = await transport.messages(
            selected,
            new URLSearchParams(old?.after ? { after: String(old.after) } : {}),
          );
          if (!active) return;
          const messages = mergeMessages(old?.messages ?? [], result.results);
          const entry = { messages, before: old ? old.before : result.before, after: result.after };
          history.current.set(selected, entry);
          setBefore(entry.before);
          if (messages !== old?.messages)
            setThreads((current) =>
              current.map((thread) => (thread.id === selected ? { ...thread, messages } : thread)),
            );
        }
        setError('');
      } catch (failure) {
        if (active)
          setError(failure instanceof Error ? failure.message : 'Could not refresh messages.');
      } finally {
        pending = false;
        if (active) setLoading(false);
      }
    };
    void load();
    const timer = setInterval(() => void load(), 15000);
    window.addEventListener('focus', load);
    document.addEventListener('visibilitychange', load);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('focus', load);
      document.removeEventListener('visibilitychange', load);
    };
  }, [transport, selected, query, offset, revision]);
  const older = async () => {
    if (!transport || !selected || olderBusy) return;
    const old = history.current.get(selected);
    if (!old?.before) return;
    setOlderBusy(true);
    try {
      const result = await transport.messages(
        selected,
        new URLSearchParams({ before: String(old.before) }),
      );
      if (identity.current !== transport) return;
      const latest = history.current.get(selected) ?? old;
      const messages = mergeMessages(latest.messages, result.results);
      history.current.set(selected, { ...latest, messages, before: result.before });
      if (selection.current === selected) setBefore(result.before);
      setThreads((current) =>
        current.map((thread) => (thread.id === selected ? { ...thread, messages } : thread)),
      );
    } catch (failure) {
      if (identity.current === transport)
        setError(failure instanceof Error ? failure.message : 'Could not load older messages.');
    } finally {
      setOlderBusy(false);
    }
  };
  const markRead = useCallback(
    (ids: string[]) => {
      for (const [id, entry] of history.current)
        history.current.set(id, {
          ...entry,
          messages: entry.messages.map((message) =>
            ids.includes(message.id) ? { ...message, unread: false } : message,
          ),
        });
      setThreads((current) =>
        current.map((thread) => ({
          ...thread,
          messages: history.current.get(thread.id)?.messages ?? thread.messages,
        })),
      );
      refresh();
    },
    [refresh],
  );
  return {
    threads,
    selected,
    setSelected,
    query,
    setQuery: (value: string) => {
      setSearch(value);
      setOffset(0);
      setSelected(undefined);
    },
    count,
    offset,
    next,
    setOffset,
    unread,
    loading,
    error,
    refresh,
    clear,
    markRead,
    before,
    older,
    olderBusy,
  };
}
