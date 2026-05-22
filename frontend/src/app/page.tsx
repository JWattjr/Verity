import FeedShell from "@/components/feed/FeedShell";
import ThemeToggle from "@/components/layout/ThemeToggle";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header (Mobile Only) */}
      <div className="verity-card sticky top-0 z-20 mx-2 mt-3 flex items-center justify-between p-4 sm:hidden">
        <div className="flex items-center">
          <div className="verity-blob flex h-8 w-8 items-center justify-center bg-sunburst-yellow text-sm font-semibold text-midnight">
            V
            <span className="verity-blob-smile scale-75" />
          </div>
          <span className="ml-3 text-lg font-semibold tracking-[-0.25px] text-charcoal-primary">Verity</span>
        </div>
        <ThemeToggle />
      </div>

      <FeedShell />
    </div>
  );
}
