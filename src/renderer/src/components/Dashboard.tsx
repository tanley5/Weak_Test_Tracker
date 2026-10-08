import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DashboardData } from '../../../shared/api'
import { accuracyColor } from '../../../shared/stats'
import { formatPct } from '../lib/format'

type Props = {
  onBack: () => void
}

export function Dashboard({ onBack }: Props) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [domainFilter, setDomainFilter] = useState<string>('')

  useEffect(() => {
    void window.weakTracker.getDashboard(domainFilter || undefined).then(setData)
  }, [domainFilter])

  const missChart = useMemo(() => {
    if (!data) return []
    return [
      { name: "Didn't know", value: data.missReasons.didnt_know },
      { name: 'Misread', value: data.missReasons.misread },
      { name: 'Blanked', value: data.missReasons.blanked },
    ]
  }, [data])

  if (!data) {
    return (
      <div className="app-shell">
        <button type="button" className="back-link" onClick={onBack}>
          ← Home
        </button>
        Loading dashboard…
      </div>
    )
  }

  return (
    <div className="app-shell">
      <button type="button" className="back-link" onClick={onBack}>
        ← Home
      </button>
      <h1 className="brand">Dashboard</h1>
      <p className="lede">Domain accuracy from widget attempts and batch sessions combined.</p>

      <section className="panel" style={{ marginBottom: 16 }}>
        <h2>Needs drilling</h2>
        {data.needsDrilling.length === 0 ? (
          <p className="lede">No data yet — log a batch or a few questions.</p>
        ) : (
          <ol className="drill-list">
            {data.needsDrilling.map((d, i) => (
              <li key={d.domain}>
                <span>
                  {i + 1}. {d.domain}
                </span>
                <strong>{formatPct(d.accuracy)}</strong>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <h2>Domain heatmap</h2>
        <div className="heatmap">
          {data.domains.map((d) => (
            <div key={d.domain} className={`heat-cell ${accuracyColor(d.accuracy)}`}>
              <div>{d.domain}</div>
              <div className="pct">{formatPct(d.accuracy)}</div>
              <div style={{ opacity: 0.75, fontSize: '0.85rem' }}>
                {d.correct}/{d.total}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <h2>Weekly accuracy</h2>
        <div className="toolbar">
          <div className="field">
            <label htmlFor="trend-domain">Domain</label>
            <select
              id="trend-domain"
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
            >
              <option value="">Overall</option>
              {data.domains.map((d) => (
                <option key={d.domain} value={d.domain}>
                  {d.domain}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.weekly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c3a4a" />
              <XAxis dataKey="weekStart" stroke="#9aabbc" />
              <YAxis
                domain={[0, 1]}
                tickFormatter={(v) => `${Math.round(Number(v) * 100)}%`}
                stroke="#9aabbc"
              />
              <Tooltip
                formatter={(value: number) => formatPct(value)}
                contentStyle={{ background: '#1a222c', border: '1px solid #2c3a4a' }}
              />
              <Line type="monotone" dataKey="accuracy" stroke="#3d9a7a" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <h2>Miss reasons</h2>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={missChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c3a4a" />
              <XAxis dataKey="name" stroke="#9aabbc" />
              <YAxis allowDecimals={false} stroke="#9aabbc" />
              <Tooltip contentStyle={{ background: '#1a222c', border: '1px solid #2c3a4a' }} />
              <Bar dataKey="value" fill="#c9a227" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
