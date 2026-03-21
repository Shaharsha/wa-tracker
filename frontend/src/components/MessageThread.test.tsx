import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MessageThread } from './MessageThread'
import type { Message } from '../types'

const mockMessages: Message[] = [
  { id: '1', chat_id: '123@c.us', from_me: false, body: 'Hello there', timestamp: 1711036800, message_type: 'chat' },
  { id: '2', chat_id: '123@c.us', from_me: true, body: 'Hi back!', timestamp: 1711036860, message_type: 'chat' },
]

describe('MessageThread', () => {
  it('shows loading state', () => {
    render(<MessageThread messages={[]} loading={true} />)
    expect(screen.getByText('Loading messages...')).toBeInTheDocument()
  })

  it('shows empty state when no messages', () => {
    render(<MessageThread messages={[]} loading={false} />)
    expect(screen.getByText('No messages found')).toBeInTheDocument()
  })

  it('renders messages', () => {
    render(<MessageThread messages={mockMessages} loading={false} />)
    expect(screen.getByText('Hello there')).toBeInTheDocument()
    expect(screen.getByText('Hi back!')).toBeInTheDocument()
  })

  it('shows message type when body is empty', () => {
    const msgs: Message[] = [
      { id: '1', chat_id: '123@c.us', from_me: false, body: '', timestamp: 1000, message_type: 'image' },
    ]
    render(<MessageThread messages={msgs} loading={false} />)
    expect(screen.getByText('[image]')).toBeInTheDocument()
  })
})
