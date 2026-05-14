"use client";

import Link from "next/link";
import MarketCard from "@/components/post/MarketCard";
import { useFeed } from "@/hooks/useFeed";
import { useUsdcTransfer } from "@/hooks/useUsdcTransfer";
import { useWalletProfile } from "@/hooks/useWalletProfile";
import { calculateGrossUsdc, calculateTradingFee } from "@/lib/fees";
import {
  addComment,
  castFreeVote,
  castUsdcVote,
  displayHandle,
  displayName,
  relativeTime,
  toggleReshare,
  type FeedPost,
  type MarketPost,
  type VoteSide,
} from "@/lib/verity";
import { useState } from "react";

interface MarketDetailProps {
  marketId: string;
}

export default function MarketDetail({ marketId }: MarketDetailProps) {
  const { profile } = useWalletProfile();
  const { transferToTreasury } = useUsdcTransfer();
  const { items, loading, error, reload } = useFeed(profile?.id, true);
  const [actionError, setActionError] = useState<string | null>(null);
  const item = items.find((feedItem) => feedItem.market?.id === marketId);

  async function runAction(action: () => Promise<void>) {
    if (!profile) {
      setActionError("Connect your wallet before taking that action.");
      return;
    }

    setActionError(null);

    try {
      await action();
      await reload();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Action failed.");
    }
  }

  async function commentOn(post: FeedPost) {
    const content = window.prompt("Add a comment");
    if (!content) return;
    await runAction(() => addComment(post.id, profile!.id, content));
  }

  async function sharePost(post: FeedPost) {
    const text = post.market?.question || post.content;
    const url = `${window.location.origin}/markets/${marketId}`;

    if (navigator.share) {
      await navigator.share({ title: "Verity", text, url });
      return;
    }

    await navigator.clipboard.writeText(`${text}\n${url}`);
  }

  async function backMarketWithUsdc(market: MarketPost, side: VoteSide, amount: number) {
    await runAction(async () => {
      const feeAmount = calculateTradingFee(amount, market.trading_fee_bps);
      const grossAmount = calculateGrossUsdc(amount, market.trading_fee_bps);
      const payment = await transferToTreasury(grossAmount);

      await castUsdcVote({
        market,
        profileId: profile!.id,
        side,
        amount,
        feeAmount,
        grossAmount,
        txHash: payment.hash,
      });
    });
  }

  if (loading) {
    return (
      <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm font-medium text-[var(--muted)] shadow-sm">
        Loading market...
      </div>
    );
  }

  if (error || actionError) {
    return (
      <div className="rounded-[18px] border border-downvote/30 bg-downvote/10 p-4 text-sm font-medium text-[var(--foreground)]">
        {actionError || error}
      </div>
    );
  }

  if (!item?.market) {
    return (
      <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm font-medium text-[var(--muted)] shadow-sm">
        Market not found.{" "}
        <Link className="font-bold text-[var(--foreground)] underline" href="/markets">
          View markets
        </Link>
      </div>
    );
  }

  const market = item.market;
  const yesPercent = calculateYesPercent(market);

  return (
    <MarketCard
      category={market.category}
      comments={item.commentsCount}
      deadline={new Date(market.deadline).toLocaleString()}
      freeNoVotes={market.free_no_votes}
      freeYesVotes={market.free_yes_votes}
      handle={displayHandle(item.author)}
      marketCreationFeeUsdc={market.market_creation_fee_usdc}
      name={displayName(item.author)}
      noCondition={market.no_condition}
      onComment={() => commentOn(item)}
      onReshare={() => runAction(() => toggleReshare(item.id, profile!.id, item.viewerReshared))}
      onShare={() => sharePost(item)}
      onUsdcVote={(side, amount) => backMarketWithUsdc(market, side, amount)}
      onVote={(side) => runAction(() => castFreeVote(market, profile!.id, side))}
      postContent={item.content}
      question={market.question}
      resolutionSource={market.resolution_source}
      reshares={item.resharesCount}
      reshared={item.viewerReshared}
      status={market.status}
      time={relativeTime(item.created_at)}
      tradingFeeBps={market.trading_fee_bps}
      usdcNo={Number(market.usdc_no_amount)}
      usdcYes={Number(market.usdc_yes_amount)}
      variant="detail"
      viewerVote={item.viewerVote}
      yesCondition={market.yes_condition}
      yesPercent={yesPercent}
    />
  );
}

function calculateYesPercent(market: MarketPost) {
  const totalVotes = market.free_yes_votes + market.free_no_votes;
  if (totalVotes > 0) return (market.free_yes_votes / totalVotes) * 100;

  const yes = Number(market.usdc_yes_amount);
  const no = Number(market.usdc_no_amount);
  const totalUsdc = yes + no;
  if (totalUsdc > 0) return (yes / totalUsdc) * 100;

  return 50;
}
