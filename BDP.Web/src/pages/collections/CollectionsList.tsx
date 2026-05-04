import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Layers, Edit, Trash2 } from 'lucide-react'
import type { Collection } from '../../types'
import { collections as collectionsApi } from '../../services/api'

export default function CollectionsList() {
  const navigate = useNavigate()
  const [data, setData] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    collectionsApi.getAll().then(setData).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete collection "${name}"?`)) return
    await collectionsApi.delete(id)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Collections</h1>
          <p className="text-sm text-gray-400 mt-0.5">{data.length} collections</p>
        </div>
        <button
          onClick={() => navigate('/collections/new')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium"
        >
          <Plus size={16} /> New Collection
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-center py-12">Loading…</p>
      ) : data.length === 0 ? (
        <div className="text-center py-16">
          <Layers size={40} className="mx-auto text-gray-700 mb-3" />
          <p className="text-gray-500">No collections yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.map((col) => (
            <div key={col.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors group">
              {/* Thumbnail */}
              <div className="aspect-video bg-gray-800 flex items-center justify-center">
                {col.imageUrl ? (
                  <img src={col.imageUrl} alt={col.name} className="w-full h-full object-cover" />
                ) : (
                  <Layers size={32} className="text-gray-600" />
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-white truncate">{col.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{col.productCount} products · /{col.slug}</p>
                {col.description && (
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">{col.description}</p>
                )}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => navigate(`/collections/${col.id}/edit`)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-xs transition-colors"
                  >
                    <Edit size={12} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(col.id, col.name)}
                    className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
