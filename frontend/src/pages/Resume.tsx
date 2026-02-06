import { useState, useEffect } from 'react';
import { generateResume, getResumes, deleteResume, updateResume } from '../api';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Skeleton } from '../components/ui/Skeleton';
import { Input } from "../components/ui/input"
import { Textarea } from "../components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "../components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../components/ui/select"
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

export const Resume = () => {
    const [role, setRole] = useState('');
    const [description, setDescription] = useState('');
    const [domain, setDomain] = useState('');
    const [hasLoaded, setHasLoaded] = useState(false);
    const { startLoading, stopLoading, loading } = useLoading();
    const [resumes, setResumes] = useState<any[]>([]);
    const [selectedResume, setSelectedResume] = useState<any | null>(null);
    const { user } = useAuth();

    // Resume Delete Confirmation
    const [resumeToDelete, setResumeToDelete] = useState<string | null>(null);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

    useEffect(() => {
        loadResumes();
    }, []);

    const loadResumes = async () => {
        startLoading();
        try {
            const data = await getResumes();
            setResumes(data);
        } catch (error) {
            console.error(error);
        }
        stopLoading();
        setHasLoaded(true);
    };

    const confirmDeleteResume = async () => {
        if (!resumeToDelete) return;
        try {
            await deleteResume(resumeToDelete);
            setResumes(prev => prev.filter(r => r.id !== resumeToDelete));
            toast.success('Resume deleted successfully');
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete');
        }
        setIsDeleteAlertOpen(false);
        setResumeToDelete(null);
    };

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setResumeToDelete(id);
        setIsDeleteAlertOpen(true);
    };

    const handleUpdateDomain = async (id: string, newDomain: string) => {
        try {
            await updateResume(id, newDomain);
            setResumes(prev => prev.map(r => r.id === id ? { ...r, domain: newDomain } : r));
            toast.success('Domain updated');
        } catch (error) {
            toast.error('Failed to update domain');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        startLoading();
        try {
            await generateResume(role, description, domain);
            await loadResumes();
            setRole('');
            setDescription('');
            setDomain('');
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate resume");
        }
        stopLoading();
    };

    return (
        <div className={user?.role === 'SUPER_ADMIN' ? "grid grid-cols-1 lg:grid-cols-5 gap-8 items-start" : "space-y-8"}>
            {user?.role === 'SUPER_ADMIN' && (
                <div className="lg:col-span-2 bg-white py-6 px-4 shadow sm:rounded-lg sm:px-6 lg:sticky lg:top-4 mb-8 lg:mb-0">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-extrabold text-gray-900 border-b pb-4 mb-4">Resume Generator</h2>
                        <p className="text-gray-500">Create a tailored resume in seconds.</p>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-1">
                            <label htmlFor="role" className="block text-sm font-medium text-gray-700">Target Role</label>
                            <div className="mt-1">
                                <Input id="role" type="text" required value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Senior Product Manager" className="mt-1" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Domain</label>
                            <Select value={domain} onValueChange={setDomain}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a domain (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Fullstack">Fullstack</SelectItem>
                                    <SelectItem value="GenAI">GenAI</SelectItem>
                                    <SelectItem value="DevOps">DevOps</SelectItem>
                                    <SelectItem value="AI/ML">AI/ML</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Job Description / Your Experience</label>
                            <div className="mt-1">
                                <Textarea id="description" rows={4} required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Paste the job description or a summary of your skills..." className="mt-1" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <button type="submit" disabled={loading || !role.trim() || !description.trim()} className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 ${(loading || !role.trim() || !description.trim()) ? 'opacity-75 cursor-not-allowed bg-indigo-400 hover:bg-indigo-400' : ''}`}>
                                {loading ? 'Generating...' : 'Generate Resume'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className={user?.role === 'SUPER_ADMIN' ? "lg:col-span-3" : ""}>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Your Resumes</h3>
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                        {(!hasLoaded || (loading && resumes.length === 0)) ? (
                            [1, 2, 3].map((i) => (
                                <li key={i}>
                                    <div className="px-4 py-4 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Skeleton className="h-4 w-32" />
                                                <Skeleton className="h-5 w-20 rounded-full" />
                                            </div>
                                            <div className="ml-2 flex items-center gap-2">
                                                <Skeleton className="h-5 w-16 rounded-full" />
                                            </div>
                                        </div>
                                        <div className="mt-2 sm:flex sm:justify-between">
                                            <div className="sm:flex">
                                                <Skeleton className="h-4 w-64" />
                                            </div>
                                            <div className="mt-2 flex items-center sm:mt-0">
                                                <div className="flex flex-col items-end">
                                                    <Skeleton className="h-4 w-28" />
                                                    <Skeleton className="h-3 w-16 mt-1" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))
                        ) : (
                            resumes.map((resume) => (
                                <li key={resume.id}>
                                    <div className="block hover:bg-gray-50 w-full text-left focus:outline-none cursor-pointer" onClick={() => setSelectedResume(resume)}>
                                        <div className="px-4 py-4 sm:px-6">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex flex-wrap items-center gap-2 min-w-0">
                                                    <p className="text-sm font-bold text-indigo-600 truncate">{resume.role}</p>
                                                    {user?.role === 'SUPER_ADMIN' ? (
                                                        <div onClick={(e) => e.stopPropagation()}>
                                                            <Select
                                                                value={resume.domain || ''}
                                                                onValueChange={(val) => handleUpdateDomain(resume.id, val)}
                                                            >
                                                                <SelectTrigger className="h-7 w-[110px] text-xs bg-gray-50 border-gray-200">
                                                                    <SelectValue placeholder="Domain" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="Fullstack">Fullstack</SelectItem>
                                                                    <SelectItem value="GenAI">GenAI</SelectItem>
                                                                    <SelectItem value="DevOps">DevOps</SelectItem>
                                                                    <SelectItem value="AI/ML">AI/ML</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    ) : resume.domain && (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                            {resume.domain}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {user?.role === 'SUPER_ADMIN' && (
                                                        <button
                                                            onClick={(e) => handleDeleteClick(e, resume.id)}
                                                            className="px-2 py-1 text-xs font-semibold rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors z-10 relative"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                    <p className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 border border-green-200">
                                                        Ready
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-2 flex flex-col gap-2">
                                                <p className="text-sm text-gray-500 line-clamp-2">
                                                    {resume.description}
                                                </p>
                                                <div className="flex flex-col items-start gap-0.5">
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {new Date(resume.timestamp).getDate()}, {new Date(resume.timestamp).toLocaleString('default', { month: 'long' })}, {new Date(resume.timestamp).getFullYear()}
                                                    </span>
                                                    <span className="text-gray-500 text-xs">
                                                        {new Date(resume.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))
                        )}
                        {hasLoaded && !loading && resumes.length === 0 && (
                            <li className="px-4 py-4 sm:px-6 text-center text-gray-500">No resumes generated yet.</li>
                        )}
                    </ul>
                </div>
            </div>

            <Dialog open={!!selectedResume} onOpenChange={(open) => !open && setSelectedResume(null)}>
                <DialogContent className="max-w-5xl! h-[90vh] overflow-y-auto rounded-lg">
                    <DialogHeader>
                        <DialogTitle>Resume for {selectedResume?.role}</DialogTitle>
                        <DialogDescription>
                            Generated on {selectedResume?.timestamp && (
                                <span className="flex flex-col">
                                    <span className="font-medium">
                                        {new Date(selectedResume.timestamp).getDate()}, {new Date(selectedResume.timestamp).toLocaleString('default', { month: 'long' })}, {new Date(selectedResume.timestamp).getFullYear()}
                                    </span>
                                    <span className="text-xs">
                                        {new Date(selectedResume.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 prose prose-indigo max-w-none text-gray-800 text-left">
                        <article>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedResume?.content}</ReactMarkdown>
                        </article>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Resume</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this resume? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteResume} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
};
