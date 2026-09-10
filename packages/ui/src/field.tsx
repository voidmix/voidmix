import { cloneElement, useId, type ReactElement } from 'react'
import { Label } from './components/label'

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactElement<{ id?: string }>
}) {
  const generatedId = useId()
  const id = children.props.id ?? generatedId
  return (
    <div className="field">
      <Label htmlFor={id}>{label}</Label>
      {cloneElement(children, { id })}
    </div>
  )
}
