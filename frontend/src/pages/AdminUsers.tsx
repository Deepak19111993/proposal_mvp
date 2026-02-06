import { useState, useEffect } from 'react';
import { getUsers, deleteUser, createUser, updateUser } from '../api';
import { useLoading } from '../context/LoadingContext';
import { Skeleton } from '../components/ui/Skeleton';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "../components/ui/dialog"
import {
    SelectTrigger,
    SelectValue,
    Select,
    SelectContent,
    SelectItem,
} from "../components/ui/select"
import { Input } from "../components/ui/input"
import { toast } from "sonner"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "../components/ui/alert-dialog"

export const AdminUsers = () => {
    const [users, setUsers] = useState<any[]>([]);
    const { startLoading, stopLoading, loading } = useLoading();
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Create form state
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newUserRole, setNewUserRole] = useState('USER');
    const [newUserDomain, setNewUserDomain] = useState('');
    const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

    // Update Password/User State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [updateUserId, setUpdateUserId] = useState('');
    const [updateData, setUpdateData] = useState({ email: '', role: '', password: '', name: '', domain: '' });
    const [originalUpdateData, setOriginalUpdateData] = useState({ email: '', role: '', name: '', domain: '' });
    const [currentEditUserPassword, setCurrentEditUserPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showCreatePassword, setShowCreatePassword] = useState(false);

    // Delete Confirmation State
    const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    const togglePasswordVisibility = (userId: string) => {
        setVisiblePasswords(prev => ({
            ...prev,
            [userId]: !prev[userId]
        }));
    };

    const loadUsers = async () => {
        startLoading();
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load users');
        }
        stopLoading();
    };

    const confirmDeleteUser = async () => {
        if (!deleteUserId) return;
        startLoading();
        try {
            await deleteUser(deleteUserId);
            setUsers(users.filter(u => u.id !== deleteUserId));
            toast.success('User deleted successfully');
        } catch (error) {
            toast.error('Failed to delete user');
        }
        stopLoading();
        setIsDeleteAlertOpen(false);
        setDeleteUserId(null);
    };

    const handleDeleteClick = (id: string) => {
        setDeleteUserId(id);
        setIsDeleteAlertOpen(true);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        startLoading();
        try {
            await createUser(newUserEmail, newUserPassword, newUserName, newUserRole, newUserDomain || undefined);
            setIsCreateOpen(false);
            setNewUserEmail('');
            setNewUserPassword('');
            setNewUserName('');
            setNewUserRole('USER');
            setNewUserDomain('');
            setShowCreatePassword(false);
            loadUsers(); // Reload list
        } catch (error: any) {
            toast.error(error.message);
        }
        stopLoading();
    };

    const openEditUser = (user: any) => {
        setUpdateUserId(user.id);
        const data = {
            email: user.email,
            role: user.role,
            name: user.name,
            domain: user.domain || '',
            password: ''
        };
        setUpdateData(data);
        setOriginalUpdateData({
            email: user.email,
            role: user.role,
            name: user.name,
            domain: user.domain || ''
        });
        setCurrentEditUserPassword(user.password || '');
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setIsEditModalOpen(true);
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        startLoading();
        try {
            const payload: any = {
                email: updateData.email,
                role: updateData.role,
                name: updateData.name,
                domain: updateData.domain
            };
            if (updateData.password) payload.password = updateData.password;

            await updateUser(updateUserId, payload);
            setIsEditModalOpen(false);
            toast.success('User updated successfully');
            loadUsers();
        } catch (error: any) {
            toast.error(error.message);
        }
        stopLoading();
    };

    const isModified =
        updateData.name !== originalUpdateData.name ||
        updateData.email !== originalUpdateData.email ||
        updateData.role !== originalUpdateData.role ||
        updateData.domain !== originalUpdateData.domain ||
        updateData.password !== '';

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    Add User
                </button>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {loading && users.length === 0 ? (
                        [1, 2, 3].map(i => (
                            <li key={i} className="px-4 py-4 flex items-center justify-between">
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-48" />
                                    <div className="flex items-center mt-1 space-x-2">
                                        <Skeleton className="h-5 w-20 rounded-full" />
                                        <div className="flex items-center space-x-1">
                                            <Skeleton className="h-4 w-16 rounded" />
                                            <Skeleton className="h-4 w-4 rounded" />
                                            <Skeleton className="h-4 w-4 rounded" />
                                        </div>
                                    </div>
                                </div>
                                <Skeleton className="h-4 w-12" />
                            </li>
                        ))
                    ) : (
                        users.map((user) => (
                            <li key={user.id} className="px-4 py-4 flex items-center justify-between hover:bg-gray-50">
                                <div>
                                    <p className="text-sm font-medium text-indigo-600">{user.name}</p>
                                    <p className="text-sm text-gray-500">{user.email}</p>
                                    <div className="flex items-center mt-1 space-x-2">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                            {user.role}
                                        </span>
                                        {user.domain && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {user.domain}
                                            </span>
                                        )}
                                        <div className="flex items-center text-xs text-gray-500 space-x-1">
                                            <span className="font-mono bg-gray-100 px-1 rounded">
                                                {visiblePasswords[user.id] ? user.password : '••••••••'}
                                            </span>
                                            <button
                                                onClick={() => togglePasswordVisibility(user.id)}
                                                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                                            >
                                                {visiblePasswords[user.id] ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => openEditUser(user)}
                                                className="text-gray-400 hover:text-indigo-600 focus:outline-none ml-1"
                                                title="Edit User"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteClick(user.id)}
                                    className="text-red-600 hover:text-red-900 text-sm font-medium"
                                >
                                    Delete
                                </button>
                            </li>
                        ))
                    )}
                </ul>
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New User</DialogTitle>
                        <DialogDescription>
                            Enter details to create a new user.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className='space-y-1'>
                            <label className="block text-sm font-medium text-gray-700">Name</label>
                            <Input type="text" required value={newUserName} onChange={(e) => setNewUserName(e.target.value)} className="mt-1" autoComplete="off" />
                        </div>
                        <div className='space-y-1'>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <Input type="email" required value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} className="mt-1" autoComplete="off" />
                        </div>
                        <div className='space-y-1'>
                            <label className="block text-sm font-medium text-gray-700">Password</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <Input
                                    type={showCreatePassword ? "text" : "password"}
                                    required
                                    value={newUserPassword}
                                    onChange={(e) => setNewUserPassword(e.target.value)}
                                    className="pr-10"
                                    autoComplete="new-password"
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreatePassword(!showCreatePassword)}
                                        className="text-gray-400 hover:text-gray-500 focus:outline-none"
                                    >
                                        {showCreatePassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className='space-y-1'>
                            <label className="block text-sm font-medium text-gray-700">Role</label>
                            <Select value={newUserRole} onValueChange={setNewUserRole}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USER">User</SelectItem>
                                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className='space-y-1'>
                            <label className="block text-sm font-medium text-gray-700">Domain (Optional)</label>
                            <Select value={newUserDomain} onValueChange={setNewUserDomain}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select domain" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Fullstack">Fullstack</SelectItem>
                                    <SelectItem value="GenAI">GenAI</SelectItem>
                                    <SelectItem value="DevOps">DevOps</SelectItem>
                                    <SelectItem value="AI/ML">AI/ML</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Create User
                        </button>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>
                            Update user details. Leave password blank to keep current password.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateUser} className="space-y-4">
                        <div className='space-y-1'>
                            <label className="block text-sm font-medium text-gray-700">Name</label>
                            <Input type="text" value={updateData.name} onChange={(e) => setUpdateData({ ...updateData, name: e.target.value })} className="mt-1" />
                        </div>
                        <div className='space-y-1'>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <Input type="email" value={updateData.email} onChange={(e) => setUpdateData({ ...updateData, email: e.target.value })} className="mt-1" />
                        </div>
                        <div className='space-y-1'>
                            <label className="block text-sm font-medium text-gray-700">Role</label>
                            <Select value={updateData.role} onValueChange={(value: string) => setUpdateData({ ...updateData, role: value })}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USER">User</SelectItem>
                                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className='space-y-1'>
                            <label className="block text-sm font-medium text-gray-700">Domain (Optional)</label>
                            <Select value={updateData.domain} onValueChange={(value: string) => setUpdateData({ ...updateData, domain: value })}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select domain" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Fullstack">Fullstack</SelectItem>
                                    <SelectItem value="GenAI">GenAI</SelectItem>
                                    <SelectItem value="DevOps">DevOps</SelectItem>
                                    <SelectItem value="AI/ML">AI/ML</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className='space-y-1'>
                            <label className="block text-sm font-medium text-gray-700">Current Password</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <Input
                                    type={showCurrentPassword ? "text" : "password"}
                                    value={currentEditUserPassword}
                                    readOnly
                                    autoComplete="off"
                                    className="pr-10 bg-gray-50 text-gray-500"
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="text-gray-400 hover:text-gray-500 focus:outline-none"
                                    >
                                        {showCurrentPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className='space-y-1'>
                            <label className="block text-sm font-medium text-gray-700">New Password (optional)</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <Input
                                    type={showNewPassword ? "text" : "password"}
                                    value={updateData.password}
                                    onChange={(e) => setUpdateData({ ...updateData, password: e.target.value })}
                                    className="pr-10"
                                    placeholder="Leave blank to keep current"
                                    autoComplete="new-password"
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="text-gray-400 hover:text-gray-500 focus:outline-none"
                                    >
                                        {showNewPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <button type="submit" disabled={!isModified} className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${!isModified ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            Update User
                        </button>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the user account and remove their data from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteUser} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
                            {loading ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
