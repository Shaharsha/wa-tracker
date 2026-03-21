export interface Contact {
  jid: string;
  name: string | null;
  phone: string;
  is_dismissed: boolean;
  is_blocked: boolean;
  profile_picture_url: string | null;
  last_message_preview: string;
  last_message_timestamp: number;
  last_message_from_me: boolean;
  last_message_type: string;
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
  media_url: string | null;
}

export interface Stats {
  total_unanswered: number;
  longest_waiting_hours: number;
  total_contacts_tracked: number;
  last_sync_at: string | null;
  waha_status: string;
}
