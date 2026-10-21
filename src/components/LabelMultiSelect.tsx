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

  return (
    <div className="space-y-2 sm:col-span-2">
      <LabelMultiSelect
        id={id}
        label="Roles needed"
        options={choices}
        value={selected}
        disabled={disabled}
        onChange={(next) => emit(next, custom)}
      />
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
    </div>
  )
}
