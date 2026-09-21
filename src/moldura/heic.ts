// HEIC é o formato de foto do iPhone (e de alguns Androids). O Chrome do Android não abre. A conversão usa a
// biblioteca heic-to (o libheif compilado para o navegador, ~3 MB, licença LGPL-3.0): ela é um arquivo à
// parte, baixado só quando aparece um HEIC que o navegador não abriu sozinho. Quem manda JPG ou PNG nunca
// baixa nada disso. Os avisos de licença estão em public/licencas-de-terceiros.txt.
export function carregarConversorHeic() {
  return import('heic-to')
}
