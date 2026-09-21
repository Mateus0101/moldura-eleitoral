import { LADO_MAX_FOTO } from './config.ts'
import type { FonteImagem } from './tipos.ts'

export function dimensoes(img: FonteImagem): { largura: number; altura: number } {
  return img instanceof HTMLImageElement
    ? { largura: img.naturalWidth, altura: img.naturalHeight }
    : { largura: img.width, altura: img.height }
}

export function carregarImagem(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Não foi possível carregar a imagem ${url}`))
    img.src = url
  })
}

export type MotivoErroFoto = 'leitura' | 'formato' | 'decodificacao' | 'memoria'

// Falha ao abrir a foto do eleitor: o motivo escolhe a mensagem certa, e o detalhe (formato e tamanho)
// é curto e fica visível para a pessoa mostrar se o problema continuar.
export class ErroFoto extends Error {
  motivo: MotivoErroFoto
  detalhe: string
  constructor(motivo: MotivoErroFoto, detalhe: string) {
    super(`${motivo}: ${detalhe}`)
    this.motivo = motivo
    this.detalhe = detalhe
  }
}

type Formato = 'jpeg' | 'png' | 'webp' | 'gif' | 'avif' | 'heic' | 'desconhecido'

const TIPO_DO_FORMATO: Record<Formato, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  heic: 'image/heic',
  desconhecido: '',
}

// Formato pelos primeiros bytes, sem confiar no nome nem no tipo que o aparelho informa (no Android
// o tipo vem vazio ou errado com frequência, e HEIC/HEIF de celular novo não abre em todo navegador).
function formatoDosBytes(bytes: Uint8Array): Formato {
  const texto = (de: number, ate: number) => String.fromCharCode(...bytes.slice(de, ate))
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpeg'
  if (bytes[0] === 0x89 && texto(1, 4) === 'PNG') return 'png'
  if (texto(0, 4) === 'RIFF' && texto(8, 12) === 'WEBP') return 'webp'
  if (texto(0, 3) === 'GIF') return 'gif'
  if (texto(4, 8) === 'ftyp') {
    const marca = texto(8, 12)
    if (marca === 'avif' || marca === 'avis') return 'avif'
    if (/^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(marca)) return 'heic'
  }
  return 'desconhecido'
}

// Copia a imagem para um canvas de no máximo LADO_MAX_FOTO no lado maior: redesenhar a foto inteira de
// 12 MP ou mais a cada movimento do zoom trava aparelho simples. A rotação do EXIF já vem aplicada.
function reduzir(fonte: CanvasImageSource, largura: number, altura: number): HTMLCanvasElement {
  if (!largura || !altura) throw new Error('imagem sem dimensões')
  const escala = Math.min(1, LADO_MAX_FOTO / Math.max(largura, altura))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(largura * escala))
  canvas.height = Math.max(1, Math.round(altura * escala))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ErroFoto('memoria', 'sem memória para redimensionar')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(fonte, 0, 0, canvas.width, canvas.height)
  return canvas
}

async function viaImagem(blob: Blob): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(blob)
  try {
    const img = await carregarImagem(url)
    return reduzir(img, img.naturalWidth, img.naturalHeight)
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Segunda chance: o createImageBitmap decodifica por outro caminho do navegador e às vezes abre o que
// o <img> não abre (foto muito grande, por exemplo).
async function viaBitmap(blob: Blob): Promise<HTMLCanvasElement> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' })
  } catch {
    bitmap = await createImageBitmap(blob) // navegador que não conhece a opção
  }
  try {
    return reduzir(bitmap, bitmap.width, bitmap.height)
  } finally {
    bitmap.close()
  }
}

// Foto escolhida pelo eleitor. Lê o arquivo inteiro para a memória antes de qualquer outra coisa: no
// Android o arquivo pode ser uma referência (content://, Google Fotos) que só é lida quando alguém pede,
// e ela pode se soltar se o campo de arquivo for limpo enquanto isso.
export async function carregarFotoEleitor(arquivo: Blob): Promise<HTMLCanvasElement> {
  let bytes: ArrayBuffer
  try {
    bytes = await arquivo.arrayBuffer()
  } catch {
    throw new ErroFoto('leitura', 'não consegui ler o arquivo')
  }
  if (bytes.byteLength === 0) throw new ErroFoto('leitura', 'arquivo vazio')

  const formato = formatoDosBytes(new Uint8Array(bytes, 0, Math.min(16, bytes.byteLength)))
  const detalhe = `${formato}, ${(bytes.byteLength / 1048576).toFixed(1).replace('.', ',')} MB`
  const blob = new Blob([bytes], { type: TIPO_DO_FORMATO[formato] || arquivo.type })

  let causa: unknown
  for (const decodificar of [viaImagem, viaBitmap]) {
    try {
      return await decodificar(blob)
    } catch (e) {
      if (e instanceof ErroFoto) throw e
      causa = e
    }
  }
  console.error('A foto do eleitor não abriu:', detalhe, causa)
  throw new ErroFoto(formato === 'heic' ? 'formato' : 'decodificacao', detalhe)
}

// Foto da candidatura (public/fotos/<UF>/<SQ>.jpg, mesmo domínio para o canvas poder exportar).
// Devolve null se não existir; a moldura então usa o avatar genérico.
export async function carregarFotoCandidato(uf: string, id: number): Promise<HTMLImageElement | null> {
  try {
    return await carregarImagem(`${import.meta.env.BASE_URL}fotos/${uf}/${id}.jpg`)
  } catch {
    return null
  }
}
