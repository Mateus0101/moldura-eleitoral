import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type PointerEvent } from 'react'
import { SetaEsquerda } from '../componentes/icones.tsx'
import { CORES_PARTIDO } from '../dados/cores-partidos.ts'
import type { Candidato } from '../dados/tipos.ts'
import {
  AJUSTE_INICIAL,
  AREA_FOTO,
  LARGURA,
  arrastar,
  carregarFotoCandidato,
  carregarFotoEleitor,
  desenharMoldura,
  dimensoes,
  estiloMoldura,
  exportarImagem,
  gradienteCss,
  type Ajuste,
  type Esquema,
  type FonteImagem,
} from '../moldura/index.ts'

const PASSO_TECLADO = 40 // px do canvas por toque numa seta

const ROTULO_ESQUEMA: Record<Esquema, string> = {
  partido: 'Cores do partido',
  branco: 'Branco',
  preto: 'Preto',
  bandeira: 'Bandeira do Brasil',
}

type Props = { candidato: Candidato; onTrocar: () => void }

export function Editor({ candidato, onTrocar }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const titulo = useRef<HTMLHeadingElement>(null)
  const entradaFoto = useRef<HTMLInputElement>(null)
  const [fotoCandidato, setFotoCandidato] = useState<FonteImagem | null>(null)
  const [fotoEleitor, setFotoEleitor] = useState<FonteImagem | null>(null)
  const [ajuste, setAjuste] = useState<Ajuste>(AJUSTE_INICIAL)
  const [nomeEleitor, setNomeEleitor] = useState('')
  const [erro, setErro] = useState('')

  // "Cores do partido" só aparece para partido com cores já cadastradas; sem elas, o padrão é preto.
  const coresPartido = CORES_PARTIDO[candidato.partido]
  const esquemas: Esquema[] = coresPartido
    ? ['partido', 'branco', 'preto', 'bandeira']
    : ['branco', 'preto', 'bandeira']
  const [esquema, setEsquema] = useState<Esquema>(coresPartido ? 'partido' : 'preto')
  const cores = useMemo(() => estiloMoldura(esquema, coresPartido), [esquema, coresPartido])

  useEffect(() => {
    titulo.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    if (candidato.semFoto) return
    let ativo = true
    carregarFotoCandidato(candidato.origem, candidato.id).then((img) => ativo && setFotoCandidato(img))
    return () => {
      ativo = false
    }
  }, [candidato])

  useEffect(() => {
    if (!canvas.current) return
    desenharMoldura(canvas.current, {
      candidato: {
        nome: candidato.nome,
        numero: candidato.numero,
        cargo: candidato.cargo,
        partido: candidato.partido,
        uf: candidato.origem,
        vice: candidato.vice?.nome,
      },
      nomeEleitor,
      cores,
      fotoCandidato,
      fotoEleitor,
      ajuste,
    })
  }, [candidato, nomeEleitor, cores, fotoCandidato, fotoEleitor, ajuste])

  async function escolherFoto(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = '' // permite escolher o mesmo arquivo de novo
    if (!arquivo) return
    try {
      setFotoEleitor(await carregarFotoEleitor(arquivo))
      setAjuste(AJUSTE_INICIAL)
      setErro('')
    } catch {
      setErro('Não foi possível abrir essa foto. Tente outra, em JPG ou PNG.')
    }
  }

  function mover(dx: number, dy: number) {
    if (!fotoEleitor) return
    const { largura, altura } = dimensoes(fotoEleitor)
    setAjuste((a) => arrastar(a, dx, dy, largura, altura, AREA_FOTO))
  }

  function aoArrastar(e: PointerEvent<HTMLCanvasElement>) {
    if (e.buttons !== 1) return
    const escala = LARGURA / e.currentTarget.getBoundingClientRect().width
    mover(e.movementX * escala, e.movementY * escala)
  }

  function aoTeclar(e: KeyboardEvent<HTMLCanvasElement>) {
    const passos: Record<string, [number, number]> = {
      ArrowLeft: [-PASSO_TECLADO, 0],
      ArrowRight: [PASSO_TECLADO, 0],
      ArrowUp: [0, -PASSO_TECLADO],
      ArrowDown: [0, PASSO_TECLADO],
    }
    const passo = passos[e.key]
    if (!passo) return
    e.preventDefault()
    mover(...passo)
  }

  async function baixar() {
    if (!canvas.current) return
    try {
      const blob = await exportarImagem(canvas.current)
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `moldura-${candidato.numero}.jpg`
      link.click()
      setTimeout(() => URL.revokeObjectURL(link.href), 1000)
      setErro('')
    } catch {
      setErro('Não foi possível gerar a imagem. Tente de novo.')
    }
  }

  const nome = nomeEleitor.replace(/\s+/g, ' ').trim()

  return (
    <section className="tela">
      <button type="button" className="voltar" onClick={onTrocar}>
        <SetaEsquerda />
        Trocar candidato
      </button>
      <h1 className="titulo" tabIndex={-1} ref={titulo}>
        Monte sua moldura
      </h1>

      <canvas
        ref={canvas}
        className="previa"
        role="img"
        aria-label={`Prévia da moldura de apoio a ${candidato.nome}, número ${candidato.numero}. Com uma foto escolhida, use as setas do teclado para mover.`}
        tabIndex={fotoEleitor ? 0 : -1}
        onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
        onPointerMove={aoArrastar}
        onKeyDown={aoTeclar}
      />

      <div className="controles">
        <div className="campo">
          <button type="button" className="botao" onClick={() => entradaFoto.current?.click()}>
            {fotoEleitor ? 'Trocar foto' : 'Escolher foto'}
          </button>
          <input ref={entradaFoto} type="file" accept="image/*" hidden onChange={escolherFoto} />
          <p className="nota">
            {fotoEleitor
              ? 'Arraste a foto para enquadrar.'
              : 'Escolha uma foto sua. Ela e seu nome ficam só neste aparelho: nada é enviado.'}
          </p>
        </div>

        <label className="campo">
          <span>Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={ajuste.zoom}
            disabled={!fotoEleitor}
            onChange={(e) => setAjuste((a) => ({ ...a, zoom: Number(e.target.value) }))}
          />
        </label>

        <div className="campo" role="group" aria-labelledby="titulo-cores">
          <span id="titulo-cores">Cores da moldura</span>
          <div className="opcoes">
            {esquemas.map((e) => (
              <button
                key={e}
                type="button"
                className="chip"
                aria-pressed={esquema === e}
                onClick={() => setEsquema(e)}
              >
                <span className="amostra" style={{ background: gradienteCss(estiloMoldura(e, coresPartido)) }} />
                {ROTULO_ESQUEMA[e]}
              </button>
            ))}
          </div>
        </div>

        <div className="campo">
          <label htmlFor="nome-eleitor">Seu nome (opcional)</label>
          <input
            id="nome-eleitor"
            type="text"
            className="texto"
            autoComplete="name"
            maxLength={40}
            placeholder="Ex.: Seu nome ou apelido"
            aria-describedby="dica-nome"
            value={nomeEleitor}
            onChange={(e) => setNomeEleitor(e.target.value)}
          />
          <p id="dica-nome" className="nota">
            {nome ? `Na imagem: “${nome} apoia”.` : 'Sem nome, a imagem diz “Eu apoio”.'}
          </p>
        </div>

        {erro && (
          <p className="erro" role="alert">
            {erro}
          </p>
        )}

        <button type="button" className="botao botao-principal" disabled={!fotoEleitor} onClick={baixar}>
          Baixar imagem
        </button>
      </div>
    </section>
  )
}
