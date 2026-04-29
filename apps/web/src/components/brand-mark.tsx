import type { SVGProps } from 'react'

export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect width="64" height="64" rx="14" fill="#1055F0" />
      <text
        x="29"
        y="47"
        fill="#FFFFFF"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="43"
        fontWeight="900"
        letterSpacing="-1"
        textAnchor="middle"
      >
        S
      </text>
      <path
        d="M44 15L51 8M47 23L56 14"
        stroke="#BFD0FF"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="47" cy="47" r="8" fill="#25D366" />
      <path
        d="M43.5 47.25L46.25 50L51 44.5"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
