'use client';

import { useCallback, useEffect, useState } from 'react';
import * as Icons from '@tabler/icons-react';
import Editor, { type EditorMode } from './Editor';
import { type TocItem } from './TocPanel';
import { useTocContext } from './TocContext';
import FloatingAI from './FloatingAI';

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
  const { setTocItems } = useTocContext();

  // Register TOC items with the sidebar context whenever the page changes
  useEffect(() => {
    setTocItems(toc);
    return () => setTocItems([]);
  }, [toc, setTocItems]);

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
    <div className="flex-1 min-w-0 flex">
      <main className="flex-1 min-w-0 px-5 md:px-10 lg:px-14 py-8 max-w-[860px] mx-auto w-full">
        {/* Page action buttons — edit/new in the top-right of the content area */}
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
