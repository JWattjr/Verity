export const MARKET_CREATION_FEE_USDC = 1;
export const TRADING_FEE_BPS = 200;

export function formatTradingFee(bps = TRADING_FEE_BPS) {
  return `${(bps / 100).toFixed(1)}%`;
}
