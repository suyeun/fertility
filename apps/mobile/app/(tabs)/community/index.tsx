// apps/mobile/app/community/index.tsx
import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, ActivityIndicator, Modal,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import { router } from 'expo-router'
import { communityApi, usersApi, CATEGORY_ORDER, CATEGORY_LABEL } from '@fertility/shared'
import type {
  PostCategory, PostTag, CommunityPost, UserMode, UserProfile,
} from '@fertility/shared'

const PINK       = '#ff8fab'
const DARK_ROSE  = '#5a3042'
const MUTED      = '#b07080'
const BORDER     = '#ffd6e0'
const LIGHT_PINK = '#fff0f4'
const PURPLE     = '#7c3aed'
const PURPLE_BG  = '#f5f3ff'
const PURPLE_BD  = '#ddd6fe'

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

export default function CommunityScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [postsLoading, setPostsLoading] = useState(false)

  const [activeCategory, setActiveCategory] = useState<PostCategory>('DAILY')
  const [activeTag, setActiveTag] = useState<PostTag | null>(null)

  // 글쓰기 모달
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false)
  const [newTag, setNewTag] = useState<PostTag>('#감정토닥')
  const [newContent, setNewContent] = useState('')
  const [saving, setSaving] = useState(false)

  // 댓글
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null)
  const [commentsMap, setCommentsMap] = useState<Record<string, any[]>>({})
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({})
  const [commentSaving, setCommentSaving] = useState(false)

  // ── 초기화 ──
  useEffect(() => {
    const init = async () => {
      try {
        const p = await usersApi.getProfile()
        setProfile(p)
        const mode: UserMode = (p?.currentMode as UserMode)
          ?? (p?.treatmentStage === 'natural' ? 'NATURAL' : 'CLINIC')
        const first = CATEGORY_ORDER[mode][0]
        setActiveCategory(first)
        setNewTag(CATEGORY_TAGS[first][0])
      } catch {}
      setLoading(false)
    }
    init()
  }, [])

  const userMode: UserMode = (profile?.currentMode as UserMode)
    ?? (profile?.treatmentStage === 'natural' ? 'NATURAL' : 'CLINIC')

  const orderedCategories = CATEGORY_ORDER[userMode]

  const fetchPosts = useCallback(async () => {
    setPostsLoading(true)
    try {
      const data = await communityApi.getPosts({
        category: activeCategory,
        tag: activeTag ?? undefined,
        userMode,
      })
      setPosts(data)
    } catch (e) {
      console.warn('[커뮤니티] 게시글 로드 실패:', e)
    } finally {
      setPostsLoading(false)
    }
  }, [activeCategory, activeTag, userMode])

  useEffect(() => {
    if (!loading) fetchPosts()
  }, [fetchPosts, loading])

  const handleCategoryChange = (cat: PostCategory) => {
    setActiveCategory(cat)
    setActiveTag(null)
    setNewTag(CATEGORY_TAGS[cat][0])
    setExpandedPostId(null)
  }

  // ── 글 작성 ──
  const handleCreatePost = async () => {
    if (!newContent.trim()) return
    setSaving(true)
    try {
      await communityApi.createPost({ tag: newTag, content: newContent })
      setNewContent('')
      setIsWriteModalOpen(false)
      await fetchPosts()
    } catch {
      Alert.alert('오류', '게시글 등록에 실패했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  // ── 반응 ──
  const handleReact = async (postId: string, reaction: 'cheer' | 'empathy' | 'pray') => {
    try {
      const updated = await communityApi.reactPost(postId, reaction)
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, reactions: updated.reactions } : p))
    } catch {}
  }

  // ── 댓글 ──
  const handleExpandComments = async (postId: string) => {
    if (expandedPostId === postId) { setExpandedPostId(null); return }
    setExpandedPostId(postId)
    if (!commentsMap[postId]) {
      try {
        const data = await communityApi.getComments(postId)
        setCommentsMap(prev => ({ ...prev, [postId]: data }))
      } catch {}
    }
  }

  const handleAddComment = async (postId: string) => {
    const text = commentTexts[postId]?.trim()
    if (!text || commentSaving) return
    setCommentSaving(true)
    try {
      await communityApi.addComment(postId, text)
      setCommentTexts(prev => ({ ...prev, [postId]: '' }))
      const updated = await communityApi.getComments(postId)
      setCommentsMap(prev => ({ ...prev, [postId]: updated }))
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
      ))
    } catch {
      Alert.alert('오류', '댓글 등록에 실패했어요.')
    } finally {
      setCommentSaving(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color={PINK} style={{ marginTop: 40 }} />
      </SafeAreaView>
    )
  }

  return (
    <>
      <SafeAreaView style={s.safe}>
        <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {/* 헤더 */}
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Text style={s.backText}>{'<'}</Text>
            </TouchableOpacity>
            <View>
              <Text style={s.headerTitle}>👥 공감 커뮤니티</Text>
              <Text style={s.headerSub}>같은 길을 걷는 분들과 마음을 나눠요</Text>
            </View>
            <TouchableOpacity
              style={s.writeBtn}
              onPress={() => { setNewTag(CATEGORY_TAGS[activeCategory][0]); setIsWriteModalOpen(true) }}
              activeOpacity={0.85}
            >
              <Text style={s.writeBtnTxt}>+ 글쓰기</Text>
            </TouchableOpacity>
          </View>

          {/* 카테고리 탭 */}
          <View style={s.categoryBar}>
            {orderedCategories.map(cat => {
              const { label, emoji } = CATEGORY_LABEL[cat]
              const isActive = activeCategory === cat
              return (
                <TouchableOpacity
                  key={cat}
                  style={[s.categoryTab, isActive && s.categoryTabActive]}
                  onPress={() => handleCategoryChange(cat)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.categoryTabTxt, isActive && s.categoryTabTxtActive]}>
                    {emoji} {label}
                  </Text>
                  <View style={s.anonBadge}>
                    <Text style={s.anonBadgeTxt}>🔒 익명</Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* 익명 안내 */}
          <View style={s.anonNotice}>
            <Text style={s.anonNoticeIcon}>🔒</Text>
            <Text style={s.anonNoticeTxt}>
              BOM 커뮤니티는 유저분들의 소중한 프라이버시를 위해 <Text style={{ fontWeight: '700' }}>100% 익명</Text>으로 안전하게 운영됩니다. 안심하고 마음을 나눠보세요. 🌸
            </Text>
          </View>

          {/* 세부 태그 필터 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.tagScroll}
            contentContainerStyle={s.tagScrollContent}
          >
            <TouchableOpacity
              style={[s.tagChip, activeTag === null && s.tagChipActive]}
              onPress={() => setActiveTag(null)}
            >
              <Text style={[s.tagChipTxt, activeTag === null && s.tagChipTxtActive]}>전체</Text>
            </TouchableOpacity>
            {CATEGORY_TAGS[activeCategory].map(tag => (
              <TouchableOpacity
                key={tag}
                style={[s.tagChip, activeTag === tag && s.tagChipActive]}
                onPress={() => setActiveTag(activeTag === tag ? null : tag)}
              >
                <Text style={[s.tagChipTxt, activeTag === tag && s.tagChipTxtActive]}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* 게시글 목록 */}
          {postsLoading ? (
            <ActivityIndicator color={PINK} style={{ marginTop: 32 }} />
          ) : posts.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyTitle}>아직 게시글이 없어요</Text>
              <Text style={s.emptySub}>첫 번째 이야기를 들려주세요 🌸</Text>
            </View>
          ) : (
            <View style={s.postList}>
              {posts.map(post => {
                const isExpanded = expandedPostId === post.id
                const comments = commentsMap[post.id] || []
                const tagColor = post.targetMode === 'CLINIC'
                  ? { bg: '#ede9fe', color: PURPLE }
                  : post.targetMode === 'NATURAL'
                  ? { bg: '#dcfce7', color: '#16a34a' }
                  : { bg: LIGHT_PINK, color: PINK }

                return (
                  <View key={post.id} style={s.postCard}>
                    {/* 포스트 헤더 */}
                    <View style={s.postHeader}>
                      <View style={s.postAuthorRow}>
                        <Text style={s.lockIcon}>🔒</Text>
                        <Text style={s.authorName}>{post.authorName}</Text>
                        <View style={[s.tagBadge, { backgroundColor: tagColor.bg }]}>
                          <Text style={[s.tagBadgeTxt, { color: tagColor.color }]}>{post.tag}</Text>
                        </View>
                      </View>
                      <Text style={s.timeAgo}>{timeAgo(post.createdAt)}</Text>
                    </View>

                    {/* 본문 */}
                    <Text style={s.postContent}>{post.content}</Text>

                    {/* 반응 + 댓글 버튼 */}
                    <View style={s.postFooter}>
                      {(['cheer', 'empathy', 'pray'] as const).map(r => {
                        const count = post.reactions?.[r]?.length ?? 0
                        return (
                          <TouchableOpacity
                            key={r}
                            style={s.reactionBtn}
                            onPress={() => handleReact(post.id, r)}
                            activeOpacity={0.7}
                          >
                            <Text style={s.reactionEmoji}>{REACTION_CONFIG[r].emoji}</Text>
                            <Text style={s.reactionLabel}>
                              {count > 0 ? count : REACTION_CONFIG[r].label}
                            </Text>
                          </TouchableOpacity>
                        )
                      })}
                      <TouchableOpacity
                        style={s.commentBtn}
                        onPress={() => handleExpandComments(post.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={s.commentBtnTxt}>
                          💬 {post.commentsCount > 0 ? post.commentsCount : '댓글'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* 댓글 영역 */}
                    {isExpanded && (
                      <View style={s.commentSection}>
                        {/* 댓글 입력 */}
                        <View style={s.commentInputRow}>
                          <TextInput
                            style={s.commentInput}
                            value={commentTexts[post.id] ?? ''}
                            onChangeText={t => setCommentTexts(prev => ({ ...prev, [post.id]: t }))}
                            placeholder="익명으로 댓글이 달려요"
                            placeholderTextColor="#c4a0ae"
                            returnKeyType="send"
                            onSubmitEditing={() => handleAddComment(post.id)}
                          />
                          <TouchableOpacity
                            style={[
                              s.commentSendBtn,
                              (!commentTexts[post.id]?.trim() || commentSaving) && s.commentSendBtnDisabled,
                            ]}
                            onPress={() => handleAddComment(post.id)}
                            disabled={!commentTexts[post.id]?.trim() || commentSaving}
                            activeOpacity={0.8}
                          >
                            {commentSaving
                              ? <ActivityIndicator color="#fff" size="small" />
                              : <Text style={s.commentSendTxt}>전송</Text>
                            }
                          </TouchableOpacity>
                        </View>

                        {/* 댓글 목록 */}
                        {comments.length === 0 ? (
                          <Text style={s.noCommentTxt}>첫 댓글을 달아주세요 🌸</Text>
                        ) : (
                          <View style={s.commentList}>
                            {comments.map((c: any) => (
                              <View key={c.id} style={s.commentItem}>
                                <View style={s.commentItemHeader}>
                                  <View style={s.postAuthorRow}>
                                    <Text style={[s.lockIcon, { fontSize: 9 }]}>🔒</Text>
                                    <Text style={s.commentAuthor}>
                                      {c.authorName}{c.isAuthor ? ' (글쓴이)' : ''}
                                    </Text>
                                  </View>
                                  <Text style={s.commentTime}>{timeAgo(c.createdAt)}</Text>
                                </View>
                                <Text style={s.commentContent}>{c.content}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>

      {/* 글쓰기 모달 */}
      <Modal
        visible={isWriteModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsWriteModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={s.modalSheet}>
            {/* 모달 헤더 */}
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>글 작성하기</Text>
              <TouchableOpacity onPress={() => setIsWriteModalOpen(false)}>
                <Text style={s.modalClose}>닫기</Text>
              </TouchableOpacity>
            </View>

            {/* 익명 안내 */}
            <View style={s.modalAnonNotice}>
              <Text style={s.anonNoticeIcon}>🔒</Text>
              <Text style={s.modalAnonTxt}>
                <Text style={{ fontWeight: '700' }}>익명</Text>으로 게시돼요. 닉네임이 자동 생성됩니다.
              </Text>
            </View>

            {/* 태그 선택 */}
            <Text style={s.formLabel}>태그 선택 <Text style={{ color: PINK }}>*</Text></Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
            >
              {CATEGORY_TAGS[activeCategory].map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={[s.tagChip, newTag === tag && s.tagChipActive, { marginBottom: 0 }]}
                  onPress={() => setNewTag(tag)}
                >
                  <Text style={[s.tagChipTxt, newTag === tag && s.tagChipTxtActive]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* 내용 */}
            <Text style={s.formLabel}>내용 <Text style={{ color: PINK }}>*</Text></Text>
            <TextInput
              style={s.contentInput}
              value={newContent}
              onChangeText={setNewContent}
              placeholder="솔직하고 따뜻하게 이야기를 나눠주세요 🌸"
              placeholderTextColor="#c4a0ae"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            {/* 게시 버튼 */}
            <TouchableOpacity
              style={[s.submitBtn, (!newContent.trim() || saving) && s.submitBtnDisabled]}
              onPress={handleCreatePost}
              disabled={!newContent.trim() || saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.submitBtnTxt}>게시하기</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  )
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#fffbfc' },
  scroll:  { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn:    { width: 32 },
  backText:   { fontSize: 20, color: MUTED },
  headerTitle:{ fontSize: 17, fontWeight: '700', color: DARK_ROSE },
  headerSub:  { fontSize: 10, color: MUTED, marginTop: 1 },
  writeBtn: {
    backgroundColor: PINK,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  writeBtnTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // 카테고리 탭
  categoryBar: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    padding: 4,
    gap: 4,
    marginBottom: 12,
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 16,
    gap: 3,
  },
  categoryTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  categoryTabTxt:    { fontSize: 10, fontWeight: '700', color: '#9ca3af', textAlign: 'center' },
  categoryTabTxtActive: { color: PINK },

  // 익명 뱃지
  anonBadge: {
    backgroundColor: '#ede9fe',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  anonBadgeTxt: { fontSize: 8, fontWeight: '600', color: PURPLE },

  // 익명 안내
  anonNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: PURPLE_BG,
    borderWidth: 1,
    borderColor: PURPLE_BD,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  anonNoticeIcon: { fontSize: 12 },
  anonNoticeTxt:  { fontSize: 11, color: '#6d28d9', lineHeight: 17, flex: 1 },

  // 태그 필터
  tagScroll: { marginBottom: 16 },
  tagScrollContent: { gap: 8, paddingRight: 4 },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#fff',
  },
  tagChipActive:   { backgroundColor: PINK, borderColor: PINK },
  tagChipTxt:      { fontSize: 11, fontWeight: '700', color: MUTED },
  tagChipTxtActive:{ color: '#fff' },

  // 게시글 목록
  postList: { gap: 12 },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 10,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  postAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  lockIcon:   { fontSize: 11 },
  authorName: { fontSize: 12, fontWeight: '700', color: DARK_ROSE },
  tagBadge:   { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  tagBadgeTxt:{ fontSize: 10, fontWeight: '700' },
  timeAgo:    { fontSize: 10, color: '#c4a0ae' },
  postContent:{ fontSize: 13, color: DARK_ROSE, lineHeight: 20 },

  // 반응
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: LIGHT_PINK,
  },
  reactionBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reactionEmoji: { fontSize: 14 },
  reactionLabel: { fontSize: 11, color: MUTED },
  commentBtn:    { marginLeft: 'auto' },
  commentBtnTxt: { fontSize: 11, color: MUTED },

  // 댓글
  commentSection: {
    borderTopWidth: 1,
    borderTopColor: LIGHT_PINK,
    paddingTop: 10,
    gap: 8,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#fff8f9',
    color: DARK_ROSE,
  },
  commentSendBtn: {
    backgroundColor: PINK,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  commentSendBtnDisabled: { opacity: 0.4 },
  commentSendTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },
  noCommentTxt:   { fontSize: 10, color: '#c4a0ae', textAlign: 'center', paddingVertical: 8 },
  commentList:    { gap: 8 },
  commentItem: {
    backgroundColor: '#fff8f9',
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  commentItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commentAuthor:  { fontSize: 10, fontWeight: '700', color: DARK_ROSE },
  commentTime:    { fontSize: 9, color: '#c4a0ae' },
  commentContent: { fontSize: 11, color: '#8c5060', lineHeight: 16 },

  // 빈 상태
  emptyBox:  { alignItems: 'center', paddingVertical: 60 },
  emptyTitle:{ fontSize: 13, color: MUTED, marginBottom: 4 },
  emptySub:  { fontSize: 11, color: '#c4a0ae' },

  // 글쓰기 모달
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    gap: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: DARK_ROSE },
  modalClose: { fontSize: 13, color: MUTED },

  modalAnonNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PURPLE_BG,
    borderWidth: 1,
    borderColor: PURPLE_BD,
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  modalAnonTxt: { fontSize: 11, color: '#6d28d9', flex: 1 },

  formLabel: { fontSize: 12, fontWeight: '700', color: DARK_ROSE, marginBottom: 8 },

  contentInput: {
    fontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#fff8f9',
    color: DARK_ROSE,
    minHeight: 120,
    marginBottom: 16,
    lineHeight: 20,
  },

  submitBtn: {
    backgroundColor: PINK,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: PINK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  submitBtnTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },
})
