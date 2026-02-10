import { useState, useEffect, useCallback } from 'react';
import { generateResume, getResumes, deleteResume } from '../api';
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

interface ResumeItem {
    id: string;
    role: string;
    content: string;
    timestamp: string;
    domain?: string;
    description: string;
}

export const Resume = () => {
    const [role, setRole] = useState('');
    const [description, setDescription] = useState('');
    const [domain, setDomain] = useState('');
    const [hasLoaded, setHasLoaded] = useState(false);
    const { startLoading, stopLoading, loading } = useLoading();
    const [resumes, setResumes] = useState<ResumeItem[]>([]);
    const [selectedResume, setSelectedResume] = useState<ResumeItem | null>(null);
    const { user } = useAuth();

    // Resume Delete Confirmation
    const [resumeToDelete, setResumeToDelete] = useState<string | null>(null);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);


    const loadResumes = useCallback(async () => {
        startLoading();
        try {
            const data = await getResumes();
            setResumes(data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load resumes');
        }
        setHasLoaded(true);
        stopLoading();
    }, [startLoading, stopLoading]);

    useEffect(() => {

        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadResumes();
    }, [loadResumes]);

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



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        startLoading();
        try {
            await generateResume(role, description, domain);
            await loadResumes();
            setRole('');
            setDescription('');
            setDomain('');
            toast.success('Profile uploaded and indexed successfully');
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to process profile");
        }
        stopLoading();
    };

    return (
        <div className={user?.role === 'SUPER_ADMIN' ? "grid grid-cols-1 lg:grid-cols-5 gap-8 3xl:gap-16 items-start" : "space-y-8 3xl:space-y-12"}>
            {user?.role === 'SUPER_ADMIN' && (
                <div className="lg:col-span-2 bg-white py-6 px-4 3xl:p-10 shadow sm:rounded-lg sm:px-6 lg:sticky lg:top-4 mb-6 lg:mb-0">
                    <div className="text-center mb-6 3xl:mb-10">
                        <h2 className="text-2xl md:text-3xl 3xl:text-5xl font-extrabold text-gray-900 border-b pb-4 mb-4 3xl:pb-6 3xl:mb-8">Upload Profile</h2>
                        <p className="text-gray-500 text-sm 3xl:text-lg">
                            Paste your full professional details below. We will chunk and index it for your AI Assistant.
                        </p>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6 3xl:space-y-8">
                        <div className="space-y-1">
                            <label htmlFor="role" className="block text-sm 3xl:text-lg font-medium text-gray-700">Profile Name / Role</label>
                            <div className="mt-1">
                                <Input id="role" type="text" required value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Senior Product Manager" className="mt-1 3xl:p-4 3xl:text-lg" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm 3xl:text-lg font-medium text-gray-700">Domain</label>
                            <Select value={domain} onValueChange={setDomain}>
                                <SelectTrigger className="w-full 3xl:p-4 3xl:text-lg">
                                    <SelectValue placeholder="Select a domain" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Fullstack" className="3xl:text-lg">Fullstack</SelectItem>
                                    <SelectItem value="GenAI" className="3xl:text-lg">GenAI</SelectItem>
                                    <SelectItem value="DevOps" className="3xl:text-lg">DevOps</SelectItem>
                                    <SelectItem value="AI/ML" className="3xl:text-lg">AI/ML</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="description" className="block text-sm 3xl:text-lg font-medium text-gray-700">Full Resume Content</label>
                            <div className="mt-1">
                                <Textarea id="description" required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Paste your professional history or full resume here..." className="mt-1 3xl:p-4 3xl:text-lg h-38 lg:h-48" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <button type="submit" disabled={loading || !role.trim() || !description.trim() || !domain} className={`w-full flex justify-center py-2 px-4 3xl:py-4 3xl:px-8 border border-transparent rounded-md shadow-sm text-sm 3xl:text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 ${(loading || !role.trim() || !description.trim() || !domain) ? 'opacity-75 cursor-not-allowed bg-indigo-400 hover:bg-indigo-400' : ''}`}>
                                {loading ? 'Processing...' : 'Upload and Index'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className={user?.role === 'SUPER_ADMIN' ? "lg:col-span-3" : ""}>
                <h3 className="text-xl 3xl:text-3xl font-bold text-gray-900 mb-4 3xl:mb-8">Your Resumes</h3>
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                        {(!hasLoaded || (loading && resumes.length === 0)) ? (
                            [1, 2, 3].map((i) => (
                                <li key={i}>
                                    <div className="px-4 py-4 3xl:p-8 sm:px-6">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <Skeleton className="h-5 w-40" /> {/* Role */}
                                                <Skeleton className="h-5 w-16 rounded-full" /> {/* Domain */}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Skeleton className="h-5 w-16 rounded-full" /> {/* Status */}
                                            </div>
                                        </div>
                                        <div className="mt-4 3xl:mt-6 flex flex-col gap-3 3xl:gap-4">
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-full" /> {/* Description line 1 */}
                                                <Skeleton className="h-4 w-3/4" /> {/* Description line 2 */}
                                            </div>
                                            <div className="flex flex-col gap-1 mt-1">
                                                <Skeleton className="h-4 w-32" /> {/* Date */}
                                                <Skeleton className="h-3 w-20" /> {/* Time */}
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))
                        ) : (
                            resumes.map((resume) => (
                                <li key={resume.id}>
                                    <div className="block hover:bg-gray-50 w-full text-left focus:outline-none cursor-pointer" onClick={() => setSelectedResume(resume)}>
                                        <div className="px-4 py-4 3xl:p-8 sm:px-6">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex flex-wrap items-center gap-2 min-w-0">
                                                    <p className="text-sm 3xl:text-xl font-bold text-indigo-600 truncate">{resume.role}</p>
                                                    {resume.domain && (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 3xl:px-4 3xl:py-1 rounded-full text-xs 3xl:text-sm font-medium bg-blue-100 text-blue-800">
                                                            {resume.domain}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {user?.role === 'SUPER_ADMIN' && (
                                                        <button
                                                            onClick={(e) => handleDeleteClick(e, resume.id)}
                                                            className="px-2 py-1 3xl:px-4 3xl:py-2 text-xs 3xl:text-sm font-semibold rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors z-10 relative"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                    <p className="px-2 py-0.5 3xl:px-4 3xl:py-1 inline-flex text-xs 3xl:text-sm leading-5 font-semibold rounded-full bg-green-100 text-green-800 border border-green-200">
                                                        Ready
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-2 3xl:mt-4 flex flex-col gap-2 3xl:gap-4">
                                                <p className="text-sm 3xl:text-lg text-gray-500 line-clamp-2">
                                                    {resume.description}
                                                </p>
                                                <div className="flex flex-col items-start gap-0.5">
                                                    <span className="text-sm 3xl:text-lg font-medium text-gray-900">
                                                        {new Date(resume.timestamp).getDate()}, {new Date(resume.timestamp).toLocaleString('default', { month: 'long' })}, {new Date(resume.timestamp).getFullYear()}
                                                    </span>
                                                    <span className="text-gray-500 text-xs 3xl:text-sm">
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
