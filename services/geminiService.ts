
const API_URL = 'http://localhost:5000/api';

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'x-auth-token': token || '',
    };
};

export const GeminiService = {
  generateEmail: async (topic: string, tone: string): Promise<{subject: string, body: string}> => {
    try {
      const res = await fetch(`${API_URL}/ai/generate`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ topic, tone })
      });
      
      if (!res.ok) throw new Error("Backend AI Generation Failed");
      return await res.json();
    } catch (error) {
      console.error("AI Service Error:", error);
      throw error;
    }
  },

  analyzeLogs: async (logs: any[]): Promise<string> => {
     try {
       // Only send summary stats to save bandwidth if logs are huge
       const res = await fetch(`${API_URL}/ai/analyze`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ logs }) // In prod, consider summarizing before sending
       });
       if (!res.ok) return "Analysis unavailable.";
       const data = await res.json();
       return data.analysis;
     } catch (e) {
       return "Could not generate insights.";
     }
  }
};
