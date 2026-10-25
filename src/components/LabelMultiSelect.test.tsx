import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { RoleMultiSelect } from './LabelMultiSelect'

function Harness() {
  const [value, setValue] = useState<string[]>([])
  return (
    <RoleMultiSelect
      roleLabels={['Software engineer', 'Designer', 'Other']}
      value={value}
      onChange={setValue}
    />
  )
}

describe('RoleMultiSelect', () => {
  it('selects more than one role without a modifier key and counts them', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    expect(screen.getByText(/Select every role this project needs/i)).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Software engineer' }))
    await user.click(screen.getByRole('checkbox', { name: 'Designer' }))

    expect(screen.getByRole('checkbox', { name: 'Software engineer' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Designer' })).toBeChecked()
    expect(screen.getByText('2 selected')).toBeInTheDocument()
  })

  it('reveals a custom role when Other is checked', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('checkbox', { name: 'Other' }))
    const custom = screen.getByLabelText('Custom role')
    await user.type(custom, 'Mentor')
    expect(custom).toHaveValue('Mentor')
  })
})
