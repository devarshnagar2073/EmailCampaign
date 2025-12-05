import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/apiService';
import { 
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import { 
    Card, CardHeader, CardTitle, CardContent, Button, Badge 
} from '../components/ui/ui-components';
import { Download, FileText, CheckCircle, XCircle, AlertTriangle, RefreshCw, Trash2, CheckSquare } from 'lucide-react';
import { useToast, useConfirm } from '../components/ui/GlobalFeedback';

const Analytics: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    
    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const toast = useToast();
    const confirm = useConfirm();

    useEffect(() => {
        loadLogs(page);
    }, [page]);

    const loadLogs = async (p: number) => {
        setLoading(true);
        try {
            const data = await ApiService.getLogs(p, 20); // 20 items per page
            setLogs(data.logs);
            setTotalPages(data.totalPages);
            setSelectedIds(new Set()); 
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleAll = () => {
        if (selectedIds.size === logs.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(logs.map(l => l._id)));
    };

    const handleBulkDelete = async () => {
        const isConfirmed = await confirm({
            title: "Bulk Delete",
            description: `Are you sure you want to delete ${selectedIds.size} logs? This action cannot be undone.`,
            variant: 'destructive',
            confirmText: "Delete Logs"
        });

        if (isConfirmed) {
            try {
                await ApiService.deleteLogsBulk(Array.from(selectedIds));
                toast.success("Logs deleted successfully");
                loadLogs(page);
            } catch(e) { 
                toast.error("Failed to delete logs"); 
            }
        }
    };

    const handleBulkReview = async () => {
        try {
            await ApiService.markLogsReviewed(Array.from(selectedIds));
            toast.success("Logs marked as reviewed");
            loadLogs(page);
        } catch(e) { 
            toast.error("Failed to update logs"); 
        }
    };

    const sentCount = logs.filter(l => l.status === 'SENT').length;
    const failedCount = logs.filter(l => l.status === 'FAILED').length;

    const campaignPerformance = logs.reduce((acc: any, log) => {
        const name = log.campaignName || 'Unnamed';
        if (!acc[name]) acc[name] = { name, sent: 0, failed: 0 };
        if (log.status === 'SENT') acc[name].sent++;
        else acc[name].failed++;
        return acc;
    }, {});
    const performanceData = Object.values(campaignPerformance);

    const downloadReport = () => {
        // Only downloads current page in this simple implementation, ideally would trigger backend export
        const csvContent = "data:text/csv;charset=utf-8," 
          + "Recipient,Status,Time,Campaign,Error,Reviewed\n"
          + logs.map(e => `${e.recipient},${e.status},${new Date(e.timestamp).toISOString()},${e.campaignName},${e.errorMessage || ''},${e.isReviewed ? 'Yes' : 'No'}`).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `campaign_report_page_${page}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.info("Report downloaded");
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard & Analytics</h1>
                    <p className="text-muted-foreground">Overview of your email campaigns and delivery status.</p>
                </div>
                <div className="flex gap-2">
                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-5 mr-4 bg-muted/50 p-1 rounded-md">
                             <Button size="sm" variant="ghost" onClick={handleBulkReview}>
                                <CheckSquare size={14} className="mr-2"/> Mark Reviewed
                             </Button>
                             <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                                <Trash2 size={14} className="mr-2"/> Delete ({selectedIds.size})
                             </Button>
                        </div>
                    )}
                    <Button variant="outline" onClick={() => loadLogs(page)}>
                        <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                </div>
            </div>

            {/* Failure Warning */}
            {failedCount > 0 && (failedCount / (sentCount + failedCount) > 0.1) && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-md flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={18} />
                        <span>High failure rate detected on this page. Please check your SMTP credentials and daily limits.</span>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{logs.length} <span className="text-sm font-normal text-muted-foreground">emails</span></div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Success Rate (Page)</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                        {logs.length > 0 ? ((sentCount / logs.length) * 100).toFixed(1) : 0}%
                    </div>
                    <p className="text-xs text-muted-foreground">{sentCount} delivered</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Failed (Page)</CardTitle>
                    <XCircle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-destructive">{failedCount}</div>
                </CardContent>
            </Card>
            </div>

            {/* Charts & Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Pie Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Delivery Status</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                    {logs.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Sent', value: sentCount, color: '#22c55e' },
                                        { name: 'Failed', value: failedCount, color: '#ef4444' }
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    <Cell fill="hsl(var(--primary))" />
                                    <Cell fill="hsl(var(--destructive))" />
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-muted-foreground">No data to display</p>
                    )}
                </CardContent>
            </Card>

            {/* Campaign Comparison Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Campaign Performance</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                    {performanceData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={performanceData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Legend />
                                <Bar dataKey="sent" fill="hsl(var(--primary))" name="Sent" stackId="a" />
                                <Bar dataKey="failed" fill="hsl(var(--destructive))" name="Failed" stackId="a" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                            No campaigns run yet.
                        </div>
                    )}
                </CardContent>
            </Card>
            </div>

            {/* Logs Table */}
            <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Delivery Logs</CardTitle>
                <Button variant="outline" size="sm" onClick={downloadReport}>
                    <Download size={14} className="mr-2"/> Export CSV
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                <div className="max-h-[500px] overflow-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 sticky top-0">
                            <tr className="border-b">
                                <th className="px-4 py-3 w-[40px]">
                                    <input type="checkbox" onChange={toggleAll} checked={logs.length > 0 && selectedIds.size === logs.length} />
                                </th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">Campaign</th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">Recipient</th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">Time</th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">Reviewed</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => (
                                <tr key={log._id} className={`border-b hover:bg-muted/50 transition-colors ${selectedIds.has(log._id) ? 'bg-muted/30' : ''}`}>
                                    <td className="px-4 py-3">
                                        <input type="checkbox" checked={selectedIds.has(log._id)} onChange={() => toggleSelection(log._id)} />
                                    </td>
                                    <td className="px-4 py-3 font-medium">{log.campaignName}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{log.recipient}</td>
                                    <td className="px-4 py-3">
                                        <Badge variant={log.status === 'SENT' ? 'secondary' : 'destructive'} className={log.status === 'SENT' ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}>
                                            {log.status}
                                        </Badge>
                                        {log.errorMessage && <span className="ml-2 text-xs text-destructive">({log.errorMessage})</span>}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                    <td className="px-4 py-3">
                                        {log.isReviewed && <CheckCircle size={14} className="text-green-500" />}
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No activity yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination Controls */}
                <div className="p-4 border-t flex items-center justify-between">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                    >
                        Next
                    </Button>
                </div>
            </CardContent>
            </Card>
        </div>
    );
}

export default Analytics;