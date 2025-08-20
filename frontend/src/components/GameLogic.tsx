'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiClient, WordItem } from '../lib/api'
import { GameState, EffectState, ENEMY_DATA, FOOD_WORDS } from './GameData'

export const useGameLogic = () => {
  // ローカルストレージから表示言語を読み込み（ハイドレーション対応）
  const getInitialDisplayLanguage = (): 'jp' | 'en' => {
    // サーバーサイドでは常に日本語を返してハイドレーションエラーを防ぐ
    return 'jp'
  }

  const [gameState, setGameState] = useState<GameState>({
    round: 1,
    playerHP: 100,
    enemyHP: ENEMY_DATA[1].maxHP,
    currentWord: '',
    currentWordItem: null,
    currentWordTranslation: null,
    userInput: '',
    timeLeft: 45,
    gameStatus: 'categorySelection',
    winner: null,
    wordsCompleted: 0,
    combo: 0,
    isSpecialWord: false,
    specialType: 'normal',
    lastWord: '',
    score: 0,
    maxCombo: 0,
    roundStartTime: 0,
    totalTime: 1, // 最小1秒
    roundStartScore: 0,
    availableWords: [],
    wordsLoading: false,
    selectedCategory: '',
    usedWords: new Set<string>(),
    questionLanguage: 'jp',  // お題の言語
    answerLanguage: 'jp',    // 回答の言語
    displayLanguage: getInitialDisplayLanguage()    // UI表示言語
  })

  const [effectState, setEffectState] = useState<EffectState>({
    showExplosion: false,
    explosionSkippable: false,
    showDamage: false,
    showEnemyDamage: false,
    lastDamage: 0,
    showScoreEffect: false,
    lastScoreGain: 0,
    scoreEffectKey: 0
  })

  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showScoreSubmission, setShowScoreSubmission] = useState(false)
  const [showCategorySelection, setShowCategorySelection] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // デバッグ用のログ
  useEffect(() => {
    console.log('GameLogic - showLeaderboard changed:', showLeaderboard)
  }, [showLeaderboard])

  useEffect(() => {
    console.log('GameLogic - showCategorySelection changed:', showCategorySelection)
  }, [showCategorySelection])

  useEffect(() => {
    console.log('GameLogic - isMounted changed:', isMounted)
  }, [isMounted])

  useEffect(() => {
    console.log('GameLogic - showScoreSubmission changed:', showScoreSubmission)
  }, [showScoreSubmission])

  // コンポーネントのマウント状態を管理
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // クライアントサイドでローカルストレージから言語設定を読み込み
  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('typingGameDisplayLanguage')
        if (saved === 'en' || saved === 'jp') {
          setGameState(prev => ({ ...prev, displayLanguage: saved }))
        }
      } catch (error) {
        console.warn('Failed to read display language from localStorage:', error)
      }
    }
  }, [isMounted])

  // 表示言語の変更をローカルストレージに保存
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('typingGameDisplayLanguage', gameState.displayLanguage)
      } catch (error) {
        console.warn('Failed to save display language to localStorage:', error)
      }
    }
  }, [gameState.displayLanguage])

  // スコア計算関数
  const calculateScore = (damage: number, combo: number, specialType: string, timeBonus: number = 0) => {
    let baseScore = damage * 10 // 基本スコア

    // コンボボーナス
    const comboBonus = combo >= 3 ? Math.pow(combo - 2, 1.5) * 50 : 0

    // 特殊単語ボーナス
    let specialBonus = 0
    if (specialType === 'bonus') specialBonus = 200
    if (specialType === 'debuff') specialBonus = 100 // デバフでも少しボーナス

    // 時間ボーナス
    const timeBonusScore = timeBonus * 20

    return Math.floor(baseScore + comboBonus + specialBonus + timeBonusScore)
  }

  // 簡単な翻訳辞書（フォールバック用）
  const getSimpleTranslation = (word: string, fromLang: 'jp' | 'en', toLang: 'jp' | 'en'): string | null => {
    console.log(`getSimpleTranslation: ${word} from ${fromLang} to ${toLang}`)
    if (fromLang === toLang) return word

    const translations: Record<string, Record<string, string>> = {
      // 基本単語（ラウンド1）
      'ねこ': { en: 'cat' }, 'cat': { jp: 'ねこ' },
      'いぬ': { en: 'dog' }, 'dog': { jp: 'いぬ' },
      'みず': { en: 'water' }, 'water': { jp: 'みず' },
      'ひ': { en: 'sun' }, 'sun': { jp: 'ひ' },
      'つき': { en: 'moon' }, 'moon': { jp: 'つき' },
      'ほし': { en: 'star' }, 'star': { jp: 'ほし' },
      'き': { en: 'tree' }, 'tree': { jp: 'き' },
      'はな': { en: 'flower' }, 'flower': { jp: 'はな' },
      'やま': { en: 'mountain' }, 'mountain': { jp: 'やま' },
      'うみ': { en: 'sea' }, 'sea': { jp: 'うみ' },
      'いえ': { en: 'home' }, 'home': { jp: 'いえ' },
      
      // 日常単語（ラウンド2）
      'がっこう': { en: 'school' }, 'school': { jp: 'がっこう' },
      'びょういん': { en: 'hospital' }, 'hospital': { jp: 'びょういん' },
      'ひるごはん': { en: 'lunch' }, 'lunch': { jp: 'ひるごはん' },
      'あさごはん': { en: 'breakfast' }, 'breakfast': { jp: 'あさごはん' },
      'ばんごはん': { en: 'dinner' }, 'dinner': { jp: 'ばんごはん' },
      'たんじょうび': { en: 'birthday' }, 'birthday': { jp: 'たんじょうび' },
      'てんき': { en: 'weather' }, 'weather': { jp: 'てんき' },
      'しごと': { en: 'work' }, 'work': { jp: 'しごと' },
      
      // 専門用語（ラウンド3+）
      'ぷろぐらまー': { en: 'programmer' }, 'programmer': { jp: 'ぷろぐらまー' },
      'こんぴゅーたー': { en: 'computer' }, 'computer': { jp: 'こんぴゅーたー' },
      'いんたーねっと': { en: 'internet' }, 'internet': { jp: 'いんたーねっと' },
      'すまーとふぉん': { en: 'smartphone' }, 'smartphone': { jp: 'すまーとふぉん' },
      
      // ラウンド5の長い専門用語（正確な対応関係）
      'じんこうちのうぎじゅつしゃ': { en: 'artificial intelligence' }, 'artificial intelligence': { jp: 'じんこうちのうぎじゅつしゃ' },
      'きかいがくしゅう': { en: 'machine learning' }, 'machine learning': { jp: 'きかいがくしゅう' },
      'でぃーぷらーにんぐ': { en: 'deep learning' }, 'deep learning': { jp: 'でぃーぷらーにんぐ' },
      'しぜんげんごしょり': { en: 'natural language processing' }, 'natural language processing': { jp: 'しぜんげんごしょり' },
      'こんぴゅーたーびじょん': { en: 'computer vision' }, 'computer vision': { jp: 'こんぴゅーたーびじょん' },
      'でーたさいえんす': { en: 'data science' }, 'data science': { jp: 'でーたさいえんす' },
      'くらうどこんぴゅーてぃんぐ': { en: 'cloud computing' }, 'cloud computing': { jp: 'くらうどこんぴゅーてぃんぐ' },
      'いんたーねっとおぶしんぐす': { en: 'internet of things' }, 'internet of things': { jp: 'いんたーねっとおぶしんぐす' },
      'ばーちゃるりありてぃ': { en: 'virtual reality' }, 'virtual reality': { jp: 'ばーちゃるりありてぃ' },
      'おーぐめんてっどりありてぃ': { en: 'augmented reality' }, 'augmented reality': { jp: 'おーぐめんてっどりありてぃ' },
      'そふとうぇあえんじにありんぐ': { en: 'software engineering' }, 'software engineering': { jp: 'そふとうぇあえんじにありんぐ' },
      'しすてむあどみにすとれーしょん': { en: 'system administration' }, 'system administration': { jp: 'しすてむあどみにすとれーしょん' },
      'ねっとわーくえんじにありんぐ': { en: 'network engineering' }, 'network engineering': { jp: 'ねっとわーくえんじにありんぐ' },
      'でーたべーすあどみにすとれーしょん': { en: 'database administration' }, 'database administration': { jp: 'でーたべーすあどみにすとれーしょん' },
      'ふるすたっくでべろっぷめんと': { en: 'full stack development' }, 'full stack development': { jp: 'ふるすたっくでべろっぷめんと' },
      'ゆーざーえくすぺりえんすでざいん': { en: 'user experience design' }, 'user experience design': { jp: 'ゆーざーえくすぺりえんすでざいん' },
      'でじたるまーけてぃんぐすぺしゃりすと': { en: 'digital marketing specialist' }, 'digital marketing specialist': { jp: 'でじたるまーけてぃんぐすぺしゃりすと' },
      'びじねすいんてりじぇんすあなりすと': { en: 'business intelligence analyst' }, 'business intelligence analyst': { jp: 'びじねすいんてりじぇんすあなりすと' },
      'くらうどそりゅーしょんあーきてくと': { en: 'cloud solution architect' }, 'cloud solution architect': { jp: 'くらうどそりゅーしょんあーきてくと' }
    }

    return translations[word]?.[toLang] || null
  }

  // 現在の単語の翻訳を取得する関数
  const getWordTranslation = async (currentWordItem: WordItem, targetLanguage: 'jp' | 'en'): Promise<string | null> => {
    console.log(`=== getWordTranslation Debug ===`)
    console.log(`Looking for translation of: "${currentWordItem.word}" (${currentWordItem.language})`)
    console.log(`Target language: ${targetLanguage}`)
    console.log(`Word ID: ${currentWordItem.word_id}`)

    console.log(`Word item language: ${currentWordItem.language}`)

    // 1. DynamoDBから直接翻訳を取得（最優先）
    if (currentWordItem.word_id && currentWordItem.word_id !== 'undefined') {
      try {
        console.log(`🔍 Fetching translation from DynamoDB for word_id: ${currentWordItem.word_id}`)
        const response = await apiClient.getTranslation(currentWordItem.word_id, targetLanguage)
        
        if (response.data && response.data.translation) {
          console.log(`✅ DynamoDB translation found: ${currentWordItem.word} -> ${response.data.translation}`)
          return response.data.translation
        }
      } catch (error) {
        console.warn(`⚠️ DynamoDB translation not found for word_id: ${currentWordItem.word_id}`, error)
      }
    }

    // 2. 簡単な翻訳辞書を試す（高速フォールバック）
    const simpleTranslation = getSimpleTranslation(currentWordItem.word, currentWordItem.language || 'jp', targetLanguage)
    if (simpleTranslation) {
      console.log(`✅ Simple translation found: ${currentWordItem.word} -> ${simpleTranslation}`)
      return simpleTranslation
    }

    // DynamoDBで見つからない場合は従来の方法を試す
    try {
      // 対応する言語のword_idを生成（例: beginner_words_jp_1_043 -> beginner_words_en_1_043）
      const currentLang = currentWordItem.language || (currentWordItem.word_id.includes('_jp_') ? 'jp' : 'en')
      const targetLangCode = targetLanguage === 'jp' ? 'jp' : 'en'
      const expectedWordId = currentWordItem.word_id.replace(`_${currentLang}_`, `_${targetLangCode}_`)
      
      console.log(`Looking for corresponding word_id: ${currentWordItem.word_id} -> ${expectedWordId}`)
      
      // 対応する言語の単語を取得
      console.log(`Fetching words for category: ${currentWordItem.category}, round: ${currentWordItem.round}, language: ${targetLanguage}`)
      const response = await apiClient.getWords(currentWordItem.category, currentWordItem.round, targetLanguage)
      const translatedWords = response.words || []

      console.log(`Found ${translatedWords.length} words in target language`)
      console.log(`Sample translated words:`, translatedWords.slice(0, 3).map(w => `${w.word}(${w.word_id})`))

      // 対応するword_idの単語を探す
      const translatedWord = translatedWords.find(word => word.word_id === expectedWordId)

      if (translatedWord) {
        console.log(`✅ API translation found: ${currentWordItem.word} -> ${translatedWord.word}`)
        return translatedWord.word
      } else {
        console.warn(`❌ No translation found for expected word_id: ${expectedWordId}`)
        return null
      }
    } catch (error) {
      console.error('Error fetching translation:', error)
      return null
    }
  }

  // 単語と翻訳を設定する関数
  const setWordWithTranslation = async (word: string, wordItem: WordItem | null, questionLang: 'jp' | 'en', answerLang: 'jp' | 'en') => {
    let translation: string | null = null

    console.log(`=== setWordWithTranslation Debug ===`)
    console.log(`Word: ${word}`)
    console.log(`Question language: ${questionLang}`)
    console.log(`Answer language: ${answerLang}`)
    console.log(`Word item:`, wordItem)

    // お題の言語と回答の言語が異なる場合のみ翻訳を取得
    if (questionLang !== answerLang && wordItem) {
      console.log(`Languages differ, getting translation...`)
      translation = await getWordTranslation(wordItem, answerLang)
      console.log(`Translation result: ${word} -> ${translation}`)
    } else {
      console.log(`Languages are same or no word item, no translation needed`)
    }

    console.log(`=== End setWordWithTranslation Debug ===`)

    return {
      word,
      wordItem,
      translation
    }
  }

  // 単語を取得する関数
  const fetchWordsForRound = async (category: string, round: number, language: 'jp' | 'en' = 'jp', abortSignal?: AbortSignal): Promise<WordItem[]> => {
    if (!category) {
      console.warn('No category selected')
      return []
    }

    // 既にキャンセルされている場合は処理を中断
    if (abortSignal?.aborted) {
      return []
    }

    setGameState(prev => ({ ...prev, wordsLoading: true }))
    try {
      // 言語パラメータ付きでAPIを呼び出し
      console.log(`Fetching words for ${category}, round ${round}, language ${language}`)
      
      // キャンセルチェック
      if (abortSignal?.aborted) {
        return []
      }
      
      const response = await apiClient.getWords(category, round, language)
      const allWords = response.words || []

      // DynamoDBから取得した単語をログ出力
      console.log(`API returned ${allWords.length} words for ${category} round ${round}`)
      console.log('Sample words:', allWords.slice(0, 5).map(w => `${w.word}(${w.type})`))

      // 言語でフィルタリング
      let filteredWords = allWords.filter(word => word.language === language)
      console.log(`After filtering for ${language}: ${filteredWords.length} words`)

      // フィルタリング後に単語がない場合
      if (filteredWords.length === 0) {
        console.warn(`No words found for language ${language} in DynamoDB, using fallback`)
        throw new Error('No words found for selected language in DynamoDB')
      }

      // 単語の種類別に分類
      const normalWords = filteredWords.filter(w => w.type === 'normal')
      const bonusWords = filteredWords.filter(w => w.type === 'bonus')
      const debuffWords = filteredWords.filter(w => w.type === 'debuff')
      
      console.log(`Word types - normal: ${normalWords.length}, bonus: ${bonusWords.length}, debuff: ${debuffWords.length}`)

      // 状態を更新
      setGameState(prev => ({
        ...prev,
        availableWords: filteredWords,
        wordsLoading: false
      }))
      
      console.log(`✅ Successfully loaded ${filteredWords.length} words from DynamoDB for ${category}, round ${round}, language ${language}`)
      
      // 単語リストを返す
      return filteredWords
    } catch (error) {
      console.error(`Failed to fetch words for category ${category}, round ${round}:`, error)
      // フォールバック: 新しいカテゴリーと言語に応じたハードコードされた単語を使用
      let fallbackWords: string[] = []

      if (language === 'jp') {
        if (category === 'beginner_words') {
          fallbackWords = ['みず', 'たべもの', 'のみもの', 'いえ', 'がっこう', 'しごと', 'ともだち', 'かぞく', 'いぬ', 'ねこ']
        } else if (category === 'intermediate_words') {
          fallbackWords = ['かんきょう', 'おんだんか', 'こうがい', 'りさいくる', 'しぜん', 'どうぶつ', 'しょくぶつ', 'せいたいけい', 'ちきゅう', 'うちゅう']
        } else if (category === 'beginner_conversation') {
          fallbackWords = ['おはよう', 'こんにちは', 'こんばんは', 'おやすみ', 'はじめまして', 'よろしく', 'ありがとう', 'すみません', 'ごめんなさい', 'いいえ']
        } else if (category === 'intermediate_conversation') {
          fallbackWords = ['おひさしぶりです', 'げんきでしたか', 'おかげさまで', 'いかがですか', 'どうされましたか', 'なにかありましたか', 'しんぱいしています', 'だいじょうぶでしょうか', 'てつだいましょうか', 'なにかできることは']
        } else {
          // 古いカテゴリーの場合
          if (category === 'food') {
            fallbackWords = FOOD_WORDS[round as keyof typeof FOOD_WORDS] || []
          } else if (category === 'vehicle') {
            fallbackWords = ['くるま', 'でんしゃ', 'ばす', 'ひこうき', 'ふね']
          } else if (category === 'station') {
            fallbackWords = ['とうきょう', 'しんじゅく', 'しぶや', 'いけぶくろ', 'うえの']
          } else {
            fallbackWords = ['みず', 'たべもの', 'のみもの', 'いえ', 'がっこう']
          }
        }
      } else {
        // 英語のフォールバック単語
        if (category === 'beginner_words') {
          fallbackWords = ['water', 'food', 'drink', 'house', 'school', 'work', 'friend', 'family', 'dog', 'cat']
        } else if (category === 'intermediate_words') {
          fallbackWords = ['environment', 'global warming', 'pollution', 'recycle', 'nature', 'animal', 'plant', 'ecosystem', 'earth', 'space']
        } else if (category === 'beginner_conversation') {
          fallbackWords = ['good morning', 'hello', 'good evening', 'good night', 'nice to meet you', 'please treat me well', 'thank you', 'excuse me', 'sorry', 'no']
        } else if (category === 'intermediate_conversation') {
          fallbackWords = ['long time no see', 'how have you been', 'thanks to you', 'how are things', 'what happened', 'did something happen', 'i am worried', 'will it be okay', 'shall i help', 'is there anything i can do']
        } else {
          // 古いカテゴリーの場合
          if (category === 'food') {
            fallbackWords = ['rice', 'bread', 'meat', 'fish', 'egg', 'milk', 'water', 'tea']
          } else if (category === 'vehicle') {
            fallbackWords = ['car', 'train', 'bus', 'plane', 'ship']
          } else if (category === 'station') {
            fallbackWords = ['tokyo', 'osaka', 'kyoto', 'yokohama', 'nagoya']
          } else {
            fallbackWords = ['water', 'food', 'drink', 'house', 'school']
          }
        }
      }

      const wordItems: WordItem[] = fallbackWords.map((word, index) => ({
        category: category,
        word_id: `fallback_${round}_${index}`,
        word: word,
        round: round,
        type: 'normal' as const,
        language: language
      }))

      // 状態を更新
      setGameState(prev => ({
        ...prev,
        availableWords: wordItems,
        wordsLoading: false
      }))
      
      // フォールバック単語リストを返す
      return wordItems
    }
  }

  // 単語リストから直接単語を生成する関数
  const generateRandomWordFromList = (availableWords: WordItem[], usedWords: Set<string>, lastWord: string = '') => {
    console.log(`generateRandomWordFromList called, available words: ${availableWords.length}`)
    console.log(`Sample available words:`, availableWords.slice(0, 3).map(w => w.word))
    
    if (availableWords.length === 0) {
      console.warn('No words available for current round - returning error word')
      return {
        word: 'えらー',
        type: 'normal' as const,
        wordItem: null
      }
    }

    // 未使用の単語から選択
    let normalWords = availableWords.filter(w => w.type === 'normal' && !usedWords.has(w.word))
    let bonusWords = availableWords.filter(w => w.type === 'bonus' && !usedWords.has(w.word))
    let debuffWords = availableWords.filter(w => w.type === 'debuff' && !usedWords.has(w.word))
    
    // 全ての単語を使い切った場合はリセット
    if (normalWords.length === 0 && bonusWords.length === 0 && debuffWords.length === 0) {
      console.log('All words used, resetting used words set')
      const allNormalWords = availableWords.filter(w => w.type === 'normal')
      const allBonusWords = availableWords.filter(w => w.type === 'bonus')
      const allDebuffWords = availableWords.filter(w => w.type === 'debuff')
      normalWords = allNormalWords
      bonusWords = allBonusWords
      debuffWords = allDebuffWords
      
      return {
        word: 'RESET_USED_WORDS',
        type: 'normal' as const,
        wordItem: null,
        resetUsedWords: true
      }
    }

    console.log(`Available word counts - normal: ${normalWords.length}, bonus: ${bonusWords.length}, debuff: ${debuffWords.length}`)

    let selectedWord: WordItem
    let wordType: 'normal' | 'bonus' | 'debuff' = 'normal'

    // 20%の確率で特殊単語
    if (Math.random() < 0.2 && (bonusWords.length > 0 || debuffWords.length > 0)) {
      const isBonus = Math.random() < 0.6 // 60%でボーナス、40%でデバフ
      const specialWords = isBonus ? bonusWords : debuffWords
      wordType = isBonus ? 'bonus' : 'debuff'
      selectedWord = specialWords[Math.floor(Math.random() * specialWords.length)]
    } else {
      selectedWord = normalWords[Math.floor(Math.random() * normalWords.length)]
    }

    return {
      word: selectedWord.word,
      type: wordType,
      wordItem: selectedWord
    }
  }

  // ランダムな単語を生成（重複回避）- 既存の関数（互換性のため残す）
  const generateRandomWord = useCallback((lastWord: string = '') => {
    return generateRandomWordFromList(gameState.availableWords, gameState.usedWords, lastWord)

  }, [gameState.availableWords, gameState.usedWords])

  return {
    gameState,
    setGameState,
    effectState,
    setEffectState,
    showLeaderboard,
    setShowLeaderboard,
    showScoreSubmission,
    setShowScoreSubmission,
    showCategorySelection,
    setShowCategorySelection,
    isMounted,
    calculateScore,
    getWordTranslation,
    setWordWithTranslation,
    fetchWordsForRound,
    generateRandomWord,
    generateRandomWordFromList
  }
}