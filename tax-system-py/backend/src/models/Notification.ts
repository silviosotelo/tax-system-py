export interface Notification {
  id: string;
  user_id: string;
  type: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  related_obligation_id?: string;
  related_data?: any;
  read: boolean;
  read_at?: Date;
  send_email: boolean;
  email_sent: boolean;
  email_sent_at?: Date;
  created_at: Date;
}

export interface NotificationCreateDTO {
  user_id: string;
  type: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  related_obligation_id?: string;
  related_data?: any;
  send_email?: boolean;
}
