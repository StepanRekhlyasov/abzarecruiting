import { AppHeader } from "@/features/app-header";
import { Box, Container, Typography } from "@mui/material";
import type { Breakpoint } from "@mui/material/styles";
import type { PropsWithChildren } from "react";


export function PageTemplate({
  title,
  children,
  maxWidth = 'lg',
}: PropsWithChildren<{ title?: string; maxWidth?: Breakpoint }>) {
  return (
    <Box>
      <AppHeader sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }} />
      <Container maxWidth={maxWidth}  sx={{ overflow: 'auto', height: 'calc(100vh - 64px)', mt: '64px' }}>
        <Box sx={{ py: 4 }}>
        {title && (<Typography variant="h4" component="h1" gutterBottom>
            {title}
        </Typography>
        )}
        {children}
        </Box>
      </Container>
    </Box>
  )
}