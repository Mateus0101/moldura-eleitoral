// Esquemas de cor do degradê da moldura: as cores do partido (padrão), branco, preto ou as
// cores da bandeira do Brasil. O esquema também define a cor do texto e do chip do número,
// escolhidas pelo contraste com a cor principal, para nada ficar ilegível.

export type Esquema = 'partido' | 'branco' | 'preto' | 'bandeira'

// posicao vai de 0 (esquerda) a 1 (direita).
export type Parada = { posicao: number; cor: string }

export type EstiloMoldura = {
  paradas: Parada[]
  texto: string
  textoSuave: string
  chip: string
  chipTexto: string
}

const AZUL = '#002776'
const VERDE = '#009c3b'
const AMARELO = '#ffdf00'
const CLARO = { texto: '#f8fafc', textoSuave: 'rgba(248, 250, 252, 0.85)' }
const ESCURO = { texto: '#111827', textoSuave: 'rgba(17, 24, 39, 0.78)' }
const BRANCO = '#ffffff'
const TINTA = '#111827'

function luminancia(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Razão de contraste da WCAG (1 a 21).
export function contraste(a: string, b: string): number {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (claro + 0.05) / (escuro + 0.05)
}

// A cor principal fica onde está o texto (esquerda) e ocupa uns 60% da largura; as demais
// entram à direita, sob o chip do número, sem passar por trás dos nomes longos.
function distribuir(cores: readonly string[]): Parada[] {
  const [principal, ...demais] = cores
  const paradas = [{ posicao: 0, cor: principal }]
  if (!demais.length) return paradas
  paradas.push({ posicao: 0.6, cor: principal })
  demais.forEach((cor, i) => paradas.push({ posicao: 0.8 + (0.2 * (i + 1)) / demais.length, cor }))
  return paradas
}

// Sem cores cadastradas para o partido, cai num azul-noite neutro.
export function estiloMoldura(esquema: Esquema, coresPartido: readonly string[] = []): EstiloMoldura {
  let paradas: Parada[]
  if (esquema === 'branco') paradas = [{ posicao: 0, cor: BRANCO }]
  else if (esquema === 'preto') paradas = [{ posicao: 0, cor: '#000000' }]
  else if (esquema === 'bandeira') {
    paradas = [
      { posicao: 0, cor: AZUL },
      { posicao: 0.42, cor: AZUL },
      { posicao: 0.78, cor: VERDE },
      { posicao: 1, cor: AMARELO },
    ]
  } else if (coresPartido.length) paradas = distribuir(coresPartido)
  else paradas = [{ posicao: 0, cor: '#0b1220' }]

  const principal = paradas[0].cor
  // O texto da moldura é grande e em negrito, então 3,5:1 com o branco já é legível (a WCAG pede 3:1
  // para texto grande). Abaixo disso, vale o que tiver mais contraste. Evita texto escuro sobre vermelho puro.
  const comBranco = contraste(principal, BRANCO)
  const fundoEscuro = comBranco >= 3.5 || comBranco >= contraste(principal, TINTA)
  const paleta = fundoEscuro ? CLARO : ESCURO
  return {
    paradas,
    ...paleta,
    // Chip invertido em relação ao fundo; o número leva a cor principal quando ela é legível no chip claro.
    chip: fundoEscuro ? BRANCO : TINTA,
    chipTexto: fundoEscuro ? (contraste(principal, BRANCO) >= 4.5 ? principal : TINTA) : BRANCO,
  }
}

// Para as amostras de cor na tela (botões do seletor).
export function gradienteCss({ paradas }: EstiloMoldura): string {
  if (paradas.length === 1) return paradas[0].cor
  return `linear-gradient(90deg, ${paradas.map((p) => `${p.cor} ${Math.round(p.posicao * 100)}%`).join(', ')})`
}
