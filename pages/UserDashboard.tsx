import React, { useState, useEffect, useRef } from 'react';
import { ApiService } from '../services/apiService';
import { GeminiService } from '../services/geminiService';
import { User, Template } from '../types';
import { 
    Upload, FileText, CheckCircle, Sparkles, 
    RefreshCw, Play, FileCode, Save, AlertTriangle, 
    Bold, Italic, List, Link as LinkIcon, Eye, Trash2, Paperclip, 
    LayoutTemplate, X, ChevronRight, ChevronDown, Rocket, History, Clock, Target, Loader2, Zap, BarChart2
} from 'lucide-react';
import { 
    Button, Input, Textarea, Label, 
    Card, CardHeader, CardTitle, CardContent,
    Select, Badge
} from '../components/ui/ui-components';
import { useToast, useConfirm } from '../components/ui/GlobalFeedback';

interface UserDashboardProps {
  user: User;
}

const AI_PROMPTS = [
    { label: "Product Launch", text: "Write an exciting email announcing our new product line." },
    { label: "Welcome", text: "Write a warm welcome email for new subscribers." },
    { label: "Discount", text: "Create a limited-time 20% discount offer email." },
    { label: "Newsletter", text: "Draft a monthly newsletter summary of industry trends." },
    { label: "Follow-up", text: "Write a polite follow-up email for a previous proposal." },
    { label: "Feedback", text: "Draft an email requesting customer feedback on our service." },
    { label: "Re-engagement", text: "Write an email to re-engage inactive subscribers." },
    { label: "Event Invite", text: "Create an invitation email for our upcoming webinar." },
    { label: "Cold Outreach", text: "Write a short cold email to a potential B2B client introducing our services." },
    { label: "Referral Request", text: "Write an email asking a satisfied customer for a referral." },
    { label: "Upsell", text: "Draft an email suggesting a premium upgrade to an existing customer." },
    { label: "Milestone", text: "Write a celebratory email for a customer reaching a usage milestone." },
    { label: "Holiday Greeting", text: "Write a festive holiday greeting email to customers offering best wishes." },
    { label: "Cart Abandonment", text: "Write a persuasive email reminding a customer about items left in their cart and offering a small incentive." },
    { label: "Welcome Series - Day 3", text: "Write the 3rd email in a welcome series that introduces the brand's core values and popular resources." },
];

const UserDashboard: React.FC<UserDashboardProps> = ({ user }) => {
  // Campaign Configuration
  const [campaignName, setCampaignName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvDelimiter, setCsvDelimiter] = useState(',');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [emailColumn, setEmailColumn] = useState('');
  const [contactCount, setContactCount] = useState<number | null>(null);
  
  // Content
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState<FileList | null>(null);
  
  // Tracking
  const [trackOpens, setTrackOpens] = useState(false);
  const [trackClicks, setTrackClicks] = useState(false); // UI Only for now

  // Process States
  const [isSending, setIsSending] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, failed: 0, total: 0 });
  
  // Auto-save State
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // History State
  const [recentHistory, setRecentHistory] = useState<any[]>([]);
  
  // Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // UI State
  const [showAiPanel, setShowAiPanel] = useState(false);
  
  // AI
  const [aiTopic, setAiTopic] = useState('');
  const [aiTone, setAiTone] = useState('Professional');
  const [isGenerating, setIsGenerating] = useState(false);

  // Hooks
  const toast = useToast();
  const confirm = useConfirm();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
      // Check Draft
      const draft = localStorage.getItem(`draft_${user.id}`);
      if (draft) {
          try {
             const d = JSON.parse(draft);
             setCampaignName(d.campaignName || '');
             setSubject(d.subject || '');
             setBody(d.body || '');
             setLastSaved(new Date());
          } catch(e) {}
      }
      
      // Load Templates & History
      ApiService.getTemplates().then(setTemplates);
      loadHistory();

      // Auto-save interval (60s)
      const interval = setInterval(() => {
          saveDraft(true);
      }, 60000);

      return () => clearInterval(interval);
  }, [user.id]);

  const loadHistory = async () => {
      try {
          const history = await ApiService.getCampaignHistory();
          setRecentHistory(history);
      } catch (e) { console.error("History load failed", e); }
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    parseCSV(file, csvDelimiter);
  };

  const parseCSV = (file: File, delimiter: string) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        
        if (lines.length > 0) {
            const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
            setCsvHeaders(headers);
            const likelyEmail = headers.find(h => h.toLowerCase().includes('email') || h.toLowerCase().includes('e-mail'));
            setEmailColumn(likelyEmail || headers[0]);
            setContactCount(lines.length - 1); // Subtract header row
        }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
      if (selectedFile) parseCSV(selectedFile, csvDelimiter);
  }, [csvDelimiter]);

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) setBody(content);
    };
    reader.readAsText(file);
  };

  const handleGenerateAI = async () => {
    if (!aiTopic) return toast.error("Please enter a topic");
    setIsGenerating(true);
    try {
      const result = await GeminiService.generateEmail(aiTopic, aiTone);
      setSubject(result.subject);
      setBody(result.body);
      setShowAiPanel(false);
    } catch (err) {
      toast.error("Failed to generate content. Check API Key configuration.");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Draft Logic ---
  const saveDraft = (silent = false) => {
      // Only save if there is content
      if (!campaignName && !subject && !body) return;
      
      const draftData = { campaignName, subject, body };
      localStorage.setItem(`draft_${user.id}`, JSON.stringify(draftData));
      setLastSaved(new Date());
      if (!silent) {
          toast.success("Draft saved successfully");
      }
  };

  const handleDeleteDraft = async () => {
      const isConfirmed = await confirm({
          title: "Delete Draft",
          description: "Are you sure you want to discard this draft? This cannot be undone.",
          variant: 'destructive',
          confirmText: "Discard"
      });

      if (isConfirmed) {
          localStorage.removeItem(`draft_${user.id}`);
          setCampaignName(''); setSubject(''); setBody('');
          setLastSaved(null);
          toast.info("Draft discarded");
      }
  };

  // --- Template Management ---
  const handleSaveAsTemplate = async () => {
      if (!newTemplateName || !body) return toast.error("Please provide a name and content.");
      try {
          const t = await ApiService.saveTemplate({ name: newTemplateName, subject, body });
          setTemplates([t, ...templates]);
          setNewTemplateName('');
          toast.success("Template saved!");
      } catch (error) { toast.error("Failed to save template"); }
  };

  const handleLoadTemplate = async (t: Template) => {
      const isConfirmed = await confirm({
          title: "Overwrite Content?",
          description: "Loading this template will replace your current email body and subject.",
          confirmText: "Load Template"
      });
      
      if (isConfirmed) {
          setSubject(t.subject || '');
          setBody(t.body);
          setShowTemplateModal(false);
      }
  };

  const handleDeleteTemplate = async (id: string) => {
      const isConfirmed = await confirm({
          title: "Delete Template",
          description: "Are you sure you want to delete this template?",
          variant: 'destructive'
      });

      if (isConfirmed) {
          await ApiService.deleteTemplate(id);
          setTemplates(templates.filter(t => t._id !== id));
          toast.success("Template deleted");
      }
  };

  const insertHtmlTag = (tagStart: string, tagEnd: string) => {
      if (!textareaRef.current) return;
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const text = textareaRef.current.value;
      const newText = text.substring(0, start) + tagStart + text.substring(start, end) + tagEnd + text.substring(end);
      setBody(newText);
  };

  const initiateCampaign = () => {
      if (!user.smtpConfig || !user.smtpConfig.host) {
          toast.error("Please configure SMTP settings first in the Settings tab.");
          return;
      }
      if (!selectedFile || !subject || !body || !campaignName) return toast.error("Please complete all fields.");
      setShowConfirmModal(true);
  };

  const confirmAndSend = async () => {
    setShowConfirmModal(false);
    setShowProgressModal(true);
    setIsSending(true);
    setProgress({ sent: 0, failed: 0, total: contactCount || 0 });

    try {
        const formData = new FormData();
        formData.append('file', selectedFile!);
        formData.append('campaignName', campaignName);
        formData.append('emailColumn', emailColumn);
        formData.append('delimiter', csvDelimiter);
        formData.append('subject', subject);
        formData.append('body', body);
        formData.append('trackOpens', trackOpens.toString());
        formData.append('trackClicks', trackClicks.toString());
        
        if (attachmentFiles) {
            for (let i = 0; i < attachmentFiles.length; i++) {
                formData.append('attachments', attachmentFiles[i]);
            }
        }

        const result = await ApiService.sendCampaign(formData);
        
        // Start Polling for Progress using the returned Campaign ID
        pollingRef.current = setInterval(() => pollProgress(result.campaignId), 1500);

    } catch (e: any) {
        toast.error("Failed to start campaign: " + e.message);
        setIsSending(false);
        setShowProgressModal(false);
    }
  };

  const pollProgress = async (campaignId?: string) => {
      if (!campaignId) return;
      try {
          // Fetch the campaigns list to get the authoritative counters from the specific campaign
          const campaigns = await ApiService.getCampaigns();
          const campaign = campaigns.find(c => c._id === campaignId);
          
          if (campaign) {
              const sent = campaign.sentCount || 0;
              const failed = campaign.failedCount || 0;
              const total = campaign.totalContacts || contactCount || 0;

              setProgress({ sent, failed, total });

              // Check for completion or fatal failure status
              if (campaign.status === 'COMPLETED' || campaign.status === 'FAILED') {
                  if (pollingRef.current) clearInterval(pollingRef.current);
                  setIsSending(false);
                  loadHistory();
              }
          }
      } catch (e) { console.error("Polling error", e); }
  };

  const closeProgress = () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      setShowProgressModal(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] gap-4 max-w-[1600px] mx-auto relative p-2">
        <div className="flex justify-between items-center mb-2 px-1">
            <div>
                 <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <span className="p-2 bg-primary/10 rounded-lg text-primary"><Rocket size={24} /></span>
                    Quick Campaign Wizard
                 </h1>
                 <p className="text-muted-foreground text-sm ml-11">Launch a simple blast in seconds.</p>
            </div>
            <div className="flex items-center gap-3">
                {lastSaved && <span className="text-xs text-slate-400 flex items-center gap-1"><Clock size={12}/> Auto-saved {lastSaved.toLocaleTimeString()}</span>}
                <Button variant="outline" size="sm" onClick={() => saveDraft(false)}>
                    <Save size={14} className="mr-2" /> Save Draft
                </Button>
                 <Button variant="ghost" size="sm" onClick={handleDeleteDraft} className="text-destructive hover:bg-destructive/10">
                    <Trash2 size={14} />
                </Button>
            </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden pb-4">
            
            {/* Left Panel: Configuration */}
            <div className="lg:w-[360px] flex-shrink-0 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                {/* 1. Campaign Details */}
                <Card className="border-t-4 border-t-primary shadow-md">
                    <CardHeader className="py-4 pb-2">
                        <CardTitle className="text-sm font-bold uppercase text-slate-500 tracking-wider">Step 1: Setup</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5 pt-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Campaign Name</Label>
                            <Input 
                                placeholder="e.g. Summer Sale 2024" 
                                value={campaignName}
                                onChange={e => setCampaignName(e.target.value)}
                                className="h-10 bg-slate-50 border-slate-200"
                            />
                        </div>

                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 group ${selectedFile ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200 hover:border-primary/50 hover:bg-primary/5'}`}
                        >
                            <input type="file" ref={fileInputRef} onChange={handleFileSelection} accept=".csv" className="hidden" />
                            <div className="flex flex-col items-center gap-2">
                                {selectedFile ? (
                                    <>
                                        <div className="p-2 bg-emerald-100 rounded-full text-emerald-600"><CheckCircle size={20} /></div>
                                        <p className="text-sm font-semibold text-emerald-800 truncate w-full px-2">{selectedFile.name}</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="p-2 bg-slate-100 rounded-full text-slate-400 group-hover:bg-primary/20 group-hover:text-primary transition-colors"><Upload size={20} /></div>
                                        <p className="text-sm font-medium text-slate-600">Upload Contact CSV</p>
                                    </>
                                )}
                            </div>
                        </div>

                        {contactCount !== null && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <div className="space-y-3">
                                     <div className="flex flex-col gap-1">
                                        <Label className="text-xs">Delimiter</Label>
                                        <Select value={csvDelimiter} onChange={(e) => setCsvDelimiter(e.target.value)} className="h-9 text-xs">
                                            <option value=",">Comma (,)</option>
                                            <option value=";">Semicolon (;)</option>
                                        </Select>
                                     </div>
                                     <div className="flex flex-col gap-1">
                                        <Label className="text-xs font-semibold text-primary">Email Column</Label>
                                        <Select value={emailColumn} onChange={(e) => setEmailColumn(e.target.value)} className="h-9 text-xs border-primary/20 bg-primary/5 font-medium">
                                            {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                        </Select>
                                     </div>
                                </div>
                                <div className="flex items-center justify-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 py-2 rounded border border-emerald-100/50">
                                    <CheckCircle size={14}/> {contactCount} recipients found
                                </div>
                            </div>
                        )}

                        {/* Tracking Options */}
                        <div className="space-y-3 pt-3 border-t">
                            <Label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Tracking</Label>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-slate-50 transition-colors">
                                    <input type="checkbox" id="trackOpens" checked={trackOpens} onChange={e => setTrackOpens(e.target.checked)} className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"/>
                                    <Label htmlFor="trackOpens" className="text-sm font-normal cursor-pointer flex-1">Track Opens (Pixel)</Label>
                                </div>
                                <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-slate-50 transition-colors">
                                    <input type="checkbox" id="trackClicks" checked={trackClicks} onChange={e => setTrackClicks(e.target.checked)} className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"/>
                                    <Label htmlFor="trackClicks" className="text-sm font-normal cursor-pointer flex-1">Track Link Clicks</Label>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. AI Assistant */}
                <Card className="shadow-md border-0 bg-primary text-primary-foreground overflow-hidden">
                     <button onClick={() => setShowAiPanel(!showAiPanel)} className="w-full flex items-center justify-between p-4 text-left hover:bg-white/10 transition-colors">
                        <span className="text-sm font-bold uppercase flex items-center gap-2">
                            <Sparkles size={16} className="text-yellow-300"/> AI Writer
                        </span>
                        {showAiPanel ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                     </button>
                     
                     {showAiPanel && (
                        <CardContent className="pt-0 space-y-3 animate-in fade-in pb-4">
                            <div className="space-y-1">
                                <Label className="text-xs text-primary-foreground/80">Topic</Label>
                                <Textarea 
                                    placeholder="Describe your email goal..." 
                                    className="h-20 text-sm resize-none bg-white/10 border-white/20 text-white placeholder:text-primary-foreground/50 focus:bg-white/20"
                                    value={aiTopic}
                                    onChange={e => setAiTopic(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-1.5 flex-wrap">
                                {AI_PROMPTS.slice(0, 6).map((p, i) => (
                                    <Badge key={i} variant="secondary" className="cursor-pointer text-[10px] bg-white/20 text-white hover:bg-white/30 border-0" onClick={() => setAiTopic(p.text)}>{p.label}</Badge>
                                ))}
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Select value={aiTone} onChange={(e) => setAiTone(e.target.value)} className="h-9 text-xs bg-white/10 border-white/20 text-white [&>option]:text-black">
                                    <option value="Professional">Professional</option>
                                    <option value="Friendly">Friendly</option>
                                    <option value="Urgent">Urgent</option>
                                </Select>
                                <Button size="sm" onClick={handleGenerateAI} disabled={isGenerating} className="h-9 text-xs bg-white text-primary hover:bg-slate-50 font-bold border-0 shadow-lg">
                                    {isGenerating ? <RefreshCw className="animate-spin h-3 w-3"/> : "Generate Magic"}
                                </Button>
                            </div>
                        </CardContent>
                     )}
                </Card>

                {/* 3. Recent History (Expanded & Always Visible) */}
                <Card className="flex-1 shadow-sm flex flex-col min-h-[250px] border-t-4 border-t-slate-200">
                     <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center">
                        <span className="text-sm font-bold uppercase text-slate-500 flex items-center gap-2">
                            <History size={14} /> Campaign History
                        </span>
                        <Button size="sm" variant="ghost" onClick={loadHistory} className="h-6 w-6 p-0 rounded-full">
                            <RefreshCw size={12}/>
                        </Button>
                     </div>
                     <div className="flex-1 overflow-auto p-0">
                        {recentHistory.length === 0 ? (
                            <p className="text-center text-xs text-muted-foreground p-8">No recent campaigns found.</p>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {recentHistory.map((h, i) => (
                                    <div key={i} className="p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="font-semibold text-sm text-slate-800 truncate max-w-[150px]" title={h._id}>{h._id || 'Unnamed'}</p>
                                                <p className="text-[10px] text-slate-400">{new Date(h.lastSent).toLocaleString()}</p>
                                            </div>
                                            <div className="flex gap-2 text-[10px] font-bold">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-emerald-600">{h.sent}</span>
                                                    <span className="text-slate-400 font-normal">SENT</span>
                                                </div>
                                                <div className="w-px bg-slate-200"></div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-blue-600">{h.opened || 0}</span>
                                                    <span className="text-slate-400 font-normal">OPEN</span>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Mini Bar Chart */}
                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                                            <div className="bg-emerald-500 h-full" style={{ width: `${(h.sent / (Math.max(h.sent + 1, 10))) * 100}%` }}></div>
                                            <div className="bg-blue-400 h-full opacity-70" style={{ width: `${(h.opened / (Math.max(h.sent, 1))) * 100}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                     </div>
                </Card>
            </div>

            {/* Right Panel: Editor */}
            <div className="flex-1 flex flex-col h-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                {/* Header / Subject */}
                <div className="border-b p-4 space-y-4 bg-slate-50/50">
                    <div className="flex justify-between items-start">
                        <Label className="text-sm font-bold uppercase text-slate-400 tracking-wider">Step 2: Content</Label>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setShowTemplateModal(true)} className="h-8 text-xs text-slate-600">
                                <LayoutTemplate size={14} className="mr-1.5 text-primary"/> Templates
                            </Button>
                            <div className="bg-slate-200/50 p-1 rounded-lg flex gap-1">
                                <button onClick={() => setShowPreview(false)} className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${!showPreview ? 'bg-white shadow text-primary' : 'text-slate-500 hover:text-slate-900'}`}>Write</button>
                                <button onClick={() => setShowPreview(true)} className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${showPreview ? 'bg-white shadow text-primary' : 'text-slate-500 hover:text-slate-900'}`}>Preview</button>
                            </div>
                        </div>
                    </div>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">Subject:</span>
                        <Input 
                            placeholder="Type a catchy subject line..." 
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            className="text-base font-medium pl-20 h-11 bg-white border-slate-200 focus:border-primary/50 shadow-sm"
                        />
                    </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1 flex flex-col relative bg-white">
                    {!showPreview ? (
                        <>
                             {/* Toolbar */}
                             <div className="flex items-center gap-1 p-2 border-b bg-slate-50/50">
                                <Button variant="ghost" size="icon" onClick={() => insertHtmlTag('<b>', '</b>')} className="h-8 w-8 hover:bg-primary/10 hover:text-primary"><Bold size={15} /></Button>
                                <Button variant="ghost" size="icon" onClick={() => insertHtmlTag('<i>', '</i>')} className="h-8 w-8 hover:bg-primary/10 hover:text-primary"><Italic size={15} /></Button>
                                <Button variant="ghost" size="icon" onClick={() => insertHtmlTag('<ul>\n  <li>', '</li>\n</ul>')} className="h-8 w-8 hover:bg-primary/10 hover:text-primary"><List size={15} /></Button>
                                <Button variant="ghost" size="icon" onClick={() => insertHtmlTag('<a href="#">', '</a>')} className="h-8 w-8 hover:bg-primary/10 hover:text-primary"><LinkIcon size={15} /></Button>
                                <div className="h-5 w-px bg-slate-200 mx-2"></div>
                                <Button variant="secondary" size="sm" onClick={() => templateInputRef.current?.click()} className="h-8 text-xs">
                                    <FileCode size={14} className="mr-1.5" /> Import HTML
                                </Button>
                                <input type="file" ref={templateInputRef} onChange={handleTemplateUpload} accept=".html" className="hidden" />
                             </div>
                             
                             <Textarea 
                                ref={textareaRef}
                                className="flex-1 w-full h-full resize-none border-0 focus-visible:ring-0 p-6 font-mono text-sm leading-relaxed text-slate-800" 
                                placeholder="<html><body>Write your email content here...</body></html>"
                                value={body}
                                onChange={e => setBody(e.target.value)}
                            />
                        </>
                    ) : (
                        <div className="flex-1 w-full h-full overflow-hidden bg-slate-100/50 flex flex-col">
                            <div className="bg-white border-b p-3 text-xs text-center text-slate-500 shadow-sm z-10 flex items-center justify-center gap-2">
                                <Eye size={14}/> Preview Mode
                            </div>
                            <div className="flex-1 p-8 overflow-auto">
                                <div className="max-w-2xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden min-h-[500px] flex flex-col border border-slate-100 ring-1 ring-slate-900/5">
                                    <div className="bg-slate-50 border-b p-4 text-sm space-y-1">
                                         <p className="text-slate-800"><span className="font-semibold text-slate-500 w-16 inline-block">Subject:</span> {subject || '(No Subject)'}</p>
                                         <p className="text-slate-800"><span className="font-semibold text-slate-500 w-16 inline-block">From:</span> {user.smtpConfig?.fromEmail || 'you@example.com'}</p>
                                    </div>
                                    <div className="flex-1 relative">
                                        <iframe 
                                            srcDoc={body || '<div style="font-family:sans-serif; color:#94a3b8; text-align:center; padding-top:80px;">Start typing to see content...</div>'}
                                            className="w-full h-full absolute inset-0 border-0"
                                            title="Email Preview"
                                            sandbox="allow-same-origin"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t bg-slate-50 flex justify-between items-center">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => attachmentInputRef.current?.click()} className="text-xs border-dashed border-slate-300 hover:border-primary hover:text-primary bg-white">
                                <Paperclip size={14} className="mr-2"/> Attach Files
                            </Button>
                            <input type="file" multiple ref={attachmentInputRef} className="hidden" onChange={(e) => setAttachmentFiles(e.target.files)} />
                        </div>
                        {attachmentFiles && attachmentFiles.length > 0 && (
                            <div className="flex flex-wrap gap-1 max-w-[400px]">
                                {Array.from(attachmentFiles).map((f: any, i) => (
                                    <Badge key={i} variant="secondary" className="text-[10px] font-normal flex items-center gap-1 bg-white border border-slate-200">
                                        <Paperclip size={8}/> {f.name}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>

                    <Button size="lg" onClick={initiateCampaign} disabled={isSending || !contactCount || !body} className="min-w-[180px] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-base border-0">
                        {isSending ? (
                            <><Loader2 className="mr-2 h-5 w-5 animate-spin"/> Launching...</>
                        ) : (
                            <><Rocket size={18} className="mr-2 fill-current"/> Launch Campaign</>
                        )}
                    </Button>
                </div>
            </div>
        </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
             <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
                 <div className="bg-primary h-2 w-full"></div>
                 <CardHeader>
                     <CardTitle className="flex items-center gap-2 text-xl"><Target className="text-primary"/> Ready for Lift Off?</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                     <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-3 text-sm shadow-inner">
                         <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                             <span className="text-slate-500">Campaign Name</span>
                             <span className="font-bold text-slate-800">{campaignName}</span>
                         </div>
                         <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                             <span className="text-slate-500">Recipients</span>
                             <span className="font-bold text-slate-800 flex items-center gap-1"><Zap size={14} className="text-yellow-500"/> {contactCount} contacts</span>
                         </div>
                         <div className="flex justify-between items-center">
                             <span className="text-slate-500">Tracking</span>
                             <div className="flex gap-2">
                                 {trackOpens && <Badge variant="default" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0">Opens</Badge>}
                                 {trackClicks && <Badge variant="default" className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0">Clicks</Badge>}
                                 {!trackOpens && !trackClicks && <span className="text-slate-400 italic">None</span>}
                             </div>
                         </div>
                     </div>
                     <p className="text-xs text-center text-slate-400 pt-2">
                         By clicking "Launch Now", the email blasting process will begin immediately.
                     </p>
                 </CardContent>
                 <div className="p-6 pt-0 flex gap-3">
                     <Button variant="outline" className="flex-1" onClick={() => setShowConfirmModal(false)}>Abort</Button>
                     <Button className="flex-1" onClick={confirmAndSend}>Launch Now</Button>
                 </div>
             </Card>
        </div>
      )}

      {/* Progress Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
             <Card className="w-full max-w-lg shadow-2xl border-0">
                 <CardHeader className="text-center pb-2">
                     <CardTitle className="text-xl">Mission in Progress</CardTitle>
                     <p className="text-sm text-slate-500">Please keep this window open.</p>
                 </CardHeader>
                 <CardContent className="space-y-6 pt-4">
                     <div className="space-y-3">
                         <div className="flex justify-between text-sm font-semibold text-slate-700">
                             <span>Overall Progress</span>
                             <span>{Math.round(((progress.sent + progress.failed) / (progress.total || 1)) * 100)}%</span>
                         </div>
                         <div className="h-5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200">
                            <div 
                                className="h-full bg-primary transition-all duration-500 ease-in-out relative" 
                                style={{ width: `${((progress.sent + progress.failed) / (progress.total || 1)) * 100}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-[pulse_2s_infinite]"></div>
                            </div>
                         </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                         <div className="text-center p-5 bg-emerald-50 rounded-xl border border-emerald-100">
                             <p className="text-3xl font-extrabold text-emerald-600">{progress.sent}</p>
                             <p className="text-xs uppercase text-emerald-800 font-bold tracking-wider mt-1">Delivered</p>
                         </div>
                         <div className="text-center p-5 bg-rose-50 rounded-xl border border-rose-100">
                             <p className="text-3xl font-extrabold text-rose-600">{progress.failed}</p>
                             <p className="text-xs uppercase text-rose-800 font-bold tracking-wider mt-1">Failed</p>
                         </div>
                     </div>

                     {!isSending && (
                         <div className="text-center text-emerald-600 font-bold animate-in fade-in flex items-center justify-center gap-2 p-2 bg-emerald-50 rounded-lg">
                             <CheckCircle size={20}/> Campaign Successfully Completed
                         </div>
                     )}
                 </CardContent>
                 <div className="p-6 pt-0">
                     <Button className="w-full h-12 text-base" onClick={closeProgress} disabled={isSending} variant={isSending ? "secondary" : "default"}>
                         {isSending ? <span className="flex items-center gap-2"><Loader2 className="animate-spin"/> Sending...</span> : 'Close & View Analytics'}
                     </Button>
                 </div>
             </Card>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
          <Card className="w-full max-w-xl shadow-lg border max-h-[80vh] flex flex-col">
            <CardHeader className="border-b pb-3 bg-slate-50/50">
              <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Saved Templates</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setShowTemplateModal(false)}><X size={18}/></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 overflow-auto p-4 flex-1">
                <div className="flex gap-2 items-end border-b pb-4 border-slate-100">
                    <div className="flex-1 space-y-1">
                        <Label className="text-xs text-slate-500 uppercase">Save Current Work as Template</Label>
                        <Input placeholder="Template Name" value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} className="h-9" />
                    </div>
                    <Button size="sm" onClick={handleSaveAsTemplate} disabled={!body} className="h-9">Save</Button>
                </div>
                <div className="space-y-2">
                    {templates.length === 0 && <p className="text-center text-muted-foreground text-sm py-8 bg-slate-50 rounded-lg border border-dashed">No templates found.</p>}
                    {templates.map(t => (
                        <div key={t._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-primary/5 hover:border-primary/20 transition-all cursor-pointer group" onClick={() => handleLoadTemplate(t)}>
                            <div>
                                <p className="font-semibold text-sm text-slate-700 group-hover:text-primary transition-colors">{t.name}</p>
                                <p className="text-[10px] text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</p>
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t._id); }}>
                                <Trash2 size={14}/>
                            </Button>
                        </div>
                    ))}
                </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;