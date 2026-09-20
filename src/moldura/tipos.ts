import type { EstiloMoldura } from './esquemas.ts'

// Imagens que o canvas sabe desenhar. A foto do eleitor vira canvas (já reduzida e com a
// orientação do EXIF aplicada); a do candidato é um <img> carregado do mesmo domínio.
export type FonteImagem = HTMLImageElement | HTMLCanvasElement

export type Retangulo = { x: number; y: number; w: number; h: number }

// Enquadramento da foto dentro da área: zoom >= 1 e posição em [-1, 1] em cada eixo
// (-1 mostra o lado esquerdo/topo da foto, 0 centraliza, 1 mostra o lado direito/base).
export type Ajuste = { zoom: number; x: number; y: number }

export type CandidatoMoldura = {
  nome: string
  numero: number | string
  cargo: number // CD_CARGO do TSE
  partido: string
  uf?: string // some da moldura quando for 'BR' (presidente)
  vice?: string
}

export type EntradaMoldura = {
  candidato: CandidatoMoldura
  cores?: EstiloMoldura // sem isso, azul-noite neutro
  nomeEleitor?: string // opcional: o rótulo vira "<NOME> APOIA" em vez de "EU APOIO"
  fotoCandidato?: FonteImagem | null // sem foto: avatar genérico
  fotoEleitor?: FonteImagem | null // sem foto: área em branco com avatar
  ajuste?: Ajuste
}
