export interface Contact {
  jid: string;
  name: string | null;
  phone: string;
  is_dismissed: boolean;
  last_message_preview: string;
  last_message_timestamp: number;
  last_message_from_me: boolean;
  unanswered_count: number;
  waiting_seconds: number;
}

export interface Message {
  id: string;
  chat_id: string;
  from_me: boolean;
  body: string;
  timestamp: number;
  message_type: string;
}

export interface Stats {
  total_unanswered: number;
  longest_waiting_hours: number;
  total_contacts_tracked: number;
  last_sync_at: string | null;
  waha_status: string;
}
