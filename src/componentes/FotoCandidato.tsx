import { useState } from 'react'
import { Silhueta } from './icones.tsx'

type Props = { origem: string; id: number; semFoto?: boolean }

// Miniatura da candidatura. Sem foto (ou se o arquivo falhar) mostra a silhueta.
// O nome do candidato está sempre ao lado, então a imagem é decorativa (alt vazio).
export function FotoCandidato({ origem, id, semFoto }: Props) {
  const [falhou, setFalhou] = useState(false)

  if (semFoto || falhou) {
    return (
      <span className="foto foto-vazia">
        <Silhueta />
      </span>
    )
  }
  return (
    <img
      className="foto"
      src={`${import.meta.env.BASE_URL}fotos/${origem}/${id}.jpg`}
      alt=""
      width={56}
      height={72}
      loading="lazy"
      decoding="async"
      onError={() => setFalhou(true)}
    />
  )
}
