import { useEffect, useMemo, useState } from 'react'
import { getCategories, getWordById, getWordsByCategory, loadVocabulary, searchVocabulary } from './data/vocabulary'
import { useLocalStorage } from './hooks/useLocalStorage'
import type { PracticeDirection, RepeatSetting, VocabularyWord } from './types'

const languageKeys = ['english', 'hindi', 'odia', 'bengali', 'chinese', 'pinyin'] as const
type LanguageKey = typeof languageKeys[number]
type DisplayKey = LanguageKey | 'hindi_script' | 'odia_script' | 'bengali_script'
type DisplayPreferences = Record<Exclude<DisplayKey, 'english'>, boolean>
const defaultDisplayPreferences: DisplayPreferences = { hindi: true, hindi_script: true, odia: true, odia_script: true, bengali: true, bengali_script: true, chinese: true, pinyin: true }
const languageLabels: Record<DisplayKey, string> = { english: 'English', hindi: 'Hindi · romanized', hindi_script: 'Hindi · script', odia: 'Odia · romanized', odia_script: 'Odia · script', bengali: 'Bengali · romanized', bengali_script: 'Bengali · script', chinese: 'Chinese', pinyin: 'Pinyin' }
const getVisibleKeys = (preferences: DisplayPreferences): DisplayKey[] => ['english', ...Object.keys(preferences).filter(key => preferences[key as keyof DisplayPreferences]) as DisplayKey[]]
const directionOptions: Array<{ value: PracticeDirection; label: string }> = [
  { value: 'random', label: 'Random' }, ...languageKeys.filter(key => key !== 'pinyin').map(key => ({ value: key as PracticeDirection, label: `${languageLabels[key]} → other languages` }))
]
const accents = ['coral', 'green', 'gold', 'blue', 'rose', 'ink']

function App() {
  const [words, setWords] = useState<VocabularyWord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [page, setPage] = useState(() => window.location.pathname === '/practice' ? 'practice' : 'home')
  const [selectedId, setSelectedId] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [displayPreferences, setDisplayPreferences] = useLocalStorage<DisplayPreferences>('mfb-display-preferences', defaultDisplayPreferences)
  const categories = useMemo(() => getCategories(words), [words])

  useEffect(() => { loadVocabulary().then(setWords).catch(error => setLoadError(error.message)).finally(() => setLoading(false)) }, [])

  useEffect(() => { const handlePopState = () => setPage(window.location.pathname === '/practice' ? 'practice' : 'home'); window.addEventListener('popstate', handlePopState); return () => window.removeEventListener('popstate', handlePopState) }, [])
  const navigate = (nextPage: string, id = '') => { setPage(nextPage); setSelectedId(id); setMobileMenu(false); window.history.pushState({}, '', nextPage === 'practice' ? '/practice' : '/'); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  if (loading) return <div className="loading-screen"><span className="mark">M</span><p>Gathering your words...</p></div>
  if (loadError) return <div className="loading-screen"><span className="mark">!</span><h1>Vocabulary unavailable</h1><p>{loadError}</p></div>
  if (!words.length) return <div className="loading-screen"><span className="mark">∅</span><h1>No vocabulary yet</h1><p>Add a row to vocabulary.csv to begin.</p></div>

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => navigate('home')} aria-label="Go to home"><span className="brand-mark">M</span><span>Multilingual<br /><b>Final Boss</b></span></button>
      <nav className={mobileMenu ? 'nav open' : 'nav'}>{[['home', 'Home'], ['practice', 'Practice'], ['search', 'Search'], ['categories', 'Categories']].map(([value, label]) => <button key={value} className={page === value ? 'nav-link active' : 'nav-link'} onClick={() => navigate(value)}>{label}</button>)}</nav>
      <DisplaySettings preferences={displayPreferences} onChange={key => setDisplayPreferences(current => ({ ...current, [key]: !current[key] }))} />
      <button className="menu-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle navigation">{mobileMenu ? '×' : '☰'}</button>
    </header>
    <main>
      {page === 'home' && <Home words={words} onNavigate={navigate} />}
      {page === 'categories' && <Categories words={words} categories={categories} onNavigate={navigate} />}
      {page.startsWith('category:') && <CategoryPage category={page.slice(9)} words={words} displayPreferences={displayPreferences} onSelect={id => navigate('detail', id)} onBack={() => navigate('categories')} />}
      {page === 'search' && <SearchPage words={words} displayPreferences={displayPreferences} onSelect={id => navigate('detail', id)} />}
      {page === 'detail' && <Detail word={getWordById(words, selectedId)} displayPreferences={displayPreferences} onBack={() => navigate('search')} />}
      {page === 'practice' && <Practice words={words} categories={categories} displayPreferences={displayPreferences} />}
    </main>
    <footer><span>Multilingual Final Boss</span><span>{words.length} words · built from your vocabulary</span></footer>
  </div>
}

function Home({ words, onNavigate }: { words: VocabularyWord[]; onNavigate: (page: string, id?: string) => void }) {
  return <div className="page home-page">
    <section className="hero"><div className="hero-copy"><p className="eyebrow">Your daily language dojo</p><h1>Many languages.<br /><em>One sharp mind.</em></h1><p className="hero-text">Build your translation reflex across six languages, one word at a time.</p><button className="primary-button" onClick={() => onNavigate('practice')}>Start practicing <span>↗</span></button></div><div className="hero-art"><div className="orbit orbit-one"></div><div className="orbit orbit-two"></div><div className="hero-glyph">文</div><span className="float-chip chip-one">हिन्दी</span><span className="float-chip chip-two">বাংলা</span><span className="float-chip chip-three">Odia</span><span className="float-chip chip-four">中文</span></div></section>
    <section className="section-heading"><div><p className="eyebrow">Choose your challenge</p><h2>Make a little progress<br />that compounds.</h2></div><span className="section-count">Vocabulary size: {words.length}</span></section>
    <section className="action-grid"><button className="action-card action-coral" onClick={() => onNavigate('practice')}><span className="action-icon">✦</span><span><b>Practice memory</b><small>Recall beats recognition.</small></span><strong>↗</strong></button><button className="action-card action-green" onClick={() => onNavigate('search')}><span className="action-icon">⌕</span><span><b>Search vocabulary</b><small>Find the exact word.</small></span><strong>↗</strong></button><button className="action-card action-gold" onClick={() => onNavigate('categories')}><span className="action-icon">▦</span><span><b>Browse categories</b><small>Explore by meaning.</small></span><strong>↗</strong></button></section>
  </div>
}

function CategoryGrid({ categories, words, onSelect }: { categories: string[]; words: VocabularyWord[]; onSelect: (category: string) => void }) {
  return <div className="category-grid">{categories.map((category, index) => <button className={`category-card ${accents[index % accents.length]}`} key={category} onClick={() => onSelect(category)}><span className="category-number">0{index + 1}</span><span className="category-symbol">{['◌', '◇', '◒', '⌁', '⊹', '◎'][index % 6]}</span><span className="category-name">{category.replace('_', ' ')}</span><span className="category-total">{getWordsByCategory(words, category).length} {getWordsByCategory(words, category).length === 1 ? 'word' : 'words'} <span>→</span></span></button>)}</div>
}

function Categories({ categories, words, onNavigate }: { categories: string[]; words: VocabularyWord[]; onNavigate: (page: string) => void }) {
  return <div className="page inner-page"><PageIntro eyebrow="The word bank" title="Categories" description="Every word has a home. Pick a shelf and start connecting the dots." /><CategoryGrid categories={categories} words={words} onSelect={category => onNavigate(`category:${category}`)} /></div>
}

function CategoryPage({ category, words, displayPreferences, onSelect, onBack }: { category: string; words: VocabularyWord[]; displayPreferences: DisplayPreferences; onSelect: (id: string) => void; onBack: () => void }) {
  const [query, setQuery] = useState('')
  const categoryWords = getWordsByCategory(words, category).filter(word => Object.values(word).join(' ').toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => a.english.localeCompare(b.english))
  return <div className="page inner-page"><button className="back-button" onClick={onBack}>← Back to categories</button><PageIntro eyebrow="Category" title={category.replace('_', ' ')} description={`${categoryWords.length} words to explore.`} /><div className="toolbar"><label className="search-input"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Filter this category..." /></label><span className="result-note">{categoryWords.length} results</span></div><VocabularyTable words={categoryWords} displayPreferences={displayPreferences} onSelect={onSelect} /></div>
}

function VocabularyTable({ words, displayPreferences, onSelect }: { words: VocabularyWord[]; displayPreferences: DisplayPreferences; onSelect: (id: string) => void }) {
  const visibleKeys = getVisibleKeys(displayPreferences)
  if (!words.length) return <EmptyState title="No words found" text="Try a different filter." />
  return <div className="vocabulary-table-wrap"><table><thead><tr>{visibleKeys.map(key => <th key={key}>{languageLabels[key]}</th>)}</tr></thead><tbody>{words.map(word => <tr key={word.id} onClick={() => onSelect(word.id)} tabIndex={0} onKeyDown={event => event.key === 'Enter' && onSelect(word.id)}>{visibleKeys.map(key => <td key={key} className={key === 'chinese' || key.endsWith('_script') ? 'chinese-cell' : key === 'pinyin' ? 'pinyin-cell' : ''}>{word[key] || <span className="empty-cell">—</span>}</td>)}</tr>)}</tbody></table><div className="mobile-word-list">{words.map(word => <button className="mobile-word-card" key={word.id} onClick={() => onSelect(word.id)}><span className="mobile-word-title">{word.english}<i>→</i></span><span className="mobile-word-chinese">{displayPreferences.chinese ? word.chinese || '—' : ''} {displayPreferences.pinyin && <small>{word.pinyin}</small>}</span><span className="mobile-word-meta">{visibleKeys.filter(key => !['english', 'chinese', 'pinyin'].includes(key)).map(key => word[key] || '—').join(' · ')}</span></button>)}</div></div>
}

function SearchPage({ words, displayPreferences, onSelect }: { words: VocabularyWord[]; displayPreferences: DisplayPreferences; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const results = searchVocabulary(words, query)
  const visibleKeys = getVisibleKeys(displayPreferences).filter(key => key !== 'english')
  return <div className="page inner-page search-page"><PageIntro eyebrow="Find a word" title="Search vocabulary" description="Search every translation, pronunciation, and script at once." /><label className="big-search"><span>⌕</span><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Try “when”, “现在”, or “shénme”" /><kbd>⌘ K</kbd></label>{query.trim() ? <><div className="search-result-heading"><span>{results.length} {results.length === 1 ? 'match' : 'matches'}</span></div><div className="search-results">{results.map(word => <button className="search-result" key={word.id} onClick={() => onSelect(word.id)}><span className="result-main"><b>{word.english}</b><small>{word.category.replace('_', ' ')}</small></span><span className="result-values">{visibleKeys.map(key => <span key={key} className={key.endsWith('_script') || key === 'chinese' ? 'result-script' : key === 'pinyin' ? 'result-pinyin' : ''}>{word[key] || '—'}</span>)}</span><i>↗</i></button>)}</div>{!results.length && <EmptyState title="No matches yet" text="Try a word in another language or check the spelling." />}</> : <div className="search-hint"><span className="hint-icon">⌕</span><h3>Start with a word</h3><p>Search across all six language fields. Chinese characters work directly too.</p></div>}</div>
}

function Detail({ word, displayPreferences, onBack }: { word?: VocabularyWord; displayPreferences: DisplayPreferences; onBack: () => void }) {
  if (!word) return <div className="page inner-page"><EmptyState title="Word not found" text="This vocabulary item is no longer available." /><button className="back-button" onClick={onBack}>← Go back</button></div>
  const visibleKeys = getVisibleKeys(displayPreferences)
  return <div className="page detail-page"><button className="back-button" onClick={onBack}>← Go back</button><div className="detail-header"><div><p className="eyebrow">{word.category.replace('_', ' ')}</p><h1>{word.english}</h1></div><span className="detail-id">#{word.id}</span></div>{displayPreferences.chinese && <div className="detail-feature"><span className="eyebrow">Chinese</span><strong>{word.chinese || '—'}</strong>{displayPreferences.pinyin && <span>{word.pinyin || 'No pronunciation yet'}</span>}</div>}<div className="translation-grid">{visibleKeys.filter(key => !['english', 'chinese', 'pinyin'].includes(key)).map(key => <div className="translation-item" key={key}><span>{languageLabels[key]}</span><strong>{word[key] || '—'}</strong></div>)}{displayPreferences.pinyin && <div className="translation-item pinyin-item"><span>Pinyin · pronunciation</span><strong>{word.pinyin || '—'}</strong></div>}</div></div>
}

function Practice({ words, categories, displayPreferences }: { words: VocabularyWord[]; categories: string[]; displayPreferences: DisplayPreferences }) {
  const [direction, setDirection] = useLocalStorage<PracticeDirection>('mfb-direction', 'random')
  const [category, setCategory] = useLocalStorage('mfb-category', 'all')
  const [repeat, setRepeat] = useLocalStorage<RepeatSetting>('mfb-repeat', '5')
  const [recent, setRecent] = useLocalStorage<string[]>('mfb-recent', [])
  const [stats, setStats] = useLocalStorage('mfb-stats', { practiced: 0, gotIt: 0, again: 0 })
  const [word, setWord] = useState<VocabularyWord | null>(null)
  const [promptKey, setPromptKey] = useState<DisplayKey>('english')
  const [revealed, setRevealed] = useState(false)
  const pool = category === 'all' ? words : getWordsByCategory(words, category)
  const visibleKeys = getVisibleKeys(displayPreferences)
  const directionKey = (value: Exclude<PracticeDirection, 'random'>): DisplayKey => value === 'english' || displayPreferences[value] ? value : `${value}_script` as DisplayKey
  const chooseWord = () => {
    const available = pool.filter(item => !recent.slice(0, Number(repeat) || 0).includes(item.id))
    const choices = available.length ? available : pool
    setWord(choices[Math.floor(Math.random() * choices.length)] ?? null)
    const promptChoices = visibleKeys.filter(key => key !== 'english' && key !== 'pinyin')
    setPromptKey(direction === 'random' ? promptChoices[Math.floor(Math.random() * promptChoices.length)] ?? 'english' : directionKey(direction))
    setRevealed(false)
  }
  useEffect(() => { chooseWord() }, [category, repeat, direction])
  useEffect(() => { const handleKey = (event: KeyboardEvent) => { if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes((event.target as HTMLElement).tagName)) return; if (event.code === 'Space') { event.preventDefault(); if (!revealed) setRevealed(true) } if (event.key === 'ArrowRight' && revealed) mark('gotIt'); if (event.key.toLowerCase() === 'r' && revealed) mark('again') }; window.addEventListener('keydown', handleKey); return () => window.removeEventListener('keydown', handleKey) })
  const mark = (result: 'gotIt' | 'again') => { if (!word) return; setStats(current => ({ practiced: current.practiced + 1, gotIt: current.gotIt + (result === 'gotIt' ? 1 : 0), again: current.again + (result === 'again' ? 1 : 0) })); setRecent(current => [word.id, ...current.filter(id => id !== word.id)].slice(0, 20)); chooseWord() }
  const promptValue = word?.[promptKey as keyof VocabularyWord] as string
  return <div className="page practice-page"><div className="practice-top"><div><p className="eyebrow">Memory dojo</p><h1>Practice mode</h1><p className="practice-subtitle">Retrieve first. Reveal second. That’s how it sticks.</p></div><div className="stats-strip"><span><b>{stats.practiced}</b> practiced</span><span><b>{stats.gotIt}</b> got it</span><span><b>{stats.again}</b> again</span></div></div><div className="practice-layout"><aside className="practice-settings"><h3>Practice settings</h3><label>Direction<select value={direction} onChange={event => setDirection(event.target.value as PracticeDirection)}>{directionOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label>Category<select value={category} onChange={event => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map(item => <option key={item} value={item}>{item.replace('_', ' ')}</option>)}</select></label><label>Repeat avoidance<select value={repeat} onChange={event => setRepeat(event.target.value as RepeatSetting)}><option value="off">Off</option><option value="5">Last 5 words</option><option value="10">Last 10 words</option></select></label><div className="shortcut-list"><span><kbd>Space</kbd> Reveal</span><span><kbd>→</kbd> Got it</span><span><kbd>R</kbd> Again</span></div></aside><section className={`memory-card ${revealed ? 'revealed' : ''}`}><div className="memory-card-top"><span>{word?.category.replace('_', ' ')}</span><span>{revealed ? 'Translations revealed' : 'Think before you peek'}</span></div>{word && <div className="prompt"><span className="prompt-language">{languageLabels[promptKey]}</span><strong className={promptKey === 'chinese' || promptKey.endsWith('_script') ? 'large-script' : ''}>{promptValue || '—'}</strong>{promptKey === 'chinese' && displayPreferences.pinyin && <small>{word.pinyin}</small>}</div>}{revealed && word && <div className="revealed-grid">{visibleKeys.filter(key => key !== promptKey).map(key => <div key={key}><span>{languageLabels[key]}</span><strong className={key === 'chinese' || key.endsWith('_script') ? 'large-script' : ''}>{word[key] || '—'}</strong>{key === 'chinese' && displayPreferences.pinyin && <small>{word.pinyin}</small>}</div>)}</div>}<div className="memory-actions">{!revealed ? <button className="primary-button reveal-button" onClick={() => setRevealed(true)}>Reveal answer <span>Space</span></button> : <><button className="again-button" onClick={() => mark('again')}>↻ Again <span>R</span></button><button className="got-button" onClick={() => mark('gotIt')}>Got it <span>→</span></button></>}</div></section></div></div>
}

function DisplaySettings({ preferences, onChange }: { preferences: DisplayPreferences; onChange: (key: keyof DisplayPreferences) => void }) {
  const [open, setOpen] = useState(false)
  const options: Array<{ key: keyof DisplayPreferences; label: string }> = [
    { key: 'hindi', label: 'Hindi · romanized' }, { key: 'hindi_script', label: 'Hindi · script' },
    { key: 'odia', label: 'Odia · romanized' }, { key: 'odia_script', label: 'Odia · script' },
    { key: 'bengali', label: 'Bengali · romanized' }, { key: 'bengali_script', label: 'Bengali · script' },
    { key: 'chinese', label: 'Chinese characters' }, { key: 'pinyin', label: 'Pinyin' }
  ]
  return <div className="display-settings"><button className="display-trigger" onClick={() => setOpen(current => !current)} aria-expanded={open}>◉ Display values</button>{open && <div className="display-panel"><div className="display-panel-heading"><strong>Visible values</strong><span>Saved automatically</span></div>{options.map(option => <button className={`display-toggle ${preferences[option.key] ? 'selected' : ''}`} key={option.key} onClick={() => onChange(option.key)}><span className="toggle-indicator">{preferences[option.key] ? '✓' : ''}</span>{option.label}</button>)}</div>}</div>
}

function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) { return <div className="page-intro"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div> }
function EmptyState({ title, text }: { title: string; text: string }) { return <div className="empty-state"><span>⌕</span><h3>{title}</h3><p>{text}</p></div> }

export default App