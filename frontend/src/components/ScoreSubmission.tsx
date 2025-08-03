'use client'

import { useState } from 'react'
import { apiClient, ScoreData } from '../lib/api'

interface ScoreSubmissionProps {
  isVisible: boolean
  score: number
  round: number
  totalTime: number
  onClose: () => void
  onSubmitted: () => void
}

export default function ScoreSubmission({
  isVisible,
  score,
  round,
  totalTime,
  onClose,
  onSubmitted
}: ScoreSubmissionProps) {
  const [playerName, setPlayerName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!playerName.trim()) {
      setError('プレイヤー名を入力してください')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // バリデーション
      const trimmedName = playerName.trim()
      // totalTimeが0やNaNの場合は1秒に設定、それ以外は最小1秒を保証
      let timeValue = 1
      if (totalTime && !isNaN(totalTime) && totalTime > 0) {
        timeValue = Math.max(1, Math.floor(totalTime))
      }
      
      if (trimmedName.length < 1 || trimmedName.length > 20) {
        setError('プレイヤー名は1-20文字で入力してください')
        return
      }
      
      if (score < 0 || score > 1000000) {
        setError('スコアが無効です')
        return
      }
      
      if (round < 1 || round > 5) {
        setError('ラウンドが無効です')
        return
      }
      
      if (timeValue < 1 || timeValue > 3600) {
        setError('時間が無効です（1-3600秒）')
        return
      }

      const scoreData: ScoreData = {
        player_name: trimmedName,
        score,
        round,
        time: timeValue
      }

      console.log('Submitting score data:', scoreData)
      console.log('Original totalTime:', totalTime)
      await apiClient.submitScore(scoreData)
      setSubmitted(true)
      onSubmitted()
    } catch (err) {
      setError('スコアの送信に失敗しました')
      console.error('Failed to submit score:', err)
      console.error('Score data that failed:', {
        player_name: playerName.trim(),
        score,
        round,
        time: Math.floor(totalTime),
        originalTotalTime: totalTime
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setPlayerName('')
    setSubmitted(false)
    setError(null)
    onClose()
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          🎉 ゲーム終了！
        </h2>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="text-center space-y-2">
            <div className="text-3xl font-bold text-blue-600">
              {(score || 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">
              ラウンド {round} クリア・総時間 {Math.floor(totalTime)}秒
            </div>
          </div>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-1">
                プレイヤー名
              </label>
              <input
                type="text"
                id="playerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="あなたの名前を入力"
                maxLength={20}
                disabled={submitting}
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-500 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                {submitting ? '送信中...' : 'スコアを送信'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="flex-1 bg-gray-500 hover:bg-gray-700 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                スキップ
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <div className="text-green-600 text-lg font-semibold">
              ✅ スコアを送信しました！
            </div>
            <button
              onClick={handleClose}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg"
            >
              OK
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
