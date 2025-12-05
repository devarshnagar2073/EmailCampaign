import { User, UserRole, EmailLog, SMTPConfig } from '../types';

const USERS_KEY = 'esa_users';
const LOGS_KEY = 'esa_logs';
const CURRENT_USER_KEY = 'esa_current_user';

// Initialize with default admin if empty
const init = () => {
  const users = localStorage.getItem(USERS_KEY);
  if (!users) {
    const admin: User = {
      id: 'admin-1',
      username: 'admin',
      password: 'password',
      role: UserRole.ADMIN,
      createdAt: Date.now(),
    };
    localStorage.setItem(USERS_KEY, JSON.stringify([admin]));
  }
};

init();

export const StorageService = {
  getUsers: (): User[] => {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  },

  saveUser: (user: User): void => {
    const users = StorageService.getUsers();
    const existingIndex = users.findIndex((u) => u.id === user.id);
    if (existingIndex >= 0) {
      users[existingIndex] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  deleteUser: (userId: string): void => {
    const users = StorageService.getUsers().filter((u) => u.id !== userId);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  login: (username: string, password: string): User | null => {
    const users = StorageService.getUsers();
    const user = users.find((u) => u.username === username && u.password === password);
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      return user;
    }
    return null;
  },

  logout: (): void => {
    localStorage.removeItem(CURRENT_USER_KEY);
  },

  getCurrentUser: (): User | null => {
    const u = localStorage.getItem(CURRENT_USER_KEY);
    return u ? JSON.parse(u) : null;
  },

  // Logs
  addLogs: (newLogs: EmailLog[]): void => {
    const currentLogs = StorageService.getLogs();
    localStorage.setItem(LOGS_KEY, JSON.stringify([...currentLogs, ...newLogs]));
  },

  getLogs: (userId?: string): EmailLog[] => {
    const logs: EmailLog[] = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
    if (userId) {
      return logs.filter((l) => l.userId === userId);
    }
    return logs;
  },

  // Specific Update for SMTP to avoid full object overwrite risks in UI
  updateSMTP: (userId: string, config: SMTPConfig): void => {
    const users = StorageService.getUsers();
    const user = users.find((u) => u.id === userId);
    if (user) {
      user.smtpConfig = config;
      StorageService.saveUser(user);
      // If updating current user, update session too
      const currentUser = StorageService.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      }
    }
  },
};