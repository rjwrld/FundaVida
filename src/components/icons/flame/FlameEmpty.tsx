import * as React from 'react'

export function FlameEmpty({
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
      <path
        d="M12.4 3.3c0.3 2.4-2.8 3.8-3.8 6.1-1.3 2.8 0.1 5.5-1 7.6 -0.6-0.9-1.5-1.5-1.5-3.2 -1.6 1.7-2.1 3.7-1.5 5.4 1 2.9 4.2 4.8 7.4 4.8 3.6 0 6.8-2.1 7.7-5 0.9-3-0.6-6.3-3.3-8.5C13.9 8.3 15.1 5.4 12.4 3.3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M11 12c-0.7 1.5 0.2 3.2-0.7 4.7 -0.9-0.7-1-1.6-0.8-2.6 0.3-1 1-1.6 1.5-2.1Z"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="2 2"
      />
    </svg>
  )
}
