import mark from './assets/voidmix.svg?url'

export function Brand({ desktop = false }: { desktop?: boolean }) {
  return (
    <span className="brand">
      <img src={mark} alt="" width={32} height={32} />
      <span>Voidmix</span>
      {desktop && <span className="brand-platform">Desktop</span>}
    </span>
  )
}

export function BrandMark() {
  return <img className="auth-mark" src={mark} alt="Voidmix" width={48} height={48} />
}
