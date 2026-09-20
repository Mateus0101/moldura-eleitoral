// Publica o site (o app e as fotos) num repositório público do GitHub, de onde o GitHub Pages serve.
//
// O código-fonte fica no repositório privado; para o site vai só o resultado do build, que já é
// público para quem abre a página. O script mantém uma cópia local do repositório do site em
// .publicar/site (fora do git) e só mexe no que mudou: as ~20 mil fotos quase nunca mudam, então
// não são recopiadas nem reenviadas. A primeira publicação é a demorada (uns minutos: o git empacota
// ~20 mil arquivos pequenos); as seguintes levam segundos a poucos minutos.
//
// Uso: npm run publicar                  build + envia
//      npm run publicar -- --sem-build   reenvia o dist/ que já existe (confere se o caminho-base bate)
//      npm run publicar -- --teste       ensaio: usa um repositório local temporário e não envia nada
//
// Configuração, por variáveis de ambiente:
//   SITE_REPO     repositório do site (padrão: git@github.com:Mateus0101/moldura-eleitoral-site.git)
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
  const r = spawnSync(comando, argumentos, { cwd: raiz, encoding: 'utf8', ...opcoes })
  if (r.status !== 0) {
    if (r.stdout) console.error(r.stdout)
    if (r.stderr) console.error(r.stderr)
    throw new Error(`Falhou: ${comando} ${argumentos.join(' ')}`)
  }
  return (r.stdout ?? '').trim()
}
const git = (cwd, ...argumentos) => rodar('git', argumentos, { cwd })

// --- Configuração -------------------------------------------------------------

let repo = process.env.SITE_REPO ?? 'git@github.com:Mateus0101/moldura-eleitoral-site.git'
let pastaTeste = ''
if (teste) {
  pastaTeste = mkdtempSync(join(tmpdir(), 'site-teste-'))
  repo = join(pastaTeste, 'remoto.git')
  git(raiz, 'init', '-q', '--bare', '-b', 'main', repo)
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
    console.error('Crie antes o repositório PÚBLICO no GitHub (vazio, sem README) e confira o acesso SSH.')
    throw erro
  }
}
git(copia, 'remote', 'set-url', 'origin', repo)
// Mesma identidade do projeto: o e-mail de privacidade do GitHub. Com o e-mail pessoal o push é recusado.
git(copia, 'config', 'user.name', git(raiz, 'config', 'user.name'))
git(copia, 'config', 'user.email', git(raiz, 'config', 'user.email'))
// O que vai para o site tem de ser byte a byte o do build: sem conversão de fim de linha do Windows.
git(copia, 'config', 'core.autocrlf', 'false')

const jaTemMain = git(copia, 'ls-remote', '--heads', 'origin', 'main') !== ''
if (jaTemMain) {
  git(copia, 'fetch', '-q', 'origin', 'main')
  git(copia, 'checkout', '-q', '-B', 'main', 'origin/main')
} else {
  git(copia, 'checkout', '-q', '-B', 'main')
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

git(copia, 'add', '-A')
if (git(copia, 'status', '--porcelain') === '') {
  console.log('Nada mudou desde a última publicação.')
} else {
  const origem = git(raiz, 'rev-parse', '--short', 'HEAD')
  git(copia, 'commit', '-q', '-m', `Publica o site (código ${origem}, ${new Date().toISOString().slice(0, 10)})`)
  console.log(git(copia, 'show', '--stat', '--format=Commit %h: %s', 'HEAD').split('\n').at(-1))
  git(copia, 'push', '-q', '-u', 'origin', 'main') // sem --force: o histórico do site só cresce
  console.log(teste ? `Ensaio ok (repositório de teste em ${pastaTeste}).` : `Publicado em ${repo}.`)
  if (!jaTemMain && !teste) {
    console.log('\nPrimeira publicação. Falta ativar o GitHub Pages:')
    console.log('  repositório do site > Settings > Pages > Source: "Deploy from a branch" > main, pasta / (root)')
    console.log(`  O site fica em https://<usuário>.github.io${base}`)
  }
}
if (teste) console.log(`COPIA=${copia}\nREMOTO=${repo}`)
