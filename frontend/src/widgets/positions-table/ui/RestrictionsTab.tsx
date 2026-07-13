import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { RESTRICTION_CONDITIONS } from '@entities/restriction'
import type { AttributeConditionDraft, RestrictionCondition } from '@entities/restriction'
import type { AbzaSelectOption } from '@shared/types'
import { AsyncEntitySelect, AsyncEntityTags } from '@shared/ui/inputs'

type RestrictionsTabProps = {
  requiredTags: AbzaSelectOption[]
  onRequiredTagsChange: (tags: AbzaSelectOption[]) => void
  attributeConditions: AttributeConditionDraft[]
  onAttributeConditionsChange: (conditions: AttributeConditionDraft[]) => void
  loadAttributeOptions: (search: string, signal?: AbortSignal) => Promise<AbzaSelectOption[]>
  loadTagOptions: (search: string, signal?: AbortSignal) => Promise<AbzaSelectOption[]>
  disabled?: boolean
}

function createEmptyCondition(): AttributeConditionDraft {
  return {
    localId: crypto.randomUUID(),
    attributeId: null,
    attributeName: '',
    attributeValueType: '',
    condition: 'Exist',
    targetValue: '',
  }
}

function isNumericAttribute(valueType: string) {
  return valueType === 'number'
}

export function RestrictionsTab({
  requiredTags,
  onRequiredTagsChange,
  attributeConditions,
  onAttributeConditionsChange,
  loadAttributeOptions,
  loadTagOptions,
  disabled = false,
}: RestrictionsTabProps) {
  const { t } = useTranslation()

  const updateCondition = (localId: string, patch: Partial<AttributeConditionDraft>) => {
    onAttributeConditionsChange(
      attributeConditions.map((item) => (item.localId === localId ? { ...item, ...patch } : item)),
    )
  }

  const loadNumericAttributeOptions = useCallback(
    async (search: string, signal?: AbortSignal) => {
      const options = await loadAttributeOptions(search, signal)
      return options.filter((option) => isNumericAttribute(option.valueType ?? ''))
    },
    [loadAttributeOptions],
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="subtitle1">{t('positions.restrictions.requiredTags')}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t('positions.restrictions.requiredTagsHint')}
        </Typography>
        <AsyncEntityTags
          label={t('positions.restrictions.tags')}
          value={requiredTags}
          onChange={onRequiredTagsChange}
          loadOptions={loadTagOptions}
          disabled={disabled}
        />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography variant="subtitle1">{t('positions.restrictions.attributeConditions')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('positions.restrictions.attributeConditionsHint')}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            disabled={disabled}
            onClick={() => onAttributeConditionsChange([...attributeConditions, createEmptyCondition()])}
          >
            {t('positions.restrictions.addCondition')}
          </Button>
        </Box>

        {attributeConditions.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('positions.restrictions.emptyConditions')}
          </Typography>
        ) : (
          attributeConditions.map((condition) => {
            const needsTarget =
              condition.condition === 'Equal'
              || condition.condition === 'More'
              || condition.condition === 'Less'
            const isNumericCondition = condition.condition === 'More' || condition.condition === 'Less'
            const availableConditions = condition.attributeId && !isNumericAttribute(condition.attributeValueType)
              ? RESTRICTION_CONDITIONS.filter((value) => value !== 'More' && value !== 'Less')
              : RESTRICTION_CONDITIONS

            return (
              <Box
                key={condition.localId}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '2fr 1.2fr 1.2fr auto' },
                  gap: 1.5,
                  alignItems: 'start',
                }}
              >
                <AsyncEntitySelect
                  label={t('positions.restrictions.attribute')}
                  value={
                    condition.attributeId
                      ? {
                          value: String(condition.attributeId),
                          label: condition.attributeName,
                          valueType: condition.attributeValueType,
                        }
                      : null
                  }
                  onChange={(option) => {
                    const valueType = option?.valueType ?? ''
                    const nextCondition =
                      (condition.condition === 'More' || condition.condition === 'Less')
                      && !isNumericAttribute(valueType)
                        ? 'Exist'
                        : condition.condition

                    updateCondition(condition.localId, {
                      attributeId: option ? Number(option.value) : null,
                      attributeName: option?.label ?? '',
                      attributeValueType: valueType,
                      condition: nextCondition,
                      targetValue: nextCondition === 'Exist' ? '' : condition.targetValue,
                    })
                  }}
                  loadOptions={isNumericCondition ? loadNumericAttributeOptions : loadAttributeOptions}
                  disabled={disabled}
                />
                <FormControl fullWidth>
                  <InputLabel id={`${condition.localId}-condition`}>
                    {t('positions.restrictions.condition')}
                  </InputLabel>
                  <Select
                    labelId={`${condition.localId}-condition`}
                    label={t('positions.restrictions.condition')}
                    value={condition.condition}
                    disabled={disabled}
                    onChange={(event) => {
                      const nextCondition = event.target.value as RestrictionCondition
                      const requiresNumeric = nextCondition === 'More' || nextCondition === 'Less'
                      const shouldClearAttribute =
                        requiresNumeric && !isNumericAttribute(condition.attributeValueType)

                      updateCondition(condition.localId, {
                        condition: nextCondition,
                        attributeId: shouldClearAttribute ? null : condition.attributeId,
                        attributeName: shouldClearAttribute ? '' : condition.attributeName,
                        attributeValueType: shouldClearAttribute ? '' : condition.attributeValueType,
                        targetValue:
                          nextCondition === 'Exist' ? '' : condition.targetValue,
                      })
                    }}
                  >
                    {availableConditions.map((value) => (
                      <MenuItem key={value} value={value}>
                        {t(`positions.restrictions.conditions.${value}`)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {needsTarget ? (
                  <TextField
                    fullWidth
                    type={isNumericCondition ? 'number' : 'text'}
                    label={t('positions.restrictions.targetValue')}
                    value={condition.targetValue}
                    disabled={disabled}
                    onChange={(event) =>
                      updateCondition(condition.localId, { targetValue: event.target.value })
                    }
                  />
                ) : (
                  <Box />
                )}
                <IconButton
                  color="error"
                  disabled={disabled}
                  onClick={() =>
                    onAttributeConditionsChange(
                      attributeConditions.filter((item) => item.localId !== condition.localId),
                    )
                  }
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            )
          })
        )}
      </Box>
    </Box>
  )
}
