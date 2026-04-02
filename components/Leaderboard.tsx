'use client'

import { useEffect, useState } from 'react'
import { Trophy, Medal, TrendingUp, ChevronDown, ChevronUp, RefreshCw, BookOpen, X } from 'lucide-react'

interface AgentScore {
  rank: number
  email: string
  name: string
  team: string
  role: string
  points: number
  breakdown: Record<string, number>
  stats: {
    churn: { total: number; controlled: number; noReasonMailSent: number }
    visits: { completedBrands: number; nextMonthScheduled: number; hasLateMOM: boolean }
    demos: { total: number; converted: number; notConverted: number }
    engagementCalls: { done: number; total: number; allBefore16: boolean }
    escalations: { orange: number; red: number; kamResponsible: number }
  }
}

const BREAKDOWN_LABELS: Record<string, string> = {
  churn_controlled_penalty: 'Controlled churn > 10',
  churn_low_volume: 'Churn records < 30',
  churn_no_reason_penalty: 'No-reason mail sent > 3',
  visits_next_month_scheduled: '5+ visits scheduled next month',
  visits_brands_done: '7+ brands visited this month',
  visits_late_mom_penalty: 'MOM submitted late',
  demos_converted: 'Converted demos',
  demos_not_converted: 'Demos done (not converted)',
  demos_volume_bonus: '10+ demos this month',
  engagement_all_before_16: 'All calls done before 16th',
  escalation_orange_penalty: 'Orange escalations > 7',
  escalation_red_penalty: 'Red escalations',
  escalation_kam_responsible_penalty: 'KAM-responsible escalations',
}

const RULES = [
  {
    category: 'Churn',
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    rules: [
      { label: 'Less than 30 churn records this month', points: 5, positive: true },
      { label: 'More than 10 controlled churn records', points: -5, positive: false },
      { label: 'More than 3 records with mail sent but no reason filled', points: -2, positive: false },
    ],
  },
  {
    category: 'Visits',
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    rules: [
      { label: '5 or more visits scheduled for next month', points: 5, positive: true },
      { label: 'This month visits completed for 7+ unique brands', points: 10, positive: true },
      { label: 'Any MOM submitted more than 3 days after scheduled visit date', points: -3, positive: false },
    ],
  },
  {
    category: 'Demos',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    rules: [
      { label: 'Per converted demo this month', points: 3, positive: true },
      { label: 'Per demo completed (not converted) this month', points: 2, positive: true },
      { label: 'More than 10 demos completed this month (bonus)', points: 10, positive: true },
    ],
  },
  {
    category: 'Engagement Calls',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    rules: [
      { label: 'All brands called before the 16th of the month', points: 15, positive: true },
    ],
  },
  {
    category: 'Escalations',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    rules: [
      { label: 'More than 7 Orange escalations this month', points: -5, positive: false },
      { label: 'Per Red escalation this month', points: -2, positive: false },
      { label: 'Per escalation where responsible party is KAM', points: -3, positive: false },
    ],
  },
]

function RulebookModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold text-gray-800 text-lg">Points Rulebook</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4 space-y-4">
          <p className="text-xs text-gray-500">Points reset on the 1st of every month. Rankings update in real-time as data is filled.</p>
          {RULES.map((section) => (
            <div key={section.category} className={`rounded-xl border ${section.border} ${section.bg} p-4`}>
              <h4 className={`font-semibold text-sm mb-3 ${section.color}`}>{section.category}</h4>
              <div className="space-y-2">
                {section.rules.map((rule, i) => (
                  <div key={i} className="flex items-start justify-between gap-3">
                    <span className="text-xs text-gray-700 flex-1">{rule.label}</span>
                    <span className={`text-xs font-bold shrink-0 ${rule.positive ? 'text-green-600' : 'text-red-500'}`}>
                      {rule.positive ? `+${rule.points}` : rule.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RankBadge({ rank, tied }: { rank: number; tied?: boolean }) {
  if (rank === 1) return (
    <div className="flex flex-col items-center">
      <Trophy className="w-6 h-6 text-yellow-500" />
      {tied && <span className="text-[9px] text-yellow-600 font-semibold">tied</span>}
    </div>
  )
  if (rank === 2) return (
    <div className="flex flex-col items-center">
      <Medal className="w-6 h-6 text-gray-400" />
      {tied && <span className="text-[9px] text-gray-500 font-semibold">tied</span>}
    </div>
  )
  if (rank === 3) return (
    <div className="flex flex-col items-center">
      <Medal className="w-6 h-6 text-amber-600" />
      {tied && <span className="text-[9px] text-amber-700 font-semibold">tied</span>}
    </div>
  )
  return (
    <div className="flex flex-col items-center">
      <span className="text-sm font-bold text-gray-500 w-6 text-center">#{rank}</span>
      {tied && <span className="text-[9px] text-gray-400 font-semibold">tied</span>}
    </div>
  )
}
function AgentRow({ entry, currentUserEmail, tied }: { entry: AgentScore; currentUserEmail: string; tied: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const isMe = entry.email === currentUserEmail
  const positivePoints = Object.values(entry.breakdown).filter(v => v > 0).reduce((a, b) => a + b, 0)
  const negativePoints = Object.values(entry.breakdown).filter(v => v < 0).reduce((a, b) => a + b, 0)

  return (
    <div className={`rounded-xl border transition-all ${isMe ? 'border-blue-400 bg-blue-50/60' : 'border-gray-200 bg-white'}`}>
      <button
        className="w-full flex items-center gap-4 px-4 py-3 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-center w-8">
          <RankBadge rank={entry.rank} tied={tied} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-800 truncate">{entry.name || entry.email}</span>
            {isMe && <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">You</span>}
          </div>
          <span className="text-xs text-gray-500">{entry.team || '—'}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-lg font-bold text-gray-800">{entry.points} pts</div>
            <div className="flex gap-2 text-xs justify-end">
              {positivePoints > 0 && <span className="text-green-600">+{positivePoints}</span>}
              {negativePoints < 0 && <span className="text-red-500">{negativePoints}</span>}
            </div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 mt-1 pt-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 text-xs text-gray-600">
              <div>Churn: {entry.stats.churn.total} total, {entry.stats.churn.controlled} controlled</div>
              <div>Visits: {entry.stats.visits.completedBrands} brands done, {entry.stats.visits.nextMonthScheduled} next month</div>
              <div>Demos: {entry.stats.demos.converted} converted / {entry.stats.demos.total} total</div>
              <div>Eng. Calls: {entry.stats.engagementCalls.done}/{entry.stats.engagementCalls.total} brands</div>
              <div>Escalations: {entry.stats.escalations.red} red, {entry.stats.escalations.orange} orange</div>
            </div>
            <div className="space-y-1">
              {Object.entries(entry.breakdown).map(([key, val]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-gray-600 truncate mr-2">{BREAKDOWN_LABELS[key] || key}</span>
                  <span className={`font-semibold shrink-0 ${val > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {val > 0 ? `+${val}` : val}
                  </span>
                </div>
              ))}
              {Object.keys(entry.breakdown).length === 0 && (
                <span className="text-xs text-gray-400">No activity this month</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Team groupings
const TEAM_TABS = [
  { key: 'overall' as const, label: 'Overall', teams: null as string[] | null },
  { key: 'central-west' as const, label: 'Central-West', teams: ['Central-West Team'] as string[] },
  { key: 'north-east' as const, label: 'North-East', teams: ['North-East Team'] as string[] },
  { key: 'south' as const, label: 'South', teams: ['South_2 Team', 'South_1 Team'] as string[] },
]

type TabKey = 'overall' | 'central-west' | 'north-east' | 'south'

// Re-rank a filtered list using standard competition ranking
function rerank(entries: AgentScore[]): AgentScore[] {
  const sorted = [...entries].sort((a, b) => b.points - a.points)
  return sorted.map((entry, i, arr) => {
    const rank = i === 0 ? 1 : entry.points === arr[i - 1].points
      ? (arr[i - 1] as any)._rank
      : i + 1
    return { ...entry, rank, _rank: rank } as any
  }).map(({ _rank, ...e }: any) => e)
}

export default function Leaderboard({ currentUserEmail }: { currentUserEmail: string }) {
  const [data, setData] = useState<AgentScore[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [refreshing, setRefreshing] = useState(false)
  const [showRulebook, setShowRulebook] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('overall')

  const fetchData = async (m: string, bust = false) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/scorecard/leaderboard?month=${m}${bust ? '&bust=1' : ''}`)
      const json = await res.json()
      if (json.success) setData(json.data)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchData(month) }, [month])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData(month, true)
  }

  const myEntry = data.find(d => d.email === currentUserEmail)
  // build a set of points values that appear more than once
  const pointCounts = data.reduce<Record<number, number>>((acc, d) => {
    acc[d.points] = (acc[d.points] || 0) + 1; return acc;
  }, {})
  const isTied = (pts: number) => pointCounts[pts] > 1

  // Filter + re-rank for active tab
  const activeTabDef = TEAM_TABS.find(t => t.key === activeTab)!
  const displayData = activeTabDef.teams
    ? rerank(data.filter(d => activeTabDef.teams!.includes(d.team)))
    : data

  const displayPointCounts = displayData.reduce<Record<number, number>>((acc, d) => {
    acc[d.points] = (acc[d.points] || 0) + 1; return acc;
  }, {})
  const isDisplayTied = (pts: number) => displayPointCounts[pts] > 1
  const myDisplayEntry = displayData.find(d => d.email === currentUserEmail)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      {showRulebook && <RulebookModal onClose={() => setShowRulebook(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <h2 className="text-xl font-bold text-gray-800">Employee of the Month</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRulebook(true)}
            className="flex items-center gap-1.5 text-xs text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Rulebook
          </button>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Team tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
        {TEAM_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all ${
              activeTab === tab.key
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* My rank highlight */}
      {myDisplayEntry && !loading && (
        <div className="mb-4 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
          <TrendingUp className="w-4 h-4 text-blue-500 shrink-0" />
          <span className="text-sm text-blue-700">
            You are ranked <strong>#{myDisplayEntry.rank}</strong> with <strong>{myDisplayEntry.points} points</strong> this month
          </span>
        </div>
      )}

      {/* Top 3 podium — find first agent at each rank */}
      {!loading && displayData.length >= 1 && (() => {
        const rank1 = displayData.find(d => d.rank === 1)
        const rank2 = displayData.find(d => d.rank === 2)
        const rank3 = displayData.find(d => d.rank === 3)
        if (!rank1) return null
        const podium = [
          { entry: rank2, color: 'bg-gray-100 border-gray-200', height: 'h-28', label: '2nd', labelColor: 'text-gray-500 bg-gray-200' },
          { entry: rank1, color: 'bg-yellow-50 border-yellow-300', height: 'h-36', label: '1st', labelColor: 'text-yellow-700 bg-yellow-200' },
          { entry: rank3, color: 'bg-amber-50 border-amber-300', height: 'h-28', label: '3rd', labelColor: 'text-amber-700 bg-amber-200' },
        ]
        return (
          <div className="grid grid-cols-3 gap-3 mb-5">
            {podium.map(({ entry, color, height, label, labelColor }, i) => (
              <div key={i} className={`${color} border rounded-xl flex flex-col items-center justify-between pt-2 pb-3 px-2 ${height}`}>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${labelColor}`}>{label}</span>
                {entry ? (
                  <>
                    <RankBadge rank={entry.rank} tied={isDisplayTied(entry.points)} />
                    <div className="text-xs font-semibold text-gray-700 w-full text-center leading-tight break-words">
                      {entry.name?.split(' ')[0] || entry.email}
                    </div>
                    <div className="text-sm font-bold text-gray-800">{entry.points} pts</div>
                  </>
                ) : (
                  <div className="text-xs text-gray-400">—</div>
                )}
              </div>
            ))}
          </div>
        )
      })()}

      {/* Full list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : displayData.length === 0 ? (
        <div className="text-center py-10 text-gray-400">No agent data for this month</div>
      ) : (
        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {displayData.map(entry => (
            <AgentRow key={entry.email} entry={entry} currentUserEmail={currentUserEmail} tied={isDisplayTied(entry.points)} />
          ))}
        </div>
      )}
    </div>
  )
}
