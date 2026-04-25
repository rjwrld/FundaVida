import { Bar, BarChart, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts'

interface Datum {
  id: string
  name: string
  count: number
}

interface TopCoursesBarProps {
  data: Datum[]
}

export function TopCoursesBar({ data }: TopCoursesBarProps) {
  const rows = data.slice(0, 5)

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 44 + 16)}>
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 4, right: 36, bottom: 4, left: 0 }}
        barCategoryGap={10}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={140}
          stroke="oklch(var(--muted-foreground))"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12 }}
        />
        <Bar
          dataKey="count"
          radius={[4, 4, 4, 4]}
          isAnimationActive={false}
          fill="oklch(var(--chart-1))"
        >
          <LabelList
            dataKey="count"
            position="right"
            offset={8}
            style={{
              fill: 'oklch(var(--foreground))',
              fontFamily: 'Geist Mono, monospace',
              fontSize: 12,
              fontVariantNumeric: 'tabular-nums',
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
