// O número do candidato em caixinhas, como aparece na tela da urna.
export function NumeroUrna({ numero }: { numero: number }) {
  return (
    <span className="numero" role="img" aria-label={`Número ${numero}`}>
      {String(numero)
        .split('')
        .map((digito, i) => (
          <span key={i} className="digito" aria-hidden="true">
            {digito}
          </span>
        ))}
    </span>
  )
}
