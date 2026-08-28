export type Role = 'admin' | 'lead' | 'staff'
export type ProductStatus = 'active' | 'draft' | 'out'
export type ArticleType = 'policy' | 'product' | 'training'
export type MediaCategory = 'xuong' | 'feedback' | 'tonghop'
export type MediaType = 'image' | 'video'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: Role
  avatar_color: string
  is_locked?: boolean
  created_at: string
}

export interface Category {
  id: string
  name: string
  description: string
  sort_order: number
  created_at: string
  product_count?: number
}

export interface ProductSpec {
  id?: string
  product_id?: string
  spec_name: string
  height: string
  weight: string
  price: string
  sort_order?: number
}

export interface MediaFile {
  url: string
  type?: MediaType
}

export interface Product {
  id: string
  name: string
  sku: string
  category_id: string | null
  unit: string
  price_listed: number
  discount_pct: number
  price_final: number
  status: ProductStatus
  description: string
  images: string[]
  videos: string[]
  feedback_media: string[]
  related_media: string[]
  created_by: string | null
  created_at: string
  updated_at: string
  categories?: Category
  product_specs?: ProductSpec[]
}

export interface Message {
  id: string
  user_id: string
  content: string
  created_at: string
  profiles?: Profile
}

export interface Article {
  id: string
  type: ArticleType
  title: string
  content: string
  images: string[]
  created_by: string | null
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface QuizQuestion {
  id?: string
  quiz_id?: string
  question: string
  options: string[]
  correct_index: number
  sort_order?: number
}

export interface Quiz {
  id: string
  title: string
  description: string
  time_limit: number
  pass_score: number
  created_by: string | null
  created_at: string
  quiz_questions?: QuizQuestion[]
  quiz_assignments?: { user_id: string }[]
  quiz_submissions?: QuizSubmission[]
}

export interface QuizSubmission {
  id: string
  quiz_id: string
  user_id: string
  score: number
  total: number
  answers: number[]
  submitted_at: string
  profiles?: Profile
  quizzes?: Quiz
}

export interface MediaAlbum {
  id: string
  title: string
  description: string
  category: MediaCategory
  cover_url: string
  created_by: string | null
  created_at: string
  profiles?: Profile
  media_items?: MediaItem[]
}

export interface MediaItem {
  id: string
  album_id: string
  url: string
  type: MediaType
  caption: string
  sort_order: number
  created_at: string
  media_albums?: { title: string; category: MediaCategory }
}

export const AVATAR_COLORS = [
  '#E24B4A', '#378ADD', '#BA7517', '#7C3AED',
  '#DB2777', '#059669', '#D97706', '#0891B2'
]

export const AVATAR_COLOR_DEFAULT = '#1D9E75'

export function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export function fmtPrice(n: number) {
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ'
}

export function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function statusLabel(s: ProductStatus) {
  return s === 'active' ? 'Đang bán' : s === 'draft' ? 'Nháp' : 'Hết hàng'
}

export function statusClass(s: ProductStatus) {
  return s === 'active' ? 'badge-green' : s === 'draft' ? 'badge-gray' : 'badge-red'
}

export function articleTypeLabel(t: ArticleType) {
  return t === 'policy' ? 'Nội quy' : t === 'product' ? 'Kiến thức SP' : 'Đào tạo'
}

export function articleTypeClass(t: ArticleType) {
  return t === 'policy' ? 'badge-red' : t === 'product' ? 'badge-green' : 'badge-blue'
}

export function mediaCatLabel(c: MediaCategory) {
  return c === 'xuong' ? 'Tư Liệu Xưởng' : c === 'feedback' ? 'Feedback KH' : 'Tổng Hợp'
}

export function mediaCatClass(c: MediaCategory) {
  return c === 'xuong' ? 'badge-purple' : c === 'feedback' ? 'badge-blue' : 'badge-amber'
}

export function getStorageUrl(bucket: string, path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
}
