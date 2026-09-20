// Tamanho e visual provisórios da moldura. Cores neutras de propósito (nada que lembre
// partido ou campanha); a identidade visual definitiva ainda está em aberto.
export const LARGURA = 1080
export const ALTURA = 1080

// Lado maior da foto do eleitor depois de reduzida. Foto de celular tem 12 MP ou mais e
// redesenhar isso a cada movimento do zoom trava aparelho simples.
export const LADO_MAX_FOTO = 2048

// As cores do degradê, do texto e do chip do número vêm do esquema (esquemas.ts).
export const TEMA = {
  fundo: '#f4f1ea',
  rodape: '#4b5563',
  anel: '#ffffff',
  avatarFundo: '#d5d9df',
  avatarFigura: '#8a93a1',
  familia: "system-ui, 'Segoe UI', Roboto, sans-serif",
}

export const RODAPE = 'Montagem feita por eleitor, sem vínculo com candidatos, partidos, campanhas ou TSE'

// CD_CARGO do TSE. Vice e suplentes (2, 4, 9, 10) não têm moldura própria.
export const ROTULO_CARGO: Record<number, string> = {
  1: 'Presidente',
  3: 'Governador',
  5: 'Senador',
  6: 'Deputado Federal',
  7: 'Deputado Estadual',
  8: 'Deputado Distrital',
}
