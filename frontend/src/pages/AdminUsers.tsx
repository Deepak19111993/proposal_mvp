import { useState, useEffect, useCallback } from 'react';
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
import { EyeIcon } from "../assets/svgs/EyeIcon";
import { EyeSlashIcon } from "../assets/svgs/EyeSlashIcon";
import { EditIcon } from "../assets/svgs/EditIcon";

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

    const loadUsers = useCallback(async () => {
        startLoading();
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load users');
        }
        stopLoading();
    }, [startLoading, stopLoading]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadUsers();
    }, [loadUsers]);

    const togglePasswordVisibility = (userId: string) => {
        setVisiblePasswords(prev => ({
            ...prev,
            [userId]: !prev[userId]
        }));
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
        <div className="space-y-6 3xl:space-y-10">
            <div className="flex flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-900 3xl:text-4xl">User Management</h2>
                <div className="flex justify-end">
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="min-w-[100px] px-4 py-2 3xl:px-6 3xl:py-3 border border-transparent rounded-md shadow-sm text-sm 3xl:text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        Add User
                    </button>
                </div>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {loading && users.length === 0 ? (
                        [1, 2, 3].map(i => (
                            <li key={i} className="px-4 py-4 3xl:p-8 flex items-center justify-between">
                                <div className="space-y-2 3xl:space-y-4">
                                    <Skeleton className="h-4 w-32 3xl:w-48" />
                                    <Skeleton className="h-3 w-48 3xl:w-64" />
                                    <div className="flex items-center mt-1 space-x-2 3xl:space-x-4">
                                        <Skeleton className="h-5 w-20 3xl:h-7 3xl:w-28 rounded-full" />
                                        <div className="flex items-center space-x-1 3xl:space-x-2">
                                            <Skeleton className="h-4 w-16 3xl:w-24 rounded" />
                                            <Skeleton className="h-4 w-4 3xl:h-6 3xl:w-6 rounded" />
                                            <Skeleton className="h-4 w-4 3xl:h-6 3xl:w-6 rounded" />
                                        </div>
                                    </div>
                                </div>
                                <Skeleton className="h-4 w-12 3xl:w-20" />
                            </li>
                        ))
                    ) : (
                        users.map((user) => (
                            <li key={user.id} className="px-4 py-4 3xl:p-8 flex items-center justify-between hover:bg-gray-50">
                                <div className="3xl:space-y-2">
                                    <p className="text-sm 3xl:text-xl font-medium text-indigo-600">{user.name}</p>
                                    <p className="text-sm 3xl:text-lg text-gray-500">{user.email}</p>
                                    <div className="flex items-center mt-1 space-x-2 3xl:space-x-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 3xl:px-4 3xl:py-1 rounded-full text-xs 3xl:text-base font-medium ${user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                            {user.role}
                                        </span>
                                        {user.domain && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 3xl:px-4 3xl:py-1 rounded-full text-xs 3xl:text-base font-medium bg-blue-100 text-blue-800">
                                                {user.domain}
                                            </span>
                                        )}
                                        <div className="flex items-center text-xs 3xl:text-base text-gray-500 space-x-1 3xl:space-x-2">
                                            <span className="font-mono bg-gray-100 px-1 rounded">
                                                {visiblePasswords[user.id] ? user.password : '••••••••'}
                                            </span>
                                            <button
                                                onClick={() => togglePasswordVisibility(user.id)}
                                                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                                            >
                                                {visiblePasswords[user.id] ? (
                                                    <EyeIcon className="w-4 h-4 3xl:w-6 3xl:h-6" />
                                                ) : (
                                                    <EyeSlashIcon className="w-4 h-4 3xl:w-6 3xl:h-6" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => openEditUser(user)}
                                                className="text-gray-400 hover:text-indigo-600 focus:outline-none ml-1"
                                                title="Edit User"
                                            >
                                                <EditIcon className="w-4 h-4 3xl:w-6 3xl:h-6" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteClick(user.id)}
                                    className="text-red-600 hover:text-red-900 text-sm 3xl:text-lg font-medium"
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
                                            <EyeIcon className="w-5 h-5" />
                                        ) : (
                                            <EyeSlashIcon className="w-5 h-5" />
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
                                            <EyeIcon className="w-5 h-5" />
                                        ) : (
                                            <EyeSlashIcon className="w-5 h-5" />
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
                                            <EyeIcon className="w-5 h-5" />
                                        ) : (
                                            <EyeSlashIcon className="w-5 h-5" />
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
