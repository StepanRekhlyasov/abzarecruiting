export type ProfileAttributeDto = {
  id: number
  name: string
  description: string | null
  valueType: string
  inputType: string
  options: string[]
  value: string | null
  version: number
}
