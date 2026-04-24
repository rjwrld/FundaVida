import * as React from 'react'

export function FlameHope({
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
        fill="currentColor"
      />
      <path
        d="M12.3 14.6c0.8 0.6 1.3 1.5 1.3 2.5 0 1.6-1.1 2.8-2.5 2.8 -0.6 0-1.2-0.2-1.6-0.7 0.5-0.1 1-0.4 1.3-0.9 0.8-1.3 0.5-2.6 1.5-3.7Z"
        fill="currentColor"
        className="opacity-60"
      />
    </svg>
  )
}
