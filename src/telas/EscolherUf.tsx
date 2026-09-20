import { useEffect, useRef } from 'react'
import { UFS } from '../dados/ufs.ts'

export function EscolherUf({ onEscolher }: { onEscolher: (uf: string) => void }) {
  const titulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    titulo.current?.focus({ preventScroll: true })
  }, [])

  return (
    <section className="tela">
      <h1 className="titulo" tabIndex={-1} ref={titulo}>
        Escolha o estado
      </h1>
      <p className="apoio">Presidente aparece em qualquer estado. Os outros cargos são do estado que você escolher.</p>
      <ul className="ufs">
        {Object.entries(UFS).map(([sigla, nome]) => (
          <li key={sigla}>
            <button type="button" className="tecla" aria-label={nome} title={nome} onClick={() => onEscolher(sigla)}>
              {sigla}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
