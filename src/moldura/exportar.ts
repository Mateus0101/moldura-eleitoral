// JPEG por padrão: a moldura tem foto de fundo e o arquivo sai bem menor que o PNG,
// o que importa para compartilhar em rede móvel.
export function exportarImagem(
  canvas: HTMLCanvasElement,
  tipo: 'image/jpeg' | 'image/png' = 'image/jpeg',
  qualidade = 0.92,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível gerar a imagem.'))),
      tipo,
      qualidade,
    )
  })
}
