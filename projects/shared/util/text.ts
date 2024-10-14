import { InternalError } from '@INIT__PATH_ALIAS/shared/util/error'

// converts a camelCase or PascalCase word to CONSTANT_CASE.
// short sequential characters like 'ID' are treated as a single part of the word.
export function toConstCase (word: string): string {
  word = word.trim()
  if (word.includes(' ')) {
    throw new InternalError('Input has to be a single word')
  } else if (isConstCase(word)) {
    return word
  } else if (word.includes('_')) {
    return word.split('_').map(w => toConstCase(w)).join('_')
  }

  let lastCapital = 0
  let underscores: number[] = []
  for (let i = 1; i < word.length; i++) {
    const char = word[i]!
    // this excludes things like numbers
    const isCapital = char !== char.toLowerCase() && char === char.toUpperCase()

    if (isCapital && i - lastCapital > 1) {
      lastCapital = i
      underscores.push(i)
    }
  }

  let constName = word as string
  for (let i = underscores.length - 1; i >= 0; i--) {
    const pos = underscores[i]!
    constName = constName.substring(0, pos ) + '_' + constName.substring(pos)
  }

  return constName.toUpperCase()
}

function isConstCase (word: string): boolean {
  return word.toUpperCase() === word
}

// converts the words to param_case
export function toParamCase (text: string): string {
  return text
    .replace(/[-.,]/, ' ')
    .split(' ')
    .map(t => toConstCase(t))
    .join('_')
    .toLowerCase()
}

// converts the word to cascalCase
export function toCamelCase (word: string): string {
  return toConstCase(word)
    .split('_')
    .map(part => part.toLowerCase())
    .map((part, i) => i === 0 ? part : capitaliseWord(part))
    .join('')
}

export function capitaliseWord (word: string): string {
  return word.substring(0, 1).toUpperCase() + word.substring(1)
}

export function ensureMaxTextWidth (text: string, maxLength: number): string {
  return text.length > maxLength ? text.substring(0, maxLength) : text
}

export function toSentenceCase (text: string) {
  return text[0].toUpperCase() + text.substring(1)
}
