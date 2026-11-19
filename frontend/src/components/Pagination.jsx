// Sayfalama: "Önceki / 1 2 3 … 9 / Sonraki" + sayfa başına kayıt seçimi.

const PAGE_SIZES = [10, 20, 50]

// Gösterilecek sayfa numaraları: ilk, son, mevcut ve iki yanı; aralar "…"
function pageNumbers(page, totalPages) {
  const pages = new Set([1, totalPages, page - 1, page, page + 1])
  const sorted = [...pages].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b)
  const result = []
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) result.push(`gap-${value}`)
    result.push(value)
  })
  return result
}

export default function Pagination({ pagination, onPageChange, onLimitChange }) {
  if (!pagination) return null
  const { page, limit, total, totalPages } = pagination
  const first = total === 0 ? 0 : (page - 1) * limit + 1
  const last = Math.min(page * limit, total)

  return (
    <div className="pagination">
      <p className="pagination__summary">
        {total === 0 ? 'Kayıt yok' : `${first}–${last} / toplam ${total} kayıt`}
      </p>

      <div className="pagination__controls">
        {onLimitChange && (
          <label className="pagination__size">
            <span>Sayfa başına</span>
            <select value={limit} onChange={(event) => onLimitChange(Number(event.target.value))}>
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
        )}

        {totalPages > 1 && (
          <nav className="pagination__pages" aria-label="Sayfalar">
            <button type="button" className="btn btn-secondary btn-small" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              Önceki
            </button>
            {pageNumbers(page, totalPages).map((value) =>
              typeof value === 'string' ? (
                <span key={value} className="pagination__gap" aria-hidden="true">…</span>
              ) : (
                <button
                  key={value}
                  type="button"
                  className={`btn btn-small ${value === page ? 'btn-primary' : 'btn-secondary'}`}
                  aria-current={value === page ? 'page' : undefined}
                  aria-label={`Sayfa ${value}`}
                  onClick={() => onPageChange(value)}
                >
                  {value}
                </button>
              ),
            )}
            <button type="button" className="btn btn-secondary btn-small" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
              Sonraki
            </button>
          </nav>
        )}
      </div>
    </div>
  )
}
