import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'

type OptionTagsProps = {
  options: string[]
  onChange: (options: string[]) => void
  disabled?: boolean
  label?: string
  resetKey?: string | number
}

export function OptionTags({ options, onChange, disabled = false, label, resetKey }: OptionTagsProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')

  useEffect(() => {
    setInput('')
  }, [resetKey])

  const addOption = () => {
    const option = input.trim()
    if (!option) {
      return
    }

    onChange(options.includes(option) ? options : [...options, option])
    setInput('')
  }

  return (
    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <TextField
          fullWidth
          size="small"
          label={label ?? t('attributes.valueTypes.select')}
          value={input}
          disabled={disabled}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addOption()
            }
          }}
        />
        <Button variant="contained" disabled={disabled || !input.trim()} onClick={addOption}>
          {t('attributes.actions.add')}
        </Button>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {options.map((option) => (
          <Chip
            key={option}
            label={option}
            onDelete={disabled ? undefined : () => onChange(options.filter((item) => item !== option))}
          />
        ))}
      </Box>
    </Box>
  )
}
