'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../app/context/AuthContext'
import { communityApi, makeAnonName } from '@fertility/shared'
import type { SecretPost, SecretComment, SecretTopicTag } from '@fertility/shared'
import { Lock, MessageSquare, Send, Plus, X } from 'lucide-react'

// IVF 특화 주제 태그
const TOPIC_TAGS: { id: SecretTopicTag | 'all'; emoji: string; label: string; color: string }[] = [
  { id: 'all',         emoji: '💬', label: '전체',         color: '#6b7280' },
  { id: 'waiting',     emoji: '⏳', label: '결과 대기중',   color: '#f59e0b' },
  { id: 'transfer',    emoji: '🌱', label: '이식 후기',    color: '#10b981' },
  { id: 'retrieval',   emoji: '🥚', label: '채취 후기',    color: '#8b5cf6' },
  { id: 'stimulation', emoji: '💉', label: '과배란 유도',  color: '#3b82f6' },
  { id: 'luteal',      emoji: '🌡️', label: '황체기 증상',  color: '#ec4899' },
  { id: 'mental',      emoji: '🧘', label: '멘탈 관리',   color: '#06b6d4' },
  { id: 'relationship',emoji: '💑', label: '부부/주변',   color: '#f97316' },
  { id: 'etc',         emoji: '✨', label: '기타',        color: '#6b7280' },
]

const REACTIONS = [
  { key: 'cheer',   emoji: '💪', label: '응원해요' },
  { key: 'empathy', emoji: '🤗', label: '공감해요' },
  { key: 'pray',    emoji: '🙏', label: '같이기도' },
] as const

type ReactionKey = 'cheer' | 'empathy' | 'pray'

export default function SecretChatTab() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<SecretPost[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTag, setSelectedTag] = useState<SecretTopicTag | 'all'>('all')
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null)
  const [commentsMap, setCommentsMap] = useState<Record<string, SecretComment[]>>({})
  const [commentText, setCommentText] = useState('')
  const [commentSaving, setCommentSaving] = useState(false)

  // 글쓰기
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newTag, setNewTag] = useState<SecretTopicTag>('etc')
  const [saving, setSaving] = useState(false)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const tag = selectedTag === 'all' ? undefined : selectedTag
      setPosts(await communityApi.getSecretPosts(tag))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [selectedTag])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newContent.trim()) return
    setSaving(true)
    try {
      const anonymousName = makeAnonName(user.uid, Date.now().toString())
      await communityApi.createSecretPost({ topicTag: newTag, content: newContent.trim(), anonymousName })
      setNewContent(''); setNewTag('etc'); setIsModalOpen(false)
      await fetchPosts()
    } finally {
      setSaving(false)
    }
  }

  const handleReact = async (postId: string, reaction: ReactionKey) => {
    if (!user) return
    try {
      await communityApi.reactSecretPost(postId, reaction)
      await fetchPosts()
    } catch {}
  }

  const handleExpandComments = async (postId: string) => {
    if (expandedPostId === postId) { setExpandedPostId(null); return }
    setExpandedPostId(postId)
    if (!commentsMap[postId]) {
      const comments = await communityApi.getSecretComments(postId)
      setCommentsMap(prev => ({ ...prev, [postId]: comments }))
    }
  }

  const handleAddComment = async (postId: string) => {
    if (!user || !commentText.trim() || commentSaving) return
    setCommentSaving(true)
    try {
      const anonymousName = makeAnonName(user.uid, postId + '_c')
      await communityApi.addSecretComment(postId, commentText.trim(), anonymousName)
      setCommentText('')
      const updated = await communityApi.getSecretComments(postId)
      setCommentsMap(prev => ({ ...prev, [postId]: updated }))
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentsCount: updated.length } : p))
    } finally {
      setCommentSaving(false)
    }
  }

  const getTagInfo = (id: SecretTopicTag | 'all') =>
    TOPIC_TAGS.find(t => t.id === id) ?? TOPIC_TAGS[TOPIC_TAGS.length - 1]

  const totalReactions = (post: SecretPost) => {
    if (!post.reactions) return post.likes?.length ?? 0
    return (post.reactions.cheer?.length ?? 0) +
           (post.reactions.empathy?.length ?? 0) +
           (post.reactions.pray?.length ?? 0)
  }

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return '방금'
    if (m < 60) return `${m}분 전`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}시간 전`
    return `${Math.floor(h / 24)}일 전`
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-rose-950 flex items-center gap-1.5">
            <Lock size={14} className="text-rose-400" />
            시술 이야기방
          </h2>
          <p className="text-[10px] text-rose-300 mt-0.5">완전 익명 · 닉네임만 표시 · 작성자도 모릅니다</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-2xl text-xs font-semibold shadow-glow active-press"
        >
          <Plus size={13} />털어놓기
        </button>
      </div>

      {/* 주제 태그 필터 */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {TOPIC_TAGS.map(tag => (
          <button
            key={tag.id}
            onClick={() => setSelectedTag(tag.id as any)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
              selectedTag === tag.id
                ? 'text-white shadow-sm'
                : 'bg-rose-50 text-rose-400 hover:bg-rose-100'
            }`}
            style={selectedTag === tag.id ? { backgroundColor: tag.color } : {}}
          >
            <span>{tag.emoji}</span>{tag.label}
          </button>
        ))}
      </div>

      {/* 결과 대기중 배너 */}
      {selectedTag === 'all' && (
        <button
          onClick={() => setSelectedTag('waiting')}
          className="w-full bg-amber-50 border border-amber-200/60 rounded-2xl p-3 flex items-center gap-3 text-left hover:bg-amber-100 transition-all active-press"
        >
          <span className="text-2xl">⏳</span>
          <div>
            <p className="text-xs font-bold text-amber-700">오늘 결과 기다리는 분들 계세요?</p>
            <p className="text-[10px] text-amber-500 mt-0.5">β-hCG 결과 대기, 이식 후 기다림 — 같이 기도해요 🙏</p>
          </div>
        </button>
      )}

      {/* 게시글 목록 */}
      {loading ? (
        <div className="flex justify-center py-8">
          <span className="w-7 h-7 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-3xl mb-2">🌸</p>
          <p className="text-sm text-rose-300 font-medium">첫 이야기를 털어놓아 보세요</p>
          <p className="text-xs text-rose-200 mt-1">완전 익명이에요 — 아무도 모릅니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => {
            const tagInfo = getTagInfo(post.topicTag)
            const isExpanded = expandedPostId === post.id
            const comments = commentsMap[post.id] || []

            return (
              <div key={post.id} className="card-soft rounded-2xl overflow-hidden border border-rose-100/40">
                <div className="p-4">
                  {/* 태그 + 닉네임 + 시간 */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: tagInfo.color }}
                    >
                      {tagInfo.emoji} {tagInfo.label}
                    </span>
                    <span className="text-[10px] text-rose-300">{post.anonymousName}</span>
                    <span className="text-[10px] text-rose-200 ml-auto">{timeAgo(post.createdAt)}</span>
                  </div>

                  {/* 내용 */}
                  <p className="text-sm text-rose-900 leading-relaxed">{post.content}</p>

                  {/* 반응 버튼 */}
                  <div className="flex items-center gap-2 mt-3">
                    {REACTIONS.map(r => {
                      const count = post.reactions?.[r.key]?.length ?? 0
                      return (
                        <button
                          key={r.key}
                          onClick={() => handleReact(post.id, r.key)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-rose-50 hover:bg-rose-100 text-rose-500 transition-all active-press border border-rose-100"
                        >
                          <span>{r.emoji}</span>
                          <span className="font-medium">{r.label}</span>
                          {count > 0 && <span className="text-rose-400 font-bold">{count}</span>}
                        </button>
                      )
                    })}
                    <button
                      onClick={() => handleExpandComments(post.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-rose-50 hover:bg-rose-100 text-rose-400 transition-all ml-auto border border-rose-100"
                    >
                      <MessageSquare size={11} />
                      <span>{post.commentsCount > 0 ? post.commentsCount : '댓글'}</span>
                    </button>
                  </div>
                </div>

                {/* 댓글 */}
                {isExpanded && (
                  <div className="border-t border-rose-100/60 px-4 pb-4 pt-3 space-y-2.5">
                    {comments.map((c, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-[10px] font-bold text-rose-300 whitespace-nowrap mt-0.5">
                          {c.isAuthor ? '✍️ 글쓴이' : c.anonymousName}
                        </span>
                        <p className="text-xs text-rose-800 leading-relaxed">{c.content}</p>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <input
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        placeholder="따뜻한 한마디..."
                        className="flex-1 text-xs border border-rose-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-rose-200"
                        onKeyDown={e => e.key === 'Enter' && handleAddComment(post.id)}
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        disabled={commentSaving || !commentText.trim()}
                        className="px-3 py-2 bg-primary text-white rounded-xl text-xs disabled:opacity-40 active-press"
                      >
                        <Send size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 글쓰기 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-[480px] bg-white rounded-t-3xl shadow-2xl">
            <div className="px-5 pt-5 pb-3 border-b border-rose-100/60 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-rose-950">익명으로 털어놓기</h3>
                <p className="text-[10px] text-rose-300 mt-0.5">작성자 정보는 절대 공개되지 않아요</p>
              </div>
              <button onClick={() => setIsModalOpen(false)}>
                <X size={18} className="text-rose-300 hover:text-rose-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="px-5 py-4 space-y-4">
              {/* 주제 선택 */}
              <div>
                <p className="text-xs font-semibold text-rose-500 mb-2">주제 선택</p>
                <div className="grid grid-cols-4 gap-2">
                  {TOPIC_TAGS.filter(t => t.id !== 'all').map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setNewTag(tag.id as SecretTopicTag)}
                      className={`flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-semibold transition-all border ${
                        newTag === tag.id ? 'text-white border-transparent' : 'bg-rose-50 text-rose-400 border-rose-100'
                      }`}
                      style={newTag === tag.id ? { backgroundColor: tag.color } : {}}
                    >
                      <span className="text-base">{tag.emoji}</span>
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder="지금 마음에 있는 것을 자유롭게 털어놓으세요. 여기선 다 괜찮아요."
                rows={5}
                className="w-full border border-rose-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-rose-200 resize-none"
                required
              />
              <button
                type="submit"
                disabled={saving || !newContent.trim()}
                className="w-full py-3.5 rounded-2xl font-bold text-sm bg-primary text-white shadow-glow disabled:opacity-50 active-press"
              >
                {saving ? '올리는 중...' : '익명으로 올리기'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
