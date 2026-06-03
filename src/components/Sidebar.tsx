'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import * as Icons from '@tabler/icons-react';
import type { NavGroup } from '@/lib/content';

type RecentChange = {
  title: string;
  path: string;
  section: string;
  sectionLabel: string;
  updatedAt: string;
  icon?: string;
};

function getIcon(name: string | undefined) {
  if (!name) return Icons.IconFolder;
  const key =
    'Icon' +
    name
      .split('-')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join('');
  const I = (Icons as unknown as Record<string, React.ComponentType<{ size?: number; stroke?: number }>>)[key];
  return I ?? Icons.IconFolder;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Sidebar({
  tree,
  recentChanges,
}: {
  tree: NavGroup[];
  recentChanges: RecentChange[];
}) {
  const pathname = usePathname();

  // Initialize all top-level sections as expanded
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const expanded = new Set<string>();
    tree.forEach(g => {
      if (g.depth === 0) expanded.add(g.section);
    });
    return expanded;
  });

  const [recentChangesExpanded, setRecentChangesExpanded] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Build tree structure for nested display
  const topLevelSections = tree.filter(g => g.depth === 0);

  function getChildSections(parentId: string): NavGroup[] {
    return tree.filter(g => g.parent === parentId);
  }

  function renderSection(group: NavGroup) {
    const isExpanded = expandedSections.has(group.section);
    const SectionIcon = getIcon(group.icon);
    const childSections = getChildSections(group.section);
    const hasChildren = childSections.length > 0 || group.pages.length > 0;
    const indentClass = group.depth > 0 ? `ml-${group.depth * 3}` : '';

    return (
      <div key={group.section} className={`mb-1 ${indentClass}`}>
        <button
          onClick={() => toggleSection(group.section)}
          className="w-full flex items-center gap-1.5 px-2 pt-2 pb-1.5 text-[11px] font-semibold tracking-[0.04em] uppercase text-muted hover:text-ink transition-colors"
        >
          <Icons.IconChevronRight
            size={12}
            stroke={2}
            className={`transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
          />
          <SectionIcon size={13} stroke={1.75} className="shrink-0" />
          <span className="truncate">{group.label}</span>
          <span className="ml-auto text-[10px] font-normal opacity-60">
            {group.pages.length}
          </span>
        </button>

        {isExpanded && hasChildren && (
          <div className="ml-3 border-l-2 border-gray-100 pl-1.5 mb-1">
            {/* Render child sections first */}
            {childSections.map(child => renderSection(child))}

            {/* Then render pages */}
            {group.pages.length > 0 && (
              <ul className="space-y-0.5">
                {group.pages.map((page) => {
                  const PageIcon = getIcon(page.icon);
                  const href = `/${page.path}`;
                  const active = pathname === href;
                  return (
                    <li key={page.path}>
                      <Link
                        href={href}
                        className={[
                          'flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px]',
                          active
                            ? 'bg-brand text-white'
                            : 'text-ink hover:bg-black/[0.04]',
                          page.published === false ? 'opacity-60 italic' : '',
                        ].join(' ')}
                      >
                        <PageIcon
                          size={14}
                          stroke={1.75}
                          className={active ? 'text-white' : 'text-muted'}
                        />
                        <span className="truncate">{page.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <aside className="hidden md:flex md:w-[240px] md:flex-col border-r border-hairline bg-sidebar h-screen sticky top-0">
      <div className="px-4 pt-5 pb-3">
        <Link href="/welcome/home" className="flex items-center gap-2.5 group">
          <Image
            src="/logo.png"
            alt="Catalyst"
            width={28}
            height={28}
            className="shrink-0"
          />
          <div className="leading-tight">
            <div className="font-semibold text-[14px] text-ink">Catalyst</div>
            <div className="text-[11px] text-muted">Fellow Wiki</div>
          </div>
        </Link>
      </div>

      {/* Search trigger */}
      <div className="px-3 pb-2">
        <button
          onClick={() => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[13px] text-muted bg-white border border-hairline rounded-md hover:border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <Icons.IconSearch size={14} stroke={1.75} />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* New page / admin actions */}
      <div className="px-3 pb-3 flex items-center gap-1.5">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-editor', { detail: { kind: 'new' } }))}
          className="flex-1 flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-brand/[0.08] text-brand text-[12px] font-medium hover:bg-brand/[0.14] transition-colors"
        >
          <Icons.IconPlus size={13} stroke={2} />
          New page
        </button>
        <button
          title="Import MDX files"
          onClick={() => window.dispatchEvent(new CustomEvent('open-editor', { detail: { kind: 'import' } }))}
          className="h-7 w-7 flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-black/[0.05] transition-colors"
        >
          <Icons.IconUpload size={14} stroke={1.75} />
        </button>
        <button
          title="Manage pages"
          onClick={() => window.dispatchEvent(new CustomEvent('open-editor', { detail: { kind: 'manage' } }))}
          className="h-7 w-7 flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-black/[0.05] transition-colors"
        >
          <Icons.IconSettings size={14} stroke={1.75} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-3">
        {topLevelSections.map(group => renderSection(group))}
      </nav>

      {/* Recent Changes */}
      {recentChanges.length > 0 && (
        <div className="border-t border-hairline px-3 pt-2 pb-2">
          <button
            onClick={() => setRecentChangesExpanded(prev => !prev)}
            className="w-full flex items-center gap-1.5 text-[10.5px] font-semibold tracking-[0.08em] uppercase text-muted hover:text-ink transition-colors py-1"
          >
            <Icons.IconChevronRight
              size={11}
              stroke={2}
              className={`transition-transform shrink-0 ${recentChangesExpanded ? 'rotate-90' : ''}`}
            />
            <Icons.IconHistory size={12} stroke={1.75} />
            Recent Changes
          </button>
          {recentChangesExpanded && (
            <ul className="space-y-1 mt-1">
              {recentChanges.slice(0, 3).map((change) => (
                <li key={change.path}>
                  <Link
                    href={`/${change.path}`}
                    className="block py-1 hover:bg-black/[0.03] rounded px-1 -mx-1"
                  >
                    <div className="text-[12px] text-ink truncate">{change.title}</div>
                    <div className="text-[10px] text-muted">{formatDate(change.updatedAt)}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="border-t border-hairline px-4 py-3 text-[11px] text-muted">
        <a
          href="https://catalyst.mdplus.community"
          target="_blank"
          rel="noreferrer"
          className="hover:text-brand"
        >
          catalyst.mdplus.community ↗
        </a>
      </div>
    </aside>
  );
}
