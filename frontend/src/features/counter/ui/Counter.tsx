import { useTranslation } from 'react-i18next'
import { useUnit } from 'effector-react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { $counter, decrement, increment } from '../model'

export function Counter() {
  const { t } = useTranslation()
  const [count, onIncrement, onDecrement] = useUnit([$counter, increment, decrement])

  return (
    <Paper elevation={2} sx={{ p: 3, minWidth: 280 }}>
      <Typography variant="h6" gutterBottom>
        {t('counter.title')}
      </Typography>

      <Typography variant="h4" align="center" sx={{ my: 2 }}>
        {count}
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
        <Button variant="contained" onClick={onDecrement}>
          {t('counter.decrement')}
        </Button>
        <Button variant="contained" onClick={onIncrement}>
          {t('counter.increment')}
        </Button>
      </Box>
    </Paper>
  )
}
