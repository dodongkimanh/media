'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadFiles, saveUrlsToMediaLibrary } from '@/lib/upload'
import { Modal } from '@/components/ui/Modal'
import type { Product, ProductSpec, Category } from '@/lib/types'

interface ProductModalProps {
  product: Product | null
  catId?: string
  onClose: () => void
  onSaved: () => void
}

const emptySpec = (): ProductSpec => ({ spec_name: '', height: '', weight: '', price: '' })

export function ProductModal({ product, catId, onClose, onSaved }: ProductModalProps) {
  const [name, setName] = useState(product?.name ?? '')
  const [sku, setSku] = useState(product?.sku ?? '')
  const [categoryId, setCategoryId] = useState(product?.category_id ?? catId ?? '')
  const [unit, setUnit] = useState(product?.unit ?? '')
  const [priceListed, setPriceListed] = useState(product?.price_listed ?? 0)
  const [disc, setDisc] = useState(product?.discount_pct ?? 0)
  const [status, setStatus] = useState<'active' | 'draft' | 'out'>(product?.status ?? 'active')
  const [desc, setDesc] = useState(product?.description ?? '')
  const [specs, setSpecs] = useState<ProductSpec[]>(product?.product_specs?.length ? product.product_specs : [])
  const [existingImgs, setExistingImgs] = useState<string[]>(product?.images ?? [])
  const [existingVids, setExistingVids] = useState<string[]>(product?.videos ?? [])
  const [existingFb, setExistingFb] = useState<string[]>(product?.feedback_media ?? [])
  const [existingRel, setExistingRel] = useState<string[]>(product?.related_media ?? [])
  const [newImgs, setNewImgs] = useState<File[]>([])
  const [newVids, setNewVids] = useState<File[]>([])
  const [newFb, setNewFb] = useState<File[]>([])
  const [newRel, setNewRel] = useState<File[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [saveError, setSaveError] = useState('')
  const [libPickerField, setLibPickerField] = useState<'images' | 'feedback' | 'related' | null>(null)

  useEffect(() => {
    createClient().from('categories').select('*').order('sort_order').then(({ data }) => setCategories(data ?? []))
  }, [])

  const finalPrice = Math.round(priceListed * (1 - disc / 100))

  function addSpecRow() { setSpecs(s => [...s, emptySpec()]) }
  function removeSpec(i: number) { setSpecs(s => s.filter((_, idx) => idx !== i)) }
  function updateSpec(i: number, field: keyof ProductSpec, val: string) {
    setSpecs(s => s.map((sp, idx) => idx === i ? { ...sp, [field]: val } : sp))
  }

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    setSaveError('')

    try {
      const supabase = createClient()

      setUploadProgress('Đang tải ảnh...')
      const [uploadedImgs, uploadedVids, uploadedFb, uploadedRel] = await Promise.all([
        newImgs.length ? uploadFiles(newImgs, 'products', 'images').catch(() => []) : Promise.resolve([]),
        newVids.length ? uploadFiles(newVids, 'products', 'videos').catch(() => []) : Promise.resolve([]),
        newFb.length ? uploadFiles(newFb, 'products', 'feedback').catch(() => []) : Promise.resolve([]),
        newRel.length ? uploadFiles(newRel, 'products', 'related').catch(() => []) : Promise.resolve([]),
      ])


      const toLibrary = [
        ...uploadedImgs.map(url => ({ url, type: 'image' as const })),
        ...uploadedVids.map(url => ({ url, type: 'video' as const })),
        ...uploadedFb.map((url, i) => ({ url, type: newFb[i]?.type.startsWith('video/') ? 'video' as const : 'image' as const })),
        ...uploadedRel.map((url, i) => ({ url, type: newRel[i]?.type.startsWith('video/') ? 'video' as const : 'image' as const })),
      ]
      if (toLibrary.length) saveUrlsToMediaLibrary(toLibrary)

      const images = [...existingImgs, ...uploadedImgs]
      const videos = [...existingVids, ...uploadedVids]
      const feedback_media = [...existingFb, ...uploadedFb]
      const related_media = [...existingRel, ...uploadedRel]

      setUploadProgress('Đang lưu...')

      const payload = {
        name: name.trim(), sku, category_id: categoryId || null, unit,
        price_listed: priceListed, discount_pct: disc, status, description: desc,
        images, videos, feedback_media, related_media, updated_at: new Date().toISOString()
      }

      if (product) {
        const { error } = await supabase.from('products').update(payload).eq('id', product.id)
        if (error) throw error
        await supabase.from('product_specs').delete().eq('product_id', product.id)
        const filteredSpecs = specs.filter(s => s.spec_name)
        if (filteredSpecs.length) {
          await supabase.from('product_specs').insert(
            filteredSpecs.map((s, i) => ({ ...s, product_id: product.id, sort_order: i }))
          )
        }
      } else {
        const { data: newProd, error } = await supabase.from('products').insert(payload).select().single()
        if (error) throw error
        const filteredSpecs = specs.filter(s => s.spec_name)
        if (newProd && filteredSpecs.length) {
          await supabase.from('product_specs').insert(
            filteredSpecs.map((s, i) => ({ ...s, product_id: newProd.id, sort_order: i }))
          )
        }
      }

      setSaving(false)
      setUploadProgress('')
      onSaved()
    } catch (err: unknown) {
      setSaving(false)
      setUploadProgress('')
      const raw = err as Record<string, unknown>
      const msg = raw?.message as string
        || raw?.error_description as string
        || (err instanceof Error ? err.message : null)
        || 'Lỗi khi lưu. Vui lòng thử lại.'
      if (msg.includes('fetch') || msg.includes('URL') || msg.includes('supabase')) {
        setSaveError('Chưa kết nối Supabase. Vui lòng cấu hình .env.local trước khi lưu dữ liệu thật.')
      } else if (msg.includes('row-level security') || msg.includes('permission')) {
        setSaveError('Không có quyền thực hiện thao tác này. Vui lòng liên hệ admin.')
      } else {
        setSaveError(msg)
      }
    }
  }

  function onLibraryPick(urls: string[]) {
    if (libPickerField === 'images') setExistingImgs(v => [...v, ...urls.filter(u => !v.includes(u))])
    else if (libPickerField === 'feedback') setExistingFb(v => [...v, ...urls.filter(u => !v.includes(u))])
    else if (libPickerField === 'related') setExistingRel(v => [...v, ...urls.filter(u => !v.includes(u))])
    setLibPickerField(null)
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={product ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm'}
        confirmClose={!saving}
        footer={
          <>
            {saveError && (
              <div style={{ flex: 1, fontSize: 12, color: 'var(--red)', background: '#FEF0F0', border: '1px solid #F7C1C1', borderRadius: 8, padding: '.45rem .8rem', marginRight: '.5rem' }}>
                {saveError}
              </div>
            )}
            <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
            <button className="btn btn-primary" onClick={save} disabled={saving || !name.trim()}>
              {saving ? (uploadProgress || 'Đang lưu...') : 'Lưu sản phẩm'}
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.65rem' }}>
          <div className="fg" style={{ gridColumn: '1/-1' }}>
            <label>Tên sản phẩm *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nhập tên sản phẩm" />
          </div>
          <div className="fg">
            <label>Mã (SKU)</label>
            <input value={sku} onChange={e => setSku(e.target.value)} placeholder="AT-001" />
          </div>
          <div className="fg">
            <label>Danh mục</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="">— Chọn danh mục —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="fg">
            <label>Đơn vị tính</label>
            <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="Cái, Bộ..." />
          </div>
          <div className="fg">
            <label>Trạng thái</label>
            <select value={status} onChange={e => setStatus(e.target.value as typeof status)}>
              <option value="active">Đang bán</option>
              <option value="draft">Nháp</option>
              <option value="out">Hết hàng</option>
            </select>
          </div>
          <div className="fg">
            <label>Giá niêm yết (đ)</label>
            <input type="number" value={priceListed || ''} onChange={e => setPriceListed(+e.target.value)} placeholder="350000" />
          </div>
          <div className="fg">
            <label>Giảm giá (%)</label>
            <input type="number" value={disc || ''} min={0} max={100} onChange={e => setDisc(+e.target.value)} placeholder="0" />
          </div>
          {priceListed > 0 && (
            <div className="fg" style={{ gridColumn: '1/-1' }}>
              <label>Giá bán sau giảm</label>
              <div style={{ background: 'var(--gl)', border: '1px solid var(--bd)', borderRadius: 'var(--r)', padding: '.55rem .85rem', fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>
                {new Intl.NumberFormat('vi-VN').format(finalPrice)}đ
              </div>
            </div>
          )}
          <div className="fg" style={{ gridColumn: '1/-1' }}>
            <label>Mô tả</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Mô tả chi tiết..." />
          </div>
        </div>

        {/* Specs */}
        <div className="fg">
          <label>Thông số kỹ thuật</label>
          {specs.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1.2fr 32px', gap: '.4rem', marginBottom: '.3rem' }}>
              {['Tên sản phẩm', 'Cao', 'Nặng', 'Giá tiền', ''].map((h, i) => (
                <span key={i} style={{ fontSize: 11, fontWeight: 600, color: 'var(--mu)', padding: '0 .2rem' }}>{h}</span>
              ))}
            </div>
          )}
          {specs.map((s, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1.2fr 32px', gap: '.4rem', marginBottom: '.4rem' }}>
              {(['spec_name', 'height', 'weight', 'price'] as (keyof ProductSpec)[]).map(f => (
                <input key={f} value={s[f] as string} onChange={e => updateSpec(i, f, e.target.value)}
                  style={{ border: '1px solid var(--bd)', borderRadius: 8, padding: '.5rem .65rem', fontFamily: 'inherit', fontSize: 13, outline: 'none' }}
                />
              ))}
              <button className="btn-icon danger" onClick={() => removeSpec(i)} style={{ fontSize: 14, height: 'auto' }}>×</button>
            </div>
          ))}
          <button className="btn btn-secondary btn-sm btn-full" onClick={addSpecRow} style={{ marginTop: '.25rem' }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 2v10M2 7h10"/></svg>
            Thêm thông số
          </button>
        </div>

        <FileUploadField
          label="Ảnh sản phẩm"
          accept="image/*"
          existing={existingImgs}
          onRemoveExisting={i => setExistingImgs(v => v.filter((_, idx) => idx !== i))}
          onAdd={files => setNewImgs(v => [...v, ...Array.from(files)])}
          newFiles={newImgs}
          onRemoveNew={i => setNewImgs(v => v.filter((_, idx) => idx !== i))}
          isImage
          onLibrary={() => setLibPickerField('images')}
        />

        <FileUploadField
          label="Video sản phẩm"
          accept="video/*"
          existing={existingVids}
          onRemoveExisting={i => setExistingVids(v => v.filter((_, idx) => idx !== i))}
          onAdd={files => setNewVids(v => [...v, ...Array.from(files)])}
          newFiles={newVids}
          onRemoveNew={i => setNewVids(v => v.filter((_, idx) => idx !== i))}
        />

        <FileUploadField
          label="Ảnh / Video Feedback khách hàng"
          accept="image/*,video/*"
          existing={existingFb}
          onRemoveExisting={i => setExistingFb(v => v.filter((_, idx) => idx !== i))}
          onAdd={files => setNewFb(v => [...v, ...Array.from(files)])}
          newFiles={newFb}
          onRemoveNew={i => setNewFb(v => v.filter((_, idx) => idx !== i))}
          isImage
          onLibrary={() => setLibPickerField('feedback')}
        />

        <FileUploadField
          label="Ảnh sản phẩm cùng loại tham khảo"
          accept="image/*,video/*"
          existing={existingRel}
          onRemoveExisting={i => setExistingRel(v => v.filter((_, idx) => idx !== i))}
          onAdd={files => setNewRel(v => [...v, ...Array.from(files)])}
          newFiles={newRel}
          onRemoveNew={i => setNewRel(v => v.filter((_, idx) => idx !== i))}
          isImage
          onLibrary={() => setLibPickerField('related')}
        />
      </Modal>

      {libPickerField && (
        <MediaLibraryPicker
          onConfirm={onLibraryPick}
          onClose={() => setLibPickerField(null)}
        />
      )}
    </>
  )
}

function FileUploadField({ label, accept, existing, onRemoveExisting, onAdd, newFiles, onRemoveNew, isImage, onLibrary }: {
  label: string; accept: string; existing: string[]
  onRemoveExisting: (i: number) => void
  onAdd: (f: FileList) => void
  newFiles: File[]; onRemoveNew: (i: number) => void
  isImage?: boolean
  onLibrary?: () => void
}) {
  return (
    <div className="fg">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.35rem' }}>
        <label style={{ margin: 0 }}>{label}</label>
        {onLibrary && (
          <button type="button" onClick={onLibrary}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', border: '1px solid var(--green)', borderRadius: 6, padding: '.18rem .55rem', fontSize: 11.5, fontWeight: 600, color: 'var(--green)', background: 'var(--gl)', cursor: 'pointer' }}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>
            Chọn từ Thư Viện
          </button>
        )}
      </div>
      <div className="upload-zone">
        <input type="file" accept={accept} multiple onChange={e => e.target.files && onAdd(e.target.files)} />
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--mu)" strokeWidth="1.5">
          {isImage
            ? <><path d="M4 16l4-4 4 4 4-6 4 6"/><rect x="3" y="3" width="18" height="18" rx="2"/></>
            : <polygon points="5,3 19,12 5,21"/>
          }
        </svg>
        <p>Click hoặc kéo thả file</p>
      </div>
      {(existing.length > 0 || newFiles.length > 0) && (
        <div className="preview-grid">
          {existing.map((url, i) => {
            const isVid = /\.(mp4|mov|webm)$/i.test(url)
            return (
              <div key={i} className="preview-item">
                {isVid ? <video src={url} /> : <img src={url} alt="" />}
                <button className="preview-remove" onClick={() => onRemoveExisting(i)}>×</button>
              </div>
            )
          })}
          {newFiles.map((f, i) => (
            <div key={`new-${i}`} className="preview-item">
              <img src={URL.createObjectURL(f)} alt="" />
              <button className="preview-remove" onClick={() => onRemoveNew(i)}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MediaLibraryPicker({ onConfirm, onClose }: {
  onConfirm: (urls: string[]) => void
  onClose: () => void
}) {
  const [items, setItems] = useState<{ id: string; url: string; type: string | null; caption: string | null }[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    createClient()
      .from('media_items')
      .select('id, url, type, caption')
      .order('created_at', { ascending: false })
      .limit(300)
      .then(({ data }) => { setItems(data ?? []); setLoading(false) })
  }, [])

  function toggle(url: string) {
    setSelected(prev => {
      const s = new Set(prev)
      if (s.has(url)) s.delete(url); else s.add(url)
      return s
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Chọn ảnh/video từ Thư Viện${selected.size ? ` (${selected.size} đã chọn)` : ''}`}
      maxWidth={620}
      scrollable
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
          <button className="btn btn-primary" onClick={() => onConfirm(Array.from(selected))} disabled={selected.size === 0}>
            Thêm {selected.size || ''} file vào đây
          </button>
        </>
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--mu)', fontSize: 13 }}>Đang tải thư viện...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--mu)', fontSize: 13 }}>
          Thư viện chưa có ảnh/video nào. Hãy tải lên trong mục Ảnh Video Tư Liệu trước.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: '.65rem' }}>
            Click để chọn/bỏ chọn. File đã chọn có viền xanh.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(88px,1fr))', gap: '.45rem' }}>
            {items.map(it => {
              const isVid = it.type === 'video' || /\.(mp4|mov|webm|avi)$/i.test(it.url)
              return (
                <div key={it.id} onClick={() => toggle(it.url)}
                  style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--r)', overflow: 'hidden', cursor: 'pointer', border: selected.has(it.url) ? '2.5px solid var(--green)' : '2.5px solid transparent', background: 'var(--bg)', transition: 'border-color .12s' }}>
                  {isVid
                    ? <video src={it.url} preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    : <img src={it.url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt={it.caption ?? ''} />
                  }
                  {isVid && (
                    <span style={{ position: 'absolute', bottom: 3, left: 3, background: 'rgba(0,0,0,.62)', borderRadius: 4, display: 'flex', alignItems: 'center', padding: '2px 4px' }}>
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="white"><polygon points="4,2 14,8 4,14"/></svg>
                    </span>
                  )}
                  {selected.has(it.url) && (
                    <div style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, background: 'var(--green)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M2 5l2.5 2.5L8 3"/></svg>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </Modal>
  )
}
