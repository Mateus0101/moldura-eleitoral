import { useRegisterSW } from 'virtual:pwa-register/react'

// Registra o service worker (o que permite abrir o app sem sinal e instalar na tela inicial) e avisa
// quando há uma versão nova. Só atualiza quando a pessoa aceita, para não recarregar a página no meio
// da montagem da moldura.
export function AvisoAtualizacao() {
  const {
    needRefresh: [novaVersao, setNovaVersao],
    updateServiceWorker,
  } = useRegisterSW()

  if (!novaVersao) return null
  return (
    <div className="aviso-atualizacao" role="status">
      <p>Há uma versão nova do app. Atualizar recarrega a página.</p>
      <div className="aviso-acoes">
        <button type="button" className="botao-aviso" onClick={() => updateServiceWorker(true)}>
          Atualizar
        </button>
        <button type="button" className="botao-aviso botao-aviso-suave" onClick={() => setNovaVersao(false)}>
          Depois
        </button>
      </div>
    </div>
  )
}
