
import React, { useState, useEffect, useRef } from 'react';
import { ApiService } from '../services/apiService';
import { Campaign, Template } from '../types';
import { 
    FolderOpen, Upload, Plus, Trash2, Rocket, CheckCircle, 
    AlertTriangle, Loader2, Eye, RefreshCw, StopCircle
} from 'lucide-react';
import { Button, Card, CardContent } from '../components/ui/ui-components';
import { useToast, useConfirm } from '../components/ui/GlobalFeedback';

// Sub Components
import CampaignWizard from '../components/campaigns/CampaignWizard';
import CampaignDetails from '../components/campaigns/CampaignDetails';
import CampaignProgress from '../components/campaigns/CampaignProgress';

interface CampaignsProps {
    user: any;
}

const Campaigns: React.FC<CampaignsProps> = ({ user }) => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState<Template[]>([]);
    
    // Modal Visibility
    const [showWizard, setShowWizard] = useState(false);
    const [viewCampaign, setViewCampaign] = useState<Campaign | null>(null);
    const [showProgressModal, setShowProgressModal] = useState(false);
    
    // Wizard Data for Editing Drafts
    const [initialWizardCampaign, setInitialWizardCampaign] = useState<Campaign | null>(null);

    // Progress State
    const [progress, setProgress] = useState({ sent: 0, failed: 0, total: 0, aborted: false });
    
    // Processing Flags
    const [isRetrying, setIsRetrying] = useState(false);
    const [retryingId, setRetryingId] = useState<string | null>(null);
    const [isAborting, setIsAborting] = useState(false);
    const [activePollId, setActivePollId] = useState<string | null>(null);

    const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const toast = useToast();
    const confirm = useConfirm();

    useEffect(() => {
        loadCampaigns();
        loadTemplates();
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

    // Global Polling for list updates if any campaign is running
    useEffect(() => {
        let interval: NodeJS.Timeout;
        const hasProcessing = campaigns.some(c => c.status === 'PROCESSING');
        
        if (hasProcessing && !activePollId) {
            interval = setInterval(() => {
                ApiService.getCampaigns().then(setCampaigns).catch(console.error);
            }, 5000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [campaigns, activePollId]);

    const loadCampaigns = async () => {
        setLoading(true);
        try {
            const data = await ApiService.getCampaigns();
            setCampaigns(data);
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    };

    const loadTemplates = async () => {
        try {
            const tmpls = await ApiService.getTemplates();
            setTemplates(tmpls);
        } catch(e) {}
    };

    const handleDelete = async (id: string) => {
        const isConfirmed = await confirm({
            title: "Delete Campaign",
            description: "Are you sure you want to delete this campaign?",
            variant: 'destructive'
        });

        if(isConfirmed) {
            await ApiService.deleteCampaign(id);
            loadCampaigns();
            toast.success("Campaign deleted");
        }
    };

    const handleRetry = async (campaignId: string) => {
        const isConfirmed = await confirm({
            title: "Retry Campaign",
            description: "Are you sure you want to retry sending emails to failed or pending contacts?",
            confirmText: "Retry Sending"
        });
        
        if (isConfirmed) {
            setIsRetrying(true);
            setRetryingId(campaignId);
            try {
                // Get current counts to set initial progress
                const camp = campaigns.find(c => c._id === campaignId);
                if(camp) {
                     setProgress({ sent: camp.sentCount, failed: camp.failedCount, total: camp.totalContacts, aborted: false });
                }

                await ApiService.retryCampaign(campaignId);
                startProgressPolling(campaignId);
                
                // If viewing details, refresh the list but close detail for progress view? Or keep detail open?
                // Progress modal takes precedence
                if (viewCampaign && viewCampaign._id === campaignId) {
                     setViewCampaign(null); 
                }
                loadCampaigns();
            } catch (e: any) {
                toast.error("Retry failed: " + e.message);
            } finally {
                setIsRetrying(false);
                setRetryingId(null);
            }
        }
    };

    const handleAbort = async () => {
        if (!activePollId) return;
        
        const isConfirmed = await confirm({
            title: "Abort Campaign",
            description: "Are you sure you want to stop sending emails? This process cannot be resumed automatically.",
            variant: 'destructive',
            confirmText: "Stop Sending"
        });

        if (isConfirmed) {
            setIsAborting(true);
            try {
                await ApiService.abortCampaign(activePollId);
                toast.info("Abort signal sent. Stopping...");
                // Progress poll will catch the 'ABORTED' status shortly
            } catch (e: any) {
                toast.error("Failed to abort: " + e.message);
                setIsAborting(false);
            }
        }
    };

    const startProgressPolling = (campaignId: string) => {
        setActivePollId(campaignId);
        setShowProgressModal(true);
        setIsAborting(false);

        if (pollingRef.current) clearInterval(pollingRef.current);
        
        pollingRef.current = setInterval(async () => {
            try {
                const updatedCamps = await ApiService.getCampaigns();
                setCampaigns(updatedCamps);
                
                const c = updatedCamps.find(camp => camp._id === campaignId);
                if(c) {
                    const isAborted = c.status === 'ABORTED';
                    const isFailed = c.status === 'FAILED';
                    const isCompleted = c.status === 'COMPLETED';

                    setProgress({ sent: c.sentCount, failed: c.failedCount, total: c.totalContacts, aborted: isAborted });
                    
                    if(isCompleted || isFailed || isAborted) {
                        if(pollingRef.current) clearInterval(pollingRef.current);
                        setActivePollId(null);
                        setIsAborting(false);
                    }
                }
            } catch(e) {}
        }, 1500);
    };

    const handleWizardLaunch = (campaignId: string) => {
        startProgressPolling(campaignId);
    };

    const openWizard = () => {
        setInitialWizardCampaign(null);
        setShowWizard(true);
    };

    const resumeDraft = (c: Campaign) => {
        setInitialWizardCampaign(c);
        setShowWizard(true);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'PROCESSING': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'FAILED': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'ABORTED': return 'bg-red-100 text-red-700 border-red-200';
            case 'SCHEDULED': return 'bg-orange-100 text-orange-700 border-orange-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-primary">Campaigns</h1>
                    <p className="text-muted-foreground">Manage, schedule, and track your email outreach.</p>
                </div>
                <Button onClick={openWizard} className="bg-primary hover:bg-primary/90 shadow-lg hover:shadow-primary/20 text-white rounded-xl px-6 h-12">
                    <Plus size={18} className="mr-2"/> New Campaign
                </Button>
            </div>

            {/* Campaign List */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm ring-1 ring-slate-200/50">
                <CardContent className="p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Progress & Stats</th>
                                <th className="px-6 py-4">Created</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {campaigns.map(c => {
                                const percent = c.totalContacts > 0 ? Math.round(((c.sentCount + c.failedCount) / c.totalContacts) * 100) : 0;
                                return (
                                <tr key={c._id} className="hover:bg-primary/5 transition-colors group">
                                    <td className="px-6 py-4 font-medium flex items-center gap-3 text-slate-700">
                                        <div className="p-2.5 bg-white border border-slate-100 rounded-xl text-primary shadow-sm group-hover:scale-105 transition-transform">
                                            <FolderOpen size={18} />
                                        </div>
                                        <div>
                                            <div className="text-base font-semibold text-slate-800">{c.name}</div>
                                            <div className="text-xs text-slate-400">{c.totalContacts.toLocaleString()} Contacts</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getStatusColor(c.status)}`}>
                                            {c.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 w-[300px]">
                                        {c.status === 'DRAFT' ? (
                                            <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                                                <div className="h-1.5 w-1.5 rounded-full bg-slate-300"></div>
                                                Not started
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500">
                                                     <span className={c.status === 'PROCESSING' ? 'text-blue-600 animate-pulse' : ''}>{c.status === 'PROCESSING' ? 'Sending...' : c.status}</span>
                                                     <span>{percent}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner relative">
                                                    <div 
                                                        className={`h-full absolute left-0 top-0 transition-all duration-500 ${c.status === 'PROCESSING' ? 'bg-blue-500' : (c.status === 'ABORTED' ? 'bg-red-500' : 'bg-emerald-500')}`} 
                                                        style={{ width: `${percent}%` }} 
                                                    />
                                                    {c.failedCount > 0 && c.status !== 'ABORTED' && (
                                                        <div 
                                                            className="h-full absolute left-0 top-0 bg-rose-500" 
                                                            style={{ 
                                                                width: `${(c.failedCount / (c.totalContacts || 1)) * 100}%`,
                                                                left: `${(c.sentCount / (c.totalContacts || 1)) * 100}%`
                                                            }} 
                                                        />
                                                    )}
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                     <span className="flex items-center gap-1 text-emerald-600 font-bold" title="Sent Successfully">
                                                        <CheckCircle size={12}/> {c.sentCount}
                                                     </span>
                                                     <span className="flex items-center gap-1 text-rose-600 font-bold" title="Failed">
                                                        <AlertTriangle size={12}/> {c.failedCount}
                                                     </span>
                                                     <span className="text-slate-400 font-medium" title="Total Contacts">
                                                        / {c.totalContacts}
                                                     </span>
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => setViewCampaign(c)} className="hover:bg-primary/10 text-slate-400 hover:text-primary">
                                            <Eye size={18} />
                                        </Button>
                                        
                                        {c.status === 'DRAFT' && (
                                            <Button size="sm" onClick={() => resumeDraft(c)} className="bg-slate-900 text-white hover:bg-slate-800">
                                                <Rocket size={14} className="mr-2"/> Launch
                                            </Button>
                                        )}

                                        {(c.status === 'FAILED' || c.status === 'ABORTED' || c.status === 'COMPLETED') && (
                                            <Button 
                                                size="sm" 
                                                onClick={() => handleRetry(c._id)}
                                                className="bg-slate-50 border border-slate-200 text-slate-600 hover:bg-primary hover:text-white"
                                                disabled={(retryingId === c._id)}
                                            >
                                                {(retryingId === c._id) ? <Loader2 size={14} className="animate-spin mr-1"/> : <RefreshCw size={14} className="mr-1"/>}
                                                Retry
                                            </Button>
                                        )}

                                        {c.status === 'PROCESSING' && (
                                             <Button size="sm" variant="destructive" onClick={() => { startProgressPolling(c._id); handleAbort(); }}>
                                                 <StopCircle size={14} className="mr-2"/> Stop
                                             </Button>
                                        )}
                                        
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(c._id)} className="hover:bg-rose-50 text-slate-400 hover:text-rose-600">
                                            <Trash2 size={18}/>
                                        </Button>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                    {campaigns.length === 0 && !loading && (
                        <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-4">
                            <div className="bg-slate-100 p-4 rounded-full"><Upload size={32} className="text-slate-300"/></div>
                            <p>No campaigns found. Start by creating one.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* --- Modals --- */}
            
            <CampaignWizard 
                isOpen={showWizard} 
                onClose={() => setShowWizard(false)} 
                onLaunch={handleWizardLaunch}
                user={user}
                templates={templates}
                initialCampaign={initialWizardCampaign}
            />

            {viewCampaign && (
                <CampaignDetails 
                    campaign={viewCampaign}
                    onClose={() => setViewCampaign(null)}
                    onDelete={handleDelete}
                    onRetry={handleRetry}
                    onUpdate={(updated) => {
                         setCampaigns(campaigns.map(c => c._id === updated._id ? updated : c));
                         setViewCampaign(updated);
                    }}
                    isRetrying={isRetrying}
                />
            )}

            <CampaignProgress 
                isOpen={showProgressModal}
                onClose={() => setShowProgressModal(false)}
                onAbort={handleAbort}
                progress={progress}
                isAborting={isAborting}
            />
            
        </div>
    );
}

export default Campaigns;
