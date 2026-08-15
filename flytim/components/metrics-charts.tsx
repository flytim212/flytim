'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const TOOLTIP_STYLE = {
  background: '#fff',
  border: '1px solid #e4e4e7',
  borderRadius: 8,
  fontSize: 12,
} as const

// 近 30 天 点赞/评论/收藏 走势
export function TrendChart({
  data,
}: {
  data: { label: string; likes: number; comments: number; saves: number }[]
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#a1a1aa' }}
            tickLine={false}
            axisLine={{ stroke: '#e4e4e7' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#a1a1aa' }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#71717a' }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="likes" name="点赞" stroke="#f59e0b" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="comments" name="评论" stroke="#0ea5e9" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="saves" name="收藏" stroke="#10b981" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// 分类对比：平均点赞 / 平均总完播率
export function CategoryBars({
  data,
}: {
  data: { category: string; avgLikes: number; avgCompletion: number; count: number }[]
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <p className="mb-2 text-xs text-zinc-400">平均点赞</p>
        <div className="h-52 w-full">
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis dataKey="category" tick={{ fontSize: 12, fill: '#71717a' }} tickLine={false} axisLine={{ stroke: '#e4e4e7' }} />
              <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={44} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#71717a' }} cursor={{ fill: '#fafafa' }} />
              <Bar dataKey="avgLikes" name="平均点赞" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs text-zinc-400">平均总完播率 %</p>
        <div className="h-52 w-full">
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis dataKey="category" tick={{ fontSize: 12, fill: '#71717a' }} tickLine={false} axisLine={{ stroke: '#e4e4e7' }} />
              <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={44} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#71717a' }} cursor={{ fill: '#fafafa' }} />
              <Bar dataKey="avgCompletion" name="平均总完播率 %" fill="#0ea5e9" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
