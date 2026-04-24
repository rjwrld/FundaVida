import * as React from 'react'

export function FlameCelebration({
  size = 24,
  ...props
}: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="12" y1="8" x2="12" y2="5" />
        <line x1="14.6" y1="8.8" x2="16.3" y2="6.3" />
        <line x1="16" y1="10.6" x2="18.6" y2="9.1" />
        <line x1="9.4" y1="8.8" x2="7.7" y2="6.3" />
        <line x1="8" y1="10.6" x2="5.4" y2="9.1" />
      </g>
      <circle cx="19" cy="8.5" r="0.5" fill="currentColor" />
      <circle cx="5" cy="8.5" r="0.5" fill="currentColor" />
      <path
        d="M12.4 5.3c0.3 2.4-2.8 3.8-3.8 6.1-1.3 2.8 0.1 5.5-1 7.6 -0.6-0.9-1.5-1.5-1.5-3.2 -1.6 1.7-2.1 3.7-1.5 5.4 1 2.9 4.2 4.8 7.4 4.8 3.6 0 6.8-2.1 7.7-5 0.9-3-0.6-6.3-3.3-8.5C13.9 10.3 15.1 7.4 12.4 5.3Z"
        fill="currentColor"
      />
    </svg>
  )
}
