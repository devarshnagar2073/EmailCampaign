
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ApiService } from '../../services/apiService';
import { Campaign, EmailLog } from '../../types';
import { 
    X, FolderOpen, Calendar, RefreshCw, Loader2, Search, FileText, AlertTriangle, User, Hash, AlertCircle, Clock, CheckCircle
} from 'lucide-react';
import { 
    Button, Input, Card, CardHeader, CardTitle, CardContent,
    Badge, Tabs, TabsContent, TabsList, TabsTrigger, Label 
} from '../ui/ui-components';
import { useToast } from '../ui/GlobalFeedback';

interface CampaignDetailsProps {
    campaign: Campaign;
    onClose: () => void;
    onDelete: (id: string) => void;
    onRetry: (id: string) => void;
    onUpdate: (campaign: Campaign) => void;
    isRetrying: boolean;
}

const CampaignDetails: React.FC<CampaignDetailsProps> = ({ campaign, onClose, onDelete, onRetry, onUpdate, isRetrying }) => {
    const [activeTab, setActiveTab] = useState('contacts');
    
    // Contacts State
    const [contacts, setContacts] = useState<any[]>([]);
    const [contactPage, setContactPage] = useState(1);
    const [contactTotalPages, setContactTotalPages] = useState(1);
    const [contactSearch, setContactSearch] = useState('');
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [contactTotalCount, setContactTotalCount] = useState(0);

    // Logs State
    const [logs, setLogs] = useState<EmailLog[]>([]);
    const [logsPage, setLogsPage] = useState(1);
    const [logsTotalPages, setLogsTotalPages] = useState(1);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Settings State
    const [editName, setEditName] = useState(campaign.name);

    const toast = useToast();

    useEffect(() => {
        if (activeTab === 'contacts') loadContacts(contactPage, contactSearch);
        if (activeTab === 'logs') loadLogs(logsPage);
    }, [activeTab, contactPage, logsPage, campaign._id]);

    const loadContacts = async (page: number, search: string) => {
        setLoadingContacts(true);
        try {
            const data = await ApiService.getCampaignContacts(campaign._id, page, 20, search);
            setContacts(data.contacts);
            setContactTotalPages(data.totalPages);
            setContactTotalCount(data.total);
        } catch(e) { console.error(e); }
        finally { setLoadingContacts(false); }
    };

    const loadLogs = async (page: number) => {
        setLoadingLogs(true);
        try {
            const data = await ApiService.getCampaignLogs(campaign._id, page, 20);
            setLogs(data.logs);
            setLogsTotalPages(data.totalPages);
        } catch(e) { console.error(e); }
        finally { setLoadingLogs(false); }
    };

    const handleSaveSettings = async () => {
        try {
            await ApiService.updateCampaign(campaign._id, { name: editName });
            toast.success("Saved");
            onUpdate({ ...campaign, name: editName });
        } catch(e) { toast.error("Failed to save"); }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'PROCESSING': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'FAILED': case 'ABORTED': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'SCHEDULED': return 'bg-orange-100 text-orange-700 border-orange-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8">
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
            
            {/* Main Modal Container */}
            <div className="bg-white w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl flex flex-col relative z-10 overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-slate-900/10">
                
                {/* Header */}
                <div className="border-b bg-white px-6 py-4 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4 overflow-hidden">
                        <div className="h-10 w-10 bg-indigo-50 rounded-lg text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                            <FolderOpen size={20}/>
                        </div>
                        <div className="overflow-hidden">
                            <h2 className="text-xl font-bold text-slate-900 truncate">{campaign.name}</h2>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                <span className={`px-2 py-0.5 rounded-full font-semibold border ${getStatusColor(campaign.status)}`}>{campaign.status}</span>
                                <span className="flex items-center gap-1 hidden sm:flex"><Calendar size={12}/> {new Date(campaign.createdAt).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1"><Hash size={12}/> {campaign.totalContacts} Contacts</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                         {(campaign.status === 'FAILED' || campaign.status === 'COMPLETED' || campaign.status === 'ABORTED') && (
                            <Button 
                                size="sm"
                                variant="outline"
                                onClick={() => onRetry(campaign._id)} 
                                disabled={isRetrying}
                                className="hidden sm:flex"
                            >
                                {isRetrying ? <Loader2 size={14} className="animate-spin mr-2"/> : <RefreshCw size={14} className="mr-2"/>}
                                Retry Failed
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700">
                            <X size={24}/>
                        </Button>
                    </div>
                </div>

                {/* Tabs Container - Enforces Layout */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 border-b bg-white shrink-0">
                        <TabsList className="bg-transparent p-0 gap-8 h-12 w-auto justify-start">
                            {['contacts', 'logs', 'content', 'settings'].map(tab => (
                                <TabsTrigger 
                                    key={tab}
                                    value={tab} 
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 text-slate-500 rounded-none h-full px-0 font-medium capitalize transition-colors hover:text-indigo-600"
                                >
                                    {tab}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    {/* CONTACTS TAB */}
                    <TabsContent value="contacts" className="flex-1 flex flex-col overflow-hidden data-[state=inactive]:hidden m-0">
                        {/* Toolbar */}
                        <div className="p-4 border-b bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                            <div className="flex gap-2 w-full sm:max-w-md">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                    <Input 
                                        placeholder="Search email..." 
                                        value={contactSearch} 
                                        onChange={e => setContactSearch(e.target.value)} 
                                        className="pl-9 bg-white border-slate-200"
                                    />
                                </div>
                                <Button variant="secondary" onClick={() => loadContacts(1, contactSearch)} className="bg-white border border-slate-200">Search</Button>
                            </div>
                            <div className="text-xs text-slate-500 font-medium">
                                Total: {contactTotalCount}
                            </div>
                        </div>

                        {/* Scrollable Table Area */}
                        <div className="flex-1 overflow-auto bg-white">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        {campaign.csvHeaders?.slice(0, 8).map(h => (
                                            <th key={h} className="px-6 py-3 font-semibold text-slate-600 whitespace-nowrap border-b border-slate-100">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loadingContacts ? (
                                        <tr><td colSpan={8} className="p-20 text-center"><div className="flex flex-col items-center gap-2"><Loader2 className="animate-spin text-indigo-500" size={32}/><span className="text-slate-400">Loading contacts...</span></div></td></tr>
                                    ) : contacts.length === 0 ? (
                                        <tr><td colSpan={8} className="p-20 text-center text-slate-400"><div className="flex flex-col items-center gap-2"><User size={32} className="opacity-20"/><span className="text-slate-400">No contacts found.</span></div></td></tr>
                                    ) : contacts.map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                            {campaign.csvHeaders?.slice(0, 8).map(h => (
                                                <td key={h} className="px-6 py-3 text-slate-600 truncate max-w-[200px]">{row[h] || <span className="text-slate-300">-</span>}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Pagination Footer */}
                        <div className="p-3 border-t bg-white flex justify-between items-center shrink-0 z-20">
                            <Button variant="outline" size="sm" onClick={() => setContactPage(p => Math.max(1, p-1))} disabled={contactPage===1}>Previous</Button>
                            <span className="text-xs font-medium text-slate-500">Page {contactPage} of {contactTotalPages}</span>
                            <Button variant="outline" size="sm" onClick={() => setContactPage(p => Math.min(contactTotalPages, p+1))} disabled={contactPage===contactTotalPages}>Next</Button>
                        </div>
                    </TabsContent>

                    {/* LOGS TAB */}
                    <TabsContent value="logs" className="flex-1 flex flex-col overflow-hidden data-[state=inactive]:hidden m-0">
                        <div className="flex-1 overflow-auto bg-white">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold text-slate-600 border-b border-slate-100 w-[30%]">Recipient</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600 border-b border-slate-100 w-[15%]">Status</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600 border-b border-slate-100 w-[35%]">Message</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600 border-b border-slate-100 w-[20%]">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loadingLogs ? (
                                        <tr><td colSpan={4} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" size={32}/></td></tr>
                                    ) : logs.map(log => (
                                        <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-3 font-medium text-slate-700">{log.recipient}</td>
                                            <td className="px-6 py-3">
                                                <Badge variant={log.status === 'SENT' ? 'secondary' : 'destructive'} className={log.status==='SENT' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0' : ''}>
                                                    {log.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-3 text-slate-500 text-xs font-mono break-all">{log.errorMessage || <span className="text-emerald-600 flex items-center gap-1"><CheckCircle size={12}/> Delivered</span>}</td>
                                            <td className="px-6 py-3 text-slate-400 text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {logs.length === 0 && !loadingLogs && (
                                        <tr><td colSpan={4} className="p-20 text-center text-slate-400">No logs available.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-3 border-t bg-white flex justify-between items-center shrink-0">
                            <Button variant="outline" size="sm" onClick={() => setLogsPage(p => Math.max(1, p-1))} disabled={logsPage===1}>Previous</Button>
                            <span className="text-xs font-medium text-slate-500">Page {logsPage} of {logsTotalPages}</span>
                            <Button variant="outline" size="sm" onClick={() => setLogsPage(p => Math.min(logsTotalPages, p+1))} disabled={logsPage===logsTotalPages}>Next</Button>
                        </div>
                    </TabsContent>

                    {/* CONTENT TAB */}
                    <TabsContent value="content" className="flex-1 overflow-auto bg-slate-50 p-4 md:p-8 data-[state=inactive]:hidden m-0">
                        <div className="max-w-3xl mx-auto space-y-6">
                            <Card className="shadow-sm border border-slate-200">
                                <CardHeader className="bg-white border-b py-4">
                                    <CardTitle className="text-base font-bold text-slate-700 flex items-center gap-2"><FileText size={18} className="text-indigo-500"/> Campaign Content</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="px-6 py-4 border-b bg-slate-50/50 flex gap-4 items-center">
                                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider text-[10px]">Subject</span>
                                        <span className="text-sm font-medium text-slate-900">{campaign.launchConfig?.subject || <span className="text-red-400 italic">No subject saved</span>}</span>
                                    </div>
                                    <div className="p-8 bg-slate-100 min-h-[400px] flex justify-center">
                                        {campaign.launchConfig?.body ? (
                                            <div className="bg-white w-full max-w-2xl shadow-lg rounded-md overflow-hidden ring-1 ring-slate-200">
                                                <div className="bg-slate-50 border-b px-4 py-2 flex gap-2">
                                                    <div className="h-2 w-2 rounded-full bg-red-400"></div>
                                                    <div className="h-2 w-2 rounded-full bg-yellow-400"></div>
                                                    <div className="h-2 w-2 rounded-full bg-green-400"></div>
                                                </div>
                                                <iframe 
                                                    srcDoc={campaign.launchConfig.body} 
                                                    className="w-full h-[500px] border-0 bg-white"
                                                    title="Content Preview"
                                                    sandbox="allow-same-origin"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center text-slate-400 h-full">
                                                <AlertCircle size={48} className="mb-2 opacity-20"/>
                                                <p>No HTML body content found.</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* SETTINGS TAB */}
                    <TabsContent value="settings" className="flex-1 overflow-auto bg-slate-50 p-4 md:p-8 data-[state=inactive]:hidden m-0">
                        <div className="max-w-2xl mx-auto space-y-8">
                            <Card className="border border-slate-200 shadow-sm bg-white">
                                <CardHeader>
                                    <CardTitle className="text-lg">General Settings</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Campaign Name</Label>
                                        <Input value={editName} onChange={e => setEditName(e.target.value)} className="bg-slate-50"/>
                                    </div>
                                    <div className="flex justify-end">
                                        <Button onClick={handleSaveSettings}>Save Changes</Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border border-red-100 shadow-sm bg-red-50/10">
                                <CardHeader>
                                    <CardTitle className="text-lg text-red-700 flex items-center gap-2"><AlertTriangle size={18}/> Danger Zone</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-white border border-red-100 rounded-lg">
                                        <div>
                                            <p className="font-semibold text-slate-800">Delete Campaign</p>
                                            <p className="text-xs text-slate-500">Permanently remove this campaign and all analytics.</p>
                                        </div>
                                        <Button variant="destructive" onClick={() => { onDelete(campaign._id); onClose(); }}>Delete</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>,
        document.body
    );
};

export default CampaignDetails;
