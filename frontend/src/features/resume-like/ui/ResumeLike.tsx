import { useState, type MouseEvent } from 'react'
import FavoriteIcon from '@mui/icons-material/Favorite'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { toggleResumeLike, type ResumeLikeStateDto } from '@entities/resume'

export type ResumeLikeProps = {
  resumeId: number
  likesCount: number
  likedByCurrentUser: boolean
  canToggle?: boolean
  onChange?: (state: ResumeLikeStateDto) => void
  onError?: (error: unknown) => void
}

export function ResumeLike({
  resumeId,
  likesCount,
  likedByCurrentUser,
  canToggle = false,
  onChange,
  onError,
}: ResumeLikeProps) {
  const [isToggling, setIsToggling] = useState(false)

  const handleClick = async (event: MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()

    if (!canToggle || isToggling) {
      return
    }

    setIsToggling(true)

    try {
      const next = await toggleResumeLike(resumeId)
      onChange?.(next)
    } catch (error) {
      onError?.(error)
    } finally {
      setIsToggling(false)
    }
  }

  const heart = likedByCurrentUser ? (
    <FavoriteIcon fontSize="small" color="error" />
  ) : (
    <FavoriteBorderIcon fontSize="small" color="error" />
  )

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <Typography variant="body2" component="span">
        {likesCount}
      </Typography>
      {canToggle ? (
        <IconButton
          size="small"
          color="error"
          disabled={isToggling}
          onClick={(event) => void handleClick(event)}
          aria-pressed={likedByCurrentUser}
          aria-label="like"
          sx={{ p: 0.25 }}
        >
          {heart}
        </IconButton>
      ) : (
        <Box sx={{ display: 'inline-flex', p: 0.25 }} aria-hidden>
          {heart}
        </Box>
      )}
    </Box>
  )
}
