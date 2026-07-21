import { useRef, useState, type ChangeEvent } from 'react'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import ClearIcon from '@mui/icons-material/Clear'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import FormHelperText from '@mui/material/FormHelperText'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import { uploadFile } from '@shared/api/uploadApi'
import { parseApiError, resolveErrorMessage } from '@shared/lib/errors'
import {
  MAX_ATTRIBUTE_FILE_SIZE_BYTES,
  isFileAttributeValue,
  type AbzaFormValue,
  type FileAttributeValue,
} from '@shared/types'
import { FieldTooltip } from './FieldTooltip'

type FileFieldProps = {
  kind: 'image' | 'file'
  label: string
  value: AbzaFormValue
  onChange: (value: AbzaFormValue) => void
  onBlur?: () => void
  disabled?: boolean
  tooltip?: string
  maxFileSizeKb?: number
}

export function FileField({
  kind,
  label,
  value,
  onChange,
  onBlur,
  disabled = false,
  tooltip,
  maxFileSizeKb,
}: FileFieldProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const parsed: FileAttributeValue | null = isFileAttributeValue(value) ? value : null
  const accept = kind === 'image' ? 'image/*' : undefined

  const handlePick = () => {
    inputRef.current?.click()
  }

  const handleClear = () => {
    setError(null)
    onChange('')
    onBlur?.()
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (file.size > MAX_ATTRIBUTE_FILE_SIZE_BYTES) {
      setError(t('error.files.tooLarge'))
      return
    }

    if (maxFileSizeKb !== undefined && file.size > maxFileSizeKb * 1024) {
      setError(t('error.attributes.validationMaxFileSize', { max: maxFileSizeKb }))
      return
    }

    if (kind === 'image' && !file.type.startsWith('image/')) {
      setError(t('error.files.invalidImageType'))
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const uploaded = await uploadFile(file, kind)
      onChange({
        uid: uploaded.uid,
        url: uploaded.url,
        name: uploaded.name,
      })
      onBlur?.()
    } catch (uploadError) {
      setError(resolveErrorMessage(parseApiError(uploadError)) ?? t('error.files.upload'))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 0 }}>
          {label}
        </Typography>
        {tooltip ? <FieldTooltip tooltip={tooltip} /> : null}
      </Box>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        disabled={disabled || isUploading}
        onChange={(event) => {
          void handleFileChange(event)
        }}
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={
            isUploading ? (
              <CircularProgress size={16} color="inherit" />
            ) : kind === 'image' ? (
              <CloudUploadIcon />
            ) : (
              <AttachFileIcon />
            )
          }
          onClick={handlePick}
          disabled={disabled || isUploading}
        >
          {parsed
            ? t(kind === 'image' ? 'attributes.file.replaceImage' : 'attributes.file.replaceFile')
            : t(kind === 'image' ? 'attributes.file.uploadImage' : 'attributes.file.uploadFile')}
        </Button>

        {parsed && !disabled ? (
          <IconButton size="small" onClick={handleClear} aria-label={t('attributes.file.clear')} disabled={isUploading}>
            <ClearIcon fontSize="small" />
          </IconButton>
        ) : null}

        <Typography variant="caption" color="text.secondary">
          {t('attributes.file.maxSize')}
        </Typography>
      </Box>

      {parsed ? (
        kind === 'image' ? (
          <Box
            component="img"
            src={parsed.url}
            alt={parsed.name}
            sx={{
              mt: 0.5,
              maxWidth: 240,
              maxHeight: 160,
              objectFit: 'contain',
              borderRadius: 1,
              border: 1,
              borderColor: 'divider',
            }}
          />
        ) : (
          <Link href={parsed.url} target="_blank" rel="noopener noreferrer" underline="hover" variant="body2">
            {parsed.name}
          </Link>
        )
      ) : null}

      {error ? <FormHelperText error>{error}</FormHelperText> : null}
    </Box>
  )
}
