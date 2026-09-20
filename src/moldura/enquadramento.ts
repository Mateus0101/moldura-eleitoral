import type { Ajuste, Retangulo } from './tipos.ts'

export const AJUSTE_INICIAL: Ajuste = { zoom: 1, x: 0, y: 0 }

const limitar = (valor: number, min: number, max: number) => Math.min(max, Math.max(min, valor))

// Retângulo em que a imagem deve ser desenhada para cobrir a área inteira, já com zoom e
// posição. Nunca sobra borda vazia: o zoom mínimo é o de "cobrir".
export function enquadrar(larguraImg: number, alturaImg: number, area: Retangulo, ajuste: Ajuste): Retangulo {
  const escala = Math.max(area.w / larguraImg, area.h / alturaImg) * Math.max(1, ajuste.zoom)
  const w = larguraImg * escala
  const h = alturaImg * escala
  return {
    x: area.x - ((w - area.w) * (1 + limitar(ajuste.x, -1, 1))) / 2,
    y: area.y - ((h - area.h) * (1 + limitar(ajuste.y, -1, 1))) / 2,
    w,
    h,
  }
}

// Converte um arrasto (em pixels do canvas) no novo ajuste. Arrastar para a direita
// puxa a foto para a direita, então passa a aparecer mais do lado esquerdo dela.
export function arrastar(
  ajuste: Ajuste,
  dx: number,
  dy: number,
  larguraImg: number,
  alturaImg: number,
  area: Retangulo,
): Ajuste {
  const atual = enquadrar(larguraImg, alturaImg, area, ajuste)
  const folgaX = atual.w - area.w
  const folgaY = atual.h - area.h
  return {
    zoom: ajuste.zoom,
    x: folgaX > 0 ? limitar(ajuste.x - (2 * dx) / folgaX, -1, 1) : 0,
    y: folgaY > 0 ? limitar(ajuste.y - (2 * dy) / folgaY, -1, 1) : 0,
  }
}
