// Formato dos JSON gerados por scripts/gerar-dados.mjs (public/candidatos/<UF>.json).
export type Acompanhante = { id: number; nome: string; partido: string; semFoto?: true }

export type Registro = {
  id: number // SQ_CANDIDATO do TSE
  cargo: number // CD_CARGO do TSE
  numero: number
  nome: string // nome de urna
  partido: string
  nomeCompleto?: string // só quando difere do nome de urna
  semFoto?: true
  vice?: Acompanhante
  suplentes?: Acompanhante[]
}

// Registro já preparado para o app: de qual arquivo veio (é também a pasta da foto) e o
// texto normalizado em que a busca procura.
export type Candidato = Registro & { origem: string; busca: string }

export type GrupoCargo = 'todos' | 'presidente' | 'governador' | 'senador' | 'federal' | 'estadual'

export type Filtros = { texto: string; grupo: GrupoCargo; partido: string }
