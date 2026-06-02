import { TouchableOpacity, View, Text, StyleSheet } from 'react-native'

interface OptionButtonProps {
  emoji: string
  label: string
  sub: string
  onPress: () => void
}

export function OptionButton({ emoji, label, sub, onPress }: OptionButtonProps) {
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.emoji}>{emoji}</Text>
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.sub}>{sub}</Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: '#ffd6e0',
    marginBottom: 10,
  },
  emoji: { fontSize: 26, width: 36, textAlign: 'center' },
  text: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: '#5a3042' },
  sub: { fontSize: 12, color: '#b07080', marginTop: 2 },
})
