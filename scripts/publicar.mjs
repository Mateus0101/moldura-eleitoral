// Publica o site (o app e as fotos) na branch gh-pages do repositório, de onde o GitHub Pages serve
// (o repositório precisa ser público no plano grátis).
//
// A gh-pages não tem histórico em comum com o código: guarda só o resultado do build (o app compilado
// e as ~20 mil fotos, que já são públicos para quem abre a página) e mantém as fotos fora da main.
// O script mantém uma cópia local do repositório em
// .publicar/site (fora do git) e só mexe no que mudou: as ~20 mil fotos quase nunca mudam, então
// não são recopiadas nem reenviadas. A primeira publicação é a demorada (uns minutos: o git empacota
// ~20 mil arquivos pequenos); as seguintes levam segundos a poucos minutos.
//
// Uso: npm run publicar                  build + envia
//      npm run publicar -- --sem-build   reenvia o dist/ que já existe (confere se o caminho-base bate)
//      npm run publicar -- --teste       ensaio: usa um repositório local temporário e não envia nada
//
// Configuração, por variáveis de ambiente:
//   SITE_REPO     repositório do site (padrão: o origin deste projeto)
//   SITE_BRANCH   branch do site (padrão: gh-pages; use main se o site tiver um repositório só dele)
//   SITE_DOMINIO  domínio próprio (ex.: meuapp.com.br): grava o CNAME e usa o caminho-base "/"
//   SITE_BASE     força o caminho-base (padrão: "/<nome do repositório>/", ou "/" com domínio próprio).
//                 No Git Bash do Windows, prefixe o comando com MSYS_NO_PATHCONV=1, senão o Git Bash
//                 troca "/nome/" por "C:/Program Files/Git/nome/".
//   SITE_COPIA    pasta da cópia local do repositório do site (padrão: .publicar/site)
//   SITE_DIST     pasta do build (padrão: dist); serve para ensaiar com um site pequeno

import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = process.env.SITE_DIST ?? join(raiz, 'dist')
const args = new Set(process.argv.slice(2))
const teste = args.has('--teste')
const semBuild = args.has('--sem-build')

function rodar(comando, argumentos, opcoes = {}) {
  // maxBuffer alto: com ~20 mil arquivos a saída de alguns comandos do git passa do 1 MB padrão do Node.
  const r = spawnSync(comando, argumentos, { cwd: raiz, encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024, ...opcoes })
  if (r.status !== 0) {
    if (r.error) console.error(r.error.message)
    else {
      // Só o começo da saída: em erro com milhares de linhas, o resto só atrapalha.
      if (r.stdout) console.error(r.stdout.split('\n').slice(0, 20).join('\n'))
      if (r.stderr) console.error(r.stderr.split('\n').slice(0, 20).join('\n'))
    }
    throw new Error(`Falhou: ${comando} ${argumentos.join(' ')}`)
  }
  return (r.stdout ?? '').trim()
}
const git = (cwd, ...argumentos) => rodar('git', argumentos, { cwd })

// --- Configuração -------------------------------------------------------------

let repo = process.env.SITE_REPO ?? git(raiz, 'remote', 'get-url', 'origin')
const ramo = process.env.SITE_BRANCH ?? 'gh-pages'
let pastaTeste = ''
if (teste) {
  pastaTeste = mkdtempSync(join(tmpdir(), 'site-teste-'))
  repo = join(pastaTeste, 'remoto.git')
  git(raiz, 'init', '-q', '--bare', '-b', 'main', repo)
  // Como o repositório de verdade: já tem uma main com o código, e a gh-pages nasce separada.
  const semente = join(pastaTeste, 'semente')
  git(raiz, 'clone', '-q', repo, semente)
  git(semente, 'checkout', '-q', '-B', 'main')
  writeFileSync(join(semente, 'README.md'), 'código\n')
  git(semente, 'add', '-A')
  git(semente, '-c', 'user.name=ensaio', '-c', 'user.email=ensaio@example.com', 'commit', '-q', '-m', 'código')
  git(semente, 'push', '-q', 'origin', 'main')
}
const dominio = process.env.SITE_DOMINIO
const nomeRepo = basename(repo).replace(/\.git$/, '')
const base = process.env.SITE_BASE ?? (dominio ? '/' : teste ? '/moldura-eleitoral-site/' : `/${nomeRepo}/`)

// --- Build --------------------------------------------------------------------

if (!semBuild) {
  console.log(`Gerando o site (caminho-base ${base})...`)
  // O mesmo que "npm run build" (tsc -b && vite build), direto pelo Node, sem passar por shell.
  rodar(process.execPath, [join(raiz, 'node_modules/typescript/bin/tsc'), '-b'], { stdio: 'inherit' })
  rodar(process.execPath, [join(raiz, 'node_modules/vite/bin/vite.js'), 'build', '--base', base], { stdio: 'inherit' })
}
if (!existsSync(join(dist, 'index.html'))) throw new Error('Não achei dist/index.html: rode sem --sem-build.')
if (base !== '/' && !readFileSync(join(dist, 'index.html'), 'utf8').includes(base)) {
  throw new Error(`O dist/ atual não foi gerado com o caminho-base ${base}. Rode sem --sem-build.`)
}

// --- Cópia de trabalho do repositório do site ---------------------------------

const copia = teste ? join(pastaTeste, 'copia') : (process.env.SITE_COPIA ?? join(raiz, '.publicar', 'site'))
if (!existsSync(join(copia, '.git'))) {
  mkdirSync(dirname(copia), { recursive: true })
  try {
    rodar('git', ['clone', '-q', repo, copia])
  } catch (erro) {
    console.error(`\nNão consegui clonar ${repo}.`)
    console.error('Confira se o repositório existe e se o acesso SSH está funcionando (git ls-remote no endereço acima).')
    throw erro
  }
}
git(copia, 'remote', 'set-url', 'origin', repo)
// Mesma identidade do projeto: o e-mail de privacidade do GitHub. Com o e-mail pessoal o push é recusado.
git(copia, 'config', 'user.name', git(raiz, 'config', 'user.name'))
git(copia, 'config', 'user.email', git(raiz, 'config', 'user.email'))
// O que vai para o site tem de ser byte a byte o do build: sem conversão de fim de linha do Windows.
git(copia, 'config', 'core.autocrlf', 'false')

const tentar = (...argumentos) => spawnSync('git', argumentos, { cwd: copia, stdio: 'ignore' }).status === 0

const jaTemRamo = git(copia, 'ls-remote', '--heads', 'origin', ramo) !== ''
if (jaTemRamo) {
  git(copia, 'fetch', '-q', 'origin', ramo)
  git(copia, 'checkout', '-q', '-B', ramo, `origin/${ramo}`)
} else if (tentar('checkout', '-q', '--orphan', ramo)) {
  // Branch nova, sem nada em comum com o código: começa vazia (o índice ainda tem os arquivos da main).
  tentar('rm', '-r', '-q', '--cached', '.')
} else {
  git(copia, 'checkout', '-q', '-B', ramo) // repositório ainda vazio: não há de onde separar
}

// --- Troca o conteúdo pelo build novo -----------------------------------------

// Só toca no que mudou: arquivo igual fica intacto (o git não precisa reler as ~20 mil fotos) e o que
// saiu do build some. .git, .nojekyll e CNAME são do repositório do site, não do build.
const DO_SITE = new Set(['.nojekyll', 'CNAME'])

function sincronizar(de, para, raizDoSite = false) {
  mkdirSync(para, { recursive: true })
  const novos = new Map(readdirSync(de, { withFileTypes: true }).map((d) => [d.name, d]))
  for (const antigo of readdirSync(para, { withFileTypes: true })) {
    if (raizDoSite && (antigo.name === '.git' || DO_SITE.has(antigo.name))) continue
    const novo = novos.get(antigo.name)
    if (!novo || novo.isDirectory() !== antigo.isDirectory()) {
      rmSync(join(para, antigo.name), { recursive: true, force: true })
    }
  }
  for (const [nome, entrada] of novos) {
    const origem = join(de, nome)
    const destino = join(para, nome)
    if (entrada.isDirectory()) sincronizar(origem, destino)
    else if (!existsSync(destino) || !readFileSync(origem).equals(readFileSync(destino))) copyFileSync(origem, destino)
  }
}

sincronizar(dist, copia, true)
// Sem o .nojekyll o GitHub Pages passa o site pelo Jekyll.
if (!existsSync(join(copia, '.nojekyll'))) writeFileSync(join(copia, '.nojekyll'), '')
if (dominio) writeFileSync(join(copia, 'CNAME'), `${dominio}\n`)
else rmSync(join(copia, 'CNAME'), { force: true })

console.log('Preparando os arquivos para o git (na primeira vez leva alguns minutos, sem mostrar nada)...')
git(copia, 'add', '-A')
let commitou = false
if (git(copia, 'status', '--porcelain') !== '') {
  const origem = git(raiz, 'rev-parse', '--short', 'HEAD')
  git(copia, 'commit', '-q', '-m', `Publica o site (código ${origem}, ${new Date().toISOString().slice(0, 10)})`)
  commitou = true
  // shortstat: uma linha de resumo. O --stat listaria um arquivo por linha (~20 mil).
  console.log(git(copia, 'show', '--shortstat', '--format=', 'HEAD').split('\n').filter(Boolean).at(-1))
}

// Envia sempre que o site local está à frente do GitHub, e não só quando houve commit agora: assim
// um commit que ficou preso numa tentativa anterior (que parou antes do envio) também sai.
const noGithub = git(copia, 'ls-remote', '--heads', 'origin', ramo).split('\t')[0]
if (noGithub === git(copia, 'rev-parse', 'HEAD')) {
  console.log('Nada mudou desde a última publicação.')
} else {
  if (!commitou) console.log('Há uma publicação anterior que ainda não chegou ao GitHub.')
  console.log('Enviando ao GitHub (na primeira vez são ~110 MB e leva vários minutos, sem mostrar nada)...')
  git(copia, 'push', '-q', '-u', 'origin', ramo) // sem --force: o histórico do site só cresce
  console.log(teste ? `Ensaio ok (repositório de teste em ${pastaTeste}).` : `Publicado na branch ${ramo} de ${repo}.`)
  if (!jaTemRamo && !teste) {
    console.log('\nPrimeira publicação. Falta ativar o GitHub Pages:')
    console.log(`  repositório > Settings > Pages > Source: "Deploy from a branch" > ${ramo}, pasta / (root)`)
    console.log(`  O site fica em https://<usuário>.github.io${base}`)
  }
}
if (teste) console.log(`COPIA=${copia}\nREMOTO=${repo}`)
