import * as React from 'react'

export function FlameWelcome({
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
      <circle cx="4" cy="17" r="1" fill="currentColor" />
      <path d="M2.5 22c0-1.2 0.7-2 1.5-2s1.5 0.8 1.5 2v1h-3v-1Z" fill="currentColor" />
      <circle cx="20" cy="17" r="1" fill="currentColor" />
      <path d="M18.5 22c0-1.2 0.7-2 1.5-2s1.5 0.8 1.5 2v1h-3v-1Z" fill="currentColor" />
      <path
        d="M12.4 3.3c0.3 2.4-2.8 3.8-3.8 6.1-1.3 2.8 0.1 5.5-1 7.6 -0.6-0.9-1.5-1.5-1.5-3.2 -1.6 1.7-2.1 3.7-1.5 5.4 1 2.9 4.2 4.8 7.4 4.8 3.6 0 6.8-2.1 7.7-5 0.9-3-0.6-6.3-3.3-8.5C13.9 8.3 15.1 5.4 12.4 3.3Z"
        fill="currentColor"
      />
    </svg>
  )
}
