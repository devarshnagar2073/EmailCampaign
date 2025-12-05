
import React from 'react';
import { User, UserRole } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '../components/ui/ui-components';
import { User as UserIcon, Calendar, Shield, Mail, Server } from 'lucide-react';

interface UserProfileProps {
  user: User;
}

const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  const quotaPercentage = Math.min(((user.emailsSentToday || 0) / (user.dailyQuota || 100)) * 100, 100);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Profile</h1>
        <p className="text-muted-foreground">Manage your account details and view your quotas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Identity</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center text-center space-y-4">
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <UserIcon size={48} />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold">{user.username}</h3>
              <div className="flex justify-center">
                 <Badge variant={user.role === UserRole.ADMIN ? "default" : "secondary"}>{user.role}</Badge>
              </div>
            </div>
            <div className="w-full border-t pt-4 text-left space-y-3 text-sm">
                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2"><Calendar size={14}/> Member Since</span>
                    <span className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2"><Shield size={14}/> Account ID</span>
                    <span className="font-mono text-xs">{(user.id || '').substring(0, 8)}...</span>
                </div>
            </div>
          </CardContent>
        </Card>

        {/* Quota & Stats */}
        <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Server size={20}/> Usage & Quota</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                        <span>Daily Email Quota</span>
                        <span>{user.emailsSentToday || 0} / {user.dailyQuota || 100}</span>
                    </div>
                    <div className="h-4 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-500 ${quotaPercentage > 90 ? 'bg-destructive' : 'bg-primary'}`} 
                            style={{ width: `${quotaPercentage}%` }}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Resets daily at 00:00 server time.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50 border">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <Mail size={16}/> Sent Today
                        </div>
                        <p className="text-2xl font-bold">{user.emailsSentToday || 0}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <Server size={16}/> Remaining
                        </div>
                        <p className="text-2xl font-bold">{(user.dailyQuota || 100) - (user.emailsSentToday || 0)}</p>
                    </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-4 rounded-md text-sm border border-blue-200 dark:border-blue-800">
                    <strong>Note:</strong> If you need a higher quota, please contact an administrator to upgrade your plan.
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserProfile;
