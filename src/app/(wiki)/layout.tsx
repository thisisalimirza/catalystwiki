import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import SearchModal from '@/components/SearchModal';
import { TocProvider } from '@/components/TocContext';
import { getNavTree, getSearchIndex, getRecentChanges } from '@/lib/content';

export default function WikiLayout({ children }: { children: React.ReactNode }) {
  const tree = getNavTree();
  const searchIndex = getSearchIndex();
  const recentChanges = getRecentChanges(5);
  return (
    <TocProvider>
      <div className="min-h-screen flex flex-col md:flex-row bg-white">
        <Sidebar tree={tree} recentChanges={recentChanges} />
        <MobileNav tree={tree} />
        <SearchModal searchIndex={searchIndex} />
        {children}
      </div>
    </TocProvider>
  );
}
