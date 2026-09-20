// Ícones inline (sem biblioteca): herdam a cor do texto e ficam ocultos para leitores de tela.
const props = {
  viewBox: '0 0 24 24',
  width: 22,
  height: 22,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const

export const Lupa = () => (
  <svg {...props}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m15.5 15.5 5.5 5.5" />
  </svg>
)

export const SetaBaixo = () => (
  <svg {...props} width={18} height={18}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export const SetaEsquerda = () => (
  <svg {...props} width={20} height={20}>
    <path d="m15 5-7 7 7 7" />
  </svg>
)

// Cabeça e ombros, para quem não tem foto.
export const Silhueta = () => (
  <svg viewBox="0 0 56 72" width="100%" height="100%" fill="currentColor" aria-hidden="true" focusable="false">
    <circle cx="28" cy="27" r="11" />
    <ellipse cx="28" cy="70" rx="21" ry="21" />
  </svg>
)
