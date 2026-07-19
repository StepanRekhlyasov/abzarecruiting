import type { MouseEvent, ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Link from '@mui/material/Link'
import { profileDetailPath } from '@shared/config/routes'

type CandidateProfileLinkProps = {
  candidateId: string
  children: ReactNode
  enabled?: boolean
}

export function CandidateProfileLink({
  candidateId,
  children,
  enabled = true,
}: CandidateProfileLinkProps) {
  if (!enabled) {
    return children
  }

  const handleClick = (event: MouseEvent) => {
    event.stopPropagation()
  }

  return (
    <Link
      component={RouterLink}
      to={profileDetailPath(candidateId)}
      underline="hover"
      onClick={handleClick}
    >
      {children}
    </Link>
  )
}
