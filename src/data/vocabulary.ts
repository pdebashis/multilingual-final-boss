import type { VocabularyWord } from '../types'

const fields = ['category', 'english', 'hindi', 'hindi_script', 'odia', 'odia_script', 'bengali', 'bengali_script', 'chinese', 'pinyin'] as const

const slugify = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export function parseCsv(text: string): VocabularyWord[] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (const character of text.replace(/^\uFEFF/, '')) {
    if (character === '"') quoted = !quoted
    else if (character === ',' && !quoted) { row.push(cell.trim()); cell = '' }
    else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r') continue
      row.push(cell.trim()); cell = ''
      if (row.some(Boolean)) rows.push(row)
      row = []
    } else cell += character
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row) }
  const header = rows.shift()?.map(value => value.toLowerCase()) ?? []
  const indices = fields.map(field => header.indexOf(field))
  return rows.flatMap(values => {
    if (values.length < 2 || indices[0] < 0 || !values[indices[0]] || !values[indices[1]]) return []
    const word = Object.fromEntries(fields.map((field, index) => [field, values[indices[index]] ?? ''])) as Omit<VocabularyWord, 'id'>
    return [{ ...word, id: `${slugify(word.category)}-${slugify(word.english)}` }]
  })
}

export async function loadVocabulary(): Promise<VocabularyWord[]> {
  const response = await fetch('/vocabulary.csv')
  if (!response.ok) throw new Error('Vocabulary file could not be loaded.')
  return parseCsv(await response.text())
}

export const getCategories = (words: VocabularyWord[]) => [...new Set(words.map(word => word.category))].sort()
export const getWordsByCategory = (words: VocabularyWord[], category: string) => words.filter(word => word.category === category)
export const getWordById = (words: VocabularyWord[], id: string) => words.find(word => word.id === id)

const searchable = (word: VocabularyWord) => [word.english, word.hindi, word.hindi_script, word.odia, word.odia_script, word.bengali, word.bengali_script, word.chinese, word.pinyin].join(' ').toLocaleLowerCase()
export function searchVocabulary(words: VocabularyWord[], query: string) {
  const normalized = query.trim().toLocaleLowerCase()
  if (!normalized) return []
  return words.filter(word => searchable(word).includes(normalized)).sort((a, b) => {
    const aExact = searchable(a).split(' ').includes(normalized) ? 0 : 1
    const bExact = searchable(b).split(' ').includes(normalized) ? 0 : 1
    return aExact - bExact || a.english.localeCompare(b.english)
  })
}