import type { Candidato, Filtros, GrupoCargo, Registro } from './tipos.ts'

// Filtros por cargo. Senador é um só (o TSE não distingue 1ª e 2ª vaga) e deputado estadual
// e distrital ficam juntos, já que cada UF só tem um dos dois.
export const GRUPOS: { id: GrupoCargo; rotulo: string; cargos: number[] }[] = [
  { id: 'todos', rotulo: 'Todos', cargos: [] },
  { id: 'presidente', rotulo: 'Presidente', cargos: [1] },
  { id: 'governador', rotulo: 'Governador', cargos: [3] },
  { id: 'senador', rotulo: 'Senador', cargos: [5] },
  { id: 'federal', rotulo: 'Dep. federal', cargos: [6] },
  { id: 'estadual', rotulo: 'Dep. estadual/distrital', cargos: [7, 8] },
]

export const FILTROS_VAZIOS: Filtros = { texto: '', grupo: 'todos', partido: '' }

// Minúsculas, sem acento e sem pontuação: "D'Ávila-Silva" vira "d avila silva".
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function indexar(registro: Registro, origem: string): Candidato {
  // O vice entra na busca: quem procura "Alckmin" quer achar a chapa do titular.
  const texto = [registro.nome, registro.nomeCompleto, registro.partido, registro.vice?.nome]
    .filter(Boolean)
    .join(' ')
  // O espaço na frente permite achar "começo de palavra" com includes(' ' + termo).
  return { ...registro, origem, busca: ` ${normalizar(texto)}` }
}

const soDigitos = (termo: string) => /^\d+$/.test(termo)

// Cada termo digitado precisa bater com o candidato:
//  - número: o começo do número da urna ("13" acha 13, 130, 1300...);
//  - palavra: o começo de alguma palavra do nome, do nome completo ou da sigla do partido.
// Com texto, quem casa exatamente (número ou sigla) vem primeiro, depois quem tem o nome
// começando pelo termo. O resto mantém a ordem original (cargo e número), a mesma para todos.
export function filtrar(lista: Candidato[], { texto, grupo, partido }: Filtros): Candidato[] {
  const cargos = GRUPOS.find((g) => g.id === grupo)?.cargos ?? []
  const termos = normalizar(texto).split(' ').filter(Boolean)

  const encontrados = lista.filter(
    (c) =>
      (!cargos.length || cargos.includes(c.cargo)) &&
      (!partido || c.partido === partido) &&
      termos.every((termo) =>
        soDigitos(termo) ? String(c.numero).startsWith(termo) : c.busca.includes(` ${termo}`),
      ),
  )
  if (!termos.length) return encontrados

  const primeiro = termos[0]
  const pontos = (c: Candidato) => {
    if (soDigitos(primeiro)) return String(c.numero) === primeiro ? 0 : 2
    if (c.partido.toLowerCase() === primeiro) return 0
    return c.busca.startsWith(` ${primeiro}`) ? 1 : 2
  }
  return encontrados
    .map((c) => ({ c, p: pontos(c) }))
    .sort((a, b) => a.p - b.p) // sort é estável: empate mantém a ordem original
    .map(({ c }) => c)
}

// Siglas presentes no grupo de cargo, em ordem alfabética, para o seletor de partido.
export function partidosDe(lista: Candidato[], grupo: GrupoCargo): string[] {
  const cargos = GRUPOS.find((g) => g.id === grupo)?.cargos ?? []
  const siglas = new Set(lista.filter((c) => !cargos.length || cargos.includes(c.cargo)).map((c) => c.partido))
  return [...siglas].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}
