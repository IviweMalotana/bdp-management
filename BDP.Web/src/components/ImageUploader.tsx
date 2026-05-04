import { useRef, useState, useCallback } from 'react'
import { Upload, X, Star } from 'lucide-react'
import type { ProductImage } from '../types'
import { products as productApi } from '../services/api'

interface Props {
  productId: number
  existingImages: ProductImage[]
  onUpdate: (images: ProductImage[]) => void
}

export default function ImageUploader({ productId, existingImages, onUpdate }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return
      setUploading(true)
      setError('')
      const updated = [...existingImages]

      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop()?.toLowerCase()
        if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext ?? '')) {
          setError('Only jpg, png, webp files are accepted.')
          continue
        }
        const fd = new FormData()
        fd.append('file', file)
        fd.append('altText', file.name.replace(/\.[^.]+$/, ''))
        fd.append('isPrimary', updated.length === 0 ? 'true' : 'false')
        try {
          const img = await productApi.uploadImage(productId, fd)
          updated.push(img)
        } catch {
          setError(`Failed to upload ${file.name}`)
        }
      }

      onUpdate(updated)
      setUploading(false)
    },
    [existingImages, onUpdate, productId],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  const handleDelete = async (img: ProductImage) => {
    try {
      await productApi.deleteImage(productId, img.id)
      onUpdate(existingImages.filter((i) => i.id !== img.id))
    } catch {
      setError('Failed to delete image.')
    }
  }

  const handleSetPrimary = async (img: ProductImage) => {
    const fd = new FormData()
    fd.append('file', new Blob(), img.url) // placeholder — backend handles reorder
    // For now optimistically update UI; primary is set at upload time
    const updated = existingImages.map((i) => ({ ...i, isPrimary: i.id === img.id }))
    onUpdate(updated)
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors group"
      >
        <Upload size={24} className="mx-auto text-gray-500 group-hover:text-indigo-400 mb-2" />
        <p className="text-sm text-gray-400">
          {uploading ? 'Uploading…' : 'Drag & drop images or click to browse'}
        </p>
        <p className="text-xs text-gray-600 mt-1">JPG, PNG, WEBP accepted</p>
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Preview grid */}
      {existingImages.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {existingImages
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((img) => (
              <div key={img.id} className="relative group rounded-lg overflow-hidden border border-gray-700 bg-gray-800">
                <img
                  src={img.url}
                  alt={img.altText}
                  className="w-full aspect-square object-cover"
                />
                {img.isPrimary && (
                  <div className="absolute top-1 left-1 bg-indigo-600 rounded px-1.5 py-0.5 text-xs text-white font-medium flex items-center gap-1">
                    <Star size={10} fill="currentColor" /> Primary
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {!img.isPrimary && (
                    <button
                      onClick={() => handleSetPrimary(img)}
                      className="p-1.5 bg-indigo-600 rounded-lg hover:bg-indigo-500"
                      title="Set as primary"
                    >
                      <Star size={14} className="text-white" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(img)}
                    className="p-1.5 bg-red-600 rounded-lg hover:bg-red-500"
                    title="Delete"
                  >
                    <X size={14} className="text-white" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
