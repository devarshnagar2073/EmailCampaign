
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export interface SMTPConfig {
  host: string;
  port: number;
  user: string;
  pass: string; 
  fromEmail: string;
}

export interface User {
  id: string;
  username: string;
  password: string; 
  role: UserRole;
  status?: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  smtpConfig?: SMTPConfig;
  createdAt: number | string;
  dailyQuota?: number;
  emailsSentToday?: number;
  lastSentDate?: string | Date;
}

export interface EmailLog {
  _id: string;
  userId: string;
  recipient: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  timestamp: number;
  errorMessage?: string;
  campaignName: string;
  isReviewed?: boolean;
  opened?: boolean;
}

export interface Template {
    _id: string;
    name: string;
    subject: string;
    body: string;
    createdAt: string;
}

export interface Campaign {
    _id: string;
    name: string;
    templateId?: string;
    status: 'DRAFT' | 'SCHEDULED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'ABORTED';
    totalContacts: number;
    emailColumn: string;
    csvOriginalName: string;
    createdAt: string;
    sentCount: number;
    failedCount: number;
    scheduledAt?: string;
    csvHeaders?: string[];
    fieldMapping?: { [key: string]: string };
    launchConfig?: {
        subject?: string;
        body?: string;
        trackOpens?: boolean;
        trackClicks?: boolean;
        attachments?: { filename: string; path: string }[];
    };
}
