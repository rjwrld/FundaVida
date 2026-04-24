import * as React from 'react'

export function FlameMilestone({
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
      <path d="M12 14 4 22h16L12 14Z" fill="currentColor" className="opacity-25" />
      <path
        d="M12 14 4 22h16L12 14Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12 12.5l0.9 1.4 1.6 0.3-1.1 1.2 0.3 1.6-1.7-0.8-1.7 0.8 0.3-1.6-1.1-1.2 1.6-0.3L12 12.5Z"
        fill="currentColor"
      />
      <path
        d="M12.3 2.3c0.2 1.7-2 2.7-2.7 4.3 -0.9 2 0.1 3.9-0.7 5.4 -0.4-0.6-1.1-1.1-1.1-2.3 -1.1 1.2-1.5 2.6-1.1 3.8 0.7 2 3 3.4 5.2 3.4 2.5 0 4.8-1.5 5.4-3.5 0.6-2.1-0.4-4.4-2.3-6C13.4 5.8 14.3 3.8 12.3 2.3Z"
        fill="currentColor"
      />
    </svg>
  )
}
