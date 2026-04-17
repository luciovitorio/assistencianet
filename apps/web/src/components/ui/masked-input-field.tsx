'use client'

import * as React from 'react'
import { InputField } from './input-field'
import { applyPhoneMask, applyCpfCnpjMask, applyMoneyMask, applyCepMask } from '@/lib/masks'

export type MaskType = 'phone' | 'cpf-cnpj' | 'money' | 'cep'

type MaskedInputFieldProps = Omit<React.ComponentProps<typeof InputField>, 'type' | 'inputMode'> & {
  mask: MaskType
}

const maskConfig = {
  phone:     { fn: applyPhoneMask,    inputMode: 'tel'     as const, type: 'tel'  },
  'cpf-cnpj':{ fn: applyCpfCnpjMask, inputMode: 'numeric' as const, type: 'text' },
  money:     { fn: applyMoneyMask,    inputMode: 'numeric' as const, type: 'text' },
  cep:       { fn: applyCepMask,      inputMode: 'numeric' as const, type: 'text' },
}

export function MaskedInputField({ mask, onChange, value, ...props }: MaskedInputFieldProps) {
  const { fn: applyMask, inputMode, type } = maskConfig[mask]

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    e.target.value = applyMask(e.target.value)
    onChange?.(e)
  }

  const maskedValue = value !== undefined ? applyMask(String(value)) : undefined

  return (
    <InputField
      {...props}
      type={type}
      inputMode={inputMode}
      value={maskedValue}
      onChange={handleChange}
    />
  )
}
