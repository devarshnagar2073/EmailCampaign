
import React, { useState, useEffect, useRef } from 'react';
import { ApiService } from '../services/apiService';
import { GeminiService } from '../services/geminiService';
import { Template, Campaign } from '../types';
import { 
    LayoutTemplate, Plus, Trash2, Edit2, Rocket, 
    Sparkles, RefreshCw, Bold, Italic, List, Link as LinkIcon, Eye, CheckCircle, X,
    FileCode, Loader2, Palette, Search, SortAsc
} from 'lucide-react';
import { 
    Button, Input, Textarea, Label, Card, CardHeader, CardTitle, CardContent, Select, Badge 
} from '../components/ui/ui-components';
import { useToast, useConfirm } from '../components/ui/GlobalFeedback';

interface TemplatesProps {
    user: any;
}

const Templates: React.FC<TemplatesProps> = ({ user }) => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState<Partial<Template>>({});
    
    // Editor State
    const [showPreview, setShowPreview] = useState(false);
    const [showAiPanel, setShowAiPanel] = useState(false);
    const [aiTopic, setAiTopic] = useState('');
    const [aiTone, setAiTone] = useState('Professional');
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Run Campaign State
    const [showRunModal, setShowRunModal] = useState(false);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [selectedCampaignId, setSelectedCampaignId] = useState('');
    const [isLaunching, setIsLaunching] = useState(false);
    
    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest');

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const toast = useToast();
    const confirm = useConfirm();

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const data = await ApiService.getTemplates();
            setTemplates(data);
        } catch(e) { console.error(e); }
    };

    const handleCreateNew = () => {
        setCurrentTemplate({ name: '', subject: '', body: '' });
        setIsEditing(true);
    };

    const handleEdit = (t: Template) => {
        setCurrentTemplate(t);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        const isConfirmed = await confirm({
            title: "Delete Template",
            description: "Are you sure you want to delete this template?",
            variant: 'destructive'
        });

        if(isConfirmed) {
            await ApiService.deleteTemplate(id);
            toast.success("Template deleted successfully");
            loadTemplates();
        }
    };

    const handleSave = async () => {
        if(!currentTemplate.name || !currentTemplate.body) return toast.error("Name and body required");
        try {
            await ApiService.saveTemplate(currentTemplate);
            setIsEditing(false);
            toast.success("Template saved successfully");
            loadTemplates();
        } catch(e) { toast.error("Failed to save template"); }
    };

    const handleGenerateAI = async () => {
        if (!aiTopic) return toast.error("Please enter a topic");
        setIsGenerating(true);
        try {
          const result = await GeminiService.generateEmail(aiTopic, aiTone);
          setCurrentTemplate(prev => ({...prev, subject: result.subject, body: result.body}));
          setShowAiPanel(false);
        } catch (err) {
          toast.error("Failed to generate content.");
        } finally {
          setIsGenerating(false);
        }
    };

    const insertHtmlTag = (tagStart: string, tagEnd: string) => {
        if (!textareaRef.current) return;
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const text = textareaRef.current.value;
        const newText = text.substring(0, start) + tagStart + text.substring(start, end) + tagEnd + text.substring(end);
        setCurrentTemplate({...currentTemplate, body: newText});
    };

    const handleRunClick = async (t: Template) => {
        setCurrentTemplate(t);
        try {
            const camps = await ApiService.getCampaigns();
            setCampaigns(camps.filter(c => c.status === 'DRAFT'));
            setShowRunModal(true);
        } catch(e) { toast.error("Failed to load campaigns"); }
    };

    const handleLaunch = async () => {
        if(!selectedCampaignId) return toast.error("Select a campaign");
        setIsLaunching(true);
        try {
            await ApiService.launchCampaign(selectedCampaignId, {
                subject: currentTemplate.subject,
                body: currentTemplate.body,
                trackOpens: true,
                trackClicks: false,
                templateId: currentTemplate._id
            });
            toast.success("Campaign Launched Successfully!");
            setShowRunModal(false);
            // Optionally redirect to Campaigns page
        } catch(e: any) {
            toast.error("Launch Failed: " + e.message);
        } finally {
            setIsLaunching(false);
        }
    };

    const filteredTemplates = templates.filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (t.subject && t.subject.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // newest
    });

    if (isEditing) {
        return (
            <div className="max-w-6xl mx-auto h-[calc(100vh-4rem)] flex flex-col gap-6 animate-in fade-in">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg text-primary">
                             <Edit2 size={20}/>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">{currentTemplate._id ? 'Edit Template' : 'New Design'}</h2>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                        <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 shadow-md shadow-primary/20">
                            <CheckCircle size={16} className="mr-2"/> Save Changes
                        </Button>
                    </div>
                </div>

                <div className="flex gap-6 flex-1 overflow-hidden">
                    {/* Sidebar / AI */}
                    <Card className="w-80 flex flex-col border-0 shadow-lg h-full">
                        <CardHeader className="bg-slate-50/50 pb-4 border-b">
                            <CardTitle className="text-sm font-bold uppercase text-slate-500 tracking-wider">Properties</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="space-y-2">
                                <Label>Template Name</Label>
                                <Input 
                                    value={currentTemplate.name} 
                                    onChange={e => setCurrentTemplate({...currentTemplate, name: e.target.value})} 
                                    placeholder="e.g. Monthly Newsletter"
                                    className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Default Subject</Label>
                                <Input 
                                    value={currentTemplate.subject} 
                                    onChange={e => setCurrentTemplate({...currentTemplate, subject: e.target.value})} 
                                    placeholder="Subject line..."
                                    className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                />
                            </div>
                            
                            {/* AI Panel */}
                            <div className="border border-primary/20 rounded-xl overflow-hidden mt-4 shadow-sm">
                                <div className="bg-primary p-3 flex items-center justify-between text-white">
                                    <Label className="flex items-center gap-2 font-bold text-white cursor-pointer"><Sparkles size={14} className="text-yellow-300"/> AI Assistant</Label>
                                    <button onClick={() => setShowAiPanel(!showAiPanel)} className="hover:bg-white/20 rounded p-1 transition-colors text-xs font-semibold">{showAiPanel ? 'Hide' : 'Open'}</button>
                                </div>
                                {showAiPanel && (
                                    <div className="space-y-3 bg-primary/5 p-4 animate-in slide-in-from-top-2">
                                        <Textarea 
                                            placeholder="Describe what you want to write..." 
                                            className="h-24 text-xs bg-white border-primary/10"
                                            value={aiTopic}
                                            onChange={e => setAiTopic(e.target.value)}
                                        />
                                        <Select value={aiTone} onChange={(e) => setAiTone(e.target.value)} className="h-8 text-xs bg-white border-primary/10">
                                            <option value="Professional">Professional</option>
                                            <option value="Friendly">Friendly</option>
                                            <option value="Urgent">Urgent</option>
                                            <option value="Sales">Sales-y</option>
                                        </Select>
                                        <Button size="sm" onClick={handleGenerateAI} disabled={isGenerating} className="w-full text-xs bg-primary hover:bg-primary/90">
                                            {isGenerating ? <Loader2 className="animate-spin mr-2 h-3 w-3"/> : <Sparkles className="mr-2 h-3 w-3"/>}
                                            Generate
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Editor */}
                    <Card className="flex-1 flex flex-col overflow-hidden border-0 shadow-lg">
                        <div className="p-2 border-b flex justify-between items-center bg-slate-50">
                            <div className="flex gap-1 p-1 bg-white rounded-lg border shadow-sm">
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => insertHtmlTag('<b>', '</b>')}><Bold size={14}/></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => insertHtmlTag('<i>', '</i>')}><Italic size={14}/></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => insertHtmlTag('<ul>\n<li>', '</li>\n</ul>')}><List size={14}/></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => insertHtmlTag('<a href="#">', '</a>')}><LinkIcon size={14}/></Button>
                            </div>
                            <div className="flex bg-slate-200/50 p-1 rounded-lg">
                                <button onClick={() => setShowPreview(false)} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${!showPreview ? 'bg-white shadow text-primary' : 'text-slate-500 hover:text-slate-700'}`}>Code</button>
                                <button onClick={() => setShowPreview(true)} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${showPreview ? 'bg-white shadow text-primary' : 'text-slate-500 hover:text-slate-700'}`}>Preview</button>
                            </div>
                        </div>
                        <div className="flex-1 relative bg-white">
                            {!showPreview ? (
                                <Textarea 
                                    ref={textareaRef}
                                    className="w-full h-full border-0 resize-none p-6 font-mono text-sm leading-relaxed text-slate-700 focus-visible:ring-0"
                                    value={currentTemplate.body || ''}
                                    onChange={e => setCurrentTemplate({...currentTemplate, body: e.target.value})}
                                    placeholder="<html><body>Write your HTML email content here...</body></html>"
                                    spellCheck={false}
                                />
                            ) : (
                                <iframe 
                                    srcDoc={currentTemplate.body} 
                                    className="w-full h-full border-0" 
                                    title="preview"
                                    sandbox="allow-same-origin"
                                />
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-primary">Templates</h1>
                    <p className="text-muted-foreground">Manage your reusable email designs.</p>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto">
                    <Button onClick={handleCreateNew} className="shadow-lg hover:shadow-primary/20 bg-primary hover:bg-primary/90 w-full md:w-auto">
                        <Plus size={16} className="mr-2"/> New Template
                    </Button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                    <Input 
                        placeholder="Search templates..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-9 border-slate-200 bg-slate-50 focus:bg-white"
                    />
                </div>
                <div className="w-[180px]">
                     <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-slate-50 border-slate-200 h-10">
                         <option value="newest">Newest First</option>
                         <option value="oldest">Oldest First</option>
                         <option value="name">Name (A-Z)</option>
                     </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Add New Card (Always first) */}
                <div 
                    onClick={handleCreateNew}
                    className="border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group min-h-[200px]"
                >
                    <div className="bg-slate-100 p-4 rounded-full mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all">
                        <Plus size={32} className="text-slate-400 group-hover:text-primary"/>
                    </div>
                    <h3 className="font-semibold text-slate-600 group-hover:text-primary">Create New Template</h3>
                    <p className="text-xs text-slate-400 mt-1">Start from scratch or use AI</p>
                </div>

                {filteredTemplates.map(t => (
                    <Card key={t._id} className="group hover:-translate-y-1 hover:shadow-xl transition-all duration-300 border-slate-200 overflow-hidden flex flex-col">
                        <div className="h-2 w-full bg-gradient-to-r from-slate-200 to-slate-100 group-hover:bg-primary transition-all duration-500 shrink-0"></div>
                        <CardHeader className="pb-3 pt-5">
                            <CardTitle className="text-lg flex justify-between items-start gap-2">
                                <span className="truncate font-bold text-slate-800 group-hover:text-primary transition-colors" title={t.name}>{t.name}</span>
                                <Badge variant="outline" className="text-[10px] bg-slate-50 shrink-0 font-normal text-slate-400">HTML</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 flex-1 flex flex-col">
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex-1">
                                <p className="text-xs text-slate-500 line-clamp-3 italic">
                                    "{t.subject || 'No Subject'}"
                                </p>
                            </div>
                            <div className="flex gap-2 pt-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                                <Button variant="outline" size="sm" className="flex-1 hover:border-primary/50 hover:text-primary hover:bg-primary/5" onClick={() => handleEdit(t)}>
                                    <Edit2 size={14} className="mr-2"/> Edit
                                </Button>
                                <Button size="sm" className="flex-1 bg-slate-900 text-white hover:bg-slate-800" onClick={() => handleRunClick(t)}>
                                    <Rocket size={14} className="mr-2"/> Use
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(t._id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                                    <Trash2 size={16}/>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                
                {filteredTemplates.length === 0 && searchTerm && (
                    <div className="col-span-full py-12 text-center text-muted-foreground">
                        <p>No templates match your search.</p>
                        <Button variant="link" onClick={() => setSearchTerm('')}>Clear Search</Button>
                    </div>
                )}
            </div>

            {/* Run Campaign Modal */}
            {showRunModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
                    <Card className="w-full max-w-md shadow-2xl border-0">
                        <div className="h-1.5 w-full bg-primary"></div>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Rocket className="text-primary" size={20}/> Launch Template
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5 pt-4">
                            <div className="p-4 bg-primary/5 border border-primary/10 rounded-lg">
                                <span className="text-xs font-bold uppercase text-primary">Selected Template</span>
                                <p className="font-bold text-slate-900 mt-1">{currentTemplate.name}</p>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Select Target Campaign (CSV)</Label>
                                <Select value={selectedCampaignId} onChange={e => setSelectedCampaignId(e.target.value)} className="bg-slate-50 border-slate-200">
                                    <option value="">-- Choose Contact List --</option>
                                    {campaigns.map(c => (
                                        <option key={c._id} value={c._id}>{c.name} ({c.totalContacts} contacts)</option>
                                    ))}
                                </Select>
                                {campaigns.length === 0 && <p className="text-xs text-red-500 mt-1">No draft campaigns found. Please upload a CSV in Campaigns tab first.</p>}
                            </div>
                            
                            <div className="flex justify-end gap-3 pt-4">
                                <Button variant="ghost" onClick={() => setShowRunModal(false)}>Cancel</Button>
                                <Button onClick={handleLaunch} disabled={isLaunching || !selectedCampaignId} className="bg-primary hover:bg-primary/90">
                                    {isLaunching ? <Loader2 className="animate-spin mr-2"/> : <Rocket className="mr-2" size={16}/>}
                                    Launch Now
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

export default Templates;
