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

// Foto escolhida pelo eleitor. O <img> aplica a rotação do EXIF ao desenhar, então copiar
// para um canvas já entrega a foto em pé, e a redução deixa o redesenho do zoom leve.
export async function carregarFotoEleitor(arquivo: Blob): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(arquivo)
  try {
    const img = await carregarImagem(url)
    const escala = Math.min(1, LADO_MAX_FOTO / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * escala)
    canvas.height = Math.round(img.naturalHeight * escala)
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
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
