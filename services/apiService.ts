

import { User, EmailLog, SMTPConfig, Template, Campaign } from '../types';

const API_URL = 'http://localhost:5000/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'x-auth-token': token || '',
  };
};

const handleResponse = async (res: Response) => {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.msg || data.message || 'API Error');
  }
  return data;
};

export const ApiService = {
  // Auth
  login: async (username: string, password: string): Promise<{ user: User, token: string }> => {
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        });
        const data = await handleResponse(res);
        localStorage.setItem('token', data.token);
        return data;
    } catch (e) {
        console.error("Login Failed");
        throw e;
    }
  },

  register: async (username: string, password: string): Promise<{ msg: string }> => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return handleResponse(res);
  },

  getCurrentUser: async (): Promise<User | null> => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const res = await fetch(`${API_URL}/auth/user`, {
        headers: { 'x-auth-token': token }
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
  },

  // Admin
  getUsers: async (): Promise<User[]> => {
    const res = await fetch(`${API_URL}/auth/users`, { headers: getHeaders() });
    return handleResponse(res);
  },

  createUser: async (user: Partial<User>): Promise<User> => {
    const res = await fetch(`${API_URL}/auth/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(user),
    });
    return handleResponse(res);
  },

  updateUser: async (id: string, updates: Partial<User>): Promise<User> => {
    const res = await fetch(`${API_URL}/auth/users/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
    return handleResponse(res);
  },

  deleteUser: async (id: string): Promise<void> => {
    const res = await fetch(`${API_URL}/auth/users/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    await handleResponse(res);
  },

  // SMTP
  updateSMTP: async (config: SMTPConfig): Promise<SMTPConfig> => {
    const res = await fetch(`${API_URL}/auth/smtp`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(config),
    });
    return handleResponse(res);
  },
  
  testSMTP: async (config: SMTPConfig): Promise<{ msg: string }> => {
      const res = await fetch(`${API_URL}/auth/smtp/test`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(config)
      });
      return handleResponse(res);
  },

  // Campaigns (New)
  getCampaigns: async (): Promise<Campaign[]> => {
      const res = await fetch(`${API_URL}/campaign`, { headers: getHeaders() });
      return handleResponse(res);
  },

  getCampaignContacts: async (id: string, page = 1, limit = 10, search = ''): Promise<{ contacts: any[], total: number, totalPages: number }> => {
      const query = `page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`;
      const res = await fetch(`${API_URL}/campaign/${id}/contacts?${query}`, { headers: getHeaders() });
      return handleResponse(res);
  },
  
  getCampaignLogs: async (id: string, page = 1, limit = 20): Promise<{ logs: EmailLog[], total: number, totalPages: number }> => {
      const res = await fetch(`${API_URL}/campaign/${id}/logs?page=${page}&limit=${limit}`, { headers: getHeaders() });
      return handleResponse(res);
  },

  createCampaign: async (name: string, file: File): Promise<Campaign> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/campaign/upload`, {
          method: 'POST',
          headers: { 'x-auth-token': token || '' },
          body: formData
      });
      return handleResponse(res);
  },

  updateCampaign: async (id: string, data: any): Promise<Campaign> => {
      const res = await fetch(`${API_URL}/campaign/${id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(data)
      });
      return handleResponse(res);
  },

  deleteCampaign: async (id: string): Promise<void> => {
      const res = await fetch(`${API_URL}/campaign/${id}`, {
          method: 'DELETE',
          headers: getHeaders()
      });
      await handleResponse(res);
  },

  launchCampaign: async (id: string, data: any, attachments?: FileList | null): Promise<any> => {
      const formData = new FormData();
      formData.append('subject', data.subject);
      formData.append('body', data.body);
      formData.append('trackOpens', data.trackOpens);
      formData.append('trackClicks', data.trackClicks);
      if (data.scheduledAt) {
          formData.append('scheduledAt', data.scheduledAt);
      }
      if (data.templateId) {
          formData.append('templateId', data.templateId);
      }
      
      if (attachments) {
        for (let i = 0; i < attachments.length; i++) {
            formData.append('attachments', attachments[i]);
        }
      }

      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/campaign/${id}/launch`, {
          method: 'POST',
          headers: { 'x-auth-token': token || '' },
          body: formData
      });
      return handleResponse(res);
  },

  retryCampaign: async (id: string): Promise<any> => {
    const res = await fetch(`${API_URL}/campaign/${id}/retry`, {
        method: 'POST',
        headers: getHeaders(),
    });
    return handleResponse(res);
  },

  abortCampaign: async (id: string): Promise<any> => {
    const res = await fetch(`${API_URL}/campaign/${id}/abort`, {
        method: 'POST',
        headers: getHeaders(),
    });
    return handleResponse(res);
  },

  sendQuickEmail: async (to: string, subject: string, body: string): Promise<{ msg: string }> => {
    const res = await fetch(`${API_URL}/campaign/quick-send`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ to, subject, body }),
    });
    return handleResponse(res);
  },

  // Combined Action for UserDashboard (Quick Send) - Kept for compatibility if used elsewhere
  sendCampaign: async (formData: FormData): Promise<any> => {
      const token = localStorage.getItem('token');
      
      // 1. Upload
      const uploadData = new FormData();
      const file = formData.get('file');
      const name = formData.get('campaignName');
      
      if (file) uploadData.append('file', file);
      if (name) uploadData.append('name', name as string);

      const uploadRes = await fetch(`${API_URL}/campaign/upload`, {
          method: 'POST',
          headers: { 'x-auth-token': token || '' },
          body: uploadData
      });
      const campaign = await handleResponse(uploadRes);

      // 2. Update if necessary (emailColumn)
      const emailColumn = formData.get('emailColumn');
      if (emailColumn) {
           await fetch(`${API_URL}/campaign/${campaign._id}`, {
              method: 'PUT',
              headers: getHeaders(), 
              body: JSON.stringify({ emailColumn })
          });
      }

      // 3. Launch
      const launchData = new FormData();
      launchData.append('subject', formData.get('subject') as string);
      launchData.append('body', formData.get('body') as string);
      launchData.append('trackOpens', formData.get('trackOpens') as string);
      launchData.append('trackClicks', formData.get('trackClicks') as string);
      
      const attachments = formData.getAll('attachments');
      for (const att of attachments) {
        launchData.append('attachments', att);
      }

      const launchRes = await fetch(`${API_URL}/campaign/${campaign._id}/launch`, {
          method: 'POST',
          headers: { 'x-auth-token': token || '' },
          body: launchData
      });
      
      const response = await handleResponse(launchRes);
      return { ...response, campaignId: campaign._id };
  },

  // Logs
  getLogs: async (page = 1, limit = 20): Promise<{ logs: EmailLog[], total: number, totalPages: number }> => {
    const res = await fetch(`${API_URL}/campaign/logs?page=${page}&limit=${limit}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getAllLogs: async (): Promise<EmailLog[]> => {
    const res = await fetch(`${API_URL}/campaign/all-logs`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getCampaignHistory: async (): Promise<any[]> => {
    const res = await fetch(`${API_URL}/campaign/history`, { headers: getHeaders() });
    return handleResponse(res);
  },

  deleteLogsBulk: async (ids: string[]): Promise<void> => {
    const res = await fetch(`${API_URL}/campaign/logs/delete-bulk`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ids }),
    });
    await handleResponse(res);
  },

  markLogsReviewed: async (ids: string[]): Promise<void> => {
    const res = await fetch(`${API_URL}/campaign/logs/review-bulk`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ids }),
    });
    await handleResponse(res);
  },

  // Templates
  getTemplates: async (): Promise<Template[]> => {
    const res = await fetch(`${API_URL}/templates`, { headers: getHeaders() });
    return handleResponse(res);
  },

  saveTemplate: async (data: Partial<Template>): Promise<Template> => {
    const res = await fetch(`${API_URL}/templates`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  deleteTemplate: async (id: string): Promise<void> => {
    const res = await fetch(`${API_URL}/templates/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
    });
    await handleResponse(res);
  }
};
