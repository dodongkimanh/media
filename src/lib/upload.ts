import { createClient } from '@/lib/supabase/client'

export async function uploadFile(
  file: File,
  bucket: 'products' | 'media' | 'articles',
  folder = ''
): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop()
  const name = `${folder ? folder + '/' : ''}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
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
