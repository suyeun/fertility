'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../app/context/AuthContext'
import { communityApi, makeAnonName } from '@fertility/shared'
import type { SecretPost, SecretComment, SecretTopicTag } from '@fertility/shared'
import { Lock, Heart, MessageSquare, Send, Plus, X } from 'lucide-react'

const TOPIC_TAGS = [
  { id: 'all',           emoji: '💬', label: '전체' },
  { id: 'pain',          emoji: '💔', label: '임신 준비의 어려움' },
  { id: 'relationship',  emoji: '💑', label: '부부 관계' },
  { id: 'procedure',     emoji: '💉', label: '병원 이야기' },
  { id: 'mental',        emoji: '🧘', label: '마음 돌봄' },
  { id: 'contraception', emoji: '🌿', label: '피임 고민' },
  { id: 'etc',           emoji: '✨', label: '기타' },
] as const

const TOPIC_COLOR: Record<string, { bg: string; text: string }> = {
  pain:          { bg: '#fce7f3', text: '#9d174d' },
  relationship:  { bg: '#fef3c7', text: '#92400e' },
  procedure:     { bg: '#ede9fe', text: '#6d28d9' },
  mental:        { bg: '#d1fae5', text: '#065f46' },
  contraception: { bg: '#dcfce7', text: '#166534' },
  etc:           { bg: '#f1f5f9', text: '#475569' },
}

export default function SecretChatTab() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<SecretPost[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTag, setSelectedTag] = useState<string>('all')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newTag, setNewTag] = useState<SecretTopicTag>('etc')
  const [saving, setSaving] = useState(false)

  const [expandedPostId, setExpandedPostId] = useState<string | null>(null)
  const [commentsMap, setCommentsMap] = useState<Record<string, SecretComment[]>>({})
  const [commentText, setCommentText] = useState('')
  const [commentSaving, setCommentSaving] = useState(false)

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
      await communityApi.createSecretPost({
        topicTag: newTag,
        content: newContent.trim(),
        anonymousName,
      })
      setNewContent('')
      setNewTag('etc')
      setIsModalOpen(false)
      await fetchPosts()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleLike = async (postId: string) => {
    if (!user) return
    try {
      await communityApi.likeSecretPost(postId)
      await fetchPosts()
    } catch (err) {
      console.error(err)
    }
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
    } catch (err) {
      console.error(err)
    } finally {
      setCommentSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 익명 안내 배너 */}
      <div className="bg-purple-50 border border-purple-100 rounded-2xl px-4 py-3 flex items-start gap-2.5">
        <Lock size={13} className="text-purple-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-[11px] font-semibold text-purple-900">완전 익명 공간이에요</p>
          <p className="text-[10px] text-purple-500 mt-0.5 leading-relaxed">
            실명·아이디는 절대 공개되지 않아요. 매 글마다 다른 익명 닉네임이 자동 부여됩니다.
          </p>
        </div>
      </div>

      {/* 주제 태그 필터 */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        {TOPIC_TAGS.map(tag => (
          <button
            key={tag.id}
            onClick={() => setSelectedTag(tag.id)}
            className={`px-3 py-1.5 rounded-2xl text-[10px] font-semibold whitespace-nowrap transition-all active-press ${
              selectedTag === tag.id
                ? 'bg-purple-500 text-white shadow-sm'
                : 'bg-white border border-purple-100 text-purple-700/60 hover:text-purple-700'
            }`}
          >
            {tag.emoji} {tag.label}
          </button>
        ))}
      </div>

      {/* 포스트 리스트 */}
      <div className="space-y-3.5">
        {loading ? (
          <div className="flex justify-center py-14">
            <span className="w-7 h-7 border-2 border-purple-300 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
            <Lock size={28} className="text-purple-200 mx-auto mb-3" />
            <p className="text-xs text-gray-400 leading-relaxed">
              아직 비밀 글이 없어요.<br />첫 번째로 마음을 털어놓아 보세요.
            </p>
          </div>
        ) : posts.map(post => {
          const isExpanded = expandedPostId === post.id
          const comments = commentsMap[post.id] || []
          const hasLiked = false
          const topicInfo = TOPIC_TAGS.find(t => t.id === post.topicTag)
          const tc = TOPIC_COLOR[post.topicTag] ?? TOPIC_COLOR.etc

          return (
            <div key={post.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-3">
              {/* 카드 헤더 */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                    style={{ background: tc.bg, color: tc.text }}
                  >
                    {topicInfo?.emoji} {topicInfo?.label}
                  </span>
                  <span className="text-[11px] font-semibold text-purple-700 flex items-center gap-1">
                    <Lock size={9} className="text-purple-300" />
                    {post.anonymousName}
                  </span>
                </div>
                <span className="text-[9px] text-gray-400">
                  {new Date(post.createdAt).toLocaleDateString('ko-KR', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
                  })}
                </span>
              </div>

              {/* 본문 */}
              <p className="text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>

              {/* 반응 바 */}
              <div className="flex gap-4 pt-2.5 border-t border-slate-100 text-[10px] text-gray-400">
                <button
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center gap-1 transition-colors active-press ${
                    hasLiked ? 'text-rose-500 font-semibold' : 'hover:text-rose-400'
                  }`}
                >
                  <Heart size={13} className={hasLiked ? 'fill-rose-500 text-rose-500' : ''} />
                  {post.likes.length}
                </button>
                <button
                  onClick={() => handleExpandComments(post.id)}
                  className="flex items-center gap-1 hover:text-purple-500 transition-colors"
                >
                  <MessageSquare size={13} />
                  {post.commentsCount}
                </button>
              </div>

              {/* 댓글 영역 */}
              {isExpanded && (
                <div className="pt-3 border-t border-slate-100 space-y-3 animate-fade-in">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAddComment(post.id)}
                      placeholder="익명으로 따뜻한 말 한마디..."
                      className="flex-1 px-3 py-2 text-[11px] rounded-xl border border-purple-100 bg-purple-50/30 focus:outline-none focus:ring-1 focus:ring-purple-300"
                    />
                    <button
                      onClick={() => handleAddComment(post.id)}
                      disabled={commentSaving || !commentText.trim()}
                      className="p-2 bg-purple-500 text-white rounded-xl active-press disabled:bg-purple-200 transition-colors"
                    >
                      <Send size={12} />
                    </button>
                  </div>

                  {comments.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {comments.map(c => (
                        <div key={c.id} className="bg-slate-50 rounded-xl p-3 text-[10px] space-y-1">
                          <div className="flex justify-between items-center text-[9px] text-gray-400">
                            <span className="font-semibold text-purple-600 flex items-center gap-1">
                              <Lock size={8} className="text-purple-300" />
                              {c.anonymousName}
                              {c.isAuthor && (
                                <span className="ml-1 bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full text-[8px] font-bold">
                                  작성자
                                </span>
                              )}
                            </span>
                            <span>
                              {new Date(c.createdAt).toLocaleDateString('ko-KR', {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-gray-600 leading-relaxed">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[9px] text-center text-gray-400 py-1">
                      첫 번째로 따뜻한 말을 건네보세요 🌸
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 글쓰기 FAB */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-4 bg-purple-500 hover:bg-purple-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg active-press transition-colors z-30"
        aria-label="비밀 글 작성"
      >
        <Plus size={20} />
      </button>

      {/* 작성 모달 (bottom sheet) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-center items-end animate-fade-in">
          <div className="bg-white w-full max-w-[480px] rounded-t-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                  <Lock size={15} className="text-purple-500" />
                  비밀 글 작성
                </h3>
                <p className="text-[10px] text-purple-400 mt-0.5">
                  실명·아이디는 절대 공개되지 않아요
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={18} />
              </button>
            </div>

            {/* 주제 선택 */}
            <div>
              <p className="text-[11px] font-semibold text-slate-400 mb-2">주제 선택</p>
              <div className="flex flex-wrap gap-2">
                {TOPIC_TAGS.filter(t => t.id !== 'all').map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => setNewTag(tag.id as SecretTopicTag)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all active-press ${
                      newTag === tag.id
                        ? 'bg-purple-500 text-white shadow-sm'
                        : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                    }`}
                  >
                    {tag.emoji} {tag.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <textarea
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder="마음속 이야기를 편하게 털어놔요. 아무도 당신이 누구인지 알 수 없어요."
                rows={6}
                required
                className="w-full px-4 py-3 rounded-2xl border border-purple-100 bg-purple-50/20 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none leading-relaxed"
              />
              <button
                type="submit"
                disabled={saving || !newContent.trim()}
                className="w-full py-3.5 bg-purple-500 text-white rounded-2xl text-sm font-semibold hover:bg-purple-600 active-press disabled:bg-purple-200 transition-all flex items-center justify-center gap-2"
              >
                <Lock size={14} />
                {saving ? '올리는 중...' : '익명으로 올리기'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
