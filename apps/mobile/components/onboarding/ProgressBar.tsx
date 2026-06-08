import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

interface ProgressBarProps {
  step: 1 | 2 | 3
  totalSteps: number
  onBack: () => void
}

export function ProgressBar({ step, totalSteps, onBack }: ProgressBarProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backBtn, step === 1 && styles.hidden]}
          disabled={step === 1}
        >
          <Text style={styles.backText}>← 이전</Text>
        </TouchableOpacity>
        <Text style={styles.counter}>{step} / {totalSteps}</Text>
        <View style={styles.spacer} />
      </View>
      <View style={styles.barRow}>
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
          <View
            key={s}
            style={[styles.bar, s <= step ? styles.barActive : styles.barInactive]}
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 28 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  backBtn: {},
  hidden: { opacity: 0 },
  backText: { fontSize: 14, fontWeight: '600', color: '#ff8fab' },
  counter: { fontSize: 12, color: '#b07080', fontWeight: '500' },
  spacer: { width: 40 },
  barRow: { flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 6, borderRadius: 3 },
  barActive: { backgroundColor: '#ff8fab' },
  barInactive: { backgroundColor: '#ffd6e0' },
})
