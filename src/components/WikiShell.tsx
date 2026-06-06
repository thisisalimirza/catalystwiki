'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Icons from '@tabler/icons-react';
import Editor, { type EditorMode } from './Editor';
import { type TocItem } from './TocPanel';
import FloatingAI from './FloatingAI';

const DEPLOY_SECONDS = 90;

function DeployToast({ onDismiss }: { onDismiss: () => void }) {
  const [remaining, setRemaining] = useState(DEPLOY_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, []);

  const done = remaining === 0;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const countdown = `${mins}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border border-hairline bg-white text-[13px] max-w-xs">
      {done ? (
        <>
          <Icons.IconCircleCheck size={16} stroke={1.75} className="text-emerald-500 shrink-0" />
          <span className="text-ink font-medium">Live! Refresh to see your changes.</span>
          <button
            onClick={() => window.location.reload()}
            className="ml-1 px-2.5 py-1 rounded-md bg-brand text-white text-[12px] font-medium hover:bg-brand-600 shrink-0"
          >
            Refresh
          </button>
        </>
      ) : (
        <>
          <Icons.IconLoader2 size={16} stroke={1.75} className="text-brand shrink-0 animate-spin" />
          <span className="text-muted">Deploying changes…</span>
          <span className="font-mono font-medium text-ink tabular-nums">{countdown}</span>
        </>
      )}
      <button
        onClick={onDismiss}
        className="ml-auto p-0.5 rounded hover:bg-black/[0.06] text-muted shrink-0"
        aria-label="Dismiss"
      >
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
  const [deployToastKey, setDeployToastKey] = useState<number | null>(null);

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
          onCommit={() => setDeployToastKey(Date.now())}
          initialPages={pages}
        />
      )}
      {deployToastKey !== null && (
        <DeployToast key={deployToastKey} onDismiss={() => setDeployToastKey(null)} />
      )}
      <FloatingAI currentPath={path} />
    </div>
  );
}
