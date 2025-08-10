'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'

interface Category {
  id: string
  name: string
  description: string
  icon: string
}

interface CategorySelectionProps {
  isVisible: boolean
  onCategorySelect: (categoryId: string) => void
  onClose: () => void
  selectedLanguage: 'jp' | 'en'
}

export default function CategorySelection({ isVisible, onCategorySelect, onClose, selectedLanguage }: CategorySelectionProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isVisible) {
      fetchCategories()
    }
  }, [isVisible, selectedLanguage])

  const fetchCategories = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.getCategories(selectedLanguage)
      setCategories(response.categories || [])
    } catch (err) {
      setError(selectedLanguage === 'jp' ? 'カテゴリーの取得に失敗しました' : 'Failed to fetch categories')
      console.error('Failed to fetch categories:', err)
      // フォールバック: 新しいカテゴリーを使用
      const defaultCategories = selectedLanguage === 'jp' ? [
        { id: 'beginner_words', name: '初級単語', description: '日常生活でよく使う基本的な単語', icon: '📚' },
        { id: 'intermediate_words', name: '中級単語', description: 'より複雑で専門的な単語', icon: '🎓' },
        { id: 'beginner_conversation', name: '初級会話', description: '日常的な短い会話表現', icon: '💬' },
        { id: 'intermediate_conversation', name: '中級会話', description: 'より複雑で長い会話表現', icon: '🗣️' },
      ] : [
        { id: 'beginner_words', name: 'Beginner Words', description: 'Basic words used in daily life', icon: '📚' },
        { id: 'intermediate_words', name: 'Intermediate Words', description: 'More complex and specialized words', icon: '🎓' },
        { id: 'beginner_conversation', name: 'Beginner Conversation', description: 'Short daily conversation expressions', icon: '💬' },
        { id: 'intermediate_conversation', name: 'Intermediate Conversation', description: 'More complex and longer conversation expressions', icon: '🗣️' },
      ]
      setCategories(defaultCategories)
    } finally {
      setLoading(false)
    }
  }

  const handleCategorySelect = (categoryId: string) => {
    onCategorySelect(categoryId)
    onClose()
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            🎯 {selectedLanguage === 'jp' ? 'カテゴリー選択' : 'Select Category'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>



        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">
              {selectedLanguage === 'jp' ? '読み込み中...' : 'Loading...'}
            </p>
          </div>
        )}

        {error && (
          <div className="text-center py-4">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchCategories}
              className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              {selectedLanguage === 'jp' ? '再試行' : 'Retry'}
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-3">
            <p className="text-gray-600 text-center mb-4">
              {selectedLanguage === 'jp' 
                ? 'カテゴリーを選ぶとすぐにゲームが開始されます'
                : 'Select a category to start the game immediately'
              }
            </p>
            
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategorySelect(category.id)}
                className="w-full p-4 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg transition-colors text-left"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-3xl">{category.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-800">{category.name}</h3>
                    <p className="text-sm text-gray-600">{category.description}</p>
                  </div>
                  <div className="text-blue-500">
                    →
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="bg-gray-500 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
          >
            {selectedLanguage === 'jp' ? 'キャンセル' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}