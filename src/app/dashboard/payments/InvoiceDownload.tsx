'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Loader2 } from 'lucide-react'

interface Props {
  invoices: { file_type: string; file_path: string }[]
}

export default function InvoiceDownload({ invoices }: Props) {
  const supabase = createClient()
  const [downloading, setDownloading] = useState<string | null>(null)

  async function download(filePath: string, fileType: string) {
    setDownloading(fileType)
    const { data } = await supabase.storage.from('invoices').createSignedUrl(filePath, 60)
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
    }
    setDownloading(null)
  }

  if (invoices.length === 0) return null

  return (
    <div className="flex gap-1 mt-1">
      {invoices.map(inv => (
        <button
          key={inv.file_type}
          onClick={() => download(inv.file_path, inv.file_type)}
          disabled={downloading === inv.file_type}
          className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded transition-all"
          style={{
            backgroundColor: inv.file_type === 'pdf' ? '#dc262615' : '#16a34a15',
            color: inv.file_type === 'pdf' ? '#dc2626' : '#16a34a',
          }}
        >
          {downloading === inv.file_type ? (
            <Loader2 size={9} className="animate-spin" />
          ) : (
            <FileText size={9} />
          )}
          {inv.file_type.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
