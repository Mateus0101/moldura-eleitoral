import { useEffect, useRef, useState } from 'react'
import './App.css'
import { AvisoAtualizacao } from './componentes/AvisoAtualizacao.tsx'
import { SetaBaixo } from './componentes/icones.tsx'
import { carregarCandidatos, carregarDataDosDados } from './dados/carregar.ts'
import type { Candidato } from './dados/tipos.ts'
import { contadorAtivo } from './metricas.ts'
import { UFS } from './dados/ufs.ts'
import { Busca } from './telas/Busca.tsx'
import { EscolherUf } from './telas/EscolherUf.tsx'
import { Editor } from './telas/Editor.tsx'

const CHAVE_UF = 'moldura:uf'

// Lembrar o estado é só conveniência: sem armazenamento (aba anônima, por exemplo), segue sem lembrar.
function lerUfSalva(): string | null {
  try {
    const uf = localStorage.getItem(CHAVE_UF)
    return uf && uf in UFS ? uf : null
  } catch {
    return null
  }
}

function guardarUf(uf: string) {
  try {
    localStorage.setItem(CHAVE_UF, uf)
  } catch {
    // ignora
  }
}

type Carga = { uf: string; lista?: Candidato[]; erro?: true }

function App() {
  const [uf, setUf] = useState<string | null>(lerUfSalva)
  const [carga, setCarga] = useState<Carga>()
  const [tentativa, setTentativa] = useState(0)
  const [candidato, setCandidato] = useState<Candidato | null>(null)
  const [geradoEm, setGeradoEm] = useState('')
  const rolagem = useRef(0)

  useEffect(() => {
    if (!uf) return
    let ativo = true
    carregarCandidatos(uf).then(
      (lista) => ativo && setCarga({ uf, lista }),
      () => ativo && setCarga({ uf, erro: true }),
    )
    return () => {
      ativo = false
    }
  }, [uf, tentativa])

  useEffect(() => {
    let ativo = true
    carregarDataDosDados().then(
      (data) => ativo && setGeradoEm(data),
      () => {}, // a data é só informação: se falhar, some do rodapé
    )
    return () => {
      ativo = false
    }
  }, [])

  // O botão "voltar" do celular fecha o editor em vez de sair do app.
  useEffect(() => {
    const aoVoltar = () => setCandidato(null)
    window.addEventListener('popstate', aoVoltar)
    return () => window.removeEventListener('popstate', aoVoltar)
  }, [])

  // Editor abre no topo; ao voltar, a lista reaparece onde a pessoa estava.
  useEffect(() => {
    window.scrollTo(0, candidato ? 0 : rolagem.current)
  }, [candidato])

  function escolherUf(sigla: string) {
    guardarUf(sigla)
    setUf(sigla)
    setCarga(undefined)
    setCandidato(null)
  }

  function escolherCandidato(c: Candidato) {
    rolagem.current = window.scrollY
    history.pushState({ editor: true }, '')
    setCandidato(c)
  }

  function voltarParaLista() {
    if (history.state?.editor) history.back()
    else setCandidato(null)
  }

  function tentarDeNovo() {
    setCarga(undefined)
    setTentativa((n) => n + 1)
  }

  const atual = carga?.uf === uf ? carga : undefined
  const dataDados = geradoEm && `${geradoEm.slice(8, 10)}/${geradoEm.slice(5, 7)}/${geradoEm.slice(0, 4)}`

  return (
    <div className="app">
      <header className="topo">
        <span className="marca">Moldura Eleitoral</span>
        {uf && (
          <button
            type="button"
            className="estado"
            aria-label={`Estado: ${UFS[uf]}. Trocar estado`}
            onClick={() => {
              setUf(null)
              setCandidato(null)
            }}
          >
            {uf}
            <SetaBaixo />
          </button>
        )}
      </header>

      {uf && (
        <ol className="passos" aria-label="Passos">
          <li aria-current={candidato ? undefined : 'step'}>Candidato</li>
          <li aria-current={candidato ? 'step' : undefined}>Sua foto</li>
        </ol>
      )}

      <main>
        {!uf && <EscolherUf onEscolher={escolherUf} />}

        {uf && !atual && (
          <p className="apoio" role="status">
            Carregando candidatos de {UFS[uf]}…
          </p>
        )}

        {atual?.erro && (
          <div className="vazio">
            <p role="alert">Não foi possível carregar os candidatos. Verifique a conexão e tente de novo.</p>
            <button type="button" className="botao" onClick={tentarDeNovo}>
              Tentar de novo
            </button>
          </div>
        )}

        {uf && atual?.lista && (
          <div hidden={!!candidato}>
            <Busca key={uf} lista={atual.lista} onEscolher={escolherCandidato} />
          </div>
        )}

        {candidato && <Editor key={candidato.id} candidato={candidato} onTrocar={voltarParaLista} />}
      </main>

      <AvisoAtualizacao />

      <footer className="rodape">
        <p>
          Aplicativo independente, sem vínculo com o TSE, candidatos, partidos ou campanhas.
          {dataDados && ` Dados do TSE gerados em ${dataDados}.`}
          {contadorAtivo && ' Só contamos quantas imagens são geradas, sem saber quem as gerou.'}
        </p>
      </footer>
    </div>
  )
}

export default App
