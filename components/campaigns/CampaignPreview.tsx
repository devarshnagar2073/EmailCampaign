
import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent } from '../ui/ui-components';

interface CampaignPreviewProps {
    isOpen: boolean;
    onClose: () => void;
    content: { subject: string, body: string };
    fromEmail: string;
}

const CampaignPreview: React.FC<CampaignPreviewProps> = ({ isOpen, onClose, content, fromEmail }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
            <Card className="w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl bg-white border-0 animate-in zoom-in-95">
                <CardHeader className="border-b flex flex-row items-center justify-between py-3">
                    <CardTitle className="text-lg">Email Preview</CardTitle>
                    <Button variant="ghost" size="icon" onClick={onClose}><X size={18}/></Button>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto p-0">
                    <div className="p-4 bg-slate-50 border-b space-y-2">
                        <div className="flex gap-2 text-sm"><span className="font-bold text-slate-500 w-16">Subject:</span> <span className="text-slate-900">{content.subject}</span></div>
                        <div className="flex gap-2 text-sm"><span className="font-bold text-slate-500 w-16">From:</span> <span className="text-slate-900">{fromEmail}</span></div>
                    </div>
                    <div className="p-8">
                        <iframe 
                            srcDoc={content.body} 
                            className="w-full h-[400px] border border-slate-200 rounded-lg"
                            sandbox="allow-same-origin"
                            title="Preview"
                        />
                    </div>
                </CardContent>
                <div className="p-4 border-t bg-slate-50 flex justify-end">
                    <Button onClick={onClose}>Close Preview</Button>
                </div>
            </Card>
        </div>,
        document.body
    );
};

export default CampaignPreview;
