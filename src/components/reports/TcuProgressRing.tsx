import { motion } from 'framer-motion'
import { useFormat } from '@/hooks/useFormat'

interface TcuProgressRingProps {
  completed: number
  target: number
}

export function TcuProgressRing({ completed, target }: TcuProgressRingProps) {
  const { formatNumber } = useFormat()
  const safeTarget = target > 0 ? target : 1
  const ratio = Math.max(0, Math.min(1, completed / safeTarget))

  // SVG geometry
  const size = 180
  const stroke = 14
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - ratio)

  return (
    <div className="relative flex h-full min-h-[200px] items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="img"
        aria-label={`${completed} of ${target} TCU hours`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="oklch(var(--muted))"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="oklch(var(--chart-1))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[34px] font-semibold tabular-nums leading-none text-foreground">
          {formatNumber(completed)}
        </span>
        <span className="mt-1 text-xs text-muted-foreground">
          / <span className="font-mono">{formatNumber(target)}</span> h
        </span>
      </div>
    </div>
  )
}
