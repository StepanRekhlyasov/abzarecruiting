export const DEFAULT_ATTRIBUTE_NAMES = [
  'First name',
  'Last name',
  'Phone number',
  'Biography',
  'Location',
  'Profile photo',
] as const

export function isDefaultAttributeName(name: string): boolean {
  return DEFAULT_ATTRIBUTE_NAMES.includes(name as (typeof DEFAULT_ATTRIBUTE_NAMES)[number])
}
