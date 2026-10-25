import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ProfileProjects } from './ProfileProjects'

describe('ProfileProjects', () => {
  it('heads the task list and uses plain status language', () => {
    render(
      <MemoryRouter>
        <ProfileProjects
          projects={[
            {
              project_id: 'p1',
              title: 'Studio site',
              status: 'active',
              visibility: 'public',
              tasks: [
                { id: 't1', title: 'Write the brief', status: 'pending' },
                { id: 't2', title: 'Revise the copy', status: 'corrections_requested' },
              ],
            },
            {
              project_id: 'p2',
              title: 'Private cohort',
              status: 'active',
              kind: 'accomplishment_summary',
              tasks: [{ id: 'hidden', title: 'Secret task', status: 'pending' }],
            },
          ]}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Tasks')).toBeInTheDocument()
    expect(screen.getByText('Not started')).toBeInTheDocument()
    expect(screen.getByText('Changes requested')).toBeInTheDocument()
    expect(screen.queryByText('Secret task')).not.toBeInTheDocument()
    expect(screen.queryByText('pending')).not.toBeInTheDocument()
  })
})
