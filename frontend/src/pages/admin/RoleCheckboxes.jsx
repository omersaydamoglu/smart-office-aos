// Çoklu rol seçimi (en az bir rol zorunlu). Yeni kullanıcı formu ve rol düzenleme penceresinde kullanılır.
import { ALL_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from '../../auth/roles'

export default function RoleCheckboxes({ value, onChange, error, disabled = false }) {
  function toggle(role) {
    onChange(value.includes(role) ? value.filter((item) => item !== role) : [...value, role])
  }

  return (
    <fieldset className="checkbox-group" aria-describedby={error ? 'roles-error' : undefined}>
      <legend>
        Roller <span className="required" aria-hidden="true">*</span>
      </legend>
      {ALL_ROLES.map((role) => (
        <label key={role} className="checkbox-option">
          <input
            type="checkbox"
            checked={value.includes(role)}
            onChange={() => toggle(role)}
            disabled={disabled}
          />
          <span>
            <span className="checkbox-option__label">{ROLE_LABELS[role]}</span>
            <span className="checkbox-option__hint">{ROLE_DESCRIPTIONS[role]}</span>
          </span>
        </label>
      ))}
      {error && <p id="roles-error" className="field-error">{error}</p>}
    </fieldset>
  )
}
