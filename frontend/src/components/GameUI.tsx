'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import ExplosionEffect from './ExplosionEffect'
import DamageEffect from './DamageEffect'
import ComboEffect from './ComboEffect'
import EnemyDamageEffect from './EnemyDamageEffect'
import ScoreEffect from './ScoreEffect'
import Leaderboard from './Leaderboard'
import ScoreSubmission from './ScoreSubmission'
import CategorySelection from './CategorySelection'
import { useGameLogic } from './GameLogic'
import { ENEMY_DATA, getLocalizedText } from './GameData'

export default function GameUI() {
  try {
    const gameLogicResult = useGameLogic()
    
    // useGameLogicの戻り値が正しく取得できているかチェック
    if (!gameLogicResult || !gameLogicResult.gameState) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-600/40 via-indigo-600/30 to-black/50 flex items-center justify-center">
          <div className="text-white text-xl">Error: Game logic not initialized</div>
        </div>
      )
    }
  
  const {
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
  } = gameLogicResult



  const inputRef = useRef<HTMLInputElement>(null)
  const [isComposing, setIsComposing] = useState(false)

  // ゲーム開始
  const startRound = useCallback(async () => {
    // AbortControllerを作成
    const abortController = new AbortController()
    
    try {
      // まず単語を取得してからゲームを開始
      const availableWords = await fetchWordsForRound(gameState.selectedCategory, gameState.round, gameState.questionLanguage, abortController.signal)

      const timeLimit = ENEMY_DATA[gameState.round as keyof typeof ENEMY_DATA].timeLimit
      let wordData = generateRandomWordFromList(availableWords, gameState.usedWords, gameState.lastWord)
      

      
      // 使用済み単語のリセットが必要な場合
      if (wordData.word === 'RESET_USED_WORDS') {
        setGameState(prev => ({ ...prev, usedWords: new Set<string>() }))
        wordData = generateRandomWord(gameState.lastWord) // 再度生成
      }
      
      const newWord = typeof wordData === 'string' ? wordData : wordData.word
      const newWordItem = typeof wordData !== 'string' ? wordData.wordItem : null



      // キャンセルチェック
      if (abortController.signal.aborted) {
        return
      }

      // 翻訳を取得
      const wordWithTranslation = await setWordWithTranslation(newWord, newWordItem, gameState.questionLanguage, gameState.answerLanguage)

      // 再度キャンセルチェック
      if (abortController.signal.aborted) {
        return
      }

      // 状態更新を確実に行う
      const newUsedWords = new Set(gameState.usedWords)
      newUsedWords.add(newWord)

      setGameState(prev => ({
        ...prev,
        currentWord: wordWithTranslation.word,
        currentWordItem: wordWithTranslation.wordItem,
        currentWordTranslation: wordWithTranslation.translation,
        userInput: '',
        timeLeft: timeLimit,
        gameStatus: 'playing',
        wordsCompleted: 0,
        combo: 0,
        isSpecialWord: typeof wordData !== 'string',
        specialType: typeof wordData === 'string' ? 'normal' : wordData.type,
        lastWord: newWord,
        roundStartTime: Date.now(),
        roundStartScore: prev.score,
        usedWords: newUsedWords
      }))



      // 入力フィールドにフォーカス
      setTimeout(() => {
        if (inputRef.current) {
          try {
            inputRef.current.focus()
          } catch (error) {
            // Focus error handling
          }
        }
      }, 100)
    } catch (error) {
      console.error('Error in startRound:', error)
      // エラー時は安全にゲーム状態をリセット
      setGameState(prev => ({
        ...prev,
        gameStatus: 'categorySelection',
        wordsLoading: false
      }))
    }
  }, [generateRandomWord, gameState.round, gameState.selectedCategory, gameState.questionLanguage, gameState.answerLanguage, gameState.lastWord, fetchWordsForRound, setWordWithTranslation, setGameState])

  // タイマー処理
  useEffect(() => {
    if (gameState.gameStatus === 'playing' && gameState.timeLeft > 0 && gameState.enemyHP > 0) {
      const timer = setTimeout(() => {
        setGameState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }))
      }, 1000)
      return () => clearTimeout(timer)
    } else if (gameState.gameStatus === 'playing' && gameState.timeLeft === 0 && gameState.enemyHP > 0) {
      // 時間切れ - 敵の勝利（敵がまだ生きている場合のみ）
      setGameState(prev => ({
        ...prev,
        gameStatus: 'gameEnd',
        winner: 'enemy'
      }))
      // 敗北時もスコア送信画面を表示
      if (gameState.score > 0) {
        setShowScoreSubmission(true)
      }
    }
  }, [gameState.gameStatus, gameState.timeLeft, gameState.enemyHP, gameState.score, setGameState, setShowScoreSubmission])

  // 入力処理（変換中でも入力値は更新する）
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target) {
      setGameState(prev => ({ ...prev, userInput: e.target.value }))
    }
  }

  // 入力判定処理
  const checkInput = async () => {
    // ゲーム中でない場合は処理をスキップ
    if (gameState.gameStatus !== 'playing') {
      return
    }

    const input = gameState.userInput.trim()
    
    // 空の入力は無視
    if (input === '') {
      return
    }
    
    const currentWord = gameState.currentWord
    const currentWordItem = gameState.currentWordItem



    let isCorrect = false

    // お題の言語と回答の言語が同じ場合
    if (gameState.questionLanguage === gameState.answerLanguage) {
      isCorrect = input === currentWord
      console.log(`Same language check: ${input} === ${currentWord} ? ${isCorrect}`)
    } else {
      // 異なる言語の場合は翻訳をチェック
      if (currentWordItem) {
        console.log(`Getting translation for word_id: ${currentWordItem.word_id}`)
        const translation = await getWordTranslation(currentWordItem, gameState.answerLanguage)
        if (translation) {
          isCorrect = input === translation
          console.log(`Translation check: ${input} === ${translation} ? ${isCorrect}`)
        } else {
          console.log(`No translation found, checking against original word`)
          isCorrect = input === currentWord
        }
      } else {
        console.log(`No word item available, checking against current word`)
        isCorrect = input === currentWord
      }
    }

    console.log(`Final result: ${isCorrect}`)
    console.log(`=== End Input Check Debug ===`)

    if (isCorrect) {
      // 敵が既に倒されている場合は処理をスキップ
      if (gameState.enemyHP <= 0) {
        console.log('Enemy already defeated, skipping input processing')
        return
      }

      // 正解処理
      let damage = 20
      let playerHPGain = 0
      let timeBonus = 0

      // 特殊単語効果
      if (gameState.specialType === 'bonus') {
        damage = 40
        playerHPGain = 10
        timeBonus = 5
      } else if (gameState.specialType === 'debuff') {
        damage = 10
      }

      // コンボボーナス
      const newCombo = gameState.combo + 1
      if (newCombo >= 3) {
        damage = Math.floor(damage * (1 + (newCombo - 2) * 0.2))
      }

      // スコア計算
      const scoreGain = calculateScore(damage, newCombo, gameState.specialType, timeBonus)

      // エフェクト表示
      setEffectState(prev => ({
        ...prev,
        showScoreEffect: true,
        lastScoreGain: scoreGain,
        scoreEffectKey: prev.scoreEffectKey + 1
      }))

      const newEnemyHP = Math.max(0, gameState.enemyHP - damage)
      const newPlayerHP = Math.min(100, gameState.playerHP + playerHPGain)
      const newTimeLeft = gameState.timeLeft + timeBonus

      // 次の単語を生成
      let wordData = generateRandomWord(gameState.lastWord)
      
      // 使用済み単語のリセットが必要な場合
      if (wordData.word === 'RESET_USED_WORDS') {
        setGameState(prev => ({ ...prev, usedWords: new Set<string>() }))
        wordData = generateRandomWord(gameState.lastWord) // 再度生成
      }
      
      const newWord = typeof wordData === 'string' ? wordData : wordData.word
      const newWordItem = typeof wordData !== 'string' ? wordData.wordItem : null

      // 翻訳を取得
      const wordWithTranslation = await setWordWithTranslation(newWord, newWordItem, gameState.questionLanguage, gameState.answerLanguage)

      setGameState(prev => {
        // 使用済み単語に追加
        const newUsedWords = new Set(prev.usedWords)
        newUsedWords.add(newWord)

        return {
          ...prev,
          currentWord: wordWithTranslation.word,
          currentWordItem: wordWithTranslation.wordItem,
          currentWordTranslation: wordWithTranslation.translation,
          userInput: '',
          enemyHP: newEnemyHP,
          playerHP: newPlayerHP,
          timeLeft: newTimeLeft,
          wordsCompleted: prev.wordsCompleted + 1,
          combo: newCombo,
          maxCombo: Math.max(prev.maxCombo, newCombo),
          isSpecialWord: typeof wordData !== 'string',
          specialType: typeof wordData === 'string' ? 'normal' : wordData.type,
          lastWord: newWord,
          score: prev.score + scoreGain,
          usedWords: newUsedWords
        }
      })

      // ダメージエフェクト
      if (damage > 0) {
        setEffectState(prev => ({
          ...prev,
          showEnemyDamage: true,
          lastDamage: damage
        }))
        setTimeout(() => {
          setEffectState(prev => ({ ...prev, showEnemyDamage: false }))
        }, 1000)
      }

      // 敵撃破チェック
      if (newEnemyHP <= 0) {
        // 即座にゲーム状態を変更してタイマーを停止
        if (gameState.round >= 5) {
          // 全ラウンドクリア
          setGameState(prev => ({
            ...prev,
            gameStatus: 'gameEnd',
            winner: 'player',
            totalTime: Math.floor((Date.now() - prev.roundStartTime) / 1000),
            enemyHP: 0 // 敵HPを確実に0にする
          }))
          setShowScoreSubmission(true)
        } else {
          // 次のラウンドへ
          setGameState(prev => ({
            ...prev,
            gameStatus: 'roundEnd',
            winner: 'player',
            enemyHP: 0 // 敵HPを確実に0にする
          }))
        }

        // 爆発エフェクト
        setEffectState(prev => ({
          ...prev,
          showExplosion: true,
          explosionSkippable: false
        }))

        setTimeout(() => {
          setEffectState(prev => ({ ...prev, explosionSkippable: true }))
        }, 1000)

        setTimeout(() => {
          setEffectState(prev => ({ ...prev, showExplosion: false, explosionSkippable: false }))
        }, 2000)
      }
    } else {
      // 敵が既に倒されている場合は処理をスキップ
      if (gameState.enemyHP <= 0) {
        console.log('Enemy already defeated, skipping input processing')
        return
      }

      // 不正解処理
      const damage = 15
      const newPlayerHP = Math.max(0, gameState.playerHP - damage)

      setGameState(prev => ({
        ...prev,
        userInput: '',
        playerHP: newPlayerHP,
        combo: 0 // コンボリセット
      }))

      // プレイヤーダメージエフェクト
      setEffectState(prev => ({
        ...prev,
        showDamage: true,
        lastDamage: damage
      }))

      // プレイヤー敗北チェック
      if (newPlayerHP <= 0) {
        setGameState(prev => ({
          ...prev,
          gameStatus: 'gameEnd',
          winner: 'enemy'
        }))
        // 敗北時もスコア送信画面を表示
        if (gameState.score > 0) {
          setShowScoreSubmission(true)
        }
      }
    }
  }

  // キーボードイベント処理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isComposing) {
      e.preventDefault()
      checkInput()
    }
  }

  // 変換開始・終了の処理
  const handleCompositionStart = () => {
    setIsComposing(true)
  }

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    setIsComposing(false)
    if (e.currentTarget) {
      setGameState(prev => ({ ...prev, userInput: e.currentTarget.value }))
      // 変換確定時に自動判定
      setTimeout(() => {
        checkInput()
      }, 10)
    }
  }

  // 次のラウンドへ進む
  const nextRound = () => {
    const nextRoundNumber = gameState.round + 1
    setGameState(prev => ({
      ...prev,
      round: nextRoundNumber,
      playerHP: 100,
      enemyHP: ENEMY_DATA[nextRoundNumber as keyof typeof ENEMY_DATA].maxHP,
      gameStatus: 'waiting',
      winner: null,
      combo: 0,
      usedWords: new Set<string>() // 新しいラウンドで使用済み単語をリセット
    }))
  }

  // ゲームリセット
  const resetGameDirectly = () => {
    console.log('Resetting game directly')
    const currentDisplayLanguage = gameState.displayLanguage // 現在の表示言語を保持

    setGameState({
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
      totalTime: 1,
      roundStartScore: 0,
      availableWords: [],
      wordsLoading: false,
      selectedCategory: '',
      usedWords: new Set<string>(),
      questionLanguage: 'jp',
      answerLanguage: 'jp',
      displayLanguage: currentDisplayLanguage
    })
    setEffectState({
      showExplosion: false,
      explosionSkippable: false,
      showDamage: false,
      showEnemyDamage: false,
      lastDamage: 0,
      showScoreEffect: false,
      lastScoreGain: 0,
      scoreEffectKey: 0
    })
    setShowLeaderboard(false)
    setShowScoreSubmission(false)
    setShowCategorySelection(false)
  }

  // カテゴリー選択処理
  const handleCategorySelect = async (category: string) => {
    console.log(`Category selected: ${category}`)
    setGameState(prev => ({
      ...prev,
      selectedCategory: category,
      gameStatus: 'waiting'
    }))
    setShowCategorySelection(false)
  }

  // 言語切り替え処理
  const handleLanguageChange = (language: 'jp' | 'en') => {
    // 言語切り替え時にゲームをリセットして安全に切り替える
    const currentDisplayLanguage = language
    setGameState({
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
      totalTime: 1,
      roundStartScore: 0,
      availableWords: [],
      wordsLoading: false,
      selectedCategory: '',
      usedWords: new Set<string>(),
      questionLanguage: 'jp',
      answerLanguage: 'jp',
      displayLanguage: currentDisplayLanguage
    })
    setEffectState({
      showExplosion: false,
      explosionSkippable: false,
      showDamage: false,
      showEnemyDamage: false,
      lastDamage: 0,
      showScoreEffect: false,
      lastScoreGain: 0,
      scoreEffectKey: 0
    })
  }

  // グローバルキーボードイベント処理（ゲーム進行用）
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // スコア送信画面やリーダーボード表示中はキーボードイベントを無効にする
      if (showScoreSubmission || showLeaderboard || showCategorySelection) {
        return
      }

      if (e.code === 'Space') {
        e.preventDefault()
        if (gameState.gameStatus === 'waiting') {
          startRound()
        } else if (gameState.gameStatus === 'roundEnd') {
          if (gameState.round >= 5) {
            // 全ラウンドクリア時はスコア送信画面を表示
            setShowScoreSubmission(true)
          } else {
            nextRound()
          }
        } else if (gameState.gameStatus === 'gameEnd') {
          if (gameState.score > 0) {
            setShowScoreSubmission(true)
          } else {
            resetGameDirectly()
          }
        } else if (effectState.showExplosion && effectState.explosionSkippable) {
          // 爆発エフェクトをスキップ
          setEffectState(prev => ({ ...prev, showExplosion: false, explosionSkippable: false }))
          if (gameState.round >= 5) {
            setGameState(prev => ({
              ...prev,
              gameStatus: 'gameEnd',
              winner: 'player',
              totalTime: Math.floor((Date.now() - prev.roundStartTime) / 1000)
            }))
            setShowScoreSubmission(true)
          } else {
            setGameState(prev => ({
              ...prev,
              gameStatus: 'roundEnd',
              winner: 'player'
            }))
          }
        }
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [gameState.gameStatus, gameState.round, gameState.score, showScoreSubmission, showLeaderboard, showCategorySelection, effectState.showExplosion, effectState.explosionSkippable, startRound, nextRound, resetGameDirectly, setShowScoreSubmission, setGameState, setEffectState])

  const currentEnemyData = ENEMY_DATA[gameState.round as keyof typeof ENEMY_DATA]
  const theme = currentEnemyData.theme

  // ハイドレーション完了まで何も表示しない
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600/40 via-indigo-600/30 to-black/50 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen transition-all duration-1000 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${currentEnemyData.backgroundImage})` }}
    >
      {/* 背景オーバーレイ */}
      <div className={`absolute inset-0 transition-all duration-1000 ${currentEnemyData.backgroundOverlay}`}></div>

      {/* コンテンツ */}
      <div className="relative z-10">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          {/* ヘッダー部分 */}
          <div className="flex flex-col sm:flex-row items-center mb-4 gap-2">
            {/* 左側のボタン群 */}
            <div className="flex justify-start w-full sm:w-1/3 order-2 sm:order-1">
              <button
                onClick={() => {
                  console.log('Ranking button clicked!')
                  console.log('showScoreSubmission:', showScoreSubmission)
                  console.log('setShowLeaderboard function:', setShowLeaderboard)
                  setShowLeaderboard(true)
                }}
                disabled={showScoreSubmission}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showScoreSubmission
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                  }`}
              >
                🏆 {gameState.displayLanguage === 'jp' ? 'ランキング' : 'Ranking'}
              </button>
            </div>

            {/* 中央のタイトル */}
            <div className="flex justify-center w-full sm:w-1/3 order-1 sm:order-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg text-center">
                {gameState.displayLanguage === 'jp' ? 'タイピングゲーム' : 'Typing Game'}
              </h1>
            </div>

            {/* 右側の言語切り替え */}
            <div className="flex justify-end w-full sm:w-1/3 order-3">
              <div className="flex bg-white/20 rounded-lg p-1">
                <button
                  onClick={() => handleLanguageChange('jp')}
                  className={`px-2 py-1 rounded-md transition-colors text-xs ${gameState.displayLanguage === 'jp'
                    ? 'bg-purple-500 text-white'
                    : 'text-white hover:text-gray-200'
                    }`}
                  title={gameState.displayLanguage === 'jp' ? '表示言語: 日本語' : 'Display Language: Japanese'}
                >
                  🇯🇵
                </button>
                <button
                  onClick={() => handleLanguageChange('en')}
                  className={`px-2 py-1 rounded-md transition-colors text-xs ${gameState.displayLanguage === 'en'
                    ? 'bg-purple-500 text-white'
                    : 'text-white hover:text-gray-200'
                    }`}
                  title={gameState.displayLanguage === 'jp' ? '表示言語: 英語' : 'Display Language: English'}
                >
                  🇺🇸
                </button>
              </div>
            </div>
          </div>

          {/* ゲーム情報表示 */}
          <div className="text-center mb-4">
            <h2 className="text-xl font-semibold text-white drop-shadow-lg">
              {getLocalizedText('round', gameState.displayLanguage)} {gameState.round}/5
            </h2>
            <p className="text-base mt-1 text-white drop-shadow-lg relative">
              {getLocalizedText('score', gameState.displayLanguage)}: <span className="text-green-300">{(gameState.score || 0).toLocaleString()}</span>
              <ScoreEffect
                key={effectState.scoreEffectKey}
                show={effectState.showScoreEffect}
                score={effectState.lastScoreGain}
                onComplete={() => setEffectState(prev => ({ ...prev, showScoreEffect: false }))}
              />
              {gameState.combo > 0 && (
                <span className="ml-4 text-yellow-300">
                  {getLocalizedText('combo', gameState.displayLanguage)}: {gameState.combo}
                </span>
              )}
            </p>
          </div>

          {/* HP表示とバトル画面 */}
          <div className="flex justify-between items-center mb-6">
            {/* プレイヤーHP */}
            <div className="text-center">
              <div className="text-6xl mb-2 relative">
                🛡️
                <DamageEffect
                  isVisible={effectState.showDamage}
                  onComplete={() => setEffectState(prev => ({ ...prev, showDamage: false }))}
                />
                <ComboEffect combo={gameState.combo} />
              </div>
              <div className="text-lg font-semibold text-white drop-shadow-lg">{getLocalizedText('player', gameState.displayLanguage)}</div>
              <div className="flex justify-center">
                <div className="w-32 bg-gray-200 rounded-full h-4 mt-2">
                  <div
                    className="bg-green-500 h-4 rounded-full transition-all duration-300"
                    style={{ width: `${gameState.playerHP}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-white text-sm mt-1">{gameState.playerHP}/100</div>
            </div>

            {/* VS表示 */}
            <div className="text-center">
              <div className="text-4xl font-bold text-white drop-shadow-lg animate-pulse">VS</div>
              {gameState.gameStatus === 'playing' && (
                <div className="mt-2">
                  <div className="text-white text-lg font-semibold">
                    {getLocalizedText('timeLeft', gameState.displayLanguage)}: {gameState.timeLeft}{getLocalizedText('seconds', gameState.displayLanguage)}
                  </div>
                </div>
              )}
            </div>

            {/* 敵HP */}
            <div className="text-center">
              <div className="text-6xl mb-2 relative">
                {gameState.enemyHP > 0 ? currentEnemyData.icon : currentEnemyData.defeatedIcon}
                <EnemyDamageEffect
                  show={effectState.showEnemyDamage}
                  damage={effectState.lastDamage}
                />
                <ExplosionEffect
                  show={effectState.showExplosion}
                  skippable={effectState.explosionSkippable}
                />
              </div>
              <div className="text-lg font-semibold text-white drop-shadow-lg">
                {ENEMY_DATA[gameState.round as keyof typeof ENEMY_DATA].name[gameState.questionLanguage]}
              </div>
              <div className="flex justify-center">
                <div className="w-32 bg-gray-200 rounded-full h-4 mt-2">
                  <div
                    className="bg-red-500 h-4 rounded-full transition-all duration-300"
                    style={{ width: `${(gameState.enemyHP / ENEMY_DATA[gameState.round as keyof typeof ENEMY_DATA].maxHP) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-white text-sm mt-1">{gameState.enemyHP}/{ENEMY_DATA[gameState.round as keyof typeof ENEMY_DATA].maxHP}</div>
            </div>
          </div>

          {/* カテゴリー選択画面 */}
          {gameState.gameStatus === 'categorySelection' && (
            <div className="text-center">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6">
                <h3 className="text-xl font-bold text-white mb-6 drop-shadow-lg">
                  {getLocalizedText('categorySelect', gameState.displayLanguage)}
                </h3>
                
                {/* 言語設定セクション */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="text-center">
                    <h3 className="text-white font-medium mb-3 drop-shadow-lg">
                      📝 {gameState.displayLanguage === 'jp' ? 'お題の言語' : 'Question Language'}
                    </h3>
                    <div className="flex bg-white/20 rounded-lg p-1 max-w-xs mx-auto">
                      <button
                        onClick={() => setGameState(prev => ({ ...prev, questionLanguage: 'jp' }))}
                        className={`px-4 py-2 rounded-md transition-colors flex-1 ${gameState.questionLanguage === 'jp'
                          ? 'bg-blue-500 text-white'
                          : 'text-white hover:text-gray-200'
                          }`}
                      >
                        🇯🇵 日本語
                      </button>
                      <button
                        onClick={() => setGameState(prev => ({ ...prev, questionLanguage: 'en' }))}
                        className={`px-4 py-2 rounded-md transition-colors flex-1 ${gameState.questionLanguage === 'en'
                          ? 'bg-blue-500 text-white'
                          : 'text-white hover:text-gray-200'
                          }`}
                      >
                        🇺🇸 English
                      </button>
                    </div>
                  </div>

                  <div className="text-center">
                    <h3 className="text-white font-medium mb-3 drop-shadow-lg">
                      ⌨️ {gameState.displayLanguage === 'jp' ? '回答の言語' : 'Answer Language'}
                    </h3>
                    <div className="flex bg-white/20 rounded-lg p-1 max-w-xs mx-auto">
                      <button
                        onClick={() => setGameState(prev => ({ ...prev, answerLanguage: 'jp' }))}
                        className={`px-4 py-2 rounded-md transition-colors flex-1 ${gameState.answerLanguage === 'jp'
                          ? 'bg-green-500 text-white'
                          : 'text-white hover:text-gray-200'
                          }`}
                      >
                        🇯🇵 日本語
                      </button>
                      <button
                        onClick={() => setGameState(prev => ({ ...prev, answerLanguage: 'en' }))}
                        className={`px-4 py-2 rounded-md transition-colors flex-1 ${gameState.answerLanguage === 'en'
                          ? 'bg-green-500 text-white'
                          : 'text-white hover:text-gray-200'
                          }`}
                      >
                        🇺🇸 English
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    console.log('Game start button clicked!')
                    console.log('setShowCategorySelection function:', setShowCategorySelection)
                    setShowCategorySelection(true)
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors"
                >
                  {getLocalizedText('gameStart', gameState.displayLanguage)}
                </button>
              </div>
            </div>
          )}

          {/* ゲーム待機画面 */}
          {gameState.gameStatus === 'waiting' && (
            <div className="text-center">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6">
                <h3 className="text-xl font-bold text-white mb-4 drop-shadow-lg">
                  {getLocalizedText('roundStart', gameState.displayLanguage).replace('{round}', gameState.round.toString())}
                </h3>
                <button
                  onClick={startRound}
                  disabled={gameState.wordsLoading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors"
                >
                  {gameState.wordsLoading ? 'Loading...' : getLocalizedText('gameStart', gameState.displayLanguage)}
                </button>
                <div className="mt-2 text-xs text-white drop-shadow-lg">
                  {getLocalizedText('spaceKeyTip', gameState.displayLanguage)}
                </div>
              </div>
            </div>
          )}

          {/* ゲームプレイ画面 */}
          {gameState.gameStatus === 'playing' && (
            <div className="text-center">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6">
                {/* 現在の単語表示 */}
                <div className="mb-4">
                  <div className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
                    {gameState.currentWord}
                  </div>
                  {gameState.currentWordTranslation && (
                    <div className="text-lg text-gray-200 mb-2 flex items-center justify-center">
                      <span className="mr-1">💡</span>
                      <span>{gameState.currentWordTranslation}</span>
                    </div>
                  )}
                  {gameState.specialType === 'bonus' && (
                    <div className="text-green-400 text-sm mb-2">
                      ✨ {getLocalizedText('bonusEffect', gameState.displayLanguage)}
                    </div>
                  )}
                  {gameState.specialType === 'debuff' && (
                    <div className="text-red-400 text-sm mb-2">
                      ⚠️ {getLocalizedText('debuffEffect', gameState.displayLanguage)}
                    </div>
                  )}
                </div>

                {/* 入力フィールド */}
                <input
                  ref={inputRef}
                  type="text"
                  value={gameState.userInput || ''}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onCompositionStart={handleCompositionStart}
                  onCompositionEnd={handleCompositionEnd}
                  className="w-full max-w-md px-4 py-3 text-xl text-center border-2 border-white/30 rounded-lg bg-white/20 text-white placeholder-white/70 focus:outline-none focus:border-white/60 backdrop-blur-sm"
                  placeholder={getLocalizedText('placeholder', gameState.displayLanguage)}
                  autoComplete="off"
                />

                {/* ヒント表示 */}
                <div className="mt-4 text-sm text-white/80 space-y-1">
                  <div>{getLocalizedText('instructions', gameState.displayLanguage)}</div>
                  <div>{getLocalizedText('comboTip', gameState.displayLanguage)}</div>
                </div>
              </div>
            </div>
          )}

          {/* ラウンド終了画面 */}
          {gameState.gameStatus === 'roundEnd' && gameState.winner === 'player' && (
            <div className="text-center">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6">
                <h3 className="text-2xl font-bold text-green-400 mb-4 drop-shadow-lg">
                  {getLocalizedText('victory', gameState.displayLanguage)}
                </h3>
                
                {/* ラウンド結果表示 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/10 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-white mb-2">
                      {getLocalizedText('defeatedEnemy', gameState.displayLanguage)}
                    </h4>
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-2xl">{currentEnemyData.defeatedIcon}</span>
                      <div>
                        <div className="text-white font-medium">
                          {currentEnemyData.name[gameState.displayLanguage]}
                        </div>
                        <div className="text-gray-300 text-sm">
                          {getLocalizedText('hp', gameState.displayLanguage)}: 0/{ENEMY_DATA[gameState.round as keyof typeof ENEMY_DATA].maxHP} ({getLocalizedText('defeated', gameState.displayLanguage)})
                        </div>
                      </div>
                    </div>
                  </div>

                  {gameState.round < 5 && (
                    <div className="bg-white/10 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-white mb-2">
                        {getLocalizedText('nextEnemy', gameState.displayLanguage)}
                      </h4>
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-2xl">{ENEMY_DATA[(gameState.round + 1) as keyof typeof ENEMY_DATA].icon}</span>
                        <div>
                          <div className="text-white font-medium">
                            {ENEMY_DATA[(gameState.round + 1) as keyof typeof ENEMY_DATA].name[gameState.displayLanguage]}
                          </div>
                          <div className="text-red-600">
                            {getLocalizedText('hp', gameState.displayLanguage)}: {ENEMY_DATA[(gameState.round + 1) as keyof typeof ENEMY_DATA].maxHP}
                          </div>
                          <div className="text-red-600">
                            {getLocalizedText('timeLimit', gameState.displayLanguage)}: {ENEMY_DATA[(gameState.round + 1) as keyof typeof ENEMY_DATA].timeLimit}{getLocalizedText('seconds', gameState.displayLanguage)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (gameState.round >= 5) {
                      setShowScoreSubmission(true)
                    } else {
                      nextRound()
                    }
                  }}
                  className={`px-8 py-3 rounded-lg text-lg font-semibold transition-colors ${
                    gameState.round >= 5
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                >
                  {gameState.round >= 5 ? getLocalizedText('gameCompleteButton', gameState.displayLanguage) : getLocalizedText('nextRoundButton', gameState.displayLanguage)}
                </button>
                <div className="mt-2 text-xs text-white drop-shadow-lg">
                  {getLocalizedText('spaceKeyTip', gameState.displayLanguage)}
                </div>
              </div>
            </div>
          )}

          {/* ゲーム終了画面 */}
          {gameState.gameStatus === 'gameEnd' && (
            <div className="text-center">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6">
                <h3 className={`text-2xl font-bold mb-4 drop-shadow-lg ${
                  gameState.winner === 'player' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {gameState.winner === 'player' 
                    ? (gameState.round >= 5 ? getLocalizedText('allEnemiesDefeated', gameState.displayLanguage) : getLocalizedText('victory', gameState.displayLanguage))
                    : getLocalizedText('defeat', gameState.displayLanguage)
                  }
                </h3>
                
                <div className="text-white mb-4">
                  <div className="text-lg">
                    {getLocalizedText('score', gameState.displayLanguage)}: <span className="text-green-300 font-bold">{gameState.score.toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-gray-300 mt-2">
                    {getLocalizedText('wordsCompleted', gameState.displayLanguage)}: {gameState.wordsCompleted} | 
                    Max {getLocalizedText('combo', gameState.displayLanguage)}: {gameState.maxCombo}
                  </div>
                </div>

                <div className="flex justify-center space-x-4">
                  {gameState.score > 0 && (
                    <button
                      onClick={() => {
                        console.log('Submit Score button clicked!')
                        console.log('Current showScoreSubmission:', showScoreSubmission)
                        console.log('setShowScoreSubmission function:', setShowScoreSubmission)
                        setShowScoreSubmission(true)
                      }}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                    >
                      📊 Submit Score
                    </button>
                  )}
                  <button
                    onClick={resetGameDirectly}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                  >
                    {getLocalizedText('retry', gameState.displayLanguage)}
                  </button>
                </div>
                <div className="mt-2 text-xs text-white drop-shadow-lg">
                  {getLocalizedText('spaceKeyTip', gameState.displayLanguage)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* モーダル */}
      {showLeaderboard && (
        <Leaderboard
          isVisible={showLeaderboard}
          onClose={() => setShowLeaderboard(false)}
          language={gameState.displayLanguage}
        />
      )}

      {showScoreSubmission && (
        <ScoreSubmission
          isVisible={showScoreSubmission}
          score={gameState.score}
          round={gameState.round}
          totalTime={gameState.totalTime}
          category={gameState.selectedCategory}
          onClose={() => {
            setShowScoreSubmission(false)
            // スコア送信後にカテゴリー選択に戻る
            const currentQuestionLanguage = gameState.questionLanguage
            const currentAnswerLanguage = gameState.answerLanguage
            const currentDisplayLanguage = gameState.displayLanguage

            setGameState(prev => ({
              ...prev,
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
              totalTime: 1,
              roundStartScore: 0,
              availableWords: [],
              wordsLoading: false,
              selectedCategory: '',
              usedWords: new Set<string>(),
              questionLanguage: currentQuestionLanguage,
              answerLanguage: currentAnswerLanguage,
              displayLanguage: currentDisplayLanguage
            }))
          }}
          onSubmitted={() => {
            console.log('Score submitted successfully!')
            setShowScoreSubmission(false)
          }}
        />
      )}

      {showCategorySelection && (
        <CategorySelection
          isVisible={showCategorySelection}
          onCategorySelect={handleCategorySelect}
          onClose={() => setShowCategorySelection(false)}
          selectedLanguage={gameState.displayLanguage}
        />
      )}
    </div>
  )
  } catch (error) {
    console.error('Error in GameUI:', error)
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600/40 via-indigo-600/30 to-black/50 flex items-center justify-center">
        <div className="text-white text-xl">Error: {error instanceof Error ? error.message : 'Unknown error'}</div>
      </div>
    )
  }
}