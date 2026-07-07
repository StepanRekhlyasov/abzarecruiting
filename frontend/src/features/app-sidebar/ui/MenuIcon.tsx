import Box from '@mui/material/Box'

export function MenuIcon() {
  return (
    <Box
      component="span"
      sx={{
        width: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
      }}
    >
      {[0, 1, 2].map((line) => (
        <Box
          key={line}
          sx={{
            height: 2,
            borderRadius: 1,
            bgcolor: 'currentColor',
          }}
        />
      ))}
    </Box>
  )
}
