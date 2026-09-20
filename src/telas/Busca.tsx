import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { FotoCandidato } from '../componentes/FotoCandidato.tsx'
import { Lupa } from '../componentes/icones.tsx'
import { NumeroUrna } from '../componentes/NumeroUrna.tsx'
import { FILTROS_VAZIOS, GRUPOS, filtrar, partidosDe } from '../dados/busca.ts'
import type { Candidato, Filtros } from '../dados/tipos.ts'
import { ROTULO_CARGO } from '../moldura/index.ts'

const POR_PAGINA = 40

type Props = { lista: Candidato[]; onEscolher: (candidato: Candidato) => void }

export function Busca({ lista, onEscolher }: Props) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS)
  const [exibidos, setExibidos] = useState(POR_PAGINA)
  const titulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    titulo.current?.focus({ preventScroll: true })
  }, [])

  // O texto é adiado: a lista de milhares de nomes não segura a digitação.
  const texto = useDeferredValue(filtros.texto)
  const resultados = useMemo(
    () => filtrar(lista, { texto, grupo: filtros.grupo, partido: filtros.partido }),
    [lista, texto, filtros.grupo, filtros.partido],
  )
  const partidos = useMemo(() => partidosDe(lista, filtros.grupo), [lista, filtros.grupo])
  const comFiltro = filtros.texto !== '' || filtros.grupo !== 'todos' || filtros.partido !== ''

  function mudar(parte: Partial<Filtros>) {
    const proximo = { ...filtros, ...parte }
    // Trocar de cargo pode deixar o partido escolhido sem nenhum candidato.
    if (parte.grupo && !partidosDe(lista, parte.grupo).includes(proximo.partido)) proximo.partido = ''
    setFiltros(proximo)
    setExibidos(POR_PAGINA)
  }

  const contagem =
    resultados.length === 1 ? '1 candidato' : `${resultados.length.toLocaleString('pt-BR')} candidatos`

  return (
    <section className="tela">
      <h1 className="titulo" tabIndex={-1} ref={titulo}>
        Escolha quem você apoia
      </h1>

      <div className="busca">
        <label className="so-leitor" htmlFor="busca">
          Buscar por nome, número ou partido
        </label>
        <Lupa />
        <input
          id="busca"
          type="search"
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Nome, número ou partido"
          value={filtros.texto}
          onChange={(e) => mudar({ texto: e.target.value })}
        />
      </div>

      <div className="cargos" role="group" aria-label="Cargo">
        {GRUPOS.map((grupo) => (
          <button
            key={grupo.id}
            type="button"
            className="chip"
            aria-pressed={filtros.grupo === grupo.id}
            onClick={() => mudar({ grupo: grupo.id })}
          >
            {grupo.rotulo}
          </button>
        ))}
      </div>

      <div className="refino">
        <label className="partido-filtro">
          <span>Partido</span>
          <select value={filtros.partido} onChange={(e) => mudar({ partido: e.target.value })}>
            <option value="">Todos</option>
            {partidos.map((sigla) => (
              <option key={sigla}>{sigla}</option>
            ))}
          </select>
        </label>
        <p className="contagem" role="status">
          {contagem}
        </p>
      </div>

      {resultados.length === 0 ? (
        <div className="vazio">
          <p>Nenhum candidato encontrado. Confira o número ou tente só o sobrenome.</p>
          {comFiltro && (
            <button type="button" className="botao" onClick={() => mudar({ ...FILTROS_VAZIOS })}>
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <ul className="resultados">
          {resultados.slice(0, exibidos).map((c) => (
            <li key={c.id}>
              <button type="button" className="linha" onClick={() => onEscolher(c)}>
                <FotoCandidato origem={c.origem} id={c.id} semFoto={c.semFoto} />
                <span className="corpo">
                  <span className="nome">{c.nome}</span>
                  <span className="detalhe">
                    <span>{ROTULO_CARGO[c.cargo]}</span>
                    <span className="partido">{c.partido}</span>
                  </span>
                  {c.vice && <span className="detalhe">Vice: {c.vice.nome}</span>}
                </span>
                <NumeroUrna numero={c.numero} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {resultados.length > exibidos && (
        <button type="button" className="botao" onClick={() => setExibidos((n) => n + POR_PAGINA)}>
          Mostrar mais {Math.min(POR_PAGINA, resultados.length - exibidos)}
        </button>
      )}
    </section>
  )
}
