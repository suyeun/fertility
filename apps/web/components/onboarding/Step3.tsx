'use client'

interface Step3Props {
  cycleLength: number
  onChange: (v: number) => void
  onComplete: () => void
}

const CYCLE_OPTIONS = [21, 23, 25, 26, 27, 28, 29, 30, 31, 32, 35, 40, 45]

export function Step3({ cycleLength, onChange, onComplete }: Step3Props) {
  return (
    <div>
      <h2 className="text-xl font-bold text-[#5a3042] mb-1">
        평균 생리 주기가<br />어떻게 되세요?
      </h2>
      <p className="text-sm text-[#b07080] mb-6">
        배란일을 정확히 계산할게요. 잘 모르면 28일로 두셔도 돼요 🙂
      </p>

      {/* 큰 숫자 표시 */}
      <div className="text-center mb-6">
        <div className="inline-flex items-end gap-1">
          <span className="text-6xl font-bold text-[#ff8fab]">{cycleLength}</span>
          <span className="text-xl text-[#b07080] mb-2">일</span>
        </div>
        <div className="text-xs text-[#b07080] mt-1">
          배란일은 약 {cycleLength - 14}일째 예정이에요
        </div>
      </div>

      {/* 슬라이더 */}
      <div className="mb-4">
        <input
          type="range"
          min={21}
          max={45}
          value={cycleLength}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-[#ff8fab] h-2"
          aria-label="생리 주기 선택"
        />
        <div className="flex justify-between text-xs text-[#b07080] mt-1">
          <span>21일</span>
          <span>45일</span>
        </div>
      </div>

      {/* 자주 선택하는 값 */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CYCLE_OPTIONS.map((v) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${
              cycleLength === v
                ? 'bg-[#ff8fab] text-white border-[#ff8fab]'
                : 'bg-white text-[#8c5060] border-[#ffd6e0] hover:border-[#ff8fab]'
            }`}
          >
            {v}일
          </button>
        ))}
      </div>

      <button
        onClick={onComplete}
        className="w-full py-4 bg-[#ff8fab] text-white font-bold text-base rounded-2xl hover:bg-[#ff6b8f] transition-colors shadow-sm"
      >
        맞춤 대시보드 시작하기 🎀
      </button>
    </div>
  )
}
