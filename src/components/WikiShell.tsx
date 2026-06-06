'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Icons from '@tabler/icons-react';
import Editor, { type EditorMode } from './Editor';
import { type TocItem } from './TocPanel';
import FloatingAI from './FloatingAI';

const DEPLOY_SECONDS = 90;
const STORAGE_KEY = 'catalystwiki_deploy_toasts';
const MAX_AGE_MS = 15 * 60 * 1000; // discard toasts older than 15 min on restore

type ToastEntry = { id: number; summary: string; startTime: number };

function loadStoredToasts(): ToastEntry[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all: ToastEntry[] = JSON.parse(raw);
    return all.filter(t => Date.now() - t.startTime < MAX_AGE_MS);
  } catch { return []; }
}

function saveStoredToasts(toasts: ToastEntry[]) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toasts)); } catch { /* ignore */ }
}

function DeployToast({ entry, onDismiss }: { entry: ToastEntry; onDismiss: () => void }) {
  const elapsed = Math.floor((Date.now() - entry.startTime) / 1000);
  const [remaining, setRemaining] = useState(Math.max(0, DEPLOY_SECONDS - elapsed));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (remaining === 0) return;
    intervalRef.current = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) { clearInterval(intervalRef.current!); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const done = remaining === 0;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const countdown = `${mins}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="flex items-start gap-3 w-72 px-4 py-3 rounded-xl shadow-lg border border-hairline bg-white text-[13px]">
      <div className="shrink-0 mt-0.5">
        {done
          ? <Icons.IconCircleCheck size={16} stroke={1.75} className="text-emerald-500" />
          : <Icons.IconLoader2 size={16} stroke={1.75} className="text-brand animate-spin" />}
      </div>
      <div className="flex-1 min-w-0">
        {entry.summary && <p className="font-medium text-ink truncate mb-0.5">{entry.summary}</p>}
        {done ? (
          <p className="text-muted">
            Live!{' '}
            <button onClick={() => window.location.reload()} className="text-brand hover:underline font-medium">
              Refresh to see changes
            </button>
          </p>
        ) : (
          <p className="text-muted">
            Deploying… <span className="font-mono font-medium text-ink tabular-nums">{countdown}</span>
          </p>
        )}
      </div>
      <button onClick={onDismiss} className="shrink-0 p-0.5 rounded hover:bg-black/[0.06] text-muted mt-0.5" aria-label="Dismiss">
        <Icons.IconX size={13} stroke={1.75} />
      </button>
    </div>
  );
}

function MarginToc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    if (items.length === 0) return;
    setActive(items[0]?.id ?? null);
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -65% 0px', threshold: [0, 1] }
    );
    items.forEach((i) => {
      const el = document.getElementById(i.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav>
      <p className="text-[11px] font-medium text-muted mb-3">On this page</p>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              style={{ paddingLeft: 12 + (item.level - 2) * 12 }}
              className={[
                'block text-[12px] leading-snug py-[5px] border-l-2 transition-all duration-100',
                active === item.id
                  ? 'border-brand text-brand font-medium'
                  : 'border-transparent text-muted hover:text-ink hover:border-gray-300',
              ].join(' ')}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function WikiShell({
  path,
  toc,
  pages,
  children,
}: {
  path: string | null;
  toc: TocItem[];
  pages: Array<{ title: string; path: string; section: string; published?: boolean }>;
  children: React.ReactNode;
}) {
  const [editorMode, setEditorMode] = useState<EditorMode | null>(null);
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  // Restore any in-progress toasts from sessionStorage on mount (survives page navigation)
  useEffect(() => {
    setToasts(loadStoredToasts());
  }, []);

  const addToast = useCallback((summary: string) => {
    const entry: ToastEntry = { id: Date.now(), summary, startTime: Date.now() };
    setToasts(prev => {
      const next = [...prev, entry];
      saveStoredToasts(next);
      return next;
    });
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => {
      const next = prev.filter(t => t.id !== id);
      saveStoredToasts(next);
      return next;
    });
  }, []);

  useEffect(() => {
    function handle(e: Event) {
      const detail = (e as CustomEvent).detail as EditorMode | undefined;
      if (detail) setEditorMode(detail);
    }
    window.addEventListener('open-editor', handle as EventListener);
    return () => window.removeEventListener('open-editor', handle as EventListener);
  }, []);

  const openEdit = useCallback(() => {
    if (path) setEditorMode({ kind: 'edit', path });
  }, [path]);

  return (
    <div className="flex-1 min-w-0 relative">
      <div className="flex justify-center">

        {/* Left — sticky "On this page" TOC */}
        <div className="hidden xl:block w-[160px] shrink-0">
          <div className="sticky top-0 h-screen overflow-y-auto pt-8 pb-8 pl-6 pr-2">
            <MarginToc items={toc} />
          </div>
        </div>

        {/* Center — article content */}
        <main className="min-w-0 flex-1 max-w-[820px] px-8 md:px-12 py-8">
          {/* Edit page button — narrow screens only (wide screens: right column) */}
          {path && (
            <div className="xl:hidden flex justify-end mb-5">
              <button
                onClick={openEdit}
                className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-brand text-white text-[12px] font-medium hover:bg-brand-600 transition-colors"
              >
                <Icons.IconPencil size={13} stroke={1.75} />
                Edit page
              </button>
            </div>
          )}
          {children}
        </main>

        {/* Right — Edit page button on wide screens, aligned with the breadcrumb row */}
        <div className="hidden xl:flex w-[160px] shrink-0 pt-8 pl-5 pr-6">
          {path && (
            <button
              onClick={openEdit}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-brand text-white text-[12px] font-medium hover:bg-brand-600 transition-colors whitespace-nowrap"
            >
              <Icons.IconPencil size={13} stroke={1.75} />
              Edit page
            </button>
          )}
        </div>

      </div>

      {editorMode && (
        <Editor
          mode={editorMode}
          onClose={() => setEditorMode(null)}
          onCommit={addToast}
          initialPages={pages}
        />
      )}

      {/* Deploy toasts — stacked above the AI button (bottom-6), newest at bottom */}
      {toasts.length > 0 && (
        <div className="fixed bottom-20 right-5 z-50 flex flex-col gap-2 items-end pointer-events-none">
          {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto">
              <DeployToast entry={t} onDismiss={() => dismissToast(t.id)} />
            </div>
          ))}
        </div>
      )}
      <FloatingAI currentPath={path} />
    </div>
  );
}
