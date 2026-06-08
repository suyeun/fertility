'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { communityApi } from '@fertility/shared'
import {
  CATEGORY_ORDER, CATEGORY_LABEL, CATEGORY_ANONYMOUS, TAG_META,
  type PostCategory, type PostTag, type CommunityPost, type UserMode,
} from '@fertility/shared'
import { Plus, MessageSquare, Send, Users, Lock } from 'lucide-react'

const CATEGORY_TAGS: Record<PostCategory, PostTag[]> = {
  DAILY:  ['#감정토닥', '#남편_시댁', '#아무말'],
  CLINIC: ['#시험관_신선', '#시험관_동결', '#인공수정', '#병원추천'],
  INFO:   ['#배테기_기초체온', '#영양제추천', '#운동_식단'],
}

const REACTION_CONFIG = {
  cheer:   { emoji: '💪', label: '응원해요' },
  empathy: { emoji: '🤗', label: '공감해요' },
  pray:    { emoji: '🙏', label: '같이기도' },
} as const

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

export default function CommunityPage() {
  const { user, profile } = useAuth()

  const userMode: UserMode = (profile?.currentMode as UserMode)
    ?? (profile?.treatmentStage === 'natural' ? 'NATURAL' : 'CLINIC')

  const orderedCategories = CATEGORY_ORDER[userMode]
  const [activeCategory, setActiveCategory] = useState<PostCategory>(orderedCategories[0])
  const [activeTag, setActiveTag] = useState<PostTag | null>(null)

  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)

  // 글쓰기 모달
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTag, setNewTag] = useState<PostTag>(CATEGORY_TAGS[orderedCategories[0]][0])
  const [newContent, setNewContent] = useState('')
  const [saving, setSaving] = useState(false)

  // 댓글
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null)
  const [commentsMap, setCommentsMap] = useState<Record<string, any[]>>({})
  const [commentText, setCommentText] = useState('')
  const [commentSaving, setCommentSaving] = useState(false)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await communityApi.getPosts({ category: activeCategory, tag: activeTag ?? undefined, userMode })
      setPosts(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [activeCategory, activeTag, userMode])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const handleCategoryChange = (cat: PostCategory) => {
    setActiveCategory(cat)
    setActiveTag(null)
    setNewTag(CATEGORY_TAGS[cat][0])
  }

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newContent.trim()) return
    setSaving(true)
    try {
      await communityApi.createPost({ tag: newTag, content: newContent })
      setNewContent('')
      setIsModalOpen(false)
      await fetchPosts()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleReact = async (postId: string, reaction: 'cheer' | 'empathy' | 'pray') => {
    if (!user) return
    try {
      const updated = await communityApi.reactPost(postId, reaction)
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, reactions: updated.reactions } : p))
    } catch (err) { console.error(err) }
  }

  const handleExpandComments = async (postId: string) => {
    if (expandedPostId === postId) { setExpandedPostId(null); return }
    setExpandedPostId(postId)
    if (!commentsMap[postId]) {
      try {
        const data = await communityApi.getComments(postId)
        setCommentsMap(prev => ({ ...prev, [postId]: data }))
      } catch (err) { console.error(err) }
    }
  }

  const handleAddComment = async (postId: string) => {
    if (!user || !commentText.trim() || commentSaving) return
    setCommentSaving(true)
    try {
      await communityApi.addComment(postId, commentText)
      setCommentText('')
      const updated = await communityApi.getComments(postId)
      setCommentsMap(prev => ({ ...prev, [postId]: updated }))
    } catch (err) { console.error(err) }
    finally { setCommentSaving(false) }
  }

  // 전체 익명 운영 — 모든 카테고리 익명

  return (
    <div className="flex flex-col gap-4 pb-8">

      {/* 헤더 */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h2 className="text-lg font-bold text-[#5a3042] flex items-center gap-1.5">
            <Users size={18} className="text-[#ff8fab]" /> 공감 커뮤니티
          </h2>
          <p className="text-[11px] text-[#b07080] mt-0.5">같은 길을 걷는 분들과 마음을 나눠요</p>
        </div>
        <button
          onClick={() => { setNewTag(CATEGORY_TAGS[activeCategory][0]); setIsModalOpen(true) }}
          className="flex items-center gap-1 bg-[#ff8fab] text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm active:scale-95 transition-all"
        >
          <Plus size={13} /> 글쓰기
        </button>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex bg-[#f5f5f5] rounded-2xl p-1 gap-1">
        {orderedCategories.map(cat => {
          const { label, emoji } = CATEGORY_LABEL[cat]
          const isAnon = CATEGORY_ANONYMOUS[cat]
          return (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`flex-1 py-2 text-[10px] font-bold rounded-xl transition-all flex flex-col items-center gap-0.5 ${
                activeCategory === cat ? 'bg-white text-[#ff8fab] shadow-sm' : 'text-gray-400'
              }`}
            >
              <span>{emoji} {label}</span>
              {/* 전체 익명 뱃지 */}
              <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-[#ede9fe] text-[#7c3aed]">
                🔒 익명
              </span>
            </button>
          )
        })}
      </div>

      {/* 100% 익명 안내 문구 */}
      <div className="rounded-xl px-3 py-2.5 text-[11px] flex items-start gap-2 bg-[#f5f3ff] border border-[#ddd6fe]">
        <Lock size={12} className="text-[#7c3aed] shrink-0 mt-0.5" />
        <p className="text-[#6d28d9] leading-relaxed">
          Lunera 커뮤니티는 유저분들의 소중한 프라이버시를 위해 <b>100% 익명</b>으로 안전하게 운영됩니다. 안심하고 마음을 나눠보세요. 🌸
        </p>
      </div>

      {/* 세부 태그 필터 */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={() => setActiveTag(null)}
          className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap border transition-all ${
            activeTag === null
              ? 'bg-[#ff8fab] text-white border-[#ff8fab]'
              : 'bg-white text-[#b07080] border-[#ffd6e0]'
          }`}
        >
          전체
        </button>
        {CATEGORY_TAGS[activeCategory].map(tag => (
          <button
            key={tag}
            onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap border transition-all ${
              activeTag === tag
                ? 'bg-[#ff8fab] text-white border-[#ff8fab]'
                : 'bg-white text-[#b07080] border-[#ffd6e0]'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* 게시글 목록 */}
      {loading ? (
        <div className="flex justify-center py-16">
          <span className="w-7 h-7 border-[3px] border-[#ff8fab] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-[#b07080]">아직 게시글이 없어요</p>
          <p className="text-xs text-[#c4a0ae] mt-1">첫 번째 이야기를 들려주세요 🌸</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map(post => {
            const isExpanded = expandedPostId === post.id
            const comments = commentsMap[post.id] || []

            return (
              <div
                key={post.id}
                className="bg-white rounded-2xl p-4 border border-[#ffd6e0] flex flex-col gap-3"
                style={{ boxShadow: '0 2px 8px -2px rgba(255,143,171,0.1)' }}
              >
                {/* 헤더 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock size={11} className="text-[#7c3aed]" />
                    <span className="text-xs font-bold text-[#5a3042]">{post.authorName}</span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: post.targetMode === 'CLINIC' ? '#ede9fe'
                          : post.targetMode === 'NATURAL' ? '#dcfce7' : '#fff0f4',
                        color: post.targetMode === 'CLINIC' ? '#7c3aed'
                          : post.targetMode === 'NATURAL' ? '#16a34a' : '#ff8fab',
                      }}
                    >
                      {post.tag}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#c4a0ae]">{timeAgo(post.createdAt)}</span>
                </div>

                {/* 본문 */}
                <p className="text-sm text-[#5a3042] leading-relaxed whitespace-pre-wrap">{post.content}</p>

                {/* 반응 + 댓글 버튼 */}
                <div className="flex items-center gap-3 pt-2 border-t border-[#fff0f4]">
                  {(['cheer', 'empathy', 'pray'] as const).map(r => {
                    const count = post.reactions?.[r]?.length ?? 0
                    return (
                      <button
                        key={r}
                        onClick={() => handleReact(post.id, r)}
                        className="flex items-center gap-1 text-[11px] text-[#b07080] hover:text-[#ff8fab] transition-colors active:scale-95"
                      >
                        <span>{REACTION_CONFIG[r].emoji}</span>
                        <span>{count > 0 ? count : REACTION_CONFIG[r].label}</span>
                      </button>
                    )
                  })}
                  <button
                    onClick={() => handleExpandComments(post.id)}
                    className="ml-auto flex items-center gap-1 text-[11px] text-[#b07080] hover:text-[#ff8fab] transition-colors"
                  >
                    <MessageSquare size={13} />
                    <span>{post.commentsCount > 0 ? post.commentsCount : '댓글'}</span>
                  </button>
                </div>

                {/* 댓글 영역 */}
                {isExpanded && (
                  <div className="border-t border-[#fff0f4] pt-3 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddComment(post.id)}
                        placeholder={post.isAnonymous ? '익명으로 댓글이 달려요' : '따뜻한 응원을 남겨주세요'}
                        className="flex-1 text-xs px-3 py-2 rounded-xl border border-[#ffd6e0] bg-[#fff8f9] focus:outline-none focus:ring-1 focus:ring-[#ff8fab]"
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        disabled={commentSaving || !commentText.trim()}
                        className="p-2 bg-[#ff8fab] text-white rounded-xl disabled:opacity-40 active:scale-95 transition-all"
                      >
                        <Send size={12} />
                      </button>
                    </div>

                    {comments.length === 0 ? (
                      <p className="text-[10px] text-[#c4a0ae] text-center py-2">첫 댓글을 달아주세요 🌸</p>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                        {comments.map((c: any) => (
                          <div key={c.id} className="bg-[#fff8f9] rounded-xl px-3 py-2">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1">
                                <Lock size={9} className="text-[#7c3aed]" />
                                <span className="text-[10px] font-bold text-[#5a3042]">
                                  {c.authorName}{c.isAuthor && ' (글쓴이)'}
                                </span>
                              </div>
                              <span className="text-[9px] text-[#c4a0ae]">{timeAgo(c.createdAt)}</span>
                            </div>
                            <p className="text-[11px] text-[#8c5060] leading-relaxed">{c.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 글쓰기 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
          <div className="bg-white w-full max-w-[480px] rounded-t-3xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#5a3042]">글 작성하기</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-xs text-[#b07080]">닫기</button>
            </div>

            {/* 익명 안내 */}
            <div className="rounded-xl px-3 py-2 text-[11px] flex items-center gap-2 bg-[#f5f3ff] border border-[#ddd6fe]">
              <Lock size={11} className="text-[#7c3aed] shrink-0" />
              <span className="text-[#6d28d9]"><b>익명</b>으로 게시돼요. 닉네임이 자동 생성됩니다.</span>
            </div>

            <form onSubmit={handleCreatePost} className="flex flex-col gap-3">
              {/* 태그 선택 */}
              <div>
                <p className="text-xs font-bold text-[#5a3042] mb-2">태그 선택 <span className="text-[#ff8fab]">*</span></p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_TAGS[activeCategory].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setNewTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                        newTag === tag
                          ? 'bg-[#ff8fab] text-white border-[#ff8fab]'
                          : 'bg-white text-[#b07080] border-[#ffd6e0]'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* 내용 */}
              <div>
                <p className="text-xs font-bold text-[#5a3042] mb-2">내용 <span className="text-[#ff8fab]">*</span></p>
                <textarea
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="솔직하고 따뜻하게 이야기를 나눠주세요 🌸"
                  rows={5}
                  required
                  className="w-full text-sm px-4 py-3 rounded-2xl border border-[#ffd6e0] bg-[#fff8f9] focus:outline-none focus:ring-2 focus:ring-[#ff8fab] resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving || !newContent.trim()}
                className="w-full py-3.5 bg-[#ff8fab] text-white rounded-2xl text-sm font-bold disabled:opacity-40 active:scale-[0.98] transition-all"
              >
                {saving ? '등록 중...' : '게시하기'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
