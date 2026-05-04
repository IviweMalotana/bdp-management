interface Props {
  status: string
}

const COLOURS: Record<string, string> = {
  Draft:     'bg-gray-700 text-gray-300',
  Sent:      'bg-blue-900/50 text-blue-300 border border-blue-800',
  Paid:      'bg-green-900/50 text-green-300 border border-green-800',
  Overdue:   'bg-red-900/50 text-red-300 border border-red-800',
  Cancelled: 'bg-gray-800 text-gray-500',
}

export default function InvoiceStatusBadge({ status }: Props) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${COLOURS[status] ?? COLOURS.Draft}`}>
      {status}
    </span>
  )
}
