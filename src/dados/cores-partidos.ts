// Cores de cada partido para o degradê da moldura, da principal para as secundárias. A principal
// fica sob o texto e as demais aparecem à direita, sob o chip do número. Só entram aqui as cores
// já conferidas uma a uma; partido que não está na lista usa o azul-noite neutro.
//
// Chave: sigla como vem do TSE (PCDOB, UNIÃO, MISSÃO...).
// Regra da fonte: hex declarado na fonte indicada > cor medida na imagem da fonte > Commons.
// "Medido" = cor dominante da imagem, em pixels; não é cor oficial.
export const CORES_PARTIDO: Record<string, readonly string[]> = {
  // Imagem da matéria (agir.jpg) e logo do Commons dão os mesmos dois azuis.
  AGIR: ['#0030a2', '#2171cc'],

  // Site do partido: logo em avante70.org.br (o CSS do site usa #d27901 em todo lugar).
  // O logo do Commons tem tons bem mais vivos (#f15a1c, #00aab5).
  AVANTE: ['#d27901', '#67a4ad'],

  // Logo do Cidadania 23 (Wikipédia), medido. O logo do Commons é outra versão (azul #101a63, sem o verde-água).
  CIDADANIA: ['#022e4a', '#ec008c', '#23beaa'],

  // Cores declaradas no quadro do artigo da Wikipédia: Azure #0065cb, Azul real #0009a8, Dourado #c89721.
  // O amarelo medido no logo é mais vivo (#fac715).
  DC: ['#0065cb', '#c89721'],

  // Logo da Wikipédia, medido (o artigo não declara as cores).
  DEMOCRATA: ['#0f3b7d', '#3da162'],

  // Logo em PNG hospedado pela Câmara de Esteio-RS (fonte não oficial), medido: texto preto,
  // faixa verde e amarela. A cor principal (preto ou verde) está em aberto.
  MDB: ['#000000', '#268823', '#fcd300'],

  // Declaradas no quadro da Wikipédia: vermelho #DA010A, branco, preto. O logo medido tem um roxo
  // escuro (#460e48) no lugar do preto.
  MOBILIZA: ['#da010a', '#000000'],

  // Bandeira do partido (Wikipédia/Commons, 2023), medida. Uma cor só.
  NOVO: ['#f3702b'],

  // Bandeira do partido (Wikimedia Commons): fundo azul com as faixas amarela e verde. O PNG do mesmo
  // arquivo mede #005aac / #fcd400 / #01a64e (tons um pouco diferentes).
  PL: ['#014f9f', '#fed500', '#019640'],

  // Foto de perfil da página oficial no Facebook, medida. O logo do Commons é mais vivo (#ff0100, #fffc00).
  PCB: ['#d20406', '#fdc402'],

  // Bandeira do partido (Wikipédia/Commons), medida.
  PCDOB: ['#db2016', '#fefc00'],

  // Bandeira do partido (Wikipédia/Commons), medida.
  PCO: ['#cb0100', '#fcec15'],

  // Logo do artigo da Wikipédia, medido. O quadro do artigo declara outras cores (verde #00d663,
  // azul #0097fd, roxo #673796), que não aparecem nesse logo: em aberto.
  PODE: ['#478ecc', '#1dad49'],

  // Imagem da matéria da Agência Brasil (jul/2026): "PP" em branco sobre vermelho e azul-marinho, medida.
  // O logo do Commons (Progressistas) é azul-claro e azul-marinho (#40b5e7, #0c4071): em aberto.
  PP: ['#ff0000', '#012b7b'],

  // Imagem da matéria (prd.jpg), medida; bate com o logo do Commons.
  PRD: ['#038240', '#184486', '#f1d53d'],

  // Logos do site oficial, medidos. O CSS do site usa as cores da bandeira (#002776, #009c3b, #ffdf00).
  PRTB: ['#0148aa', '#06a449', '#fedc05'],

  // O texto do site diz "suas cores são o vermelho e amarelo". Amarelo medido no logo do site (o do PSB-MG);
  // vermelho do logo nacional (Commons), já que o logo do site é todo amarelo.
  PSB: ['#e00000', '#feb32b'],

  // Logo do site oficial, medido; bate com o Commons.
  PSD: ['#013f88', '#fcb814', '#7fc242'],

  // Imagem da matéria do O Globo, medida; bate com o Commons. A matéria fala em aposentar mascote ou número
  // após a fusão com o Podemos: pode mudar.
  PSDB: ['#0028bc', '#febc16'],

  // Bandeira oficial (Wikipédia, com origem em psol50.org.br/identidade): fundo amarelo, sol e texto vermelhos.
  // A página de identidade do site também usa amarelo (#ffcc00) e roxo (#4c0068); o logo do Commons é roxo.
  PSOL: ['#fedc16', '#de2e22'],

  // Logo do site oficial (og:image), medido; bate com o logo pequeno do site e com o Commons.
  PSTU: ['#d50e15', '#f0e207'],

  // Logo do site oficial (página de identidade visual), medido. O CSS do site usa #016124. Uma cor só.
  PV: ['#016227'],

  // Logo da Wikipédia, medido: verde-água, laranja e o texto em cinza-escuro (#454545, não usado).
  REDE: ['#2facae', '#f05921'],

  // Logo oficial no site do partido (2026), medido; o CSS do site usa as mesmas três cores.
  REPUBLICANOS: ['#005caa', '#fdc300', '#009d3d'],

  // Laranja do logo da Wikipédia, medido (bate com a cor de meta do artigo, #f37021), e azul declarado no
  // quadro do artigo. O quadro também declara laranja #db5838, que não aparece no logo.
  SOLIDARIEDADE: ['#f3711f', '#293b97'],

  // Foto de perfil da conta oficial no X, medida; bate com o Commons.
  UNIÃO: ['#044ea0', '#f9c70c', '#1ab1e8'],
}
