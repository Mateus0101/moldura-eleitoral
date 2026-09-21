# Moldura Eleitoral (nome provisório)

Web app (PWA) neutro e independente: o eleitor escolhe cargo e candidato, insere a própria foto e compartilha uma moldura de apoio nas redes. Ver `README.md` para a visão geral.

## Decisões já tomadas

- Stack: Vite + React + TypeScript + `vite-plugin-pwa` (já instalado, ainda não configurado em `vite.config.ts`).
- A composição da imagem roda no aparelho do eleitor (canvas). A foto do eleitor não vai para servidor.
- Um único template com campos variáveis (foto, nome, número, cargo, partido). Não se desenha moldura por candidato.
- Filtros por cargo: deputado federal, deputado estadual/distrital, senador, governador e vice, presidente e vice. Também busca por UF, nome e número. (Senador é um filtro só: os dados do TSE não distinguem 1ª e 2ª vaga.)
- Neutralidade total: todos os candidatos com o mesmo tratamento, sem patrocínio, sem vínculo com TSE ou campanhas, sem molduras negativas.
- Repositório remoto PÚBLICO desde 20/09/2026: `git@github.com:Mateus0101/moldura-eleitoral.git` (`origin`, acesso SSH ok), com o histórico já enviado. Público porque o GitHub Pages grátis só publica repositório público; o site sai da branch `gh-pages` do próprio repositório. Todo commit usa o e-mail de privacidade do GitHub (configurado só neste repositório): com o e-mail pessoal o push é recusado (GH007). Conferido antes de abrir: nenhum e-mail pessoal, caminho local, segredo, foto, CSV, zip ou PDF versionado.
- `imagens/` e `dados/` estão no `.gitignore` (só o `.gitkeep` entra). Reavaliar depois, por causa do tamanho.
- Licença: por ora, todos os direitos reservados (sem arquivo `LICENSE` ainda).
- Sem cobrança, decidido pelo usuário em 20/09/2026: cobrar pelo download fere normas do TSE. O app é gratuito, sem marca d'água (bloquear print não é possível na web de qualquer forma) e não guarda dado de eleitor; foto e nome ficam no aparelho. A única métrica prevista é a contagem de imagens geradas (ver Pendências).

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
- Proposta ainda não confirmada: deploy das fotos a partir do build local (`public/fotos/` é gitignored). Checar o limite de arquivos do host (são 19.944 fotos de titulares mais os JSON, 19.975 arquivos em `public/`; o Cloudflare Pages grátis aceita 20.000 por deploy, então a folga é mínima e o PWA ainda vai somar arquivos: preferência por um bucket, como o R2, só para as fotos).

## Script de dados (`npm run dados`)

`scripts/gerar-dados.mjs` (Node, sem dependências) lê `dados/` e `imagens/` e gera, tudo dentro de `public/`:
- `candidatos/<UF>.json` (27 UFs + `BR`) e `candidatos/manifest.json` (`geradoEm` do TSE, `total`, contagem de titulares por arquivo). Os JSON não são gitignored.
- `fotos/<UF>/<SQ>.jpg`: só as dos titulares vigentes (o app mostra o nome do vice, nunca a foto; as 835 fotos de vice e suplente foram descartadas em 20/09/2026), gitignored. Rodar de novo pula o que já está lá e apaga sobras. `npm run dados -- --sem-fotos` gera só os JSON (segundos; a cópia das fotos é a parte lenta).
- Cada JSON é um array de titulares, ordenado por cargo e número: `{ id (SQ), cargo (CD_CARGO do TSE), numero, nome (urna), partido, nomeCompleto?, semFoto?, vice?, suplentes? }`. `nomeCompleto` só aparece quando difere do nome de urna (serve à busca). Cargos: 1 presidente, 3 governador, 5 senador, 6 dep. federal, 7 dep. estadual, 8 dep. distrital. `vice` (cargos 2 e 4) e `suplentes` (9 e 10, em ordem) vêm aninhados como `{ id, nome, partido, semFoto? }`.
- Conferido em 20/09/2026: 20.985 linhas, 20.780 vigentes (19.945 titulares, 835 vice/suplentes), nenhum CPF nem título de eleitor nos JSON, 28 arquivos (~2,6 MB brutos), 19.944 fotos de titulares, 108,6 MB (`semFoto` só na Nayr Duarte). Vice e suplentes ficaram todos ligados a um titular.
- Regerar perto de 4/10, com o CSV novo do TSE.

## App (`src/`)

- `src/moldura/`: motor de canvas, sem React. `desenharMoldura(canvas, entrada)` compõe 1080×1080 (foto do eleitor em quadro arredondado, degradê escuro embaixo, selo circular do candidato, nome, cargo, partido, vice, número num chip). `enquadrar`/`arrastar` cuidam de zoom e posição sem deixar borda vazia; `ajustarTexto` encolhe a fonte ou quebra em até 2 linhas; `carregarFotoEleitor` reduz a 2048 px e aplica a rotação do EXIF; `exportarImagem` gera JPEG 0,92. O rótulo "EU APOIO" vira "<NOME> APOIA" quando o eleitor digita o nome (campo opcional). Layout e tema são provisórios (`config.ts`, `desenhar.ts`). O aviso de independência no rodapé da imagem é texto meu, a validar.
- `src/dados/`: `busca.ts` é lógica pura (`filtrar`, `partidosDe`, `normalizar`); `carregar.ts` baixa BR + UF com cache. Número casa por prefixo ("13" acha 13, 130, 1300); texto casa por começo de palavra no nome, nome completo, sigla e vice. Com texto, quem casa exato (número ou sigla) vem primeiro, depois nome começando pelo termo; o resto fica na ordem cargo + número, igual para todos (neutralidade).
- `src/telas/`: `EscolherUf` (teclado de siglas), `Busca` (texto, chips de cargo, partido; 40 por vez), `Editor` (prévia, foto, zoom, arrastar ou setas, nome, baixar). `App.tsx` faz o fluxo em 2 passos, lembra a UF no localStorage e trata o botão voltar com `history`.
- Visual: paleta da urna eletrônica (visor cinza-esverdeado, tinta escura, laranja só no foco), fontes do sistema (sem carregar nada de terceiros), número do candidato em caixinhas de urna, tema claro e escuro. Tokens em `src/index.css`.
- Cores da moldura: quatro esquemas para o degradê (`src/moldura/esquemas.ts`): cores do partido (padrão), branco, preto e bandeira do Brasil (azul, verde, amarelo). O degradê é horizontal, com a cor principal sob o texto (~60% da largura) e as demais à direita, sob o chip do número; a transparência sobe de baixo para cima. Cor do texto e do chip saem do contraste (WCAG) com a cor principal. As cores de cada partido ficam em `src/dados/cores-partidos.ts` (lista da principal para as secundárias); partido sem cores cadastradas só oferece branco, preto e bandeira e abre em preto. Em 20/09/2026 estão cadastrados os 30 partidos, cada um a partir dos links que o usuário mandou (site do partido, Wikipédia, notícias, perfis), com o Wikimedia Commons de apoio; cada entrada de `cores-partidos.ts` diz a fonte e a dúvida. PT, PDT e MISSÃO vêm de fotos de bandeiras vendidas no Mercado Livre (produto de terceiros, não oficial; as páginas dos anúncios bloqueiam acesso automático, mas as imagens abrem). A UP é preta e branca (confirmado pelo usuário), então o "Cores do partido" dela é preto. A revisão foi feita um por um com o usuário; a fonte inicial era o Wikimedia Commons (categoria "Logos of political parties in Brazil": logos, e bandeiras só de PL, NOVO, PDT, PSTU, PT e MISSÃO), com cores medidas em pixels, sugestão e não cor oficial. Logo e bandeira do mesmo partido podem dar cores diferentes (PL: logo só azul, bandeira azul, amarelo e verde); UP (logo branco) e MISSÃO (logo preto) não têm cor extraível do logo.
- Enquadramento do selo do candidato (`src/moldura/retrato.ts`): as fotos do TSE (161×225) não têm o mesmo aperto; em 500 fotos o espaço acima da cabeça tem mediana de 6,7% da altura e cerca de 1 em 3 tem menos de 5%. O corte fixo "cobrir, alinhado ao topo" cortava o alto da cabeça dessas. Agora cada foto é medida (fundo pela mediana dos cantos de cima, assunto = o que difere dele) e recua só o necessário para o cabelo ficar a 4 px da borda do círculo; foto com espaço fica como estava (a do Lula, com 5,3%, praticamente não muda). As sobras dos lados repetem a borda da foto. Faixa preta fina no topo (vista em ~0,2% das fotos) é descartada, só quando o fundo é claro. Medida guardada por foto (WeakMap).
- Compartilhar e contar (`src/telas/Editor.tsx`, `src/metricas.ts`): "Compartilhar" usa a Web Share API com o JPEG como arquivo (menu do sistema: WhatsApp, Instagram...) e só aparece onde `navigator.canShare({files})` existe; senão fica só "Baixar imagem". O JPEG é gerado 350 ms depois de a moldura parar de mudar e guardado antes do clique, porque o iPhone só abre o menu dentro do gesto do toque. O compartilhamento vai só com o arquivo (sem texto nem link). Cancelar o menu não é erro nem conta. O contador (GoatCounter) só age se `VITE_GOATCOUNTER` estiver definido (arquivo `.env.production`, ver `.env.production.example`): um pedido de imagem para `https://<código>.goatcounter.com/count?p=imagem-baixada|imagem-compartilhada&e=true`, sem referrer, sem cookies e sem guardar IP (segundo a doc do GoatCounter). O rodapé só avisa da contagem quando ela está ligada.
- Publicação (`npm run publicar`, `scripts/publicar.mjs`): GitHub Pages servindo a branch `gh-pages` deste repositório (órfã: sem histórico em comum com a `main`, só o app compilado mais as fotos, para as ~110 MB de fotos não irem para a `main`). Quem clona o repositório baixa também essa branch. Com `SITE_REPO`/`SITE_BRANCH=main` dá para usar um repositório só do site. O script faz o build com o caminho-base certo (`/<nome do repo>/`), mantém uma cópia local do repositório em `.publicar/site` (gitignored), sincroniza só o que mudou, escreve `.nojekyll` (e `CNAME` com `SITE_DOMINIO`) e faz push comum (sem force) usando o e-mail de privacidade do projeto. Ensaiado com um site pequeno (primeira publicação, sem mudança, mudança parcial, CNAME, erros); o conteúdo publicado fica idêntico byte a byte ao build. A primeira publicação real leva uns minutos (git empacotando ~20 mil arquivos; no Windows foram ~8 min num ensaio). No Git Bash do Windows, `SITE_BASE` precisa de `MSYS_NO_PATHCONV=1`. Não testei o envio real ao GitHub Pages, o limite de 10 min de deploy nem o tráfego (limite suave de 100 GB/mês).
- Sem testes automatizados no repo. Conferido à mão em 20/09/2026: lógica de busca em Node e um passeio completo no Edge (29 conferências), no celular e no desktop, claro e escuro.

## Pendências

- Hospedagem decidida (20/09/2026): GitHub Pages, app e fotos juntos (mesma origem, sem CORS), servido da branch `gh-pages` do repositório, que o usuário tornou público. Falta ele ativar o Pages (Settings > Pages > branch `gh-pages`) e rodar `npm run publicar` (passo a passo no README). Base64 dentro do JSON foi descartado (SP passaria de 19 MB). Netlify descartado (plano grátis: 300 créditos/mês, ~15 GB de tráfego; cada 10 mil requisições consomem 2 créditos) e Cloudflare Pages grátis não serve por causa do limite de 20.000 arquivos. Se o tráfego passar do limite suave do GitHub Pages (100 GB/mês), plano B: fotos num bucket R2 (10 GB, 1 milhão de gravações e 10 milhões de leituras grátis por mês; precisa de domínio próprio na Cloudflare; `r2.dev` é só para teste) com `crossOrigin` nas imagens.
- Configurar o PWA no `vite.config.ts` (manifest, ícones, service worker). Fotos ficam fora do precache.
- Zoom por pinça no celular (hoje é slider + arrastar). Testar em aparelho de verdade (iPhone e Android): o compartilhar só foi testado com um espião no lugar de `navigator.share`, em Edge headless.
- Antes de lançar: nome definitivo, domínio, ícones do PWA, revisão com advogado eleitoral (uso da imagem dos candidatos, texto do rodapé da imagem, campo de nome livre), conferir a amostra de substituições no TSE e regerar os dados perto de 4/10.
- Limpeza da estrutura, combinada para depois: juntar `dados/` e `imagens/` numa pasta só (`dados/csv` e `dados/fotos`, ajustando script e `.gitignore`); apagar os zips (duplicatas exatas do que foi extraído, já verificado), os `leiame.pdf` repetidos das fotos e o resto do template do Vite (`src/assets/`, `public/icons.svg`).
- Conferir no TSE uma amostra das substituições e a foto da Nayr Duarte.
- Usuário escolher o nome definitivo (sugestões dadas: Apoiei, Tô Com, Meu Apoio, Moldura Cívica) e checar domínio e INPI.
- Decidir se cria o `LICENSE`.
- Commits locais feitos em `main` em 20/09/2026. Push só quando o usuário pedir.
- Identidade visual da moldura e do app, a alinhar com o usuário (hoje tudo é provisório).
- Métrica mínima: implementada com GoatCounter, mas só liga quando o usuário criar a conta em goatcounter.com e pôr o código do site em `.env.production` (`VITE_GOATCOUNTER=<código>`). Não confirmei na documentação se o plano grátis exige uso não comercial (o app é sem fins lucrativos). Só conta imagens baixadas ou compartilhadas; visitas não são contadas.

## Contexto de prazo

O 1º turno das eleições de 2026 é em 4 de outubro (confirmar). O objetivo é um MVP enxuto e rápido: busca de candidato, upload e ajuste da foto, composição da imagem e botão de compartilhar (Web Share API).

## Convenções

- Conversar com o usuário em português do Brasil, tom informal.
- Não fazer commit nem push sem o usuário pedir.
