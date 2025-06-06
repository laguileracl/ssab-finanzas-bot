import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Plus, Edit, Users as UsersIcon, UserCheck } from "lucide-react";
import { Link } from "wouter";

export default function Users() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    telegramId: "",
    username: "",
    firstName: "",
    lastName: "",
    role: "requester",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/telegram-users"],
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      return await apiRequest("/api/telegram-users", {
        method: "POST",
        body: JSON.stringify(userData),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/telegram-users"] });
      toast({ title: "User created successfully" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create user", variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: number; userData: any }) => {
      return await apiRequest(`/api/telegram-users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(userData),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/telegram-users"] });
      toast({ title: "User updated successfully" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to update user", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      telegramId: "",
      username: "",
      firstName: "",
      lastName: "",
      role: "requester",
    });
    setEditingUser(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = () => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, userData: formData });
    } else {
      createUserMutation.mutate(formData);
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setFormData({
      telegramId: user.telegramId,
      username: user.username || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      role: user.role,
    });
    setIsDialogOpen(true);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'requester': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'finance_team': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'manager': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'requester': return '👤';
      case 'finance_team': return '💼';
      case 'manager': return '👨‍💼';
      default: return '👤';
    }
  };

  const groupedUsers = users ? users.reduce((acc: any, user: any) => {
    if (!acc[user.role]) acc[user.role] = [];
    acc[user.role].push(user);
    return acc;
  }, {}) : {};

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
                <p className="text-gray-600 dark:text-gray-300">Manage Telegram users and their permissions</p>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingUser ? 'Edit User' : 'Add New User'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingUser ? 'Update user details and permissions' : 'Add a new Telegram user to the system'}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Telegram ID</label>
                    <Input
                      placeholder="e.g., 123456789"
                      value={formData.telegramId}
                      onChange={(e) => setFormData(prev => ({ ...prev, telegramId: e.target.value }))}
                      disabled={!!editingUser}
                    />
                    {editingUser && (
                      <p className="text-xs text-gray-500 mt-1">Telegram ID cannot be changed</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Username</label>
                    <Input
                      placeholder="@username"
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">First Name</label>
                      <Input
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Last Name</label>
                      <Input
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Role</label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="requester">Requester</SelectItem>
                        <SelectItem value="finance_team">Finance Team</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-gray-500 mt-1">
                      <p>• Requester: Can submit finance requests</p>
                      <p>• Finance Team: Can process and respond to requests</p>
                      <p>• Manager: Full access to dashboard and analytics</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={!formData.telegramId || createUserMutation.isPending || updateUserMutation.isPending}
                    >
                      {editingUser ? 'Update' : 'Add'} User
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-center py-8">Loading users...</div>
        ) : Object.keys(groupedUsers).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedUsers).map(([role, roleUsers]: [string, any]) => (
              <Card key={role}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">{getRoleIcon(role)}</span>
                    <span className="capitalize">{role.replace('_', ' ')}</span>
                    <Badge className={getRoleColor(role)}>
                      {roleUsers.length} user{roleUsers.length !== 1 ? 's' : ''}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {role === 'requester' && 'Users who can submit finance requests through Telegram'}
                    {role === 'finance_team' && 'Team members who process finance requests'}
                    {role === 'manager' && 'Managers with full dashboard access'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {roleUsers.map((user: any) => (
                      <div key={user.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-5 w-5 text-green-600" />
                            <Badge className={getRoleColor(user.role)}>
                              {user.role.replace('_', ' ')}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {user.firstName || user.lastName 
                              ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                              : user.username || 'Unnamed User'
                            }
                          </h3>
                          
                          {user.username && (
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              @{user.username}
                            </p>
                          )}
                          
                          <p className="text-xs text-gray-500">
                            ID: {user.telegramId}
                          </p>
                          
                          <p className="text-xs text-gray-500">
                            Added: {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <UsersIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No users yet</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Add Telegram users to start managing finance requests. Users will be automatically registered when they interact with the bot.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First User
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}