// ==========================================
// BOM 백엔드 API 클라이언트
// 웹: NEXT_PUBLIC_API_URL  모바일: EXPO_PUBLIC_API_URL
// ==========================================

const getBaseUrl = () => {
  if (typeof process !== 'undefined') {
    return (
      (process.env as any).NEXT_PUBLIC_API_URL ||
      (process.env as any).EXPO_PUBLIC_API_URL ||
      'http://localhost:3001/api'
    )
  }
  return 'http://localhost:3001/api'
}

// 토큰 저장소 (플랫폼별로 주입)
let tokenGetter: (() => string | null) | null = null
let tokenSetter: ((token: string | null) => void) | null = null

export const configureTokenStore = (
  getter: () => string | null,
  setter: (token: string | null) => void,
) => {
  tokenGetter = getter
  tokenSetter = setter
}

export const getToken = () => tokenGetter?.() ?? null
export const setToken = (t: string | null) => tokenSetter?.(t)

// ==========================================
// 기본 fetch 래퍼
// ==========================================

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

async function request<T = any>(
  method: Method,
  path: string,
  body?: any,
  stream = false,
): Promise<T> {
  const url = `${getBaseUrl()}${path}`
  const token = getToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message || `API ${res.status}`)
  }

  if (stream) return res as unknown as T

  const text = await res.text()
  if (!text) return undefined as unknown as T
  return JSON.parse(text) as T
}

// ==========================================
// API 서비스
// ==========================================

export const authApi = {
  signup: (data: { email: string; password: string; name: string; partnerName?: string }) =>
    request<{ access_token: string; uid: string; email: string }>('POST', '/auth/signup', data),

  login: (email: string, password: string) =>
    request<{ access_token: string; uid: string; email: string }>('POST', '/auth/login', { email, password }),

  me: () => request('GET', '/auth/me'),
}

export const usersApi = {
  getProfile: () => request('GET', '/users/profile'),
  updateProfile: (data: any) => request('PATCH', '/users/profile', data),
}

export const cyclesApi = {
  getAll: () => request('GET', '/cycles'),
  save: (data: any) => request('POST', '/cycles', data),
}

export const hormonesApi = {
  getAll: () => request('GET', '/hormones'),
  save: (data: any) => request('POST', '/hormones', data),
  delete: (id: string) => request('DELETE', `/hormones/${id}`),
}

export const treatmentApi = {
  getAll: () => request('GET', '/treatment'),
  save: (data: any) => request('POST', '/treatment', data),
  updateStatus: (id: string, status: string) => request('PATCH', `/treatment/${id}/status`, { status }),
  delete: (id: string) => request('DELETE', `/treatment/${id}`),
}

export const diaryApi = {
  getAll: () => request('GET', '/diary'),
  save: (date: string, data: any) => request('POST', `/diary/${date}`, data),
  delete: (id: string) => request('DELETE', `/diary/${id}`),
}

export const aiApi = {
  streamChat: async (
    messages: { role: 'user' | 'assistant'; content: string }[],
    onToken: (token: string) => void,
    mode?: 'NATURAL' | 'CLINIC',
  ) => {
    const url = `${getBaseUrl()}/ai/chat`
    const token = getToken()
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ messages, mode }),
    })
    if (!res.ok) throw new Error(`AI API ${res.status}`)
    const reader = res.body?.getReader()
    if (!reader) throw new Error('No reader')
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      onToken(decoder.decode(value, { stream: true }))
    }
  },

  getHistory: () => request('GET', '/ai/history'),
  saveHistory: (messages: any[]) => request('POST', '/ai/history', { messages }),
}

export const communityApi = {
  // 게시글 목록 — category/tag/userMode 필터 지원
  getPosts: (params?: { category?: string; tag?: string; userMode?: string }) => {
    const q = new URLSearchParams()
    if (params?.category) q.set('category', params.category)
    if (params?.tag) q.set('tag', params.tag)
    if (params?.userMode) q.set('userMode', params.userMode)
    const qs = q.toString()
    return request('GET', `/community/posts${qs ? `?${qs}` : ''}`)
  },
  createPost: (data: { tag: string; content: string; anonymousName?: string }) =>
    request('POST', '/community/posts', data),
  reactPost: (id: string, reaction: 'cheer' | 'empathy' | 'pray') =>
    request('POST', `/community/posts/${id}/react`, { reaction }),
  getComments: (id: string) => request('GET', `/community/posts/${id}/comments`),
  addComment: (id: string, content: string, anonymousName?: string) =>
    request('POST', `/community/posts/${id}/comments`, { content, anonymousName }),

  // 레거시 — SecretChatTab 컴포넌트 호환용 (추후 제거 예정)
  getSecretPosts: (tag?: string) => request('GET', `/community/secret${tag ? `?tag=${tag}` : ''}`),
  createSecretPost: (data: any) => request('POST', '/community/secret', data),
  reactSecretPost: (id: string, reaction: 'cheer' | 'empathy' | 'pray') =>
    request('POST', `/community/secret/${id}/react`, { reaction }),
  getSecretComments: (id: string) => request('GET', `/community/secret/${id}/comments`),
  addSecretComment: (id: string, content: string, anonymousName?: string) =>
    request('POST', `/community/secret/${id}/comments`, { content, anonymousName }),
}

export const notificationsApi = {
  registerToken: (token: string, platform: 'ios' | 'android') =>
    request('POST', '/notifications/token', { token, platform }),
}

export const versionApi = {
  check: (version: string, platform: 'ios' | 'android') =>
    request('GET', `/app/version-check?version=${encodeURIComponent(version)}&platform=${platform}`),
}
