import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

export type PortfolioTokenRow = {
  id: string
  marketId: string
  question: string
  side: string
  shares: number
  avgPrice: number
  currentPrice: number
  stakedCost: number
  currentValue: number
  pnl: number
}

export default function PortfolioTokenTable({
  rows,
}: {
  rows: PortfolioTokenRow[]
}) {
  return (
    <div className="verity-token-table-wrap">
      <table className="verity-token-table">
        <thead>
          <tr>
            <th>Position</th>
            <th>Side</th>
            <th>Shares</th>
            <th>Avg price</th>
            <th>Current price</th>
            <th>Staked cost</th>
            <th>Current value</th>
            <th>P&amp;L</th>
            <th aria-label="Market link" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <strong>{row.question}</strong>
              </td>
              <td>
                <span className="verity-token-side">{row.side}</span>
              </td>
              <td>{formatNumber(row.shares)}</td>
              <td>${row.avgPrice.toFixed(2)}</td>
              <td>${row.currentPrice.toFixed(2)}</td>
              <td>${row.stakedCost.toFixed(2)}</td>
              <td>
                <strong>${row.currentValue.toFixed(2)}</strong>
              </td>
              <td>
                <strong className={row.pnl < 0 ? "is-negative" : "is-positive"}>
                  {row.pnl >= 0 ? "+" : ""}${row.pnl.toFixed(2)}
                </strong>
              </td>
              <td>
                <Link aria-label={`Open ${row.question}`} href={`/markets/${row.marketId}`}>
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatNumber(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })
}
