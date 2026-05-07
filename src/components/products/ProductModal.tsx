'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadFiles } from '@/lib/upload'
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
    setUploadProgress('Đang tải ảnh...')
    const supabase = createClient()

    const [uploadedImgs, uploadedVids, uploadedFb, uploadedRel] = await Promise.all([
      newImgs.length ? uploadFiles(newImgs, 'products', 'images') : Promise.resolve([]),
      newVids.length ? uploadFiles(newVids, 'products', 'videos') : Promise.resolve([]),
      newFb.length ? uploadFiles(newFb, 'products', 'feedback') : Promise.resolve([]),
      newRel.length ? uploadFiles(newRel, 'products', 'related') : Promise.resolve([]),
    ])

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
      await supabase.from('products').update(payload).eq('id', product.id)
      await supabase.from('product_specs').delete().eq('product_id', product.id)
      if (specs.length) {
        await supabase.from('product_specs').insert(
          specs.filter(s => s.spec_name).map((s, i) => ({ ...s, product_id: product.id, sort_order: i }))
        )
      }
    } else {
      const { data: newProd } = await supabase.from('products').insert(payload).select().single()
      if (newProd && specs.length) {
        await supabase.from('product_specs').insert(
          specs.filter(s => s.spec_name).map((s, i) => ({ ...s, product_id: newProd.id, sort_order: i }))
        )
      }
    }

    setSaving(false)
    setUploadProgress('')
    onSaved()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={product ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm'}
      footer={
        <>
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
            {['Tên', 'Cao', 'Nặng', 'Giá', ''].map((h, i) => (
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

      {/* Images */}
      <FileUploadField
        label="Ảnh sản phẩm"
        accept="image/*"
        existing={existingImgs}
        onRemoveExisting={i => setExistingImgs(v => v.filter((_, idx) => idx !== i))}
        onAdd={files => setNewImgs(v => [...v, ...Array.from(files)])}
        newFiles={newImgs}
        onRemoveNew={i => setNewImgs(v => v.filter((_, idx) => idx !== i))}
        isImage
      />

      {/* Videos */}
      <FileUploadField
        label="Video sản phẩm"
        accept="video/*"
        existing={existingVids}
        onRemoveExisting={i => setExistingVids(v => v.filter((_, idx) => idx !== i))}
        onAdd={files => setNewVids(v => [...v, ...Array.from(files)])}
        newFiles={newVids}
        onRemoveNew={i => setNewVids(v => v.filter((_, idx) => idx !== i))}
      />

      {/* Feedback */}
      <FileUploadField
        label="Ảnh / Video Feedback khách hàng"
        accept="image/*,video/*"
        existing={existingFb}
        onRemoveExisting={i => setExistingFb(v => v.filter((_, idx) => idx !== i))}
        onAdd={files => setNewFb(v => [...v, ...Array.from(files)])}
        newFiles={newFb}
        onRemoveNew={i => setNewFb(v => v.filter((_, idx) => idx !== i))}
        isImage
      />

      {/* Related */}
      <FileUploadField
        label="Ảnh sản phẩm cùng loại tham khảo"
        accept="image/*,video/*"
        existing={existingRel}
        onRemoveExisting={i => setExistingRel(v => v.filter((_, idx) => idx !== i))}
        onAdd={files => setNewRel(v => [...v, ...Array.from(files)])}
        newFiles={newRel}
        onRemoveNew={i => setNewRel(v => v.filter((_, idx) => idx !== i))}
        isImage
      />
    </Modal>
  )
}

function FileUploadField({ label, accept, existing, onRemoveExisting, onAdd, newFiles, onRemoveNew, isImage }: {
  label: string; accept: string; existing: string[]
  onRemoveExisting: (i: number) => void
  onAdd: (f: FileList) => void
  newFiles: File[]; onRemoveNew: (i: number) => void
  isImage?: boolean
}) {
  return (
    <div className="fg">
      <label>{label}</label>
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
