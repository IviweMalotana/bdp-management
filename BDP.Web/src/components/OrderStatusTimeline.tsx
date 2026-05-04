import { Check } from 'lucide-react'

const STEPS = ['Draft', 'Confirmed', 'InProduction', 'Shipped', 'Delivered']
const LABELS: Record<string, string> = {
  Draft: 'Draft',
  Confirmed: 'Confirmed',
  InProduction: 'In Production',
  Shipped: 'Shipped',
  Delivered: 'Delivered',
}

interface Props {
  currentStatus: string
}

export default function OrderStatusTimeline({ currentStatus }: Props) {
  const currentIndex = STEPS.indexOf(currentStatus)

  return (
    <div className="flex items-center w-full">
      {STEPS.map((step, i) => {
        const done = i < currentIndex
        const active = i === currentIndex

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            {/* Node */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  done
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : active
                    ? 'bg-indigo-600 border-indigo-400 text-white ring-2 ring-indigo-400/30'
                    : 'bg-gray-800 border-gray-700 text-gray-500'
                }`}
              >
                {done ? <Check size={14} /> : <span>{i + 1}</span>}
              </div>
              <span
                className={`mt-1.5 text-xs font-medium whitespace-nowrap ${
                  active ? 'text-indigo-400' : done ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                {LABELS[step]}
              </span>
            </div>
            {/* Connector */}
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 mb-5 transition-colors ${
                  done ? 'bg-indigo-600' : 'bg-gray-700'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
