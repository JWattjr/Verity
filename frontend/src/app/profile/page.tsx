import { Trophy } from "lucide-react";
import PagePanel from "@/components/layout/PagePanel";
import ProfileEditor from "@/components/profile/ProfileEditor";
import PortfolioPositions from "@/components/wallet/PortfolioPositions";

const STATS = [
  { label: "Accuracy", value: "0%" },
  { label: "Markets", value: "0" },
  { label: "Volume", value: "0" },
];

export default function ProfilePage() {
  return (
    <PagePanel
      description="Your public reputation, market history, and prediction performance."
      eyebrow="Profile"
      title="Profile"
    >
      <ProfileEditor />

      <section className="verity-card p-5">
        <div className="mt-5 grid grid-cols-3 gap-2">
          {STATS.map((stat) => (
            <div className="rounded-[12px] bg-parchment-card p-4 shadow-[var(--shadow-subtle)]" key={stat.label}>
              <p className="text-2xl font-semibold tracking-[-0.44px] text-midnight">{stat.value}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ash">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4">
        <PortfolioPositions />
      </section>

      <section className="verity-card p-5">
        <h2 className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-charcoal-primary">
          <Trophy className="h-4 w-4 text-sunburst-yellow" />
          Badge
        </h2>
        <p className="mt-3 text-sm tracking-[-0.18px] text-graphite">
          Top 10% predictor in AI/Tech markets this month.
        </p>
      </section>
    </PagePanel>
  );
}
