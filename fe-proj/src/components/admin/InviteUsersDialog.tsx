import React, { useState } from 'react';
import { useAuth } from '@/contexts/auth/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { UserPlus, X, Mail } from 'lucide-react';
import type { UserRole } from '@/contexts/auth/types';

const InviteUsersDialog: React.FC = () => {
  const { inviteUsers } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<UserRole>('driver');
  const [isInviting, setIsInviting] = useState(false);

  const addEmail = () => {
    const email = emailInput.trim();
    if (email && !emails.includes(email) && email.includes('@')) {
      setEmails([...emails, email]);
      setEmailInput('');
    }
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails(emails.filter(email => email !== emailToRemove));
  };

  const handleBulkEmails = (text: string) => {
    const emailList = text
      .split(/[\n,;]/)
      .map(email => email.trim())
      .filter(email => email && email.includes('@') && !emails.includes(email));
    
    setEmails([...emails, ...emailList]);
  };

  const handleInvite = async () => {
    if (emails.length === 0) return;

    setIsInviting(true);
    try {
      await inviteUsers(emails, selectedRole);
      toast({
        title: "Invitations sent",
        description: `${emails.length} invitation${emails.length > 1 ? 's' : ''} sent successfully.`,
      });
      setEmails([]);
      setEmailInput('');
      setIsOpen(false);
    } catch (error: any) {
      toast({
        title: "Error sending invitations",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Users
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Users to Organization</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addEmail()}
              />
              <Button onClick={addEmail} size="sm">
                Add
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="bulk-emails">Or paste multiple emails</Label>
            <Textarea
              id="bulk-emails"
              placeholder="Paste emails separated by commas, semicolons, or new lines"
              onBlur={(e) => {
                if (e.target.value.trim()) {
                  handleBulkEmails(e.target.value);
                  e.target.value = '';
                }
              }}
            />
          </div>

          {emails.length > 0 && (
            <div>
              <Label>Email List ({emails.length})</Label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded">
                {emails.map((email) => (
                  <Badge key={email} variant="secondary" className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {email}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-red-500" 
                      onClick={() => removeEmail(email)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="role">Default Role</Label>
            <Select value={selectedRole} onValueChange={(value: UserRole) => setSelectedRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="driver">Driver</SelectItem>
                <SelectItem value="fleet_manager">Fleet Manager</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleInvite} 
              disabled={emails.length === 0 || isInviting}
            >
              {isInviting ? 'Sending...' : `Invite ${emails.length} User${emails.length > 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteUsersDialog;