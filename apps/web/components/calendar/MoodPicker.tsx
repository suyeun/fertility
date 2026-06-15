'use client'

import type { Mood } from '@fertility/shared'

const MOODS: { mood: Mood; emoji: string; label: string }[] = [
  { mood: 'great',   emoji: '😄', label: '최고' },
  { mood: 'good',    emoji: '🙂', label: '좋아' },
  { mood: 'excited', emoji: '🥰', label: '설레' },
  { mood: 'hopeful', emoji: '🌸', label: '기대' },
  { mood: 'neutral', emoji: '😐', label: '그냥' },
  { mood: 'tired',   emoji: '😴', label: '피곤' },
  { mood: 'anxious', emoji: '😟', label: '불안' },
  { mood: 'sad',     emoji: '😢', label: '슬퍼' },
  { mood: 'angry',   emoji: '😠', label: '화나' },
  { mood: 'sick',    emoji: '🤒', label: '아파' },
]

interface MoodPickerProps {
  selected: Mood | null
  onSelect: (mood: Mood) => void
}

export function MoodPicker({ selected, onSelect }: MoodPickerProps) {
  const row1 = MOODS.slice(0, 5)
  const row2 = MOODS.slice(5)

  return (
    <div className="px-3 pb-4">
      <p className="text-[#8c5060] text-xs font-bold mb-2">오늘 기분은요?</p>
      <div className="flex gap-1.5 mb-1.5">
        {row1.map(({ mood, emoji, label }) => (
          <button
            key={mood}
            onClick={() => onSelect(mood)}
            aria-label={label}
            aria-pressed={selected === mood}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-2xl border text-lg transition-colors
              ${selected === mood
                ? 'bg-[#ffd6e0] border-[#ffb3c6]'
                : 'bg-[#fff8f9] border-[#ffd6e0] hover:bg-[#fff0f4]'
              }`}
          >
            <span>{emoji}</span>
            <span className="text-[10px] text-[#8c5060] font-semibold">{label}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        {row2.map(({ mood, emoji, label }) => (
          <button
            key={mood}
            onClick={() => onSelect(mood)}
            aria-label={label}
            aria-pressed={selected === mood}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-2xl border text-lg transition-colors
              ${selected === mood
                ? 'bg-[#ffd6e0] border-[#ffb3c6]'
                : 'bg-[#fff8f9] border-[#ffd6e0] hover:bg-[#fff0f4]'
              }`}
          >
            <span>{emoji}</span>
            <span className="text-[10px] text-[#8c5060] font-semibold">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
