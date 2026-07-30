// apps/web/app/(dashboard)/records/page.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { hormonesApi, usersApi, useUserStore, getRecordTabs, getHospitalFields, getDailyFields } from '@fertility/shared'
import type { TreatmentMode, CurrentStage } from '@fertility/shared'
import { HormoneRecord } from '@fertility/shared'
import { Plus, Info, TrendingUp, Calendar, Trash2, Sparkles } from 'lucide-react'

type HormoneType = 'amh' | 'fsh' | 'lh' | 'estradiol' | 'progesterone' | 'bbt' | 'opkIndex'

function HospitalFieldsForm({
  mode,
  stage,
  todayRecord,
  onSave,
}: {
  mode: TreatmentMode
  stage: CurrentStage
  todayRecord: any
  onSave: (field: any, value: any) => Promise<void>
}) {
  const fields = getHospitalFields(mode, stage)
  const [values, setValues] = React.useState<Record<string, string>>({})
  const [warnings, setWarnings] = React.useState<Record<string, string | null>>({})
  const [saving, setSaving] = React.useState(false)

  if (fields.length === 0) {
    return (
      <div className="bg-rose-50 rounded-3xl p-6 text-center border border-rose-100/60">
        <p className="text-xs text-rose-900/50">이 단계에서 기록할 항목이 없습니다.</p>
      </div>
    )
  }

  const handleChange = (key: string, val: string, warning?: (v: string | number) => string | null) => {
    setValues(prev => ({ ...prev, [key]: val }))
    if (warning) setWarnings(prev => ({ ...prev, [key]: warning(val) }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      for (const [key, val] of Object.entries(values)) {
        if (val !== '') await onSave(key as any, isNaN(Number(val)) ? val : Number(val))
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-rose-100/40 space-y-4">
      {fields.map((f) => (
        <div key={f.key} className="space-y-1">
          <label className="text-xs font-semibold text-rose-900/70 flex items-center gap-1">
            {f.label} {f.unit && <span className="text-rose-400 font-normal">({f.unit})</span>}
          </label>
          {f.type === 'select' ? (
            <select
              value={values[f.key] ?? ''}
              onChange={(e) => handleChange(f.key, e.target.value, f.warning)}
              className="w-full px-3 py-2.5 rounded-xl border border-rose-100 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">선택</option>
              {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : f.type === 'multiselect' ? (
            <div className="flex flex-wrap gap-1.5">
              {f.options?.map(o => {
                const selected = (values[f.key] ?? '').split(',').filter(Boolean).includes(o.value)
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => {
                      const cur = (values[f.key] ?? '').split(',').filter(Boolean)
                      const next = selected ? cur.filter(x => x !== o.value) : [...cur, o.value]
                      handleChange(f.key, next.join(','), f.warning)
                    }}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-semibold border transition-colors ${
                      selected ? 'bg-primary text-white border-primary' : 'bg-white border-rose-100 text-rose-700'
                    }`}
                  >
                    {o.label}
                  </button>
                )
              })}
              {f.key === 'symptoms' && (values[f.key] ?? '').includes('ohss') && (
                <div className="w-full mt-1 bg-orange-50 border border-orange-200 rounded-xl p-2.5 text-[10px] text-orange-700 font-semibold">
                  ⚠️ OHSS 증상이 심하면 즉시 병원에 연락하세요
                </div>
              )}
            </div>
          ) : f.type === 'slider' ? (
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={10}
                value={values[f.key] ?? 5}
                onChange={(e) => handleChange(f.key, e.target.value)}
                className="flex-1 accent-primary"
              />
              <span className="text-xs font-bold text-primary w-6 text-center">{values[f.key] ?? 5}</span>
            </div>
          ) : (
            <input
              type="number"
              step="0.1"
              placeholder={f.placeholder ?? `예: ${f.unit}`}
              value={values[f.key] ?? ''}
              onChange={(e) => handleChange(f.key, e.target.value, f.warning)}
              className="w-full px-3 py-2.5 rounded-xl border border-rose-100 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}
          {warnings[f.key] && (
            <div className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-100">
              ⚠️ {warnings[f.key]}
            </div>
          )}
        </div>
      ))}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 bg-primary text-white rounded-2xl text-xs font-semibold hover:bg-rose-500 active-press transition-colors"
      >
        {saving ? '저장 중...' : '수치 저장'}
      </button>
    </div>
  )
}

export default function RecordsPage() {
  const { user, profile: authProfile, refreshProfile } = useAuth()
  const { profile: storeProfile } = useUserStore()
  const profile = storeProfile ?? authProfile
  const treatmentMode: TreatmentMode = (profile?.treatmentStage as TreatmentMode) ?? 'natural'
  const currentStage: CurrentStage = (profile as any)?._currentStage ?? null

  const recordTabs = getRecordTabs(treatmentMode)
  const [activeTab, setActiveTab] = useState<string>('daily')

  // 호르몬 관련 상태
  const [records, setRecords] = useState<HormoneRecord[]>([])
  const [loadingHormones, setLoadingHormones] = useState(true)
  const [selectedHormone, setSelectedHormone] = useState<HormoneType>('bbt')

  // 입력 폼 상태 (호르몬 및 홈케어 지표)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [recordedAt, setRecordedAt] = useState(new Date().toISOString().split('T')[0])
  const [amh, setAmh] = useState('')
  const [fsh, setFsh] = useState('')
  const [lh, setLh] = useState('')
  const [estradiol, setEstradiol] = useState('')
  const [progesterone, setProgesterone] = useState('')
  const [bbt, setBbt] = useState('')
  const [opkIndex, setOpkIndex] = useState('')
  const [cervicalMucus, setCervicalMucus] = useState<'dry' | 'sticky' | 'creamy' | 'eggwhite' | ''>('')
  const [weight, setWeight] = useState('')
  const [sleepHours, setSleepHours] = useState('')

  // 시술 지표 상태
  const [follicleSize, setFollicleSize] = useState('')
  const [endometriumThickness, setEndometriumThickness] = useState('')
  const [retrievedOocytesCount, setRetrievedOocytesCount] = useState('')
  const [embryoGrade, setEmbryoGrade] = useState('')
  const [hcgLevel, setHcgLevel] = useState('')

  const [hormoneNotes, setHormoneNotes] = useState('')
  const [savingHormone, setSavingHormone] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)

  // 아코디언 상태
  const [showHospitalHormones, setShowHospitalHormones] = useState(false)
  const [showNaturalIndicators, setShowNaturalIndicators] = useState(false)

  const todayStr = new Date().toISOString().split('T')[0]

  const fetchRecords = async () => {
    if (!user) return
    try {
      const data = await hormonesApi.getAll()
      setRecords(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingHormones(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      if (!user) return
      setLoadingHormones(true)
      await fetchRecords()
    }
    init()
  }, [user])

  useEffect(() => {
    if (profile?.treatmentStage === 'natural') {
      setSelectedHormone('bbt')
    } else {
      setSelectedHormone('amh')
    }
  }, [profile])

  const handleHormoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSavingHormone(true)
    try {
      await hormonesApi.save({
        recordedAt,
        amh: amh ? Number(amh) : undefined,
        fsh: fsh ? Number(fsh) : undefined,
        lh: lh ? Number(lh) : undefined,
        estradiol: estradiol ? Number(estradiol) : undefined,
        progesterone: progesterone ? Number(progesterone) : undefined,
        bbt: bbt ? Number(bbt) : undefined,
        opkIndex: opkIndex ? Number(opkIndex) : undefined,
        cervicalMucus: cervicalMucus ? cervicalMucus as any : undefined,
        weight: weight ? Number(weight) : undefined,
        sleepHours: sleepHours ? Number(sleepHours) : undefined,
        
        follicleSize: follicleSize ? Number(follicleSize) : undefined,
        endometriumThickness: endometriumThickness ? Number(endometriumThickness) : undefined,
        retrievedOocytesCount: retrievedOocytesCount ? Number(retrievedOocytesCount) : undefined,
        embryoGrade: embryoGrade || undefined,
        hcgLevel: hcgLevel ? Number(hcgLevel) : undefined,
        
        notes: hormoneNotes
      })
      await fetchRecords()
      setIsModalOpen(false)
      setAmh('')
      setFsh('')
      setLh('')
      setEstradiol('')
      setProgesterone('')
      setBbt('')
      setOpkIndex('')
      setCervicalMucus('')
      setWeight('')
      setSleepHours('')
      setFollicleSize('')
      setEndometriumThickness('')
      setRetrievedOocytesCount('')
      setEmbryoGrade('')
      setHcgLevel('')
      setHormoneNotes('')
    } catch (err) {
      console.error(err)
    } finally {
      setSavingHormone(false)
    }
  }

  const handleUpgradeStage = async (targetStage: 'iui' | 'ivf') => {
    if (!user) return
    setIsUpgrading(true)
    try {
      await usersApi.updateProfile({
        treatmentStage: targetStage
      })
      await refreshProfile()
      setActiveTab(targetStage === 'iui' ? 'hospital' : 'procedure')
    } catch (err) {
      console.error('단계 업그레이드 실패:', err)
    } finally {
      setIsUpgrading(false)
    }
  }

  const saveDailyField = async (field: keyof HormoneRecord, value: any) => {
    if (!user) return
    try {
      const todayRecord = records.find(r => r.recordedAt === todayStr)
      const recordId = todayRecord?.id || 'daily_' + Math.random().toString(36).substring(2, 9)
      
      const updatedRecord: Partial<HormoneRecord> = {
        ...todayRecord,
        id: recordId,
        userId: user.uid,
        recordedAt: todayStr,
        [field]: value === '' ? undefined : value
      }
      
      await hormonesApi.save(updatedRecord)
      await fetchRecords()
    } catch (err) {
      console.error('일상 수치 저장 실패:', err)
    }
  }



  // 호르몬 차트 데이터 계산
  const chartData = [...records]
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
    .map(r => ({
      date: r.recordedAt.substring(5), // MM-DD
      value: r[selectedHormone]
    }))
    .filter(d => d.value !== undefined && d.value !== null) as { date: string; value: number }[]

  const hormoneMeta: Record<HormoneType, { name: string; unit: string; desc: string; normal: string }> = {
    amh: {
      name: 'AMH (난소 예비능)',
      unit: 'ng/mL',
      desc: '난소 안에 남아있는 난자의 개수(나이)를 가늠하는 호르몬입니다. 수치가 높을수록 배란 가능한 난자가 많음을 뜻합니다.',
      normal: '2.0 ~ 4.0 ng/mL'
    },
    fsh: {
      name: 'FSH (여포 자극 호르몬)',
      unit: 'mIU/mL',
      desc: '난포의 성장을 촉진하는 호르몬으로, 난소 기능이 저하될수록 이 호르몬 수치가 대상 난포를 자극하기 위해 상승합니다.',
      normal: '3.5 ~ 12.5 mIU/mL (여포기 기준)'
    },
    lh: {
      name: 'LH (황체 형성 호르몬)',
      unit: 'mIU/mL',
      desc: '난포를 터뜨려 배란을 유도하는 호르몬입니다. 배란 직전에 급격히 상승(LH 서지)합니다.',
      normal: '2.4 ~ 12.6 mIU/mL (여포기 기준)'
    },
    estradiol: {
      name: 'Estradiol (에스트로겐 E2)',
      unit: 'pg/mL',
      desc: '난포가 자라면서 분비되는 주요 여성호르몬으로 자궁 내막을 두껍게 만드는 역할을 합니다.',
      normal: '25 ~ 172 pg/mL (여포기 기준)'
    },
    progesterone: {
      name: 'Progesterone (황체호르몬)',
      unit: 'ng/mL',
      desc: '배란 후 자궁 내막을 착상에 최적화된 상태로 유지하며 임신 유지를 돕는 호르몬입니다.',
      normal: '여포기: 0.1~1.5 ng/mL, 황체기: 2.5~25.0 ng/mL'
    },
    bbt: {
      name: '기초체온 (BBT)',
      unit: '°C',
      desc: '매일 아침 눈뜬 직후 움직이지 않은 상태에서 잰 체온입니다. 배란 직후 황체호르몬 영향으로 체온이 0.3~0.5도 상승하여 저온기와 고온기 흐름을 이룹니다.',
      normal: '저온기 36.1 ~ 36.4°C / 고온기 36.5 ~ 37.0°C'
    },
    opkIndex: {
      name: '배란테스트기 (OPK)',
      unit: 'Level (0~10)',
      desc: '배란 전 급증하는 황체형성호르몬(LH) 농도를 소변으로 진단하는 수치입니다. 수치가 9~10으로 가장 진해진 후 24~48시간 이내에 배란이 일어납니다.',
      normal: '양성(피크): 9 ~ 10 Level'
    }
  }

  // SVG 파라미터
  const width = 380
  const height = 150
  const paddingLeft = 30
  const paddingRight = 15
  const paddingTop = 20
  const paddingBottom = 25

  const values = chartData.map(d => d.value)
  let minVal = 0
  let maxVal = 10
  if (selectedHormone === 'bbt') {
    minVal = values.length > 0 ? Math.min(...values) - 0.15 : 35.8
    maxVal = values.length > 0 ? Math.max(...values) + 0.15 : 37.2
  } else if (selectedHormone === 'opkIndex') {
    minVal = 0
    maxVal = 10
  } else {
    minVal = values.length > 0 ? Math.min(...values) * 0.9 : 0
    maxVal = values.length > 0 ? Math.max(...values) * 1.1 : 10
  }

  const getX = (index: number) => {
    if (chartData.length <= 1) return width / 2
    return paddingLeft + (index * (width - paddingLeft - paddingRight)) / (chartData.length - 1)
  }

  const getY = (val: number) => {
    if (maxVal === minVal) return height / 2
    return height - paddingBottom - ((val - minVal) * (height - paddingTop - paddingBottom)) / (maxVal - minVal)
  }

  let linePath = ''
  let areaPath = ''
  if (chartData.length > 0) {
    chartData.forEach((d, i) => {
      const x = getX(i)
      const y = getY(d.value)
      if (i === 0) {
        linePath = `M ${x} ${y}`
        areaPath = `M ${x} ${height - paddingBottom} L ${x} ${y}`
      } else {
        linePath += ` L ${x} ${y}`
        areaPath += ` L ${x} ${y}`
      }
      if (i === chartData.length - 1) {
        areaPath += ` L ${x} ${height - paddingBottom} Z`
      }
    })
  }

  return (
    <div className="space-y-5">
      {/* 상단 탭 스위처 */}
      <div className="flex bg-rose-50/50 p-1.5 rounded-2xl border border-rose-100/40 gap-0.5">
        {recordTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all active-press ${
              activeTab === tab.key
                ? 'bg-white text-primary shadow-sm'
                : 'text-rose-900/50 hover:text-rose-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 일반 기록 탭 ── */}
      {activeTab === 'daily' && (
        <div className="space-y-5 animate-fade-in">
          <div>
            <h2 className="text-lg font-bold text-rose-950 flex items-center gap-1.5">📊 오늘의 신체 기록</h2>
            <p className="text-[11px] text-rose-900/50 mt-0.5">매일의 신체 변화를 기록합니다</p>
          </div>
          <div className="space-y-4">
              {(() => {
                const todayRecord = records.find(r => r.recordedAt === todayStr)
                return (
                  <div className="bg-white rounded-3xl p-5 shadow-sm border border-rose-100/40 space-y-3">
                    {/* 기초체온 BBT */}
                    <div className="flex justify-between items-center p-3.5 rounded-2xl bg-white border border-rose-100/60 shadow-sm hover:shadow-md transition-shadow">
                      <span className="text-xs font-semibold text-rose-950 flex items-center gap-2">
                        🌡️ 기초체온
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="36.5"
                          value={todayRecord?.bbt || bbt}
                          onChange={(e) => {
                            const val = e.target.value
                            setBbt(val)
                            saveDailyField('bbt', val ? Number(val) : '')
                          }}
                          className="w-20 px-2 py-1 text-right text-xs font-bold text-rose-900 border-b border-rose-200 focus:outline-none focus:border-rose-500"
                        />
                        <span className="text-xs font-bold text-rose-950">°C 입력</span>
                      </div>
                    </div>

                    {/* 배란 테스트기 */}
                    <div className="flex justify-between items-center p-3.5 rounded-2xl bg-white border border-rose-100/60 shadow-sm hover:shadow-md transition-shadow">
                      <span className="text-xs font-semibold text-rose-950 flex items-center gap-2">
                        🥚 배란 테스트기
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            const val = todayRecord?.opkIndex === 10 ? '' : 10
                            saveDailyField('opkIndex', val)
                          }}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-colors ${
                            todayRecord?.opkIndex === 10
                              ? 'bg-rose-500 text-white border-rose-500'
                              : 'bg-rose-50/20 text-rose-700 border-rose-100 hover:bg-rose-50'
                          }`}
                        >
                          양성 (피크)
                        </button>
                        <button
                          onClick={() => {
                            const val = todayRecord?.opkIndex === 1 ? '' : 1
                            saveDailyField('opkIndex', val)
                          }}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-colors ${
                            todayRecord?.opkIndex === 1
                              ? 'bg-slate-500 text-white border-slate-500'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          음성
                        </button>
                      </div>
                    </div>

                    {/* 몸무게 */}
                    <div className="flex justify-between items-center p-3.5 rounded-2xl bg-white border border-rose-100/60 shadow-sm hover:shadow-md transition-shadow">
                      <span className="text-xs font-semibold text-rose-950 flex items-center gap-2">
                        ⚖️ 몸무게
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="50"
                          value={todayRecord?.weight || weight}
                          onChange={(e) => {
                            const val = e.target.value
                            setWeight(val)
                            saveDailyField('weight', val ? Number(val) : '')
                          }}
                          className="w-16 px-2 py-1 text-right text-xs font-bold text-rose-900 border-b border-rose-200 focus:outline-none focus:border-rose-500"
                        />
                        <span className="text-xs font-bold text-rose-950">kg 입력</span>
                      </div>
                    </div>

                    {/* 수면 시간 */}
                    <div className="flex justify-between items-center p-3.5 rounded-2xl bg-white border border-rose-100/60 shadow-sm hover:shadow-md transition-shadow">
                      <span className="text-xs font-semibold text-rose-950 flex items-center gap-2">
                        😴 수면 시간
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.5"
                          placeholder="8"
                          value={todayRecord?.sleepHours || sleepHours}
                          onChange={(e) => {
                            const val = e.target.value
                            setSleepHours(val)
                            saveDailyField('sleepHours', val ? Number(val) : '')
                          }}
                          className="w-16 px-2 py-1 text-right text-xs font-bold text-rose-900 border-b border-rose-200 focus:outline-none focus:border-rose-500"
                        />
                        <span className="text-xs font-bold text-rose-950">시간 입력</span>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* 하단 넛지 배너 */}
              <div className="bg-[#fff0f3] rounded-2xl p-4.5 border border-rose-100/60 flex items-center gap-2.5 shadow-sm">
                <span className="text-base">💡</span>
                <p className="text-xs text-rose-700 font-semibold leading-relaxed">
                  기초체온을 매일 기록하면 배란일 예측이 훨씬 정확해져요
                </p>
              </div>
            </div>
        </div>
      )}

      {/* ── 병원 수치 탭 ── */}
      {activeTab === 'hospital' && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-rose-950">🏥 병원 수치 기록</h2>
              <p className="text-[11px] text-rose-900/50 mt-0.5">현재 단계({currentStage ?? '미설정'})의 주요 검사 수치를 입력합니다</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-primary hover:bg-rose-500 text-white text-xs font-semibold py-2 px-3 rounded-xl flex items-center gap-1 active-press transition-colors shadow-sm"
            >
              <Plus size={14} /> 수치 등록
            </button>
          </div>

          {!currentStage ? (
            <div className="bg-rose-50 rounded-3xl p-6 text-center space-y-3 border border-rose-100/60">
              <p className="text-sm font-bold text-rose-950">현재 치료 단계가 설정되지 않았습니다</p>
              <p className="text-xs text-rose-900/50">설정 화면에서 현재 단계를 선택하면 단계별 수치 필드가 표시됩니다</p>
              <a href="/settings" className="inline-block text-xs font-semibold text-primary underline">설정으로 이동</a>
            </div>
          ) : (
            <HospitalFieldsForm
              mode={treatmentMode}
              stage={currentStage}
              todayRecord={records.find(r => r.recordedAt === todayStr)}
              onSave={saveDailyField}
            />
          )}
        </div>
      )}

      {/* ── 시술 지표 탭 (clinic 전용) ── */}
      {activeTab === 'procedure' && (
        <div className="space-y-5 animate-fade-in">
          <div>
            <h2 className="text-lg font-bold text-rose-950">💉 시술 지표 기록</h2>
            <p className="text-[11px] text-rose-900/50 mt-0.5">채취, 이식 등 주요 시술 결과를 기록합니다</p>
          </div>

          {/* 과거 기록 내역 */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 mb-3.5 flex items-center gap-1.5">
              <Calendar size={14} className="text-primary" />
              과거 수치 기록 내역
            </h3>
            {records.length > 0 ? (
              <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                {records.map((r, i) => (
                  <div key={r.id || i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-rose-950">{r.recordedAt}</span>
                      <button
                        onClick={async () => {
                          if (confirm('이 기록을 삭제하시겠습니까?')) {
                            await hormonesApi.delete(r.id!)
                            await fetchRecords()
                          }
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]">
                      {r.bbt !== undefined && <div className="bg-white rounded-lg p-1.5 border border-slate-100"><p className="text-rose-900/60 font-semibold">체온</p><p className="font-bold text-rose-950 mt-0.5">{r.bbt} °C</p></div>}
                      {r.opkIndex !== undefined && <div className="bg-white rounded-lg p-1.5 border border-slate-100"><p className="text-rose-900/60 font-semibold">배테기</p><p className="font-bold text-rose-950 mt-0.5">{r.opkIndex === 10 ? '양성(피크)' : '음성'}</p></div>}
                      {r.weight !== undefined && <div className="bg-white rounded-lg p-1.5 border border-slate-100"><p className="text-rose-900/60 font-semibold">몸무게</p><p className="font-bold text-rose-950 mt-0.5">{r.weight} kg</p></div>}
                      {r.sleepHours !== undefined && <div className="bg-white rounded-lg p-1.5 border border-slate-100"><p className="text-rose-900/60 font-semibold">수면</p><p className="font-bold text-rose-950 mt-0.5">{r.sleepHours} 시간</p></div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-6">등록된 기록이 없습니다.</p>
            )}
          </div>
        </div>
      )}

      {/* 수치 등록 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-center items-end animate-fade-in">
          <div className="bg-white w-full max-w-[480px] rounded-t-3xl p-6 space-y-4 shadow-2xl border-t border-rose-100 max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-rose-950">검사 수치 기록 추가</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-gray-400 hover:text-slate-600"
              >
                닫기
              </button>
            </div>

            <form onSubmit={handleHormoneSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-rose-900/60 mb-1 ml-1">
                  기록 날짜
                </label>
                <input
                  type="date"
                  value={recordedAt}
                  onChange={(e) => setRecordedAt(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
                />
              </div>

              {profile?.treatmentStage === 'natural' ? (
                <>
                  <div className="space-y-3.5 bg-rose-50/30 p-4 rounded-3xl border border-rose-100/40">
                    <h4 className="font-bold text-rose-950 flex items-center gap-1.5">
                      🌱 홈케어 지표 기록 (자연 임신)
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-rose-900/60 mb-1 ml-1">
                          기초체온 (°C)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="35.0"
                          max="39.0"
                          value={bbt}
                          onChange={(e) => setBbt(e.target.value)}
                          placeholder="예: 36.45"
                          className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-rose-900/60 mb-1 ml-1">
                          배란테스트기 (진하기 0~10)
                        </label>
                        <select
                          value={opkIndex}
                          onChange={(e) => setOpkIndex(e.target.value)}
                          className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all appearance-none"
                        >
                          <option value="">선택 안함</option>
                          {Array.from({ length: 11 }, (_, i) => (
                            <option key={i} value={i}>{i} (LH 수치)</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-rose-900/60 mb-1 ml-1">
                        자궁경부점액 상태
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { value: 'dry', label: '건조함' },
                          { value: 'sticky', label: '끈적함' },
                          { value: 'creamy', label: '크림상태' },
                          { value: 'eggwhite', label: '계란흰자' }
                        ].map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => setCervicalMucus(cervicalMucus === item.value ? '' : (item.value as any))}
                            className={`py-2 rounded-xl text-[10px] border text-center transition-all ${
                              cervicalMucus === item.value
                                ? 'bg-primary text-white border-primary font-semibold'
                                : 'bg-white border-rose-100/60 text-gray-500 hover:bg-rose-50/25'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-100 rounded-3xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowHospitalHormones(!showHospitalHormones)}
                      className="w-full px-4 py-3 bg-slate-50 text-left font-bold text-slate-700 flex justify-between items-center hover:bg-slate-100 transition-colors"
                    >
                      <span>🏥 상세 병원 검사 결과 (호르몬) 추가</span>
                      <span className="text-[10px] text-gray-400">{showHospitalHormones ? '접기 ▲' : '펼치기 ▼'}</span>
                    </button>
                    {showHospitalHormones && (
                      <div className="p-4 bg-white border-t border-slate-100 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block font-semibold text-gray-500 mb-1 ml-1">
                              AMH 수치 (ng/mL)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={amh}
                              onChange={(e) => setAmh(e.target.value)}
                              placeholder="예: 2.5"
                              className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-gray-500 mb-1 ml-1">
                              FSH 수치 (mIU/mL)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={fsh}
                              onChange={(e) => setFsh(e.target.value)}
                              placeholder="예: 6.8"
                              className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block font-semibold text-gray-500 mb-1 ml-1">
                              LH (mIU/mL)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={lh}
                              onChange={(e) => setLh(e.target.value)}
                              placeholder="예: 4.5"
                              className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-gray-500 mb-1 ml-1">
                              Estradiol (pg/mL)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={estradiol}
                              onChange={(e) => setEstradiol(e.target.value)}
                              placeholder="예: 45.2"
                              className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-gray-500 mb-1 ml-1">
                              Progesterone (ng/mL)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={progesterone}
                              onChange={(e) => setProgesterone(e.target.value)}
                              placeholder="예: 1.2"
                              className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-rose-900/60 mb-1 ml-1">
                        AMH 수치 (ng/mL)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={amh}
                        onChange={(e) => setAmh(e.target.value)}
                        placeholder="예: 2.5"
                        className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-rose-900/60 mb-1 ml-1">
                        FSH 수치 (mIU/mL)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={fsh}
                        onChange={(e) => setFsh(e.target.value)}
                        placeholder="예: 6.8"
                        className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-semibold text-rose-900/60 mb-1 ml-1">
                        LH (mIU/mL)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={lh}
                        onChange={(e) => setLh(e.target.value)}
                        placeholder="예: 4.5"
                        className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-rose-900/60 mb-1 ml-1">
                        Estradiol (pg/mL)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={estradiol}
                        onChange={(e) => setEstradiol(e.target.value)}
                        placeholder="예: 45.2"
                        className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-rose-900/60 mb-1 ml-1">
                        Progesterone (ng/mL)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={progesterone}
                        onChange={(e) => setProgesterone(e.target.value)}
                        placeholder="예: 1.2"
                        className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
                      />
                    </div>
                  </div>

                  {/* 검사 수치 입력 영역 (ivf, fet 단계인 경우 노출) */}
                  {(profile?.treatmentStage === 'ivf' || profile?.treatmentStage === 'fet') && (
                    <div className="space-y-3.5 bg-indigo-50/30 p-4 rounded-3xl border border-indigo-100/40 mb-3">
                      <h4 className="font-bold text-indigo-950 flex items-center gap-1.5">
                        💉 검사 지표 기록 (IVF / 동결이식)
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-indigo-900/60 mb-1 ml-1">
                            난포 크기 (mm)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={follicleSize}
                            onChange={(e) => setFollicleSize(e.target.value)}
                            placeholder="예: 18.5"
                            className="w-full px-4 py-3 rounded-2xl border border-indigo-100 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-indigo-900/60 mb-1 ml-1">
                            자궁내막 두께 (mm)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={endometriumThickness}
                            onChange={(e) => setEndometriumThickness(e.target.value)}
                            placeholder="예: 8.2"
                            className="w-full px-4 py-3 rounded-2xl border border-indigo-100 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block font-semibold text-indigo-900/60 mb-1 ml-1">
                            채취 난자 수
                          </label>
                          <input
                            type="number"
                            value={retrievedOocytesCount}
                            onChange={(e) => setRetrievedOocytesCount(e.target.value)}
                            placeholder="예: 8"
                            className="w-full px-4 py-3 rounded-2xl border border-indigo-100 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-indigo-900/60 mb-1 ml-1">
                            수정란 등급
                          </label>
                          <input
                            type="text"
                            value={embryoGrade}
                            onChange={(e) => setEmbryoGrade(e.target.value)}
                            placeholder="예: AA"
                            className="w-full px-4 py-3 rounded-2xl border border-indigo-100 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-indigo-900/60 mb-1 ml-1">
                            hCG 수치
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={hcgLevel}
                            onChange={(e) => setHcgLevel(e.target.value)}
                            placeholder="예: 150"
                            className="w-full px-4 py-3 rounded-2xl border border-indigo-100 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border border-slate-100 rounded-3xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowNaturalIndicators(!showNaturalIndicators)}
                      className="w-full px-4 py-3 bg-slate-50 text-left font-bold text-slate-700 flex justify-between items-center hover:bg-slate-100 transition-colors"
                    >
                      <span>🌱 홈케어 지표 (체온, 배테기) 추가</span>
                      <span className="text-[10px] text-gray-400">{showNaturalIndicators ? '접기 ▲' : '펼치기 ▼'}</span>
                    </button>
                    {showNaturalIndicators && (
                      <div className="p-4 bg-white border-t border-slate-100 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block font-semibold text-gray-500 mb-1 ml-1">
                              기초체온 (°C)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="35.0"
                              max="39.0"
                              value={bbt}
                              onChange={(e) => setBbt(e.target.value)}
                              placeholder="예: 36.45"
                              className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-gray-500 mb-1 ml-1">
                              배란테스트기 (진하기 0~10)
                            </label>
                            <select
                              value={opkIndex}
                              onChange={(e) => setOpkIndex(e.target.value)}
                              className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all appearance-none"
                            >
                              <option value="">선택 안함</option>
                              {Array.from({ length: 11 }, (_, i) => (
                                <option key={i} value={i}>{i} (LH 수치)</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block font-semibold text-gray-500 mb-1 ml-1">
                            자궁경부점액 상태
                          </label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {[
                              { value: 'dry', label: '건조함' },
                              { value: 'sticky', label: '끈적함' },
                              { value: 'creamy', label: '크림상태' },
                              { value: 'eggwhite', label: '계란흰자' }
                            ].map((item) => (
                              <button
                                key={item.value}
                                type="button"
                                onClick={() => setCervicalMucus(cervicalMucus === item.value ? '' : (item.value as any))}
                                className={`py-2 rounded-xl text-[10px] border text-center transition-all ${
                                  cervicalMucus === item.value
                                    ? 'bg-primary text-white border-primary font-semibold'
                                    : 'bg-white border-rose-100/60 text-gray-500 hover:bg-rose-50/25'
                                }`}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div>
                <label className="block font-semibold text-rose-900/60 mb-1 ml-1">
                  메모 / 특이사항
                </label>
                <textarea
                  value={hormoneNotes}
                  onChange={(e) => setHormoneNotes(e.target.value)}
                  placeholder="피검사 병원명, 공복 여부 등 메모사항"
                  rows={2}
                  className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={savingHormone}
                className="w-full py-3.5 bg-primary text-white rounded-2xl text-sm font-semibold hover:bg-rose-500 active-press transition-all flex justify-center items-center gap-2"
              >
                {savingHormone ? '저장 중...' : '기록 저장하기'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
