import { useEffect, useState } from 'react';
import { getHistory, deleteHistory } from '../api';
import { useLoading } from '../context/LoadingContext';
import { Link } from 'react-router-dom';
import { TrashIcon } from '@heroicons/react/24/outline';
import { Skeleton } from '../components/ui/Skeleton';
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

interface HistoryItem {
    id: string;
    timestamp: string;
    question: string;
    answer?: string;
    fitscore?: number;
}

export const History = () => {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [hasLoaded, setHasLoaded] = useState(false);
    const { startLoading, stopLoading, loading } = useLoading();
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    useEffect(() => {
        startLoading();
        getHistory()
            .then(setHistory)
            .catch(console.error)
            .finally(() => {
                stopLoading();
                setHasLoaded(true);
            });
    }, [startLoading, stopLoading]);

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
        setIsDeleteOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        startLoading();
        try {
            await deleteHistory(deleteId);
            setHistory(history.filter(item => item.id !== deleteId));
        } catch (error) {
            console.error("Failed to delete history item", error);
            // alert("Failed to delete item."); // Replace with toast later if needed
        }
        stopLoading();
        setIsDeleteOpen(false);
        setDeleteId(null);
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-100 ring-green-500/20';
        if (score >= 50) return 'text-yellow-600 bg-yellow-100 ring-yellow-500/20';
        return 'text-red-600 bg-red-100 ring-red-500/20';
    };

    const truncateWords = (text: string, limit: number) => {
        const words = text.split(' ');
        if (words.length > limit) {
            return words.slice(0, limit).join(' ') + '...';
        }
        return text;
    };

    const truncateChars = (text: string, limit: number) => {
        if (text.length > limit) {
            return text.substring(0, limit) + '...';
        }
        return text;
    };

    return (
        <div className="space-y-8 3xl:space-y-12">
            <div className="md:flex md:items-center md:justify-between">
                <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl 3xl:text-5xl sm:truncate">
                        Proposal History
                    </h2>
                </div>
                <div className="mt-4 flex md:mt-0 md:ml-4">
                    <Link
                        to="/"
                        className="flex justify-center py-2 px-4 3xl:py-4 3xl:px-8 border border-transparent rounded-md shadow-sm text-sm 3xl:text-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                    >
                        New Proposal
                    </Link>
                </div>
            </div>

            <div className="flex flex-col">
                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {(!hasLoaded || (loading && history.length === 0)) ? (
                        [1, 2, 3].map((i) => (
                            <div key={`skeleton-card-${i}`} className="bg-white shadow rounded-lg p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                    <Skeleton className="h-6 w-16 rounded-md" />
                                </div>
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-2/3" />
                                <div className="flex justify-end gap-4 pt-2">
                                    <Skeleton className="h-4 w-12" />
                                    <Skeleton className="h-5 w-5 rounded-md" />
                                </div>
                            </div>
                        ))
                    ) : (
                        history.map((item) => (
                            <div key={`card-${item.id}`} className="bg-white shadow rounded-lg p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-900">
                                            {new Date(item.timestamp).getDate()}, {new Date(item.timestamp).toLocaleString('default', { month: 'long' })}, {new Date(item.timestamp).getFullYear()}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    {item.fitscore !== undefined && (
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getScoreColor(item.fitscore)}`}>
                                            {item.fitscore}/100
                                        </span>
                                    )}
                                </div>
                                <div className="text-sm text-gray-900 leading-relaxed italic">
                                    "{truncateWords(item.question, 30)}"
                                </div>
                                <div className="flex justify-end items-center gap-6 pt-2 border-t border-gray-50">
                                    <Link to={`/history/${item.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-900">
                                        View Proposal
                                    </Link>
                                    <button
                                        onClick={() => handleDeleteClick(item.id)}
                                        className="text-red-600 hover:text-red-900 p-1"
                                        title="Delete"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                    {hasLoaded && !loading && history.length === 0 && (
                        <div className="bg-white shadow rounded-lg p-8 text-center text-sm text-gray-500">
                            No proposals found.
                        </div>
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                        <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="w-[180px] 3xl:w-[250px] px-6 py-3 3xl:px-8 3xl:py-5 text-left text-xs 3xl:text-base font-medium text-gray-500 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th scope="col" className="px-6 py-3 3xl:px-8 3xl:py-5 text-left text-xs 3xl:text-base font-medium text-gray-500 uppercase tracking-wider">
                                            Requirements
                                        </th>
                                        <th scope="col" className="w-[120px] 3xl:w-[180px] px-6 py-3 3xl:px-8 3xl:py-5 text-left text-xs 3xl:text-base font-medium text-gray-500 uppercase tracking-wider">
                                            Fit Score
                                        </th>
                                        <th scope="col" className="w-[120px] px-6 py-3 3xl:px-8 3xl:py-5 text-right text-xs 3xl:text-base font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {(!hasLoaded || (loading && history.length === 0)) ? (
                                        [1, 2, 3, 4, 5].map((i) => (
                                            <tr key={`skeleton-row-${i}`}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <Skeleton className="h-[1.25rem] w-28" />
                                                        <Skeleton className="h-[1rem] w-20 mt-1" />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Skeleton className="h-[1.25rem] w-full" />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="inline-flex items-center">
                                                        <Skeleton className="h-6 w-16 rounded-md" />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <div className="flex justify-end items-center space-x-4">
                                                        <Skeleton className="h-[1.25rem] w-8" />
                                                        <Skeleton className="h-5 w-5 rounded-md" />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        history.map((item) => (
                                            <tr key={item.id}>
                                                <td className="px-6 py-4 3xl:px-8 3xl:py-6 whitespace-nowrap text-sm 3xl:text-lg text-gray-500 align-middle">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-900 leading-[1.25rem] 3xl:leading-[1.75rem]">
                                                            {new Date(item.timestamp).getDate()}, {new Date(item.timestamp).toLocaleString('default', { month: 'long' })}, {new Date(item.timestamp).getFullYear()}
                                                        </span>
                                                        <span className="text-gray-500 text-xs 3xl:text-sm mt-1 leading-[1rem]">
                                                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 3xl:px-8 3xl:py-6 text-sm 3xl:text-xl text-gray-900 break-words whitespace-normal align-middle">
                                                    <div className="leading-[1.25rem] 3xl:leading-[1.75rem]">{truncateChars(item.question, 250)}</div>
                                                </td>
                                                <td className="px-6 py-4 3xl:px-8 3xl:py-6 whitespace-nowrap text-sm 3xl:text-lg align-middle">
                                                    <div className="inline-flex items-center">
                                                        {item.fitscore !== undefined ? (
                                                            <span className={`inline-flex items-center rounded-md px-2 py-1 3xl:px-3 3xl:py-2 text-xs 3xl:text-base font-medium ring-1 ring-inset ${getScoreColor(item.fitscore)}`}>
                                                                {item.fitscore}/100
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400">N/A</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 3xl:px-8 3xl:py-6 whitespace-nowrap text-right text-sm 3xl:text-lg font-medium align-middle">
                                                    <div className="flex justify-end items-center space-x-4 3xl:space-x-8">
                                                        <Link to={`/history/${item.id}`} className="text-indigo-600 hover:text-indigo-900 leading-[1.25rem]">
                                                            View
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDeleteClick(item.id)}
                                                            className="text-red-600 hover:text-red-900 focus:outline-none"
                                                            title="Delete"
                                                        >
                                                            <TrashIcon className="h-5 w-5 3xl:h-7 3xl:w-7" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                    {hasLoaded && !loading && history.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-4 3xl:p-12 text-center text-sm 3xl:text-xl text-gray-500">
                                                No proposals found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Proposal</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this proposal? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
