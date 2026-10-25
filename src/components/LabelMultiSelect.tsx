import { useState } from 'react'
import { optionsWithLegacy } from '@/lib/taxonomies'

const selectClassName =
  'min-h-32 w-full rounded-md border border-input bg-canvas px-3 py-2 text-sm text-ink'

type LabelMultiSelectProps = {
  id: string
  label: string
  options: string[]
  value: string[]
  onChange: (value: string[]) => void
  disabled?: boolean
}

export function LabelMultiSelect({
  id,
  label,
  options,
  value,
  onChange,
  disabled = false,
}: LabelMultiSelectProps) {
  const choices = optionsWithLegacy(options, value)

  return (
    <label className="block space-y-1" htmlFor={id}>
      <span className="text-sm font-medium text-ink">{label}</span>
      <select
        id={id}
        multiple
        className={selectClassName}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          onChange(Array.from(event.target.selectedOptions, (option) => option.value))
        }}
      >
        {choices.map((choice) => (
          <option key={choice} value={choice}>
            {choice}
          </option>
        ))}
      </select>
    </label>
  )
}

type RoleMultiSelectProps = {
  id?: string
  roleLabels: string[]
  value: string[]
  onChange: (value: string[]) => void
  disabled?: boolean
}

export function RoleMultiSelect({
  id = 'roles_needed',
  roleLabels,
  value,
  onChange,
  disabled = false,
}: RoleMultiSelectProps) {
  const [custom, setCustom] = useState('')
  const trimmedCustom = custom.trim()
  const known = new Set(roleLabels)
  const legacy = value.filter((role) => role !== 'Other' && !known.has(role) && role !== trimmedCustom)
  const choices = optionsWithLegacy(roleLabels, legacy)
  const selected = value.filter((role) => choices.includes(role))
  const otherSelected = selected.includes('Other')

  function emit(nextSelected: string[], nextCustom: string) {
    const trimmed = nextCustom.trim()
    const next = [...nextSelected]
    if (next.includes('Other') && trimmed && !next.includes(trimmed)) next.push(trimmed)
    onChange(next)
  }

  function toggle(choice: string) {
    const next = selected.includes(choice)
      ? selected.filter((role) => role !== choice)
      : [...selected, choice]
    emit(next, custom)
  }

  const selectedCount = selected.length

  return (
    <fieldset className="space-y-2 sm:col-span-2" disabled={disabled}>
      <legend className="text-sm font-medium text-ink">Roles needed</legend>
      <p id={`${id}-hint`} className="text-sm text-ink-muted">
        Select every role this project needs. You can choose more than one.
      </p>
      <div className="grid gap-2 sm:grid-cols-2" aria-describedby={`${id}-hint`}>
        {choices.map((choice) => {
          const checked = selected.includes(choice)
          return (
            <label
              key={choice}
              className="flex items-start gap-2 rounded-md border border-input bg-canvas px-3 py-2 text-sm text-ink"
            >
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                checked={checked}
                onChange={() => toggle(choice)}
              />
              <span>{choice}</span>
            </label>
          )
        })}
      </div>
      <p className="text-sm text-ink-muted">
        {selectedCount === 0 ? 'None selected' : `${selectedCount} selected`}
      </p>
      {otherSelected ? (
        <label className="block space-y-1" htmlFor={`${id}_custom`}>
          <span className="text-sm font-medium text-ink">Custom role</span>
          <input
            id={`${id}_custom`}
            maxLength={80}
            className="w-full rounded-md border border-input bg-canvas px-3 py-2 text-ink"
            value={custom}
            disabled={disabled}
            onChange={(event) => {
              setCustom(event.target.value)
              emit(selected, event.target.value)
            }}
          />
        </label>
      ) : null}
    </fieldset>
  )
}
