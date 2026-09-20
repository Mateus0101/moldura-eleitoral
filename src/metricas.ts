// Única métrica do app: quantas imagens foram geradas (baixadas ou compartilhadas). Não identifica
// ninguém e não envia foto, nome, candidato nem estado.
//
// Usa o GoatCounter (https://www.goatcounter.com): um pedido de imagem para
// https://<código>.goatcounter.com/count?p=<evento>&e=true. Sem cookies e sem guardar IP, e sem carregar
// o script deles. O código do site vem de VITE_GOATCOUNTER (arquivo .env.production); sem ele, nada é enviado.

const CODIGO = (import.meta.env.VITE_GOATCOUNTER as string | undefined)?.trim()

export const contadorAtivo = Boolean(CODIGO)

export type EventoImagem = 'baixada' | 'compartilhada'

export function contarImagemGerada(evento: EventoImagem): void {
  if (!CODIGO) return
  const pixel = new Image()
  pixel.referrerPolicy = 'no-referrer' // nem o endereço da página vai junto
  pixel.src = `https://${CODIGO}.goatcounter.com/count?p=imagem-${evento}&e=true&rnd=${Date.now()}`
}
