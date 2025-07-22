'use client'

import { useEffect, useState } from 'react'

interface DamageEffectProps {
  isVisible: boolean
  onComplete: () => void
}

export default function DamageEffect({ isVisible, onComplete }: DamageEffectProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onComplete()
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [isVisible, onComplete])

  if (!isVisible) return null

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* ダメージ表示 */}
      <div className="damage-text">
        -10 HP
      </div>
      
      {/* 画面の赤い点滅 */}
      <div className="damage-flash"></div>

      <style jsx>{`
        .damage-text {
          position: absolute;
          top: -30px;
          left: 50%;
          transform: translateX(-50%);
          color: #ef4444;
          font-size: 1.2rem;
          font-weight: bold;
          animation: damage-float 0.8s ease-out forwards;
          text-shadow: 0 0 4px rgba(239, 68, 68, 0.5);
        }

        .damage-flash {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(239, 68, 68, 0.3);
          animation: damage-flash-anim 0.3s ease-out;
          pointer-events: none;
          z-index: 1000;
        }

        @keyframes damage-float {
          0% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateX(-50%) translateY(-40px);
          }
        }

        @keyframes damage-flash-anim {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}