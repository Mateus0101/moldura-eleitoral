export type OpcoesTexto = {
  fonteMax: number
  fonteMin: number
  maxLinhas: number
  estilo: (px: number) => string // valor de ctx.font para o tamanho dado
}

export type TextoAjustado = { linhas: string[]; fonte: number }

// Quebra em linhas por palavra, sem cortar palavra. Uma palavra maior que a largura fica
// sozinha na linha (quem chama percebe pelo excesso de largura e reduz a fonte).
function quebrar(ctx: CanvasRenderingContext2D, texto: string, larguraMax: number): string[] {
  const linhas: string[] = []
  let atual = ''
  for (const palavra of texto.split(/\s+/).filter(Boolean)) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra
    if (atual && ctx.measureText(tentativa).width > larguraMax) {
      linhas.push(atual)
      atual = palavra
    } else atual = tentativa
  }
  if (atual) linhas.push(atual)
  return linhas
}

const cabe = (ctx: CanvasRenderingContext2D, linhas: string[], larguraMax: number) =>
  linhas.every((linha) => ctx.measureText(linha).width <= larguraMax)

// Maior fonte (entre fonteMax e fonteMin) em que o texto cabe em maxLinhas linhas. Se nem na
// fonte mínima couber, corta com reticências na última linha. Deixa ctx.font no tamanho escolhido.
export function ajustarTexto(
  ctx: CanvasRenderingContext2D,
  texto: string,
  larguraMax: number,
  { fonteMax, fonteMin, maxLinhas, estilo }: OpcoesTexto,
): TextoAjustado {
  for (let fonte = fonteMax; fonte >= fonteMin; fonte -= 2) {
    ctx.font = estilo(fonte)
    const linhas = quebrar(ctx, texto, larguraMax)
    if (linhas.length <= maxLinhas && cabe(ctx, linhas, larguraMax)) return { linhas, fonte }
  }

  ctx.font = estilo(fonteMin)
  const todas = quebrar(ctx, texto, larguraMax)
  const linhas = todas.slice(0, maxLinhas).map((linha) => truncar(ctx, linha, larguraMax))
  if (todas.length > maxLinhas) {
    const ultima = linhas.length - 1
    linhas[ultima] = truncar(ctx, `${linhas[ultima]}…`, larguraMax)
  }
  return { linhas, fonte: fonteMin }
}

// Tira letras do fim até caber, terminando em reticências. Linha que já cabe volta como está.
function truncar(ctx: CanvasRenderingContext2D, linha: string, larguraMax: number): string {
  if (ctx.measureText(linha).width <= larguraMax) return linha
  let corte = linha.replace(/…$/, '')
  while (corte.length > 1 && ctx.measureText(`${corte}…`).width > larguraMax) corte = corte.slice(0, -1)
  return `${corte}…`
}
