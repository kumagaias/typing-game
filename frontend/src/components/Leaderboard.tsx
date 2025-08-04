'use client'

import { useState, useEffect } from 'react'
import { apiClient, LeaderboardEntry } from '../lib/api'

interface LeaderboardProps {
  isVisible: boolean
  onClose: () => void
  currentScore?: number
}

export default function Leaderboard({ isVisible, onClose, currentScore }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isVisible) {
      fetchLeaderboard()
    }
  }, [isVisible])

  const fetchLeaderboard = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.getLeaderboard()
      console.log('Leaderboard response:', response)
      
      // データの検証と修正（バックエンドの大文字フィールド名に対応）
      const validatedLeaderboard = (response.leaderboard || []).map((entry: any) => ({
        score: entry.score || entry.Score || 0,
        rank: entry.rank || entry.Rank || 0,
        round: entry.round || entry.Round || 1,
        category: entry.category || entry.Category || 'food',
        player_name: entry.player_name || entry.PlayerName || 'Unknown'
      }))
      
      setLeaderboard(validatedLeaderboard)
    } catch (err) {
      setError('リーダーボードの取得に失敗しました')
      console.error('Failed to fetch leaderboard:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">🏆 リーダーボード</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">読み込み中...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-4">
            <p className="text-red-600 mb-2">{error}</p>
            <button
              onClick={fetchLeaderboard}
              className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              再試行
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-2">
            {leaderboard.length === 0 ? (
              <p className="text-center text-gray-600 py-4">
                まだスコアが登録されていません
              </p>
            ) : (
              <>
                {/* トップ10位 - 豪華な表示 */}
                {leaderboard.slice(0, 10).map((entry, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      currentScore && entry.score === currentScore
                        ? 'bg-yellow-100 border-2 border-yellow-400'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        entry.rank === 1 ? 'bg-yellow-500' :
                        entry.rank === 2 ? 'bg-gray-400' :
                        entry.rank === 3 ? 'bg-orange-600' :
                        'bg-blue-500'
                      }`}>
                        {entry.rank}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">
                          {entry.player_name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {entry.category === 'food' ? '🍜' : 
                           entry.category === 'vehicle' ? '🚗' : 
                           entry.category === 'station' ? '🚉' : '🍜'} ラウンド {entry.round}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-gray-800">
                        {(entry.score || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">pts</div>
                    </div>
                  </div>
                ))}
                
                {/* 11-30位 - 簡素な表示 */}
                {leaderboard.length > 10 && (
                  <div className="mt-4">
                    <div className="text-sm text-gray-500 mb-2 px-2">11位以下</div>
                    <div className="space-y-1">
                      {leaderboard.slice(10, 30).map((entry, index) => (
                        <div
                          key={index + 10}
                          className={`flex items-center justify-between px-3 py-2 text-sm rounded ${
                            currentScore && entry.score === currentScore
                              ? 'bg-yellow-50 border border-yellow-300'
                              : 'bg-gray-25 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="w-6 text-center text-gray-500 font-medium">
                              {entry.rank}
                            </span>
                            <span className="text-gray-700">
                              {entry.player_name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {entry.category === 'food' ? '🍜' : 
                               entry.category === 'vehicle' ? '🚗' : 
                               entry.category === 'station' ? '🚉' : '🍜'}R{entry.round}
                            </span>
                          </div>
                          <div className="text-gray-600 font-medium">
                            {(entry.score || 0).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="mt-4 text-center">
          <button
            onClick={onClose}
            className="bg-gray-500 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
