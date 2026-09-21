import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type PointerEvent } from 'react'
import { SetaEsquerda } from '../componentes/icones.tsx'
import { CORES_PARTIDO } from '../dados/cores-partidos.ts'
import type { Candidato } from '../dados/tipos.ts'
import { contarImagemGerada } from '../metricas.ts'
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
  ErroFoto,
  type Ajuste,
  type Esquema,
  type FonteImagem,
  type MotivoErroFoto,
} from '../moldura/index.ts'

const PASSO_TECLADO = 40 // px do canvas por toque numa seta
const ESPERA_DO_ARQUIVO = 350 // ms parado até gerar o JPEG que o "Compartilhar" vai enviar

// Compartilhar arquivo (a imagem) pelo menu do sistema: WhatsApp, Instagram, Telegram... Está no
// celular e em parte dos computadores; onde não existe, o app só oferece baixar.
function suportaCompartilharArquivo(): boolean {
  try {
    return (
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [new File([''], 'moldura.jpg', { type: 'image/jpeg' })] })
    )
  } catch {
    return false
  }
}

const MENSAGEM_FOTO: Record<MotivoErroFoto, string> = {
  leitura: 'Não consegui ler esse arquivo. Escolha a foto de novo, de dentro da galeria.',
  formato: 'Esse formato de foto (HEIC) não abre neste aparelho. Escolha uma foto em JPG ou PNG, ou tire um print dela.',
  decodificacao: 'Essa foto não abriu neste aparelho. Tente outra, em JPG ou PNG.',
  memoria: 'A foto é grande demais para este aparelho. Tente uma menor, em JPG ou PNG.',
}

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
  const [podeCompartilhar] = useState(suportaCompartilharArquivo)
  // O JPEG fica pronto antes do clique: o navegador só deixa abrir o menu de compartilhar dentro do
  // gesto do toque, e gerar a imagem na hora (é assíncrono) faria o iPhone recusar.
  const [arquivo, setArquivo] = useState<File | null>(null)

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

  // Gera o arquivo quando a moldura para de mudar. Ao mudar de novo, o anterior deixa de valer na hora.
  useEffect(() => {
    if (!fotoEleitor || !canvas.current) return
    const tela = canvas.current
    let vale = true
    const espera = setTimeout(async () => {
      try {
        const blob = await exportarImagem(tela)
        if (vale) setArquivo(new File([blob], `moldura-${candidato.numero}.jpg`, { type: blob.type }))
      } catch {
        // sem arquivo pronto, "Compartilhar" fica desativado e "Baixar" gera na hora
      }
    }, ESPERA_DO_ARQUIVO)
    return () => {
      vale = false
      clearTimeout(espera)
      setArquivo(null)
    }
  }, [candidato, nomeEleitor, cores, fotoCandidato, fotoEleitor, ajuste])

  async function escolherFoto(e: ChangeEvent<HTMLInputElement>) {
    const entrada = e.target
    const arquivo = entrada.files?.[0]
    if (!arquivo) return
    try {
      setFotoEleitor(await carregarFotoEleitor(arquivo))
      setAjuste(AJUSTE_INICIAL)
      setErro('')
    } catch (falha) {
      const motivo = falha instanceof ErroFoto ? falha.motivo : 'decodificacao'
      const detalhe = falha instanceof ErroFoto && falha.detalhe ? ` (Detalhe: ${falha.detalhe}.)` : ''
      setErro(MENSAGEM_FOTO[motivo] + detalhe)
    } finally {
      // Só limpa o campo depois de ler a foto (permite escolher o mesmo arquivo de novo). No Android,
      // limpar antes pode soltar o arquivo antes de ele ser lido.
      entrada.value = ''
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
      const blob = arquivo ?? (await exportarImagem(canvas.current))
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `moldura-${candidato.numero}.jpg`
      link.click()
      setTimeout(() => URL.revokeObjectURL(link.href), 1000)
      setErro('')
      contarImagemGerada('baixada')
    } catch {
      setErro('Não foi possível gerar a imagem. Tente de novo.')
    }
  }

  async function compartilhar() {
    if (!arquivo) return
    try {
      await navigator.share({ files: [arquivo] })
      setErro('')
      contarImagemGerada('compartilhada')
    } catch (e) {
      // Fechar o menu sem escolher nada não é erro.
      if (e instanceof DOMException && e.name === 'AbortError') return
      setErro('Não foi possível abrir o compartilhamento. Baixe a imagem e envie pelo app que preferir.')
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
              : 'Escolha uma foto sua. Ela e o seu nome nunca saem do aparelho.'}
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

        {podeCompartilhar ? (
          <>
            <button type="button" className="botao botao-principal" disabled={!arquivo} onClick={compartilhar}>
              Compartilhar
            </button>
            <button type="button" className="botao" disabled={!fotoEleitor} onClick={baixar}>
              Baixar imagem
            </button>
          </>
        ) : (
          <button type="button" className="botao botao-principal" disabled={!fotoEleitor} onClick={baixar}>
            Baixar imagem
          </button>
        )}
      </div>
    </section>
  )
}
