import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('shows "All caught up" for unanswered tab', () => {
    render(<EmptyState tab="unanswered" />)
    expect(screen.getByText('All caught up')).toBeInTheDocument()
    expect(screen.getByText(/No one's waiting/)).toBeInTheDocument()
  })

  it('shows "No dismissed contacts" for dismissed tab', () => {
    render(<EmptyState tab="dismissed" />)
    expect(screen.getByText('No dismissed contacts')).toBeInTheDocument()
  })
})
