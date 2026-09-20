# Moldura Eleitoral (nome provisório)

Web app (PWA) neutro e independente para o eleitor montar uma moldura de apoio a qualquer candidato: escolhe o cargo e o candidato, insere a própria foto e compartilha nas redes.

## Cargos

- Deputado federal
- Deputado estadual (ou distrital, no DF)
- Senador
- Governador e vice-governador
- Presidente e vice-presidente da República

## Stack

Vite + React + TypeScript + PWA (`vite-plugin-pwa`). A composição da imagem roda no aparelho do eleitor (canvas); a foto dele não é enviada a servidor.

## Estrutura

- `dados/`: CSVs do TSE por estado (fora do git: têm CPF e título de eleitor)
- `imagens/`: fotos das candidaturas, originais do TSE (fora do git por enquanto)
- `scripts/gerar-dados.mjs`: gera `public/candidatos/*.json` e `public/fotos/` (`npm run dados`)
- `scripts/publicar.mjs`: gera o site e publica no GitHub Pages (`npm run publicar`)
- `public/candidatos/`: um JSON por UF mais `BR`, só com os campos que o app usa
- `src/moldura/`: motor de canvas que compõe a imagem
- `src/dados/`, `src/telas/`, `src/componentes/`: busca, telas e componentes do app

## Publicar (GitHub Pages)

O site (o app compilado mais as ~20 mil fotos) vai para um repositório **público** só para isso; o código-fonte continua neste repositório privado.

1. No GitHub, crie um repositório público **vazio** (sem README), por exemplo `moldura-eleitoral-site`. Com outro nome, rode com `SITE_REPO=git@github.com:Mateus0101/<nome>.git`.
2. Opcional, para contar as imagens geradas: crie uma conta em https://www.goatcounter.com, copie `.env.production.example` para `.env.production` e preencha `VITE_GOATCOUNTER` com o código do seu site. Sem isso, o app não envia nada a ninguém.
3. `npm run publicar`. A primeira vez leva alguns minutos (são ~20 mil arquivos); as próximas só enviam o que mudou.
4. No repositório do site: Settings > Pages > Source: "Deploy from a branch" > `main`, pasta `/ (root)`. Em um ou dois minutos o site abre em `https://mateus0101.github.io/moldura-eleitoral-site/`.
5. Depois: `npm run dados` (só se o TSE atualizou os dados) e `npm run publicar`.

Ensaio sem enviar nada: `npm run publicar -- --teste`.

## Princípios

- Neutralidade: todos os candidatos, de qualquer partido, com o mesmo tratamento.
- Sem patrocínio de candidatos, partidos ou campanhas.
- App independente, sem vínculo com o TSE.

## Em aberto

- **Sem cobrança**: o app é gratuito (cobrar pelo download fere normas do TSE) e não guarda dados dos eleitores. A única métrica prevista é a contagem de imagens geradas, sem identificar ninguém. Falta validar com advogado eleitoral o uso da imagem dos candidatos.
- Nome definitivo do projeto.
- Licença (por ora, todos os direitos reservados).
- Identidade visual da moldura.
