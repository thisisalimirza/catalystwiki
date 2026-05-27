'use client';

import { useCallback, useEffect, useState } from 'react';
import * as Icons from '@tabler/icons-react';
import Editor, { type EditorMode } from './Editor';
import { type TocItem } from './TocPanel';
import FloatingAI from './FloatingAI';

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
      <p className="text-[10.5px] font-semibold tracking-[0.08em] uppercase text-muted mb-3">
        On this page
      </p>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => (
          <li key={item.id} style={{ paddingLeft: (item.level - 2) * 10 }}>
            <a
              href={`#${item.id}`}
              className={[
                'block text-[12px] leading-snug py-0.5 transition-colors',
                active === item.id
                  ? 'text-brand font-medium'
                  : 'text-muted hover:text-ink',
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
  const openNew = useCallback(() => {
    setEditorMode({ kind: 'new' });
  }, []);
  const openManage = useCallback(() => {
    setEditorMode({ kind: 'manage' });
  }, []);
  const openImport = useCallback(() => {
    setEditorMode({ kind: 'import' });
  }, []);

  return (
    <div className="flex-1 min-w-0 relative">
      {/* 3-column layout: [left TOC] [content] [right balance] */}
      <div className="flex justify-center min-h-full">

        {/* Left margin TOC — sits in the natural whitespace between sidebar and content */}
        <div className="hidden xl:block w-[200px] shrink-0">
          <div className="sticky top-0 h-screen overflow-y-auto pt-8 pb-8 pl-6 pr-5">
            <MarginToc items={toc} />
          </div>
        </div>

        {/* Main content */}
        <main className="min-w-0 w-full max-w-[780px] px-6 md:px-10 py-8">
          {/* Page action buttons */}
          <div className="flex justify-end gap-2 mb-4 -mt-1">
            {path && (
              <button
                onClick={openEdit}
                className="flex items-center gap-1.5 h-7 px-3 rounded-md bg-brand text-white text-[12px] font-medium hover:bg-brand-600 transition-colors"
              >
                <Icons.IconPencil size={12} stroke={1.75} />
                Edit page
              </button>
            )}
            <button
              onClick={openNew}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-hairline text-[12px] font-medium hover:bg-black/[0.03] transition-colors"
            >
              <Icons.IconPlus size={12} stroke={1.75} />
              New
            </button>
            <button
              onClick={openImport}
              className="hidden sm:flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-hairline text-[12px] font-medium text-muted hover:bg-black/[0.03] transition-colors"
              title="Import MDX files"
            >
              <Icons.IconUpload size={12} stroke={1.75} />
            </button>
            <button
              onClick={openManage}
              className="hidden sm:flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-hairline text-[12px] font-medium text-muted hover:bg-black/[0.03] transition-colors"
              title="Manage pages"
            >
              <Icons.IconSettings size={12} stroke={1.75} />
            </button>
          </div>
          {children}
        </main>

        {/* Right balance spacer — mirrors left TOC width to keep content visually centered */}
        <div className="hidden xl:block w-[200px] shrink-0" />
      </div>

      {/* Overlays */}
      {editorMode && (
        <Editor
          mode={editorMode}
          onClose={() => setEditorMode(null)}
          initialPages={pages}
        />
      )}
      <FloatingAI currentPath={path} />
    </div>
  );
}
