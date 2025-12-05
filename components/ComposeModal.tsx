
import React, { useState, useEffect } from 'react';
import { PenSquare, Send, X, AlertTriangle, Settings, CheckCircle, Loader2, FileText, LayoutTemplate } from 'lucide-react';
import { Button, Input, Textarea, Label, Select, Badge } from './ui/ui-components';
import { ApiService } from '../services/apiService';
import { User, Template } from '../types';
import { useConfirm } from './ui/GlobalFeedback';
import { createPortal } from 'react-dom';

interface ComposeModalProps {
  user: User;
  onNavigateSettings: () => void;
}

const ComposeModal: React.FC<ComposeModalProps> = ({ user, onNavigateSettings }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Templates State
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const hasSmtp = Boolean(user.smtpConfig && user.smtpConfig.host && user.smtpConfig.host.trim().length > 0);
  const confirm = useConfirm();

  useEffect(() => {
    if (isOpen && user) {
        ApiService.getTemplates()
            .then(setTemplates)
            .catch(err => console.error("Failed to load templates", err));
    }
  }, [isOpen, user]);

  const handleOpen = () => {
    setIsOpen(true);
    setSuccess(false);
    setError('');
    setSelectedTemplateId('');
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleTemplateChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const id = e.target.value;
      if (!id) {
        setSelectedTemplateId('');
        return;
      }
      const template = templates.find(t => t._id === id);
      if (template) {
          if ((subject || body) && !success) {
              const isConfirmed = await confirm({
                  title: "Overwrite Content?",
                  description: "This will replace your current subject and message body.",
                  confirmText: "Overwrite"
              });
              if (!isConfirmed) return;
          }
          setSelectedTemplateId(id);
          setSubject(template.subject || '');
          setBody(template.body);
      }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to || !subject || !body) return;

    setSending(true);
    setError('');

    try {
      await ApiService.sendQuickEmail(to, subject, body);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setIsOpen(false);
        setTo('');
        setSubject('');
        setBody('');
        setSelectedTemplateId('');
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  // Render logic for the offcanvas
  const offCanvas = isOpen && createPortal(
    <div className="fixed inset-0 z-[10000] overflow-hidden">
        {/* Backdrop */}
        <div 
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={handleClose}
        />
        
        {/* Offcanvas Panel */}
        <div className="absolute top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-300 sm:w-[480px]">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-white z-10">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Send className="text-indigo-600" size={20}/>
                        Quick Email
                    </h2>
                    <p className="text-sm text-slate-500">Send a single email instantly.</p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClose} className="rounded-full hover:bg-slate-100">
                    <X size={24}/>
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                {!hasSmtp ? (
                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-6 text-center space-y-4">
                        <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                            <AlertTriangle size={24}/>
                        </div>
                        <div>
                            <h3 className="font-bold text-orange-900">SMTP Not Configured</h3>
                            <p className="text-sm text-orange-700 mt-1">You must setup your email server before sending.</p>
                        </div>
                        <Button onClick={() => { handleClose(); onNavigateSettings(); }} className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                            <Settings className="mr-2 h-4 w-4"/> Go to Settings
                        </Button>
                    </div>
                ) : success ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                            <CheckCircle size={32}/>
                        </div>
                        <h3 className="text-2xl font-bold text-emerald-800">Sent Successfully!</h3>
                        <p className="text-slate-500">Your email has been dispatched.</p>
                    </div>
                ) : (
                    <form id="quick-email-form" onSubmit={handleSend} className="space-y-5">
                        {/* Template */}
                        {templates.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-bold text-slate-500 flex items-center gap-1">
                                    <LayoutTemplate size={12}/> Use Template
                                </Label>
                                <Select 
                                    value={selectedTemplateId} 
                                    onChange={handleTemplateChange}
                                    className="bg-white"
                                >
                                    <option value="">-- Start from scratch --</option>
                                    {templates.map(t => (
                                        <option key={t._id} value={t._id}>{t.name}</option>
                                    ))}
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="to">Recipient (To)</Label>
                            <Input 
                                id="to" 
                                type="email" 
                                placeholder="name@example.com"
                                value={to}
                                onChange={e => setTo(e.target.value)}
                                required
                                className="bg-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Input 
                                id="subject" 
                                placeholder="Hello there..."
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                required
                                className="bg-white font-medium"
                            />
                        </div>

                        <div className="space-y-2 flex-1 flex flex-col">
                            <Label htmlFor="body">Message Body</Label>
                            <Textarea 
                                id="body" 
                                placeholder="Write your message here..."
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                required
                                className="bg-white min-h-[200px] flex-1 font-sans resize-none p-4"
                            />
                        </div>
                        
                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100">
                                <AlertTriangle size={16}/> {error}
                            </div>
                        )}
                    </form>
                )}
            </div>

            {/* Footer */}
            {!success && hasSmtp && (
                <div className="p-6 border-t bg-white z-10">
                    <Button 
                        type="submit" 
                        form="quick-email-form" 
                        className="w-full h-12 text-base font-semibold shadow-lg shadow-indigo-200" 
                        disabled={sending}
                    >
                        {sending ? <Loader2 className="animate-spin mr-2"/> : <Send className="mr-2" size={18}/>}
                        Send Email
                    </Button>
                </div>
            )}
        </div>
    </div>,
    document.body
  );

  return (
    <>
      <button
        onClick={handleOpen}
        className="fixed bottom-8 right-8 z-[50] h-14 w-14 rounded-full shadow-xl bg-indigo-600 hover:bg-indigo-700 hover:scale-110 transition-all duration-300 flex items-center justify-center text-white ring-4 ring-indigo-100"
        title="Quick Send"
      >
        <PenSquare size={24} />
      </button>
      {offCanvas}
    </>
  );
};

export default ComposeModal;
