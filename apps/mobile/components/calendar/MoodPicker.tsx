import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import type { Mood } from '@fertility/shared'
import { F } from '../../lib/fonts'

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
    <View style={styles.wrap}>
      <Text style={styles.title}>오늘 기분은요?</Text>
      <View style={styles.row}>
        {row1.map(({ mood, emoji, label }) => (
          <TouchableOpacity
            key={mood}
            style={[styles.btn, selected === mood && styles.btnActive]}
            onPress={() => onSelect(mood)}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{emoji}</Text>
            <Text style={styles.label}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={[styles.row, { marginTop: 6 }]}>
        {row2.map(({ mood, emoji, label }) => (
          <TouchableOpacity
            key={mood}
            style={[styles.btn, selected === mood && styles.btnActive]}
            onPress={() => onSelect(mood)}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{emoji}</Text>
            <Text style={styles.label}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, paddingBottom: 20 },
  title: {
    fontFamily: F.bold,
    fontSize: 12,
    color: '#8c5060',
    marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 6 },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#ffd6e0',
    backgroundColor: '#fff8f9',
    gap: 2,
    minHeight: 44,
  },
  btnActive: {
    backgroundColor: '#ffd6e0',
    borderColor: '#ffb3c6',
  },
  emoji: { fontSize: 18 },
  label: {
    fontFamily: F.semiBold,
    fontSize: 10,
    color: '#8c5060',
  },
})
