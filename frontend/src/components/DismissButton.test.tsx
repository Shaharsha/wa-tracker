import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DismissButton } from './DismissButton'

describe('DismissButton', () => {
  it('shows Restore when dismissed', () => {
    render(
      <DismissButton isDismissed={true} onDismiss={vi.fn()} onUndismiss={vi.fn()} />
    )
    expect(screen.getByText('Restore')).toBeInTheDocument()
  })

  it('shows Dismiss when not dismissed', () => {
    const { container } = render(
      <DismissButton isDismissed={false} onDismiss={vi.fn()} onUndismiss={vi.fn()} />
    )
    expect(container.textContent).toContain('Dismiss')
  })

  it('calls onUndismiss when Restore clicked', () => {
    const onUndismiss = vi.fn()
    render(
      <DismissButton isDismissed={true} onDismiss={vi.fn()} onUndismiss={onUndismiss} />
    )
    fireEvent.click(screen.getByText('Restore'))
    expect(onUndismiss).toHaveBeenCalledOnce()
  })

  it('calls onDismiss when Dismiss clicked', () => {
    const onDismiss = vi.fn()
    render(
      <DismissButton isDismissed={false} onDismiss={onDismiss} onUndismiss={vi.fn()} />
    )
    fireEvent.click(screen.getByText('Dismiss'))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('stops event propagation on click', () => {
    const parentClick = vi.fn()
    const onDismiss = vi.fn()
    render(
      <div onClick={parentClick}>
        <DismissButton isDismissed={false} onDismiss={onDismiss} onUndismiss={vi.fn()} />
      </div>
    )
    fireEvent.click(screen.getByText('Dismiss'))
    expect(onDismiss).toHaveBeenCalledOnce()
    expect(parentClick).not.toHaveBeenCalled()
  })
})
