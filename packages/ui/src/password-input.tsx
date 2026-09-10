import { useState, type ComponentProps } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from './components/input'
import { Button } from './components/button'

export function PasswordInput(props: Omit<ComponentProps<typeof Input>, 'type'>) {
  const [visible, setVisible] = useState(false)
  const Icon = visible ? EyeOff : Eye
  const label = visible ? '隐藏密码' : '显示密码'
  return (
    <div className="password-input">
      <Input {...props} type={visible ? 'text' : 'password'} />
      <Button
        variant="ghost"
        size="icon"
        type="button"
        disabled={props.disabled}
        aria-label={label}
        aria-pressed={visible}
        title={label}
        onClick={() => setVisible(!visible)}
      >
        <Icon aria-hidden="true" />
      </Button>
    </div>
  )
}
