export type VocabularyWord = {
  id: string
  category: string
  english: string
  hindi: string
  hindi_script: string
  odia: string
  odia_script: string
  bengali: string
  bengali_script: string
  chinese: string
  pinyin: string
}

export type PracticeDirection = 'random' | 'english' | 'hindi' | 'odia' | 'bengali' | 'chinese'
export type RepeatSetting = 'off' | '5' | '10'