import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import type { Mood } from '@fertility/shared'

const MOODS: { mood: Mood; emoji: string; label: string }[] = [
  { mood: 'great', emoji: '😄', label: '최고' },
  { mood: 'good', emoji: '🙂', label: '좋아' },
  { mood: 'hopeful', emoji: '🌸', label: '기대' },
  { mood: 'anxious', emoji: '😟', label: '불안' },
  { mood: 'sad', emoji: '😢', label: '슬퍼' },
]

interface MoodPickerProps {
  selected: Mood | null
  onSelect: (mood: Mood) => void
}

export function MoodPicker({ selected, onSelect }: MoodPickerProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>오늘 기분은요?</Text>
      <View style={styles.row}>
        {MOODS.map(({ mood, emoji, label }) => (
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
    fontSize: 12,
    fontWeight: '700',
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
    fontSize: 10,
    fontWeight: '600',
    color: '#8c5060',
  },
})
