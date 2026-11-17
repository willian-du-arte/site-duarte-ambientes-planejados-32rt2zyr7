// Utilidades de exportação dos relatórios gerenciais (Etapa 4).
// CSV (Excel) via download de Blob; PDF via janela de impressão do navegador
// (mesmo mecanismo da proposta comercial em QuoteProposal).
import { createRoot } from 'react-dom/client'
import { createElement } from 'react'

export interface ReportTable {
  title: string
  columns: string[]
  rows: (string | number)[][]
}

function csvCell(v: string | number): string {
  const s = String(v ?? '')
  // ponto-e-vírgula é o separador que o Excel pt-BR entende; escapa aspas e quebras
  return `"${s.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`
}

/** Baixa as tabelas como CSV (abre direto no Excel). */
export function downloadCsv(filename: string, tables: ReportTable[]): void {
  const parts: string[] = []
  for (const t of tables) {
    parts.push(t.title.toUpperCase())
    parts.push(t.columns.map(csvCell).join(';'))
    for (const r of t.rows) parts.push(r.map(csvCell).join(';'))
    parts.push('')
  }
  const csv = '\uFEFF' + parts.join('\r\n') // BOM para o Excel respeitar acentuação
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Abre a janela de impressão com as tabelas isoladas numa folha A4
 * (o usuário escolhe "Salvar como PDF" — mesmo fluxo da proposta comercial).
 */
export async function printReport(
  title: string,
  subtitle: string,
  tables: ReportTable[],
): Promise<void> {
  const frame = document.createElement('iframe')
  frame.style.position = 'fixed'
  frame.style.right = '0'
  frame.style.bottom = '0'
  frame.style.width = '0'
  frame.style.height = '0'
  frame.style.border = '0'
  document.body.appendChild(frame)
  const doc = frame.contentDocument
  if (!doc) return
  doc.open()
  doc.write(
    '<html><head><title>' +
      title +
      '</title><style>' +
      '@page { size: A4; margin: 14mm } body { margin: 0; font-family: Georgia, serif; color: #222 }' +
      'h1 { font-size: 18px; margin: 0 } h2 { font-size: 13px; margin: 18px 0 6px; letter-spacing: 2px; text-transform: uppercase; color: #a16207 }' +
      'table { width: 100%; border-collapse: collapse; font-size: 11px }' +
      'th { text-align: left; border-bottom: 1px solid #ccc; padding: 5px 4px }' +
      'td { border-bottom: 1px solid #eee; padding: 5px 4px }' +
      '.num { text-align: right }' +
      '</style></head><body></body></html>',
  )
  doc.close()
  const container = doc.createElement('div')
  doc.body.appendChild(container)
  const root = createRoot(container)
  root.render(
    createElement(
      'div',
      null,
      createElement('h1', null, title),
      createElement('p', { style: { fontSize: 11, color: '#666', margin: '4px 0 0' } }, subtitle),
      ...tables.map((t) =>
        createElement(
          'div',
          { key: t.title },
          createElement('h2', null, t.title),
          createElement(
            'table',
            null,
            createElement(
              'thead',
              null,
              createElement(
                'tr',
                null,
                t.columns.map((c, i) =>
                  createElement('th', { key: i, className: i > 0 ? 'num' : undefined }, c),
                ),
              ),
            ),
          ),
          createElement(
            'tbody',
            null,
            t.rows.map((r, ri) =>
              createElement(
                'tr',
                { key: ri },
                r.map((cell, ci) =>
                  createElement(
                    'td',
                    { key: ci, className: ci > 0 ? 'num' : undefined },
                    String(cell),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  )
  await new Promise((r) => setTimeout(r, 300))
  frame.contentWindow?.focus()
  frame.contentWindow?.print()
  setTimeout(() => {
    root.unmount()
    frame.remove()
  }, 2000)
}
