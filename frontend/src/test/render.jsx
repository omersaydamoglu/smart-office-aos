// Tüm uygulamayı (yönlendirme, oturum, kabuk) verilen adreste açar.
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

export function renderApp(path = '/') {
  window.history.replaceState({}, '', path)
  const user = userEvent.setup()
  return { user, ...render(<App />) }
}
