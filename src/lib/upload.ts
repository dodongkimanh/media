import { createClient } from '@/lib/supabase/client'

export async function uploadFile(
  file: File,
  bucket: 'products' | 'media' | 'articles',
  folder = ''
): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop()
  const uid = Math.floor(Math.random() * 1_000_000_000).toString().padStart(9, '0')
  const name = folder ? `${folder}/xuongkimanh-${uid}.${ext}` : `xuongkimanh-${uid}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(name, file, { upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from(bucket).getPublicUrl(name)
  return data.publicUrl
}

export async function uploadFiles(
  files: File[],
  bucket: 'products' | 'media' | 'articles',
  folder = ''
): Promise<string[]> {
  return Promise.all(files.map(f => uploadFile(f, bucket, folder)))
}

export async function deleteStorageFile(url: string) {
  const supabase = createClient()
  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/)
  if (!match) return
  const [, bucket, path] = match
  await supabase.storage.from(bucket).remove([path])
}

const AUTO_ALBUM_TITLE = 'Ảnh & Video Sản Phẩm'

async function getOrCreateAutoAlbum(): Promise<string> {
  const supabase = createClient()
  const { data: existing } = await supabase
    .from('media_albums')
    .select('id')
    .eq('title', AUTO_ALBUM_TITLE)
    .maybeSingle()
  if (existing?.id) return existing.id
  const { data: created } = await supabase
    .from('media_albums')
    .insert({ title: AUTO_ALBUM_TITLE, description: 'Ảnh & video tự động lưu khi tải lên từ quản lý sản phẩm', category: 'tonghop' })
    .select('id')
    .single()
  return created!.id
}

export async function saveUrlsToMediaLibrary(items: { url: string; type: 'image' | 'video' }[]) {
  if (!items.length) return
  const supabase = createClient()
  try {
    const albumId = await getOrCreateAutoAlbum()
    await supabase.from('media_items').insert(
      items.map((item, i) => ({ album_id: albumId, url: item.url, type: item.type, sort_order: i }))
    )
  } catch {
    // Không block luồng chính nếu lưu thư viện thất bại
  }
}
