// Proposta comercial imprimível (PDF via impressão do navegador) com identidade Duarte.
// Renderiza uma folha A4 escondida; ao imprimir, só ela sai no papel.
import { QuoteRecord } from '@/types/erp'
import { formatCurrency, formatDate } from '@/lib/format'
import { createRoot } from 'react-dom/client'
import { createElement } from 'react'

const BRAND = {
  company: 'Duarte Ambientes Planejados',
  tagline: 'Marcenaria e móveis sob medida em MDF',
  city: 'Santa Maria — RS',
  warrantyDefault: '90 dias contra defeitos de fabricação',
}

export function QuoteProposal({
  quote,
  clientName,
  clientInfo,
}: {
  quote: QuoteRecord
  clientName: string
  clientInfo?: string
}) {
  const items = quote.items ?? []
  const num = (v: number | undefined) => formatCurrency(v ?? 0)
  return (
    <div
      style={{
        fontFamily: 'Georgia, "Times New Roman", serif',
        color: '#222',
        width: '210mm',
        minHeight: '297mm',
        padding: '18mm 16mm',
        background: '#fff',
        boxSizing: 'border-box',
      }}
    >
      {/* cabeçalho */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '2px solid #d4af37',
          paddingBottom: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, margin: 0, letterSpacing: 1 }}>{BRAND.company}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#666' }}>
            {BRAND.tagline} · {BRAND.city}
          </p>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11, color: '#666' }}>
          <p style={{ margin: 0 }}>Proposta nº {quote.id?.slice(0, 6)?.toUpperCase()}</p>
          <p style={{ margin: '2px 0 0' }}>
            Emitida em {formatDate(new Date().toISOString().slice(0, 10))}
          </p>
          <p style={{ margin: '2px 0 0', color: '#a16207' }}>Versão v{quote.version ?? 1}</p>
        </div>
      </div>

      {/* cliente e título */}
      <div style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>{quote.title}</h2>
        <p style={{ fontSize: 12, margin: '6px 0 0' }}>
          <strong>Cliente:</strong> {clientName}
          {clientInfo ? ` · ${clientInfo}` : ''}
        </p>
        {quote.description && (
          <p style={{ fontSize: 12, color: '#444', margin: '4px 0 0' }}>{quote.description}</p>
        )}
      </div>

      {/* especificações */}
      {(quote.environments || quote.dimensions || quote.materials) && (
        <div style={{ marginTop: 16, fontSize: 12 }}>
          <h3
            style={{
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: 2,
              color: '#a16207',
              margin: '0 0 6px',
            }}
          >
            Especificações
          </h3>
          {quote.environments && (
            <p style={{ margin: '3px 0' }}>
              <strong>Ambientes:</strong> {quote.environments}
            </p>
          )}
          {quote.dimensions && (
            <p style={{ margin: '3px 0' }}>
              <strong>Dimensões:</strong> {quote.dimensions}
            </p>
          )}
          {quote.materials && (
            <p style={{ margin: '3px 0' }}>
              <strong>Materiais:</strong> {quote.materials}
            </p>
          )}
        </div>
      )}

      {/* itens de custo */}
      {items.length > 0 && (
        <table style={{ width: '100%', marginTop: 16, borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>
              <th style={{ padding: '6px 4px' }}>Item</th>
              <th style={{ padding: '6px 4px', textAlign: 'center' }}>Qtd</th>
              <th style={{ padding: '6px 4px', textAlign: 'right' }}>Custo unit.</th>
              <th style={{ padding: '6px 4px', textAlign: 'right' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '6px 4px' }}>{it.description}</td>
                <td style={{ padding: '6px 4px', textAlign: 'center' }}>{it.quantity}</td>
                <td style={{ padding: '6px 4px', textAlign: 'right' }}>{num(it.unit_cost)}</td>
                <td style={{ padding: '6px 4px', textAlign: 'right' }}>
                  {num(it.quantity * it.unit_cost)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* valores */}
      <div style={{ marginTop: 16, marginLeft: 'auto', width: 260, fontSize: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
          <span>Custos totais</span>
          <span>{num(quote.total_cost)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
          <span>Margem aplicada</span>
          <span>{quote.margin_percent ?? 0}%</span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 6,
            padding: '8px',
            background: '#f7f1df',
            border: '1px solid #d4af37',
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          <span>Valor total</span>
          <span>{num(quote.final_price)}</span>
        </div>
      </div>

      {/* condições */}
      <div style={{ marginTop: 18, fontSize: 11, color: '#444' }}>
        {quote.payment_terms && (
          <p style={{ margin: '3px 0' }}>
            <strong>Condições de pagamento:</strong> {quote.payment_terms}
          </p>
        )}
        {quote.deadline_days ? (
          <p style={{ margin: '3px 0' }}>
            <strong>Prazo de entrega:</strong> até {quote.deadline_days} dias após a aprovação
          </p>
        ) : null}
        <p style={{ margin: '3px 0' }}>
          <strong>Garantia:</strong> {quote.warranty || BRAND.warrantyDefault}
        </p>
      </div>

      <p style={{ marginTop: 24, fontSize: 10, color: '#999', textAlign: 'center' }}>
        Proposta válida por 15 dias · Duarte Ambientes Planejados — Santa Maria/RS
      </p>
    </div>
  )
}

/** Abre a janela de impressão do navegador com a proposta isolada na folha. */
export async function printQuoteProposal(
  quote: QuoteRecord,
  clientName: string,
  clientInfo?: string,
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
    '<html><head><title>Proposta — Duarte Ambientes</title><style>@page { size: A4; margin: 0 } body { margin: 0 }' +
      'body > div { margin: 0 auto !important }' +
      '</style></head><body></body></html>',
  )
  doc.close()
  const container = doc.createElement('div')
  doc.body.appendChild(container)
  const root = createRoot(container)
  root.render(createElement(QuoteProposal, { quote, clientName, clientInfo }))
  // aguarda o render antes de imprimir
  await new Promise((r) => setTimeout(r, 300))
  frame.contentWindow?.focus()
  frame.contentWindow?.print()
  setTimeout(() => {
    root.unmount()
    frame.remove()
  }, 2000)
}
