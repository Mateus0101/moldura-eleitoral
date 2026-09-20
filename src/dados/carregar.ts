import { indexar } from './busca.ts'
import type { Candidato, Registro } from './tipos.ts'

const cache = new Map<string, Promise<Candidato[]>>()

async function lerArquivo(origem: string): Promise<Candidato[]> {
  const resposta = await fetch(`${import.meta.env.BASE_URL}candidatos/${origem}.json`)
  if (!resposta.ok) throw new Error(`candidatos/${origem}.json: HTTP ${resposta.status}`)
  const registros = (await resposta.json()) as Registro[]
  return registros.map((registro) => indexar(registro, origem))
}

// Presidente está no arquivo BR e os demais cargos no da UF. O eleitor vê tudo junto.
// Guarda o resultado: trocar de estado e voltar não baixa de novo.
export function carregarCandidatos(uf: string): Promise<Candidato[]> {
  let promessa = cache.get(uf)
  if (!promessa) {
    promessa = Promise.all([lerArquivo('BR'), lerArquivo(uf)]).then(([nacional, estadual]) => [
      ...nacional,
      ...estadual,
    ])
    promessa.catch(() => cache.delete(uf)) // falhou: a próxima tentativa baixa de novo
    cache.set(uf, promessa)
  }
  return promessa
}

export async function carregarDataDosDados(): Promise<string> {
  const resposta = await fetch(`${import.meta.env.BASE_URL}candidatos/manifest.json`)
  if (!resposta.ok) throw new Error(`manifest.json: HTTP ${resposta.status}`)
  const { geradoEm } = (await resposta.json()) as { geradoEm: string }
  return geradoEm
}
