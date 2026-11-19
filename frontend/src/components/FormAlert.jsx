// Form/pencere üstünde gösterilen hata ya da uyarı kutusu. message boşsa hiçbir şey çizmez.
export default function FormAlert({ message, tone = 'danger', children }) {
  if (!message && !children) return null
  return (
    <div className={`form-alert form-alert--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      {message && <p>{message}</p>}
      {children}
    </div>
  )
}
