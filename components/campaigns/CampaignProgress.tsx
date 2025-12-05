
import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, StopCircle, Loader2 } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent } from '../ui/ui-components';

interface CampaignProgressProps {
    isOpen: boolean;
    onClose: () => void;
    onAbort: () => void;
    progress: { sent: number, failed: number, total: number, aborted: boolean };
    isAborting: boolean;
}

const CampaignProgress: React.FC<CampaignProgressProps> = ({ isOpen, onClose, onAbort, progress, isAborting }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md animate-in fade-in" />
            <Card className="w-full max-w-lg shadow-2xl border-0 overflow-hidden bg-white rounded-2xl relative animate-in zoom-in-95">
                <CardHeader className="text-center pb-2">
                     <CardTitle className="text-2xl">{progress.aborted ? "Sending Aborted" : "Sending in Progress"}</CardTitle>
                     <p className="text-slate-500">Do not close this window if sending is active.</p>
                </CardHeader>
                <CardContent className="space-y-8 pt-6">
                     {progress.aborted ? (
                        <div className="p-4 bg-red-100 border border-red-200 rounded-lg text-red-800 flex items-center gap-3">
                            <AlertTriangle size={24} />
                            <div className="text-sm font-semibold">
                                Campaign Aborted / Stopped. <br/>
                            </div>
                        </div>
                     ) : (
                        <div className="relative pt-2">
                            <div className="flex justify-between text-sm font-bold text-slate-700 mb-2">
                                <span>Completion</span>
                                <span>{Math.round(((progress.sent + progress.failed) / (progress.total || 1)) * 100)}%</span>
                            </div>
                            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200">
                                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${((progress.sent + progress.failed) / (progress.total || 1)) * 100}%` }}></div>
                            </div>
                        </div>
                     )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-6 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm">
                            <p className="text-4xl font-black text-emerald-500">{progress.sent}</p>
                            <p className="text-xs uppercase text-emerald-800 font-bold tracking-widest mt-2">Delivered</p>
                        </div>
                        <div className="text-center p-6 bg-rose-50 rounded-2xl border border-rose-100 shadow-sm">
                            <p className="text-4xl font-black text-rose-500">{progress.failed}</p>
                            <p className="text-xs uppercase text-rose-800 font-bold tracking-widest mt-2">Failed</p>
                        </div>
                    </div>
                </CardContent>
                <div className="p-6 pt-0 flex gap-3">
                    {!progress.aborted && (progress.sent + progress.failed < progress.total) && (
                         <Button 
                            variant="destructive"
                            className="flex-1 h-12 text-lg bg-rose-600 hover:bg-rose-700" 
                            onClick={onAbort} 
                            disabled={isAborting}
                         >
                            {isAborting ? <Loader2 className="animate-spin mr-2"/> : <StopCircle className="mr-2"/>}
                            {isAborting ? 'Stopping...' : 'Stop Campaign'}
                         </Button>
                    )}
                    <Button 
                        variant={progress.aborted || (progress.sent + progress.failed >= progress.total) ? "default" : "secondary"}
                        className="flex-1 h-12 text-lg" 
                        onClick={onClose} 
                        disabled={!progress.aborted && (progress.sent + progress.failed < progress.total)}
                    >
                        Close Window
                    </Button>
                </div>
            </Card>
        </div>,
        document.body
    );
};

export default CampaignProgress;
