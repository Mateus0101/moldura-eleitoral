# Moldura Eleitoral (nome provisório)

Web app (PWA) neutro e independente: o eleitor escolhe cargo e candidato, insere a própria foto e compartilha uma moldura de apoio nas redes. Ver `README.md` para a visão geral.

## Decisões já tomadas

- Stack: Vite + React + TypeScript + `vite-plugin-pwa` (já instalado, ainda não configurado em `vite.config.ts`).
- A composição da imagem roda no aparelho do eleitor (canvas). A foto do eleitor não vai para servidor.
- Um único template com campos variáveis (foto, nome, número, cargo, partido). Não se desenha moldura por candidato.
- Filtros por cargo: deputado federal, deputado estadual/distrital, senador, governador e vice, presidente e vice. Também busca por UF, nome e número. (Senador é um filtro só: os dados do TSE não distinguem 1ª e 2ª vaga.)
- Neutralidade total: todos os candidatos com o mesmo tratamento, sem patrocínio, sem vínculo com TSE ou campanhas, sem molduras negativas.
- Repositório remoto privado: `git@github.com:Mateus0101/moldura-eleitoral.git` (`origin`, já configurado e com acesso SSH ok). Ainda sem commit e sem push.
- `imagens/` e `dados/` estão no `.gitignore` (só o `.gitkeep` entra). Reavaliar depois, por causa do tamanho.
- Licença: por ora, todos os direitos reservados (sem arquivo `LICENSE` ainda).

## Dados e fotos (analisados em 20/09/2026)

**CSVs do TSE** em `dados/` (gitignored). Não são Excel: veio `consulta_cand_2026.zip` (já descompactado) com um CSV por UF (27), `BR` (presidente/vice), `BRASIL` (consolidado, bate com a soma) e `leiame.pdf`.
- Latin-1, separador `;`, campos entre aspas; `#NULO` e `#NE` significam vazio. Gerados em 20/09/2026 12:30. O TSE atualiza sempre, então regerar os JSON perto de 4/10.
- 20.985 candidaturas. Chave única: `SQ_CANDIDATO` (não é o número da urna).
- Colunas que vão para o app: `SQ_CANDIDATO`, `SG_UF`, `CD_CARGO`, `NR_CANDIDATO`, `NM_URNA_CANDIDATO`, `SG_PARTIDO`, `NM_CANDIDATO` (só para busca). O resto fica de fora. O CSV traz CPF, título de eleitor e data de nascimento reais: nunca podem ir para o bundle. O script de geração usa lista fixa de colunas.
- Substituições: candidaturas substituídas continuam no arquivo (196 grupos com mesmo UF+cargo+número e pessoas diferentes, ex.: Pablo Marçal e Leonardo Avalanche, ambos presidente nº 28). `DS_SITUACAO_CANDIDATURA` vem `#NE` em tudo (só vale até 2022). Regra adotada: manter o maior `SQ_CANDIDATO` de cada (UF, cargo, número), o que dá 20.780 vigentes. É inferência (o menor SQ parece ser o original), então conferir uma amostra no site do TSE antes de lançar.
- Vice e suplentes ligam ao titular por (UF, número), depois da dedup. Presidente/vice: 13 chapas vigentes.
- Tamanhos: `NM_URNA_CANDIDATO` até 30 caracteres (média 14); número de 2 a 5 dígitos; siglas longas (`REPUBLICANOS`). O texto da moldura precisa encolher ou quebrar linha.
- Formato sugerido: um JSON por UF mais o do `BR`, carregado sob demanda (o eleitor só precisa do próprio estado).

**Fotos** em `imagens/<UF>/F{UF}{SQ_CANDIDATO}_div.jpg` (gitignored). Zips originais ainda em `imagens/`.
- 20.981 JPGs, 112 MB, média de 5,5 KB, 161×225 px (algumas 111×155). Todas casam com o CSV pelo `SQ`. Só 4 candidaturas sem foto; a única vigente é Nayr Duarte (SP, dep. estadual, nº 36076): usar avatar genérico.
- Decisão do usuário: manter as fotos apesar da resolução. Na moldura entram pequenas (selo ou círculo, ampliação até ~1,5×); na busca servem de thumbnail.
- Ficam no mesmo domínio do app (de outro domínio sem CORS o canvas fica contaminado e não exporta). Fora do precache do PWA e do git.
- Proposta ainda não confirmada: deploy das fotos a partir do build local (`public/fotos/` é gitignored). Checar o limite de arquivos do host (são 20.779 fotos mais os JSON, ou seja, mais de 20 mil).

## Script de dados (`npm run dados`)

`scripts/gerar-dados.mjs` (Node, sem dependências) lê `dados/` e `imagens/` e gera, tudo dentro de `public/`:
- `candidatos/<UF>.json` (27 UFs + `BR`) e `candidatos/manifest.json` (`geradoEm` do TSE, `total`, contagem de titulares por arquivo). Os JSON não são gitignored.
- `fotos/<UF>/<SQ>.jpg`: só as vigentes (titulares, vices e suplentes), gitignored. Rodar de novo pula o que já está lá e apaga sobras. `npm run dados -- --sem-fotos` gera só os JSON (segundos; a cópia das fotos é a parte lenta).
- Cada JSON é um array de titulares, ordenado por cargo e número: `{ id (SQ), cargo (CD_CARGO do TSE), numero, nome (urna), partido, nomeCompleto?, semFoto?, vice?, suplentes? }`. `nomeCompleto` só aparece quando difere do nome de urna (serve à busca). Cargos: 1 presidente, 3 governador, 5 senador, 6 dep. federal, 7 dep. estadual, 8 dep. distrital. `vice` (cargos 2 e 4) e `suplentes` (9 e 10, em ordem) vêm aninhados como `{ id, nome, partido, semFoto? }`.
- Conferido em 20/09/2026: 20.985 linhas, 20.780 vigentes (19.945 titulares, 835 vice/suplentes), nenhum CPF nem título de eleitor nos JSON, 28 arquivos (~2,6 MB brutos), 20.779 fotos (`semFoto` só na Nayr Duarte). Vice e suplentes ficaram todos ligados a um titular.
- Regerar perto de 4/10, com o CSV novo do TSE.

## App (`src/`)

- `src/moldura/`: motor de canvas, sem React. `desenharMoldura(canvas, entrada)` compõe 1080×1080 (foto do eleitor em quadro arredondado, degradê escuro embaixo, selo circular do candidato, nome, cargo, partido, vice, número num chip). `enquadrar`/`arrastar` cuidam de zoom e posição sem deixar borda vazia; `ajustarTexto` encolhe a fonte ou quebra em até 2 linhas; `carregarFotoEleitor` reduz a 2048 px e aplica a rotação do EXIF; `exportarImagem` gera JPEG 0,92. O rótulo "EU APOIO" vira "<NOME> APOIA" quando o eleitor digita o nome (campo opcional). Layout e tema são provisórios (`config.ts`, `desenhar.ts`). O aviso de independência no rodapé da imagem é texto meu, a validar.
- `src/dados/`: `busca.ts` é lógica pura (`filtrar`, `partidosDe`, `normalizar`); `carregar.ts` baixa BR + UF com cache. Número casa por prefixo ("13" acha 13, 130, 1300); texto casa por começo de palavra no nome, nome completo, sigla e vice. Com texto, quem casa exato (número ou sigla) vem primeiro, depois nome começando pelo termo; o resto fica na ordem cargo + número, igual para todos (neutralidade).
- `src/telas/`: `EscolherUf` (teclado de siglas), `Busca` (texto, chips de cargo, partido; 40 por vez), `Editor` (prévia, foto, zoom, arrastar ou setas, nome, baixar). `App.tsx` faz o fluxo em 2 passos, lembra a UF no localStorage e trata o botão voltar com `history`.
- Visual: paleta da urna eletrônica (visor cinza-esverdeado, tinta escura, laranja só no foco), fontes do sistema (sem carregar nada de terceiros), número do candidato em caixinhas de urna, tema claro e escuro. Tokens em `src/index.css`.
- Cores da moldura: quatro esquemas para o degradê (`src/moldura/esquemas.ts`): cores do partido (padrão), branco, preto e bandeira do Brasil (azul, verde, amarelo). O degradê é horizontal, com a cor principal sob o texto (~60% da largura) e as demais à direita, sob o chip do número; a transparência sobe de baixo para cima. Cor do texto e do chip saem do contraste (WCAG) com a cor principal. As cores de cada partido ficam em `src/dados/cores-partidos.ts` (lista da principal para as secundárias); partido sem cores cadastradas só oferece branco, preto e bandeira e abre em preto. Em 20/09/2026 estão cadastrados 26 dos 30 partidos, cada um a partir dos links que o usuário mandou (site do partido, Wikipédia, notícias, perfis), com o Wikimedia Commons de apoio; cada entrada de `cores-partidos.ts` diz a fonte e a dúvida. Faltam MISSÃO, PDT e PT (os links eram anúncios do Mercado Livre, que bloqueiam acesso automático) e UP (o símbolo do link é preto e branco). A revisão foi feita um por um com o usuário; a fonte inicial era o Wikimedia Commons (categoria "Logos of political parties in Brazil": logos, e bandeiras só de PL, NOVO, PDT, PSTU, PT e MISSÃO), com cores medidas em pixels, sugestão e não cor oficial. Logo e bandeira do mesmo partido podem dar cores diferentes (PL: logo só azul, bandeira azul, amarelo e verde); UP (logo branco) e MISSÃO (logo preto) não têm cor extraível do logo.
- Sem testes automatizados no repo. Conferido à mão em 20/09/2026: lógica de busca em Node e um passeio completo no Edge (29 conferências), no celular e no desktop, claro e escuro.

## Pendências

- Confirmar onde hospedar as fotos (proposta acima) e o limite de arquivos do host. Base64 dentro do JSON foi descartado: só as fotos de SP passariam de 15 MB (~20 MB em base64) e a lista deixaria de carregar leve. Alternativa se o limite de arquivos apertar: um arquivo de fotos por UF, com índice.
- Configurar o PWA no `vite.config.ts` (manifest, ícones, service worker). Fotos ficam fora do precache.
- Botão de compartilhar (Web Share API com arquivo) no Editor; hoje só baixa. Zoom por pinça no celular (hoje é slider + arrastar).
- Limpeza da estrutura, combinada para depois: juntar `dados/` e `imagens/` numa pasta só (`dados/csv` e `dados/fotos`, ajustando script e `.gitignore`); apagar os zips (duplicatas exatas do que foi extraído, já verificado), os `leiame.pdf` repetidos das fotos e o resto do template do Vite (`src/assets/`, `public/icons.svg`).
- Conferir no TSE uma amostra das substituições e a foto da Nayr Duarte.
- Usuário escolher o nome definitivo (sugestões dadas: Apoiei, Tô Com, Meu Apoio, Moldura Cívica) e checar domínio e INPI.
- Decidir se cria o `LICENSE`.
- Commits locais feitos em `main` em 20/09/2026. Push só quando o usuário pedir.
- Identidade visual da moldura e do app, a alinhar com o usuário (hoje tudo é provisório).
- Cobrança simbólica pelo download: apenas anotada como possibilidade. Validar com advogado eleitoral e checar direito de imagem antes de decidir. Bloquear print de tela não é possível na web (só app nativo faz isso), então, se cobrar, o caminho é marca d'água na prévia.

## Contexto de prazo

O 1º turno das eleições de 2026 é em 4 de outubro (confirmar). O objetivo é um MVP enxuto e rápido: busca de candidato, upload e ajuste da foto, composição da imagem e botão de compartilhar (Web Share API).

## Convenções

- Conversar com o usuário em português do Brasil, tom informal.
- Não fazer commit nem push sem o usuário pedir.
