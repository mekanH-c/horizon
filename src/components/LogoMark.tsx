/**
 * The brand mark: a rupee glyph on a neo-brutalist yellow tile with a green badge and black border.
 */
export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-hidden="true">
      <rect x="3" y="3" width="58" height="58" rx="12" fill="#FFE94A" stroke="#111111" strokeWidth="4" />
      <circle cx="32" cy="32" r="18" fill="#00C48C" stroke="#111111" strokeWidth="3" />
      <text
        x="32"
        y="43"
        fontFamily="'Archivo Black', system-ui, sans-serif"
        fontSize="30"
        fontWeight="900"
        fill="#111111"
        textAnchor="middle"
      >
        ₹
      </text>
    </svg>
  )
}