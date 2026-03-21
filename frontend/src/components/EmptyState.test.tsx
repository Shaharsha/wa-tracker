import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('shows "All caught up" for unanswered tab', () => {
    render(<EmptyState tab="unanswered" />)
    expect(screen.getByText('All caught up')).toBeInTheDocument()
  })

  it('shows empty message for dismissed tab', () => {
    render(<EmptyState tab="dismissed" />)
    expect(screen.getByText('No skipped contacts')).toBeInTheDocument()
  })

  it('shows empty message for blocked tab', () => {
    render(<EmptyState tab="blocked" />)
    expect(screen.getByText('No blocked contacts')).toBeInTheDocument()
  })
})
