// Gera os JSON de candidatos (um por UF, mais o BR) e copia as fotos das candidaturas vigentes.
//
// Entrada:  dados/consulta_cand_2026_<UF>.csv  e  imagens/<UF>/F<UF><SQ>_div.jpg
// Saída:    public/candidatos/<UF>.json e public/candidatos/manifest.json
//           public/fotos/<UF>/<SQ>.jpg
//
// Uso: npm run dados            (JSON + fotos)
//      npm run dados -- --sem-fotos   (só JSON; a cópia das fotos é a parte lenta)

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const pastaCsv = join(raiz, 'dados')
const pastaFotosOrigem = join(raiz, 'imagens')
const pastaJson = join(raiz, 'public', 'candidatos')
const pastaFotosDestino = join(raiz, 'public', 'fotos')

const semFotos = process.argv.includes('--sem-fotos')

// Lista fixa de colunas lidas. O CSV traz CPF, título de eleitor e data de nascimento
// reais: nada além disto pode chegar ao JSON (nem ao bundle).
const COLUNAS = [
  'SQ_CANDIDATO',
  'SG_UF',
  'CD_CARGO',
  'NR_CANDIDATO',
  'NM_URNA_CANDIDATO',
  'SG_PARTIDO',
  'NM_CANDIDATO',
  'DT_GERACAO',
  'HH_GERACAO',
]

// Códigos de cargo do TSE. Vice e suplentes acompanham o titular pelo (UF, número).
const VICE_DE = { 1: 2, 3: 4 } // presidente -> vice, governador -> vice
const SUPLENTES_DE = { 5: [9, 10] } // senador -> 1º e 2º suplentes
const TITULARES = [1, 3, 5, 6, 7, 8]
const ACESSORIOS = [2, 4, 9, 10]

// O TSE marca vazio como #NULO ou #NE.
const limpar = (valor) => (valor === '#NULO' || valor === '#NE' ? '' : valor.trim())

// CSV do TSE: Latin-1, separador ';', campos entre aspas (aspas internas dobradas).
function lerCsv(caminho) {
  const texto = readFileSync(caminho).toString('latin1')
  const linhas = []
  let linha = []
  let campo = ''
  let entreAspas = false

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (entreAspas) {
      if (c !== '"') campo += c
      else if (texto[i + 1] === '"') {
        campo += '"'
        i++
      } else entreAspas = false
    } else if (c === '"') entreAspas = true
    else if (c === ';') {
      linha.push(campo)
      campo = ''
    } else if (c === '\n') {
      linha.push(campo)
      linhas.push(linha)
      linha = []
      campo = ''
    } else if (c !== '\r') campo += c
  }
  if (campo || linha.length) {
    linha.push(campo)
    linhas.push(linha)
  }

  const [cabecalho, ...dados] = linhas
  const indice = COLUNAS.map((coluna) => {
    const posicao = cabecalho.indexOf(coluna)
    if (posicao < 0) throw new Error(`${caminho}: coluna ${coluna} não encontrada`)
    return posicao
  })
  return dados
    .filter((valores) => valores.length > 1)
    .map((valores) =>
      Object.fromEntries(COLUNAS.map((coluna, i) => [coluna, limpar(valores[indice[i]] ?? '')])),
    )
}

// --- Leitura ---------------------------------------------------------------

const arquivos = readdirSync(pastaCsv)
  .filter((nome) => /^consulta_cand_2026_[A-Z]{2}\.csv$/.test(nome)) // BRASIL (consolidado) fica de fora
  .sort()
if (arquivos.length !== 28) {
  console.warn(`Aviso: esperava 28 CSVs (27 UFs + BR) e achei ${arquivos.length}.`)
}

const todos = []
let geradoEm = ''
for (const arquivo of arquivos) {
  for (const r of lerCsv(join(pastaCsv, arquivo))) {
    const cargo = Number(r.CD_CARGO)
    if (!TITULARES.includes(cargo) && !ACESSORIOS.includes(cargo)) {
      throw new Error(`Cargo inesperado ${r.CD_CARGO} (SQ ${r.SQ_CANDIDATO}). Revisar o mapa de cargos.`)
    }
    const nomeCompleto = r.NM_CANDIDATO
    todos.push({
      sq: Number(r.SQ_CANDIDATO),
      uf: r.SG_UF,
      cargo,
      numero: Number(r.NR_CANDIDATO),
      nome: r.NM_URNA_CANDIDATO || nomeCompleto,
      nomeCompleto,
      partido: r.SG_PARTIDO,
    })
    // dd/mm/aaaa + hh:mm:ss, horário de Brasília
    const [dia, mes, ano] = r.DT_GERACAO.split('/')
    const gerado = `${ano}-${mes}-${dia}T${r.HH_GERACAO}-03:00`
    if (gerado > geradoEm) geradoEm = gerado
  }
}

// --- Substituições ---------------------------------------------------------
// Candidaturas substituídas continuam no arquivo, com o mesmo (UF, cargo, número).
// DS_SITUACAO_CANDIDATURA vem #NE, então vale a inferência: o maior SQ é o vigente.

const vigentes = new Map()
for (const c of todos) {
  const chave = `${c.uf}|${c.cargo}|${c.numero}`
  const atual = vigentes.get(chave)
  if (!atual || c.sq > atual.sq) vigentes.set(chave, c)
}

// --- Fotos: quem tem arquivo de origem ------------------------------------

const origemDaFoto = (c) => join(pastaFotosOrigem, c.uf, `F${c.uf}${c.sq}_div.jpg`)
for (const c of vigentes.values()) c.temFoto = existsSync(origemDaFoto(c))

// --- Chapas: vice e suplentes ligados ao titular --------------------------

const registroBasico = (c) => {
  const r = { id: c.sq, nome: c.nome, partido: c.partido }
  if (!c.temFoto) r.semFoto = true
  return r
}

const ligados = new Set()
const ligar = (titular, cargo) => {
  const chave = `${titular.uf}|${cargo}|${titular.numero}`
  const c = vigentes.get(chave)
  if (c) ligados.add(chave)
  return c
}

const porArquivo = new Map() // UF -> registros dos titulares
const semVice = []
for (const c of vigentes.values()) {
  if (!TITULARES.includes(c.cargo)) continue

  const registro = { id: c.sq, cargo: c.cargo, numero: c.numero, nome: c.nome, partido: c.partido }
  // O nome completo só serve para a busca: fica de fora quando é igual ao da urna.
  if (c.nomeCompleto !== c.nome) registro.nomeCompleto = c.nomeCompleto
  if (!c.temFoto) registro.semFoto = true

  if (VICE_DE[c.cargo]) {
    const vice = ligar(c, VICE_DE[c.cargo])
    if (vice) registro.vice = registroBasico(vice)
    else semVice.push(c)
  }
  if (SUPLENTES_DE[c.cargo]) {
    const suplentes = SUPLENTES_DE[c.cargo].map((cargo) => ligar(c, cargo)).filter(Boolean)
    if (suplentes.length) registro.suplentes = suplentes.map(registroBasico)
  }

  if (!porArquivo.has(c.uf)) porArquivo.set(c.uf, [])
  porArquivo.get(c.uf).push(registro)
}

const orfaos = [...vigentes.entries()].filter(
  ([chave, c]) => ACESSORIOS.includes(c.cargo) && !ligados.has(chave),
)

// --- Escrita dos JSON ---------------------------------------------------

rmSync(pastaJson, { recursive: true, force: true })
mkdirSync(pastaJson, { recursive: true })

const contagem = {}
for (const uf of [...porArquivo.keys()].sort()) {
  const registros = porArquivo.get(uf).sort((a, b) => a.cargo - b.cargo || a.numero - b.numero)
  contagem[uf] = registros.length
  writeFileSync(join(pastaJson, `${uf}.json`), JSON.stringify(registros))
}
writeFileSync(
  join(pastaJson, 'manifest.json'),
  JSON.stringify({ geradoEm, total: vigentes.size, candidatos: contagem }, null, 2) + '\n',
)

// --- Cópia das fotos --------------------------------------------------------
// Só as vigentes (titulares, vices e suplentes), como public/fotos/<UF>/<SQ>.jpg.
// Roda de novo sem refazer tudo: pula o que já está lá com o mesmo tamanho e apaga as sobras.

let copiadas = 0
let puladas = 0
let removidas = 0
if (!semFotos) {
  const comFoto = [...vigentes.values()].filter((c) => c.temFoto)
  const esperadas = new Set(comFoto.map((c) => `${c.uf}/${c.sq}.jpg`))

  if (existsSync(pastaFotosDestino)) {
    for (const pasta of readdirSync(pastaFotosDestino, { withFileTypes: true })) {
      if (!pasta.isDirectory()) continue
      for (const arquivo of readdirSync(join(pastaFotosDestino, pasta.name))) {
        if (!esperadas.has(`${pasta.name}/${arquivo}`)) {
          rmSync(join(pastaFotosDestino, pasta.name, arquivo))
          removidas++
        }
      }
    }
  }

  const ufsCriadas = new Set()
  for (const c of comFoto) {
    const destino = join(pastaFotosDestino, c.uf, `${c.sq}.jpg`)
    const origem = origemDaFoto(c)
    if (existsSync(destino) && statSync(destino).size === statSync(origem).size) {
      puladas++
      continue
    }
    if (!ufsCriadas.has(c.uf)) {
      mkdirSync(join(pastaFotosDestino, c.uf), { recursive: true })
      ufsCriadas.add(c.uf)
    }
    copyFileSync(origem, destino)
    copiadas++
  }
}

// --- Resumo ---------------------------------------------------------------

const titulares = [...vigentes.values()].filter((c) => TITULARES.includes(c.cargo)).length
const semFoto = [...vigentes.values()].filter((c) => !c.temFoto)

console.log(`Gerado pelo TSE em: ${geradoEm}`)
console.log(`Linhas nos CSVs: ${todos.length}`)
console.log(`Vigentes: ${vigentes.size} (${todos.length - vigentes.size} substituídas descartadas)`)
console.log(`  titulares: ${titulares}, vice/suplentes: ${vigentes.size - titulares}`)
console.log(`Arquivos JSON: ${porArquivo.size} em public/candidatos/`)
if (semFotos) console.log('Fotos: puladas (--sem-fotos)')
else console.log(`Fotos: ${copiadas} copiadas, ${puladas} já estavam lá, ${removidas} sobras removidas`)

if (semFoto.length) {
  console.log(`Sem foto (${semFoto.length}):`)
  for (const c of semFoto) console.log(`  ${c.uf} cargo ${c.cargo} nº ${c.numero} ${c.nome} (SQ ${c.sq})`)
}
if (semVice.length) {
  console.warn(`Aviso: ${semVice.length} titular(es) sem vice:`)
  for (const c of semVice) console.warn(`  ${c.uf} cargo ${c.cargo} nº ${c.numero} ${c.nome}`)
}
if (orfaos.length) {
  console.warn(`Aviso: ${orfaos.length} vice/suplente(s) sem titular (não entram nos JSON):`)
  for (const [, c] of orfaos) console.warn(`  ${c.uf} cargo ${c.cargo} nº ${c.numero} ${c.nome}`)
}
