'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// TypingGameをクライアントサイドでのみレンダリング
const TypingGame = dynamic(() => import('../components/TypingGame'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-600/40 via-indigo-600/30 to-black/50 flex items-center justify-center">
      <div className="text-white text-xl">Loading Game...</div>
    </div>
  )
})

const ErrorBoundary = dynamic(() => import('../components/ErrorBoundary'), {
  ssr: false
})

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-100 to-green-100">
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-purple-600/40 via-indigo-600/30 to-black/50 flex items-center justify-center">
          <div className="text-white text-xl">Loading...</div>
        </div>
      }>
        <ErrorBoundary>
          <TypingGame />
        </ErrorBoundary>
      </Suspense>
    </main>
  )
}