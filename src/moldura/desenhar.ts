import { ALTURA, LARGURA, RODAPE, ROTULO_CARGO, TEMA } from './config.ts'
import { AJUSTE_INICIAL, enquadrar } from './enquadramento.ts'
import { estiloMoldura, type EstiloMoldura } from './esquemas.ts'
import { dimensoes } from './imagens.ts'
import { ajustarTexto, type OpcoesTexto } from './texto.ts'
import type { Ajuste, CandidatoMoldura, EntradaMoldura, FonteImagem, Retangulo } from './tipos.ts'

// --- Layout (px, base 1080x1080) ---------------------------------------------
// Foto do eleitor em quadro arredondado; o degradê escuro na parte de baixo leva o selo
// do candidato, o nome, o número e o cargo. Faixa fina no rodapé para o aviso de independência.

const MARGEM = 40
const ALTURA_RODAPE = 72
const RAIO_QUADRO = 36
const RECUO = 40 // do conteúdo até a borda do quadro

export const AREA_FOTO: Retangulo = {
  x: MARGEM,
  y: MARGEM,
  w: LARGURA - 2 * MARGEM,
  h: ALTURA - MARGEM - ALTURA_RODAPE,
}

const SELO = 220 // diâmetro da foto do candidato (as fotos do TSE têm ~161 px: fica em ~1,4x)
const ANEL = 8
const LIMITE_INFERIOR = AREA_FOTO.y + AREA_FOTO.h - RECUO
const SELO_CX = AREA_FOTO.x + RECUO + SELO / 2
const SELO_CY = LIMITE_INFERIOR - SELO / 2
const COLUNA_X = AREA_FOTO.x + RECUO + SELO + 36
const COLUNA_L = AREA_FOTO.x + AREA_FOTO.w - RECUO - COLUNA_X
const ALTURA_CHIP = 96

const estilo = (peso: number) => (px: number) => `${peso} ${px}px ${TEMA.familia}`

const ESTILO_PADRAO = estiloMoldura('partido') // partido sem cores cadastradas: azul-noite neutro

// --- Desenho -----------------------------------------------------------------

export function desenharMoldura(canvas: HTMLCanvasElement, entrada: EntradaMoldura): void {
  const { candidato, nomeEleitor, fotoCandidato, fotoEleitor, ajuste = AJUSTE_INICIAL, cores = ESTILO_PADRAO } = entrada
  if (canvas.width !== LARGURA) canvas.width = LARGURA
  if (canvas.height !== ALTURA) canvas.height = ALTURA
  const ctx = canvas.getContext('2d')!
  ctx.save()
  ctx.imageSmoothingQuality = 'high'

  ctx.fillStyle = TEMA.fundo
  ctx.fillRect(0, 0, LARGURA, ALTURA)

  desenharQuadro(ctx, fotoEleitor, ajuste, cores)
  desenharTextos(ctx, candidato, nomeEleitor, cores)
  desenharSelo(ctx, fotoCandidato)
  desenharRodape(ctx)

  ctx.restore()
}

function desenharQuadro(
  ctx: CanvasRenderingContext2D,
  foto: FonteImagem | null | undefined,
  ajuste: Ajuste,
  cores: EstiloMoldura,
) {
  ctx.save()
  caminhoArredondado(ctx, AREA_FOTO, RAIO_QUADRO)
  ctx.clip()

  if (foto) desenharCobrindo(ctx, foto, AREA_FOTO, ajuste)
  else desenharAvatar(ctx, AREA_FOTO)

  ctx.drawImage(camadaDegrade(cores), AREA_FOTO.x, AREA_FOTO.y)
  ctx.restore()
}

let camada: { chave: string; canvas: HTMLCanvasElement } | undefined

// As cores do esquema em degradê horizontal, com a transparência subindo de baixo para cima:
// a foto aparece por cima e a cor toma conta da parte de baixo, onde fica o texto. Fica guardada
// porque arrastar a foto redesenha a moldura o tempo todo e a camada só muda com o esquema.
function camadaDegrade(cores: EstiloMoldura): HTMLCanvasElement {
  const chave = JSON.stringify(cores.paradas)
  if (camada?.chave === chave) return camada.canvas

  const canvas = camada?.canvas ?? document.createElement('canvas')
  canvas.width = AREA_FOTO.w
  canvas.height = AREA_FOTO.h
  const ctx = canvas.getContext('2d')!

  const horizontal = ctx.createLinearGradient(0, 0, AREA_FOTO.w, 0)
  for (const { posicao, cor } of cores.paradas) horizontal.addColorStop(posicao, cor)
  ctx.fillStyle = horizontal
  ctx.fillRect(0, 0, AREA_FOTO.w, AREA_FOTO.h)

  const vertical = ctx.createLinearGradient(0, AREA_FOTO.h * 0.45, 0, AREA_FOTO.h * 0.8)
  vertical.addColorStop(0, 'rgba(0, 0, 0, 0)')
  vertical.addColorStop(1, 'rgba(0, 0, 0, 0.9)')
  ctx.globalCompositeOperation = 'destination-in' // mantém a cor só onde a máscara é opaca
  ctx.fillStyle = vertical
  ctx.fillRect(0, 0, AREA_FOTO.w, AREA_FOTO.h)

  camada = { chave, canvas }
  return canvas
}

// Os blocos de texto são empilhados de baixo para cima: o partido fica fixo junto à borda e
// o resto sobe conforme o nome ocupa uma ou duas linhas.
function desenharTextos(
  ctx: CanvasRenderingContext2D,
  c: CandidatoMoldura,
  nomeEleitor: string | undefined,
  cores: EstiloMoldura,
) {
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'

  const cargo = [ROTULO_CARGO[c.cargo], c.uf && c.uf !== 'BR' ? c.uf : ''].filter(Boolean).join(' · ')
  const detalhe = [c.partido, c.vice ? `Vice: ${c.vice}` : ''].filter(Boolean).join(' · ')

  let y = LIMITE_INFERIOR
  if (detalhe) {
    y = blocoAcima(ctx, detalhe, y, cores.textoSuave, 1.2, {
      fonteMax: 36,
      fonteMin: 24,
      maxLinhas: 1,
      estilo: estilo(600),
    })
  }
  if (cargo) {
    y = blocoAcima(ctx, cargo, y - 6, cores.texto, 1.2, {
      fonteMax: 44,
      fonteMin: 28,
      maxLinhas: 1,
      estilo: estilo(600),
    })
  }
  y = blocoAcima(ctx, c.nome, y - 12, cores.texto, 1.05, {
    fonteMax: 80,
    fonteMin: 40,
    maxLinhas: 2,
    estilo: estilo(800),
  })

  desenharLinhaDoNumero(ctx, String(c.numero), y - 20 - ALTURA_CHIP, nomeEleitor, cores)
}

function blocoAcima(
  ctx: CanvasRenderingContext2D,
  texto: string,
  base: number,
  cor: string,
  entrelinha: number,
  opcoes: OpcoesTexto,
): number {
  const { linhas, fonte } = ajustarTexto(ctx, texto, COLUNA_L, opcoes)
  const passo = fonte * entrelinha
  const topo = base - passo * linhas.length
  ctx.font = opcoes.estilo(fonte)
  ctx.fillStyle = cor
  linhas.forEach((linha, i) => ctx.fillText(linha, COLUNA_X, topo + i * passo))
  return topo
}

// O número da urna num chip claro à direita e, à esquerda, "EU APOIO" ou "<NOME> APOIA".
// O nome do eleitor pode ser longo: o rótulo ocupa o que sobra ao lado do chip, em até 2 linhas.
function desenharLinhaDoNumero(
  ctx: CanvasRenderingContext2D,
  numero: string,
  topo: number,
  nomeEleitor: string | undefined,
  cores: EstiloMoldura,
) {
  const centro = topo + ALTURA_CHIP / 2
  ctx.textBaseline = 'middle'

  ctx.font = estilo(800)(76)
  const largura = Math.max(150, ctx.measureText(numero).width + 72)
  const direita = COLUNA_X + COLUNA_L
  caminhoArredondado(ctx, { x: direita - largura, y: topo, w: largura, h: ALTURA_CHIP }, ALTURA_CHIP / 2)
  ctx.fillStyle = cores.chip
  ctx.fill()

  ctx.fillStyle = cores.chipTexto
  ctx.textAlign = 'center'
  ctx.fillText(numero, direita - largura / 2, centro + 3)
  ctx.textAlign = 'left'

  const nome = nomeEleitor?.replace(/\s+/g, ' ').trim()
  const rotulo = (nome ? `${nome} apoia` : 'eu apoio').toLocaleUpperCase('pt-BR')
  const opcoes = { fonteMax: 34, fonteMin: 20, maxLinhas: 2, estilo: estilo(700) }
  const { linhas, fonte } = ajustarTexto(ctx, rotulo, COLUNA_L - largura - 24, opcoes)
  const passo = fonte * 1.15
  ctx.font = opcoes.estilo(fonte)
  ctx.fillStyle = cores.textoSuave
  linhas.forEach((linha, i) => ctx.fillText(linha, COLUNA_X, centro + (i - (linhas.length - 1) / 2) * passo))
  ctx.textBaseline = 'top'
}

function desenharSelo(ctx: CanvasRenderingContext2D, foto: FonteImagem | null | undefined) {
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
  ctx.shadowBlur = 24
  ctx.shadowOffsetY = 6
  ctx.fillStyle = TEMA.anel
  ctx.beginPath()
  ctx.arc(SELO_CX, SELO_CY, SELO / 2 + ANEL, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.beginPath()
  ctx.arc(SELO_CX, SELO_CY, SELO / 2, 0, Math.PI * 2)
  ctx.clip()
  const area = { x: SELO_CX - SELO / 2, y: SELO_CY - SELO / 2, w: SELO, h: SELO }
  // Foto de urna é retrato 161x225: alinhada perto do topo para o rosto não ser cortado.
  if (foto) desenharCobrindo(ctx, foto, area, { zoom: 1, x: 0, y: -0.7 })
  else desenharAvatar(ctx, area)
  ctx.restore()
}

function desenharRodape(ctx: CanvasRenderingContext2D) {
  const topo = AREA_FOTO.y + AREA_FOTO.h
  const { linhas, fonte } = ajustarTexto(ctx, RODAPE, LARGURA - 2 * MARGEM, {
    fonteMax: 22,
    fonteMin: 16,
    maxLinhas: 1,
    estilo: estilo(500),
  })
  ctx.font = estilo(500)(fonte)
  ctx.fillStyle = TEMA.rodape
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(linhas[0] ?? '', LARGURA / 2, topo + (ALTURA - topo) / 2)
}

// --- Auxiliares --------------------------------------------------------------

function desenharCobrindo(ctx: CanvasRenderingContext2D, img: FonteImagem, area: Retangulo, ajuste: Ajuste) {
  const { largura, altura } = dimensoes(img)
  const r = enquadrar(largura, altura, area, ajuste)
  ctx.drawImage(img, r.x, r.y, r.w, r.h)
}

// Silhueta genérica (fundo cinza, cabeça e ombros) para foto ausente. Quem chama já recortou a área.
function desenharAvatar(ctx: CanvasRenderingContext2D, area: Retangulo) {
  const lado = Math.min(area.w, area.h)
  const cx = area.x + area.w / 2
  ctx.fillStyle = TEMA.avatarFundo
  ctx.fillRect(area.x, area.y, area.w, area.h)
  ctx.fillStyle = TEMA.avatarFigura
  ctx.beginPath()
  ctx.arc(cx, area.y + area.h * 0.38, lado * 0.16, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(cx, area.y + area.h * 0.86, lado * 0.32, lado * 0.3, 0, 0, Math.PI * 2)
  ctx.fill()
}

// Não usa ctx.roundRect para funcionar também em Safari e Firefox mais antigos.
function caminhoArredondado(ctx: CanvasRenderingContext2D, { x, y, w, h }: Retangulo, raio: number) {
  ctx.beginPath()
  ctx.moveTo(x + raio, y)
  ctx.arcTo(x + w, y, x + w, y + h, raio)
  ctx.arcTo(x + w, y + h, x, y + h, raio)
  ctx.arcTo(x, y + h, x, y, raio)
  ctx.arcTo(x, y, x + w, y, raio)
  ctx.closePath()
}
