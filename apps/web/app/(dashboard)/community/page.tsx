// apps/web/app/(dashboard)/community/page.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { communityApi } from '@fertility/shared'
import { Plus, Users, Heart, MessageSquare, Send, Lock } from 'lucide-react'
import SecretChatTab from '../../../components/community/SecretChatTab'
import InfoTab from '../../../components/community/InfoTab'

type Stage = 'all' | 'natural' | 'iui' | 'ivf' | 'fet' | 'pregnant'
type Tab = 'regular' | 'info' | 'secret'

export default function CommunityPage() {
  const { user, profile } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('secret')
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFilter, setSelectedFilter] = useState<Stage>('all')

  // 글 쓰기 모달
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  // 댓글 펼치기 및 작성 상태
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null)
  const [commentsMap, setCommentsMap] = useState<Record<string, any[]>>({})
  const [newCommentText, setNewCommentText] = useState('')
  const [commentSaving, setCommentSaving] = useState(false)

  const fetchPosts = async () => {
    try {
      const filterStage = selectedFilter === 'all' ? undefined : selectedFilter
      const data = await communityApi.getPosts(filterStage)
      setPosts(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [selectedFilter])

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !profile || !title.trim() || !content.trim()) return
    setSaving(true)
    try {
      await communityApi.createPost({ title, content })
      setTitle('')
      setContent('')
      setIsModalOpen(false)
      await fetchPosts()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleLikePost = async (postId: string) => {
    if (!user) return
    try {
      const updatedLikes = await communityApi.likePost(postId)
      setPosts(posts.map(p => {
        if (p.id === postId) {
          return { ...p, likes: updatedLikes }
        }
        return p
      }))
    } catch (err) {
      console.error(err)
    }
  }

  const handleExpandComments = async (postId: string) => {
    if (expandedCommentsPostId === postId) {
      setExpandedCommentsPostId(null)
      return
    }
    setExpandedCommentsPostId(postId)
    try {
      const comments = await communityApi.getComments(postId)
      setCommentsMap(prev => ({ ...prev, [postId]: comments }))
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddComment = async (postId: string) => {
    if (!user || !profile || !newCommentText.trim() || commentSaving) return
    setCommentSaving(true)
    try {
      await communityApi.addComment(postId, newCommentText)
      setNewCommentText('')
      // 댓글 목록 리프레시
      const updatedComments = await communityApi.getComments(postId)
      setCommentsMap(prev => ({ ...prev, [postId]: updatedComments }))
    } catch (err) {
      console.error(err)
    } finally {
      setCommentSaving(false)
    }
  }

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'natural': return '🌱 자연임신'
      case 'iui': return '🧪 인공수정'
      case 'ivf': return '🧬 시험관'
      case 'fet': return '❄️ 동결이식'
      case 'pregnant': return '👶 임신성공'
      default: return '🌱 준비중'
    }
  }

  const filters: { value: Stage; label: string }[] = [
    { value: 'all', label: '전체' },
    { value: 'natural', label: '자연임신' },
    { value: 'iui', label: '인공수정' },
    { value: 'ivf', label: '시험관' },
    { value: 'fet', label: '동결이식' },
    { value: 'pregnant', label: '임신성공' },
  ]

  return (
    <div className="space-y-5">
      {/* 상단 타이틀 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-rose-950 flex items-center gap-1.5">
            <Users size={20} className="text-primary" />
            공감 커뮤니티
          </h2>
          <p className="text-xs text-rose-900/50 mt-0.5">같은 길을 걷는 소중한 분들과 마음을 나눕니다</p>
        </div>
        {activeTab === 'regular' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-primary hover:bg-rose-500 text-white text-xs font-semibold py-2 px-3 rounded-xl flex items-center gap-1 active-press transition-colors shadow-sm"
          >
            <Plus size={14} /> 글쓰기
          </button>
        )}
      </div>

      {/* 탭 전환 — 시술 이야기방 우선 */}
      <div className="flex bg-slate-100/70 rounded-2xl p-1 gap-1">
        <button
          onClick={() => setActiveTab('secret')}
          className={`flex-1 py-2.5 text-[10px] font-semibold rounded-xl transition-all flex items-center justify-center gap-1 ${
            activeTab === 'secret'
              ? 'bg-white text-rose-700 shadow-sm'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          🌸 시술 이야기방
        </button>
        <button
          onClick={() => setActiveTab('regular')}
          className={`flex-1 py-2.5 text-[10px] font-semibold rounded-xl transition-all ${
            activeTab === 'regular'
              ? 'bg-white text-rose-700 shadow-sm'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          💬 일반 게시판
        </button>
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-2.5 text-[10px] font-semibold rounded-xl transition-all ${
            activeTab === 'info'
              ? 'bg-white text-rose-600 shadow-sm'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          📚 정보 나눔
        </button>
      </div>

      {/* 정보 나눔 탭 */}
      {activeTab === 'info' && <InfoTab />}

      {/* 비밀 대화방 탭 */}
      {activeTab === 'secret' && <SecretChatTab />}

      {/* 일반 게시판 탭만 아래 내용 렌더링 */}
      {activeTab !== 'regular' ? null : (
        <>
      {/* 필터 칩 */}
      <div className="flex gap-1.5 overflow-x-auto pb-1.5 -mx-1 px-1">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setSelectedFilter(f.value)}
            className={`px-3.5 py-1.8 rounded-2xl text-[10px] font-bold tracking-tight whitespace-nowrap active-press transition-all ${
              selectedFilter === f.value
                ? 'bg-primary text-white shadow-sm shadow-rose-200'
                : 'bg-white border border-rose-100/50 text-rose-900/60 hover:text-primary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 게시글 리스트 */}
      <div className="space-y-3.5">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <span className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></span>
          </div>
        ) : posts.length > 0 ? (
          posts.map((post) => {
            const hasLiked = user && post.likes?.includes(user.uid)
            const comments = commentsMap[post.id] || []
            const isCommentsExpanded = expandedCommentsPostId === post.id

            return (
              <div key={post.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-3.5">
                {/* 헤더 */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-rose-50 text-primary font-bold px-2.5 py-0.5 rounded-full border border-rose-100/30">
                      {getStageLabel(post.treatmentStage)}
                    </span>
                    <span className="text-xs font-bold text-rose-950/80">{post.userName}</span>
                  </div>
                  <span className="text-[9px] text-gray-400">
                    {new Date(post.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                  </span>
                </div>

                {/* 제목 & 본문 */}
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800 leading-tight">{post.title}</h4>
                  <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                </div>

                {/* 반응 컨트롤 바 */}
                <div className="flex gap-4 items-center pt-2.5 border-t border-slate-100 text-[10px] text-gray-400">
                  <button
                    onClick={() => handleLikePost(post.id)}
                    className={`flex items-center gap-1 hover:text-primary active-press transition-colors ${
                      hasLiked ? 'text-primary font-bold' : ''
                    }`}
                  >
                    <Heart size={14} className={hasLiked ? 'fill-primary' : ''} />
                    <span>좋아요 {post.likes?.length || 0}</span>
                  </button>

                  <button
                    onClick={() => handleExpandComments(post.id)}
                    className="flex items-center gap-1 hover:text-rose-800 transition-colors"
                  >
                    <MessageSquare size={14} />
                    <span>댓글 보기</span>
                  </button>
                </div>

                {/* 댓글 영역 (펼쳤을 때) */}
                {isCommentsExpanded && (
                  <div className="mt-3.5 pt-3.5 border-t border-slate-100 space-y-3.5 bg-slate-50/40 p-3 rounded-2xl animate-fade-in">
                    <span className="text-[9px] font-bold text-rose-900/60 block">댓글 소통</span>
                    
                    {/* 댓글 작성 폼 */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        placeholder="따뜻한 응원 한마디를 나누어주세요"
                        className="flex-1 px-3 py-2 text-[10px] rounded-xl border border-rose-100 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        disabled={commentSaving || !newCommentText.trim()}
                        className="p-2 bg-primary text-white rounded-xl active-press disabled:bg-rose-300 transition-colors"
                      >
                        <Send size={12} />
                      </button>
                    </div>

                    {/* 댓글 목록 */}
                    {comments.length > 0 ? (
                      <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                        {comments.map((comment) => (
                          <div key={comment.id} className="text-[10px] bg-white p-2.5 rounded-xl border border-slate-100 space-y-1">
                            <div className="flex justify-between items-center text-[8px] text-gray-400 font-semibold">
                              <span className="text-rose-900">{comment.userName}</span>
                              <span>{new Date(comment.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-gray-600 leading-normal">{comment.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[9px] text-gray-400 text-center py-2">가장 먼저 응원의 댓글을 달아주세요! 🌸</p>
                    )}
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-100">
            <p className="text-xs text-gray-400">필터에 해당하는 게시글이 아직 없습니다.</p>
          </div>
        )}
      </div>

      {/* 새 포스트 등록 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-center items-end animate-fade-in">
          <div className="bg-white w-full max-w-[480px] rounded-t-3xl p-6 space-y-4 shadow-2xl border-t border-rose-100 animate-slide-up">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-rose-950">새 글 작성하기</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-gray-400 hover:text-slate-600"
              >
                닫기
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-rose-900/60 mb-1 ml-1">
                  글 제목
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="제목을 입력하세요"
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
                />
              </div>

              <div>
                <label className="block font-semibold text-rose-900/60 mb-1 ml-1">
                  글 내용
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="준비 과정이나 감정, 유용한 정보들을 나누어 보세요. 민감한 소통일수록 배려를 담아 이야기해 주시면 감사하겠습니다."
                  rows={6}
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 bg-primary text-white rounded-2xl text-sm font-semibold hover:bg-rose-500 active-press transition-all flex justify-center items-center gap-2"
              >
                {saving ? '등록 중...' : '게시글 등록하기'}
              </button>
            </form>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  )
}
