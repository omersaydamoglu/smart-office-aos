// Kişi adıyla ilgili küçük yardımcılar (kabuk, tablolar ve listeler ortak kullanır).

export function displayName(user) {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ')
  return fullName || user?.email || 'Kullanıcı'
}

// "Ayşe Yılmaz" -> "AY" (Türkçe büyük harf kuralıyla: "i" -> "İ")
export function initials(user) {
  const name = displayName(user)
  const parts = name.includes('@') ? [name] : name.split(/\s+/)
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase('tr-TR'))
    .join('')
}
