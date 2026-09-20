import { dimensoes } from './imagens.ts'
import type { FonteImagem, Retangulo } from './tipos.ts'

// Foto de urna dentro do selo circular. O corte "cobrir, alinhado ao topo" funciona quando há
// espaço acima da cabeça, mas as fotos fechadas no rosto (cabelo encostando no topo) perdem o
// alto da cabeça na curva do círculo. Aqui o recuo é proporcional ao aperto de cada foto: quem
// tem espaço fica como estava; quem está apertado recua só o necessário para o cabelo caber, e
// as sobras dos lados repetem a borda da própria foto (fundo de estúdio continua liso).

const FOLGA_CABECA = 4 // px entre o topo do cabelo e a borda do círculo
const ALINHAMENTO_TOPO = 0.15 // fração da sobra vertical cortada em cima (o resto vai embaixo)
const RECUO_MAXIMO = 0.8 // a foto nunca encolhe abaixo de 80% do lado do círculo
const FAIXA_MAXIMA = 12 // linhas do topo examinadas à procura de faixa escura de borda

// Altura (px) com que a foto é desenhada no círculo de lado `lado`. `alturaCobrir` é a altura no
// corte "cobrir" (o máximo) e `espaco` a fração da altura da foto vazia acima da cabeça.
export function alturaDoRetrato(alturaCobrir: number, espaco: number, lado: number): number {
  // Distância do topo do cabelo à borda superior da janela, em px. Só diminui quando a foto cresce.
  const folga = (altura: number) =>
    espaco * altura + (altura < lado ? (lado - altura) / 2 : -ALINHAMENTO_TOPO * (altura - lado))

  if (folga(alturaCobrir) >= FOLGA_CABECA) return alturaCobrir
  let baixo = lado * RECUO_MAXIMO
  let alto = alturaCobrir
  for (let i = 0; i < 24; i++) {
    const meio = (baixo + alto) / 2
    if (folga(meio) >= FOLGA_CABECA) baixo = meio
    else alto = meio
  }
  return baixo
}

// topo: linhas de cima a descartar (várias fotos do TSE vêm com uma faixa preta fina que viraria
// uma tampa escura no selo). espaco: fração da altura útil vazia acima do assunto (0 = cabelo
// encostando no topo).
type Medida = { topo: number; espaco: number }

const guardadas = new WeakMap<object, Medida>()

// Guardada por foto: o arrasto redesenha a moldura o tempo todo e a foto do candidato não muda.
export function medirFoto(foto: FonteImagem): Medida {
  let medida = guardadas.get(foto)
  if (!medida) {
    medida = medir(foto)
    guardadas.set(foto, medida)
  }
  return medida
}

// Sem leitura de pixels (imagem de outra origem), vale "sem faixa e sem aperto": corte de sempre.
const SEM_MEDIDA: Medida = { topo: 0, espaco: 1 }

function medir(foto: FonteImagem): Medida {
  const { largura, altura } = dimensoes(foto)
  if (largura < 20 || altura < 30) return SEM_MEDIDA
  try {
    const canvas = document.createElement('canvas')
    canvas.width = largura
    canvas.height = altura
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(foto, 0, 0)
    const pixels = ctx.getImageData(0, 0, largura, altura).data
    const cor = (x: number, y: number) => {
      const i = (y * largura + x) * 4
      return [pixels[i], pixels[i + 1], pixels[i + 2]]
    }

    // Faixa de borda: linhas do topo quase todas escuras, sobre um fundo claro. Só se procura quando
    // os cantos logo abaixo da faixa são claros: em foto de fundo preto as linhas escuras do topo são
    // o próprio fundo (e a cabeça pode começar dentro delas), então nada é descartado.
    const luz = (x: number, y: number) => {
      const [r, g, b] = cor(x, y)
      return 0.299 * r + 0.587 * g + 0.114 * b
    }
    const escura = (y: number) => {
      let n = 0
      for (let x = 0; x < largura; x++) if (luz(x, y) < 50) n++
      return n / largura >= 0.85
    }
    let cantos = 0
    let contados = 0
    for (let y = FAIXA_MAXIMA + 2; y < Math.min(altura, FAIXA_MAXIMA + 8); y++) {
      for (let x = 0; x < 8; x++) {
        cantos += luz(x, y) + luz(largura - 1 - x, y)
        contados += 2
      }
    }
    const fundoClaro = contados > 0 && cantos / contados >= 80
    let faixa = 0
    if (fundoClaro) while (faixa < FAIXA_MAXIMA && escura(faixa)) faixa++
    const topo = faixa ? faixa + 1 : 0 // +1: a última linha da faixa costuma ficar meio escura

    // Fundo: mediana das amostras dos cantos de cima.
    const inicio = topo + 1
    const amostras: number[][] = []
    for (const [x0, y0] of [
      [0, inicio],
      [largura - 6, inicio],
      [0, Math.round(altura * 0.15)],
      [largura - 6, Math.round(altura * 0.15)],
    ]) {
      for (let dy = 0; dy < 6; dy++) for (let dx = 0; dx < 6; dx++) amostras.push(cor(x0 + dx, y0 + dy))
    }
    const mediana = (canal: number) => amostras.map((c) => c[canal]).sort((a, b) => a - b)[amostras.length >> 1]
    const fundo = [mediana(0), mediana(1), mediana(2)]

    // Assunto: a primeira linha em que ao menos 25% do miolo da largura difere do fundo.
    const x1 = Math.round(largura * 0.2)
    const x2 = Math.round(largura * 0.8)
    for (let y = inicio; y < altura; y++) {
      let diferentes = 0
      for (let x = x1; x < x2; x++) {
        const [r, g, b] = cor(x, y)
        if (Math.hypot(r - fundo[0], g - fundo[1], b - fundo[2]) > 60) diferentes++
      }
      if (diferentes / (x2 - x1) >= 0.25) return { topo, espaco: (y - topo) / (altura - topo) }
    }
    return { topo, espaco: 1 }
  } catch {
    return SEM_MEDIDA
  }
}

// Desenha a foto na área (o selo já recortou o círculo). Sobras ficam com a borda repetida.
export function desenharRetrato(ctx: CanvasRenderingContext2D, foto: FonteImagem, area: Retangulo): void {
  const { largura, altura: alturaTotal } = dimensoes(foto)
  const { topo, espaco } = medirFoto(foto)
  const altura = alturaTotal - topo
  const cobrir = Math.max(area.w / largura, area.h / altura)
  const h = alturaDoRetrato(altura * cobrir, espaco, area.h)
  const w = h * (largura / altura)
  const x = area.x + (area.w - w) / 2
  const y = h >= area.h ? area.y - (h - area.h) * ALINHAMENTO_TOPO : area.y + (area.h - h) / 2

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(area.x, area.y, area.w, area.h)
  if (w < area.w) {
    ctx.drawImage(foto, 0, topo, 1, altura, area.x, y, x - area.x + 1, h) // esquerda
    ctx.drawImage(foto, largura - 1, topo, 1, altura, x + w - 1, y, area.x + area.w - (x + w) + 1, h) // direita
  }
  if (h < area.h) {
    ctx.drawImage(foto, 0, topo, largura, 1, x, area.y, w, y - area.y + 1) // cima
    ctx.drawImage(foto, 0, alturaTotal - 1, largura, 1, x, y + h - 1, w, area.y + area.h - (y + h) + 1) // baixo
  }
  ctx.drawImage(foto, 0, topo, largura, altura, x, y, w, h)
}
