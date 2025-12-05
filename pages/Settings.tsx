
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ApiService } from '../services/apiService';
import { User } from '../types';
import { Settings as SettingsIcon, CheckCircle, Wifi, AlertCircle, Loader2, Info, ExternalLink, X, ShieldCheck } from 'lucide-react';
import { Button, Input, Label, Card, CardHeader, CardTitle, CardContent } from '../components/ui/ui-components';
import { useToast } from '../components/ui/GlobalFeedback';

interface SettingsProps {
    user: User;
    onUpdateUser: (user: User) => void;
}

const Settings: React.FC<SettingsProps> = ({ user, onUpdateUser }) => {
    const [smtpHost, setSmtpHost] = useState(user.smtpConfig?.host || '');
    const [smtpPort, setSmtpPort] = useState(user.smtpConfig?.port?.toString() || '587');
    const [smtpUser, setSmtpUser] = useState(user.smtpConfig?.user || '');
    const [smtpPass, setSmtpPass] = useState(user.smtpConfig?.pass || '');
    const [fromEmail, setFromEmail] = useState(user.smtpConfig?.fromEmail || '');
    const [settingsSaved, setSettingsSaved] = useState(false);
    
    // Test State
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{success: boolean, msg: string} | null>(null);

    // Docs State
    const [showGmailDocs, setShowGmailDocs] = useState(false);

    const toast = useToast();

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const updatedConfig = await ApiService.updateSMTP({
                host: smtpHost,
                port: parseInt(smtpPort),
                user: smtpUser,
                pass: smtpPass,
                fromEmail
            });
            
            // Update the global user state so ComposeModal sees the new config immediately
            onUpdateUser({ 
                ...user, 
                smtpConfig: updatedConfig 
            });

            setSettingsSaved(true);
            toast.success("SMTP Configuration saved successfully");
            setTimeout(() => setSettingsSaved(false), 3000);
        } catch (e) {
            toast.error("Failed to save settings.");
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await ApiService.testSMTP({
                host: smtpHost,
                port: parseInt(smtpPort),
                user: smtpUser,
                pass: smtpPass,
                fromEmail
            });
            setTestResult({ success: true, msg: res.msg });
            toast.success("Connection Successful");
        } catch (e: any) {
            setTestResult({ success: false, msg: e.message || 'Connection Failed' });
            toast.error(e.message || 'Connection Failed');
        } finally {
            setTesting(false);
        }
    };

    const autofillGmail = () => {
        setSmtpHost('smtp.gmail.com');
        setSmtpPort('587');
        toast.info("Gmail presets applied. Please enter your email and App Password.");
    };

    return (
        <div className="p-8 max-w-3xl mx-auto space-y-6">
             <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Configure your SMTP server to start sending emails.</p>
            </div>
            
            {/* Gmail Recommendation Banner */}
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-start gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 shrink-0 mt-0.5">
                    <Info size={20} />
                </div>
                <div className="space-y-2 flex-1">
                    <h4 className="font-bold text-indigo-900">Gmail Recommended</h4>
                    <p className="text-sm text-indigo-700 leading-relaxed">
                        For personal use, we recommend using Gmail with an <strong>App Password</strong>. It's free, reliable, and secure. 
                        Do not use your regular login password.
                    </p>
                    <div className="flex gap-2 pt-1">
                         <Button size="sm" variant="secondary" onClick={autofillGmail} className="bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50">
                             Apply Gmail Presets
                         </Button>
                         <Button size="sm" variant="link" onClick={() => setShowGmailDocs(true)} className="text-indigo-700 p-0 h-9 px-3">
                             How to get App Password?
                         </Button>
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><SettingsIcon size={20}/> SMTP Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSaveSettings} className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>SMTP Host</Label>
                                <Input placeholder="smtp.gmail.com" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} required />
                                <p className="text-[10px] text-muted-foreground">The address of your mail server.</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Port</Label>
                                <Input type="number" placeholder="587" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} required />
                                <p className="text-[10px] text-muted-foreground">Usually 587 (TLS) or 465 (SSL).</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Username</Label>
                                <Input placeholder="your.email@gmail.com" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Password / App Password</Label>
                                <Input type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} required />
                                <p className="text-[10px] text-muted-foreground">Use App Password for Gmail/Outlook.</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Sender Email (From)</Label>
                            <Input type="email" placeholder="you@company.com" value={fromEmail} onChange={e => setFromEmail(e.target.value)} required />
                            <p className="text-[10px] text-muted-foreground">Emails will appear to come from this address.</p>
                        </div>
                        
                        {testResult && (
                            <div className={`text-sm p-3 rounded flex items-center gap-2 ${testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                {testResult.success ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
                                {testResult.msg}
                            </div>
                        )}

                        <div className="pt-4 flex items-center justify-between">
                                <Button type="button" variant="secondary" onClick={handleTestConnection} disabled={testing}>
                                    {testing ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Wifi className="mr-2 h-4 w-4"/>}
                                    Test Connection
                                </Button>

                                <div className="flex items-center gap-3">
                                    {settingsSaved && <span className="text-sm text-green-600 flex items-center gap-1 animate-in fade-in slide-in-from-left-2"><CheckCircle size={14}/> Settings Saved</span>}
                                    <Button type="submit">Save Configuration</Button>
                                </div>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Documentation Modal */}
            {showGmailDocs && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                     <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowGmailDocs(false)} />
                     <Card className="w-full max-w-lg relative bg-white border-0 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                         <div className="h-2 w-full bg-indigo-500"></div>
                         <button onClick={() => setShowGmailDocs(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
                         <div className="p-6 pb-2">
                             <div className="flex items-center gap-3 mb-4">
                                <div className="bg-indigo-100 p-3 rounded-full text-indigo-600"><ShieldCheck size={24}/></div>
                                <h2 className="text-xl font-bold">Gmail App Password Guide</h2>
                             </div>
                             <p className="text-sm text-slate-500">
                                 Google requires an App Password for third-party apps to send email securely.
                             </p>
                         </div>
                         <CardContent className="space-y-6 pt-2">
                             <div className="space-y-4">
                                 <div className="flex gap-4">
                                     <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 border border-slate-200">1</div>
                                     <div className="text-sm text-slate-700">Go to your <a href="https://myaccount.google.com/" target="_blank" className="text-indigo-600 font-medium underline">Google Account</a> settings.</div>
                                 </div>
                                 <div className="flex gap-4">
                                     <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 border border-slate-200">2</div>
                                     <div className="text-sm text-slate-700">Navigate to <strong>Security</strong> and ensure <strong>2-Step Verification</strong> is ON.</div>
                                 </div>
                                 <div className="flex gap-4">
                                     <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 border border-slate-200">3</div>
                                     <div className="text-sm text-slate-700">Use the search bar at the top to search for "<strong>App Passwords</strong>".</div>
                                 </div>
                                 <div className="flex gap-4">
                                     <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 border border-slate-200">4</div>
                                     <div className="text-sm text-slate-700">Create a new app password (name it "EmailShooter") and copy the 16-character code.</div>
                                 </div>
                                 <div className="flex gap-4">
                                     <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 border border-slate-200">5</div>
                                     <div className="text-sm text-slate-700">Paste that code into the <strong>Password</strong> field in SMTP settings here.</div>
                                 </div>
                             </div>
                             <div className="bg-slate-50 p-3 rounded-lg border text-xs text-slate-500 flex gap-2">
                                 <Info size={16} className="shrink-0"/>
                                 Use smtp.gmail.com, Port 587, and your full Gmail address as username.
                             </div>
                         </CardContent>
                         <div className="p-6 pt-2 flex justify-end">
                             <Button onClick={() => setShowGmailDocs(false)}>Got it</Button>
                         </div>
                     </Card>
                </div>,
                document.body
            )}
        </div>
    );
}

export default Settings;
