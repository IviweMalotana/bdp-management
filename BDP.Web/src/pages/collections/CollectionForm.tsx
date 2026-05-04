import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, X, Plus } from 'lucide-react'
import type { Collection, Product } from '../../types'
import { collections as collectionsApi, products as productsApi } from '../../services/api'

const inp = 'w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500'

function toSlug(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function CollectionForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [collection, setCollection] = useState<Collection | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [slug, setSlug] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [metaKeywords, setMetaKeywords] = useState('')
  const [slugManual, setSlugManual] = useState(false)

  // Product management (edit only)
  const [products, setProducts] = useState<Collection['products']>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (isEdit) {
      collectionsApi.getById(Number(id)).then((c) => {
        setCollection(c)
        setName(c.name); setDescription(c.description); setSlug(c.slug)
        setImageUrl(c.imageUrl ?? ''); setMetaTitle(c.metaTitle)
        setMetaDescription(c.metaDescription); setMetaKeywords(c.metaKeywords)
        setProducts(c.products ?? [])
        setSlugManual(true)
      })
    }
    productsApi.getAll({ pageSize: 200 }).then((r) => setAllProducts(r.items ?? []))
  }, [id, isEdit])

  // Auto-slug from name
  useEffect(() => {
    if (!slugManual && name) setSlug(toSlug(name))
  }, [name, slugManual])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    const body = { name, description, slug, imageUrl: imageUrl || null, metaTitle, metaDescription, metaKeywords }
    try {
      if (isEdit) {
        await collectionsApi.update(Number(id), body)
      } else {
        await collectionsApi.create(body)
      }
      navigate('/collections')
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleAddProduct = async (productId: number) => {
    if (!id) return
    try {
      await collectionsApi.addProduct(Number(id), productId)
      const updated = await collectionsApi.getById(Number(id))
      setProducts(updated.products ?? [])
      setProductSearch('')
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to add product')
    }
  }

  const handleRemoveProduct = async (productId: number) => {
    if (!id) return
    await collectionsApi.removeProduct(Number(id), productId)
    setProducts((prev) => prev?.filter((p) => p.productId !== productId))
  }

  const filteredProducts = allProducts.filter(
    (p) => p.name.toLowerCase().includes(productSearch.toLowerCase()) &&
      !products?.some((cp) => cp.productId === p.id)
  )

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/collections')} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-bold text-white">{isEdit ? 'Edit Collection' : 'New Collection'}</h1>
      </div>

      {error && <div className="px-4 py-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Details</h2>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className={inp} placeholder="Serum Bottles" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Slug</label>
            <input
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugManual(true) }}
              className={inp}
              placeholder="serum-bottles"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${inp} resize-none`} placeholder="Collection description…" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Image URL</label>
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={inp} placeholder="https://…" />
          </div>
        </div>

        {/* SEO */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">SEO</h2>
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-xs text-gray-400">Meta Title</label>
              <span className={`text-xs ${metaTitle.length > 60 ? 'text-red-400' : 'text-gray-500'}`}>{metaTitle.length}/60</span>
            </div>
            <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className={inp} placeholder="SEO title (max 60 chars)" maxLength={80} />
          </div>
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-xs text-gray-400">Meta Description</label>
              <span className={`text-xs ${metaDescription.length > 155 ? 'text-red-400' : 'text-gray-500'}`}>{metaDescription.length}/155</span>
            </div>
            <textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} rows={2} className={`${inp} resize-none`} placeholder="SEO description (max 155 chars)" maxLength={200} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Meta Keywords</label>
            <input value={metaKeywords} onChange={(e) => setMetaKeywords(e.target.value)} className={inp} placeholder="serum bottles, wholesale, cosmetic packaging" />
          </div>
        </div>

        {/* Products section (edit only) */}
        {isEdit && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Products ({products?.length ?? 0})</h2>
              <button type="button" onClick={() => setAdding(!adding)} className="flex items-center gap-1 px-3 py-1 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 text-xs rounded-lg">
                <Plus size={12} /> Add Product
              </button>
            </div>

            {adding && (
              <div className="space-y-2">
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className={inp}
                  placeholder="Search products…"
                  autoFocus
                />
                {productSearch && (
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredProducts.slice(0, 10).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddProduct(p.id)}
                        className="w-full text-left px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-white transition-colors"
                      >
                        {p.name} <span className="text-xs text-gray-500">({p.category})</span>
                      </button>
                    ))}
                    {filteredProducts.length === 0 && <p className="text-xs text-gray-500 px-3 py-2">No products found</p>}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              {products?.map((cp) => (
                <div key={cp.productId} className="flex items-center justify-between px-3 py-2.5 bg-gray-800 rounded-lg">
                  <div>
                    <p className="text-sm text-white">{cp.name}</p>
                    <p className="text-xs text-gray-500">{cp.category} · {cp.variantCount} variants</p>
                  </div>
                  <button type="button" onClick={() => handleRemoveProduct(cp.productId)} className="p-1 text-gray-600 hover:text-red-400 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ))}
              {(!products || products.length === 0) && <p className="text-sm text-gray-500 text-center py-4">No products in collection</p>}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/collections')} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
            <Save size={15} />{saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Collection'}
          </button>
        </div>
      </form>
    </div>
  )
}
