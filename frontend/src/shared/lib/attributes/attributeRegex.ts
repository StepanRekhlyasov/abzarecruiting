export function isAttributeRegexMatch(value: string, input: string): boolean {
  const { pattern, flags } = parseAttributeRegex(input)

  try {
    return new RegExp(pattern, flags).test(value)
  } catch {
    return false
  }
}

export function parseAttributeRegex(input: string): { pattern: string; flags: string } {
  const trimmed = input.trim()
  const match = /^\/((?:\\.|[^/])*)\/([gimsuyd]*)$/.exec(trimmed)

  if (match) {
    return {
      pattern: match[1],
      flags: match[2],
    }
  }

  return { pattern: trimmed, flags: '' }
}
