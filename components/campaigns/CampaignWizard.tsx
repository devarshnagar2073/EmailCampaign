
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ApiService } from '../../services/apiService';
import { Campaign, Template } from '../../types';
import { 
    X, Upload, CheckCircle, Settings2, LayoutTemplate, Paperclip, 
    MousePointerClick, Clock, ArrowLeft, ArrowRight, Loader2, Rocket, Eye 
} from 'lucide-react';
import { 
    Button, Input, Card, Label, Select, Badge, Textarea 
} from '../ui/ui-components';
import { useToast } from '../ui/GlobalFeedback';
import CampaignPreview from './CampaignPreview';

interface CampaignWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onLaunch: (campaignId: string) => void;
    user: any;
    templates: Template[];
    initialCampaign?: Campaign | null;
}

const CampaignWizard: React.FC<CampaignWizardProps> = ({ isOpen, onClose, onLaunch, user, templates, initialCampaign }) => {
    const [step, setStep] = useState(initialCampaign && !initialCampaign.emailColumn ? 2 : initialCampaign ? 3 : 1);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Data
    const [name, setName] = useState(initialCampaign?.name || '');
    const [file, setFile] = useState<File | null>(null);
    const [campaign, setCampaign] = useState<Campaign | null>(initialCampaign || null);
    
    // Mapping
    const [emailCol, setEmailCol] = useState(initialCampaign?.emailColumn || '');
    const [mapping, setMapping] = useState<{[key: string]: string}>(initialCampaign?.fieldMapping || {});

    // Content
    const [subject, setSubject] = useState(initialCampaign?.launchConfig?.subject || '');
    const [body, setBody] = useState(initialCampaign?.launchConfig?.body || '');
    const [attachments, setAttachments] = useState<FileList | null>(null);
    const [trackOpens, setTrackOpens] = useState(true);
    const [trackClicks, setTrackClicks] = useState(false);
    const [scheduleLater, setScheduleLater] = useState(false);
    const [scheduledTime, setScheduledTime] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState('');

    // Preview
    const [showPreview, setShowPreview] = useState(false);
    const [previewContent, setPreviewContent] = useState({ subject: '', body: '' });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const subjectRef = useRef<HTMLInputElement>(null);
    const bodyRef = useRef<HTMLTextAreaElement>(null);
    const attachmentsInputRef = useRef<HTMLInputElement>(null);
    const toast = useToast();

    if (!isOpen) return null;

    const handleStep1 = async () => {
        if (!name || !file) return toast.error("Please provide a name and CSV file.");
        setIsProcessing(true);
        try {
            const camp = await ApiService.createCampaign(name, file);
            setCampaign(camp);
            if(camp.emailColumn) setEmailCol(camp.emailColumn);
            setStep(2);
        } catch(e) { toast.error("Upload Failed"); }
        finally { setIsProcessing(false); }
    };

    const handleStep2 = async () => {
        if (!campaign) return;
        if (!emailCol) return toast.error("Please map the Email column.");
        setIsProcessing(true);
        try {
            const updated = await ApiService.updateCampaign(campaign._id, {
                emailColumn: emailCol,
                fieldMapping: mapping
            });
            setCampaign(updated);
            setStep(3);
        } catch(e) { toast.error("Failed to save mapping"); }
        finally { setIsProcessing(false); }
    };

    const handleLaunch = async () => {
        if (!campaign || !subject || !body) return toast.error("Subject and Body are required.");
        if (scheduleLater && !scheduledTime) return toast.error("Please pick a schedule time.");
        
        setIsProcessing(true);
        try {
            await ApiService.launchCampaign(campaign._id, {
                subject,
                body,
                trackOpens,
                trackClicks,
                scheduledAt: scheduleLater ? scheduledTime : null,
                templateId: selectedTemplateId
            }, attachments);
            
            if (scheduleLater) {
                toast.success(`Campaign Scheduled!`);
                onClose();
            } else {
                onLaunch(campaign._id);
                onClose();
            }
        } catch(e: any) {
            toast.error("Launch Failed: " + e.message);
            setIsProcessing(false);
        }
    };

    const handleTemplateSelect = (id: string) => {
        setSelectedTemplateId(id);
        const t = templates.find(temp => temp._id === id);
        if(t) {
            setSubject(t.subject || '');
            setBody(t.body);
        }
    };

    const handleGeneratePreview = async () => {
        if (!campaign) return;
        try {
            const data = await ApiService.getCampaignContacts(campaign._id, 1, 1, '');
            const contact = data.contacts[0];
            
            let sub = subject;
            let b = body;
            
            if (!contact) {
                toast.info("No contacts found to preview with, showing static content.");
            } else {
                const context = { ...contact, email: contact.email };
                for(const key in context) {
                    if (typeof context[key] !== 'string') continue;
                    const placeholder = `{{${key}}}`;
                    const val = context[key];
                    sub = sub.split(placeholder).join(val);
                    b = b.split(placeholder).join(val);
                }
            }
            setPreviewContent({ subject: sub, body: b });
            setShowPreview(true);
        } catch (e) {
            toast.error("Failed to generate preview");
        }
    };

    const insertVariable = (variable: string) => {
        const tag = `{{${variable}}}`;
        if (document.activeElement === subjectRef.current && subjectRef.current) {
             const el = subjectRef.current;
             const start = el.selectionStart || 0;
             const end = el.selectionEnd || 0;
             const text = el.value;
             setSubject(text.substring(0, start) + tag + text.substring(end));
        } else if (document.activeElement === bodyRef.current && bodyRef.current) {
             const el = bodyRef.current;
             const start = el.selectionStart || 0;
             const end = el.selectionEnd || 0;
             const text = el.value;
             setBody(text.substring(0, start) + tag + text.substring(end));
        } else {
             navigator.clipboard.writeText(tag);
             toast.info(`Copied ${tag} to clipboard`);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
             <Card className="w-full max-w-7xl max-h-[90vh] flex flex-col shadow-2xl border-0 overflow-hidden relative bg-white rounded-2xl ring-1 ring-white/10 animate-in zoom-in-95">
                
                {/* Header */}
                <div className="bg-white border-b px-6 py-4 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            Wizard
                            <span className="text-slate-300 font-light">|</span>
                            <span className="text-base font-normal text-slate-500">Step {step} of 3</span>
                        </h2>
                    </div>
                    <div className="flex gap-2">
                        <div className={`h-2 w-8 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-slate-200'}`}></div>
                        <div className={`h-2 w-8 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-slate-200'}`}></div>
                        <div className={`h-2 w-8 rounded-full transition-colors ${step >= 3 ? 'bg-primary' : 'bg-slate-200'}`}></div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-100"><X size={20}/></Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50">
                    {/* STEP 1: UPLOAD */}
                    {step === 1 && (
                        <div className="h-full flex flex-col items-center justify-center p-12 space-y-8 min-h-[400px]">
                            <div className="w-full max-w-lg space-y-6 bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
                                <div className="space-y-2">
                                    <Label className="text-base font-semibold text-slate-700">Campaign Name</Label>
                                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Summer Sale 2024" className="h-12 text-lg shadow-sm bg-slate-50 border-slate-200"/>
                                </div>
                                <div 
                                    onClick={() => fileInputRef.current?.click()} 
                                    className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all group ${file ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-primary hover:bg-indigo-50/30'}`}
                                >
                                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)}/>
                                    <div className="flex flex-col items-center gap-3">
                                        {file ? (
                                            <>
                                                <div className="bg-emerald-100 p-4 rounded-full text-emerald-600 shadow-sm"><CheckCircle size={32}/></div>
                                                <p className="font-bold text-lg text-emerald-800">{file.name}</p>
                                                <p className="text-xs text-emerald-600 bg-emerald-100/50 px-2 py-1 rounded">Click to replace file</p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="bg-slate-100 p-4 rounded-full text-slate-400 group-hover:bg-primary/20 group-hover:text-primary transition-colors shadow-sm"><Upload size={32}/></div>
                                                <div>
                                                    <p className="font-semibold text-lg text-slate-700 group-hover:text-primary">Upload CSV File</p>
                                                    <p className="text-xs text-slate-400 mt-1">Drag and drop or click to browse</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: MAPPING */}
                    {step === 2 && (
                        <div className="p-12 max-w-3xl mx-auto h-full flex flex-col justify-center min-h-[400px]">
                             <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 space-y-6">
                                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3">
                                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600 h-fit"><Settings2 size={20}/></div>
                                    <div>
                                        <h3 className="font-bold text-blue-900">Map Email Column</h3>
                                        <p className="text-sm text-blue-700">We detected the following columns. Please confirm which one contains the recipient email.</p>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-2">
                                    <div className="space-y-2">
                                        <Label className="text-base font-semibold text-slate-700">Email Address Column <span className="text-red-500">*</span></Label>
                                        <Select value={emailCol} onChange={e => setEmailCol(e.target.value)} className="h-12 bg-slate-50 border-slate-300 text-lg">
                                            <option value="" disabled>-- Select Column --</option>
                                            {campaign?.csvHeaders?.map(h => <option key={h} value={h}>{h}</option>)}
                                        </Select>
                                    </div>
                                    
                                    <div className="pt-6 border-t mt-4">
                                        <Label className="text-sm font-semibold text-slate-500 mb-2 block uppercase tracking-wide">Available Variables</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {campaign?.csvHeaders?.map(h => (
                                                <Badge key={h} variant="secondary" className="text-xs bg-slate-100 text-slate-600 border border-slate-200">
                                                    {`{{${h}}}`}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                             </div>
                        </div>
                    )}

                    {/* STEP 3: COMPOSE */}
                    {step === 3 && (
                        <div className="h-full flex overflow-hidden flex-col md:flex-row min-h-[500px]">
                            {/* Editor Area */}
                            <div className="flex-1 flex flex-col border-r border-slate-200 bg-white">
                                <div className="p-4 border-b border-slate-100 flex flex-col gap-1 shrink-0">
                                    <Label className="text-xs font-bold text-slate-400 uppercase">Subject Line</Label>
                                    <Input 
                                        ref={subjectRef}
                                        value={subject} 
                                        onChange={e => setSubject(e.target.value)} 
                                        placeholder="Enter a catchy subject..." 
                                        className="border-0 text-xl font-bold px-0 shadow-none focus-visible:ring-0 placeholder:text-slate-300 h-auto"
                                    />
                                </div>
                                
                                <div className="flex-1 relative">
                                    <Textarea 
                                        ref={bodyRef}
                                        value={body} 
                                        onChange={e => setBody(e.target.value)} 
                                        placeholder="Hi {{Name}}, type your email content here..." 
                                        className="w-full h-full resize-none border-0 focus-visible:ring-0 p-6 font-mono text-sm leading-relaxed text-slate-700" 
                                    />
                                </div>
                                
                                <div className="p-2 border-t flex justify-end">
                                    <Button variant="outline" size="sm" onClick={handleGeneratePreview} className="text-xs">
                                        <Eye className="mr-2 h-3 w-3"/> Preview with Data
                                    </Button>
                                </div>
                            </div>

                            {/* Sidebar Config */}
                            <div className="w-full md:w-[320px] bg-slate-50 flex flex-col overflow-y-auto border-l border-slate-200 shadow-[inset_10px_0_20px_-15px_rgba(0,0,0,0.05)]">
                                <div className="p-5 space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-slate-500">Load Template</Label>
                                        <Select value={selectedTemplateId} onChange={(e) => handleTemplateSelect(e.target.value)} className="bg-white border-slate-200 text-sm">
                                            <option value="">-- None --</option>
                                            {templates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                                        </Select>
                                    </div>

                                    {campaign?.csvHeaders && (
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2"><LayoutTemplate size={12}/> Insert Variable</Label>
                                            <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto custom-scrollbar p-1">
                                                {campaign.csvHeaders.map(h => (
                                                    <Badge 
                                                        key={h} 
                                                        onClick={() => insertVariable(h)} 
                                                        variant="outline" 
                                                        className="bg-white cursor-pointer hover:bg-primary hover:text-white transition-colors border-slate-200 py-1"
                                                        title={`Insert {{${h}}}`}
                                                    >
                                                        {`{${h}}`}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-slate-500">Attachments</Label>
                                        <div onClick={() => attachmentsInputRef.current?.click()} className="border border-dashed border-slate-300 rounded-lg p-3 bg-white hover:border-primary cursor-pointer text-center text-xs text-slate-500 transition-colors">
                                            <Paperclip className="mx-auto mb-1 h-4 w-4"/>
                                            {attachments && attachments.length > 0 ? (
                                                <span className="text-primary font-semibold">{attachments.length} files selected</span>
                                            ) : "Click to attach files"}
                                        </div>
                                        <input type="file" multiple ref={attachmentsInputRef} className="hidden" onChange={(e) => setAttachments(e.target.files)} />
                                    </div>

                                    <div className="h-px bg-slate-200 w-full my-2"></div>

                                    <div className="space-y-3">
                                            <Label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2"><MousePointerClick size={12}/> Tracking</Label>
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 text-sm cursor-pointer p-2 bg-white rounded-md border border-slate-200 hover:border-primary/50 transition-colors">
                                                    <input type="checkbox" checked={trackOpens} onChange={e => setTrackOpens(e.target.checked)} className="rounded text-primary focus:ring-primary h-4 w-4"/>
                                                    Track Opens
                                                </label>
                                                <label className="flex items-center gap-2 text-sm cursor-pointer p-2 bg-white rounded-md border border-slate-200 hover:border-primary/50 transition-colors">
                                                    <input type="checkbox" checked={trackClicks} onChange={e => setTrackClicks(e.target.checked)} className="rounded text-primary focus:ring-primary h-4 w-4"/>
                                                    Track Clicks
                                                </label>
                                            </div>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2"><Clock size={12}/> Schedule</Label>
                                        <div className={`p-3 rounded-lg border transition-all ${scheduleLater ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
                                            <label className="flex items-center gap-2 text-sm cursor-pointer mb-2">
                                                    <input type="checkbox" checked={scheduleLater} onChange={e => setScheduleLater(e.target.checked)} className="rounded text-primary focus:ring-primary"/>
                                                    <span className="font-medium">Schedule for later</span>
                                            </label>
                                            {scheduleLater && (
                                                <Input 
                                                    type="datetime-local" 
                                                    value={scheduledTime} 
                                                    onChange={e => setScheduledTime(e.target.value)} 
                                                    className="h-9 text-xs bg-white"
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-white border-t px-6 py-4 flex justify-between items-center shrink-0 z-10 shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
                    {step > 1 ? (
                        <Button variant="outline" onClick={() => setStep(prev => prev - 1)} disabled={isProcessing}>
                            <ArrowLeft size={16} className="mr-2"/> Back
                        </Button>
                    ) : <div></div>}

                    {step < 3 ? (
                        <Button onClick={step === 1 ? handleStep1 : handleStep2} disabled={isProcessing} className="bg-primary hover:bg-primary/90 px-8 shadow-lg shadow-primary/20">
                            {isProcessing ? <Loader2 className="animate-spin mr-2"/> : null}
                            Next Step <ArrowRight size={16} className="ml-2"/>
                        </Button>
                    ) : (
                        <Button onClick={handleLaunch} disabled={isProcessing} className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 px-10 shadow-lg shadow-indigo-200">
                            {isProcessing ? <Loader2 className="animate-spin mr-2"/> : <Rocket size={16} className="mr-2 fill-white/20"/>}
                            {scheduleLater ? 'Schedule Campaign' : 'Launch Campaign'}
                        </Button>
                    )}
                </div>

                <CampaignPreview 
                    isOpen={showPreview} 
                    onClose={() => setShowPreview(false)} 
                    content={previewContent} 
                    fromEmail={user.smtpConfig?.fromEmail || 'You'}
                />
            </Card>
        </div>,
        document.body
    );
};

export default CampaignWizard;
