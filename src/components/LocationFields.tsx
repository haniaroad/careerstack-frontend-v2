import { Input } from '@/components/Input'
import { Label } from '@/components/Label'
import { isUnitedStates } from '@/lib/taxonomies'

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm'

type LocationFieldsProps = {
  country: string
  stateRegion: string
  countries: string[]
  usStateAbbreviations: string[]
  onCountryChange: (value: string) => void
  onStateChange: (value: string) => void
  countryId?: string
  stateId?: string
  disabled?: boolean
  selectClassName?: string
}

function withCurrent(options: string[], current: string) {
  if (!current || options.includes(current)) return options
  return [current, ...options]
}

export function LocationFields({
  country,
  stateRegion,
  countries,
  usStateAbbreviations,
  onCountryChange,
  onStateChange,
  countryId = 'country',
  stateId = 'state_region',
  disabled = false,
  selectClassName: selectClass = selectClassName,
}: LocationFieldsProps) {
  const unitedStates = isUnitedStates(country)
  const countryOptions = withCurrent(countries, country)
  const stateOptions = withCurrent(usStateAbbreviations, stateRegion)

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={countryId}>Country</Label>
        <select
          id={countryId}
          className={selectClass}
          value={country}
          disabled={disabled}
          onChange={(event) => onCountryChange(event.target.value)}
        >
          <option value="">Select a country</option>
          {countryOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={stateId}>{unitedStates ? 'State' : 'State / region'}</Label>
        {unitedStates ? (
          <select
            id={stateId}
            className={selectClass}
            value={stateRegion}
            disabled={disabled}
            onChange={(event) => onStateChange(event.target.value)}
          >
            <option value="">Select a state</option>
            {stateOptions.map((abbreviation) => (
              <option key={abbreviation} value={abbreviation}>
                {abbreviation}
              </option>
            ))}
          </select>
        ) : (
          <Input
            id={stateId}
            value={stateRegion}
            disabled={disabled}
            onChange={(event) => onStateChange(event.target.value)}
          />
        )}
      </div>
    </>
  )
}
