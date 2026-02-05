import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getHistoryDetail } from '../api';
import { useLoading } from '../context/LoadingContext';
import { Skeleton } from '../components/ui/Skeleton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const HistoryDetail = () => {
    const { id } = useParams<{ id: string }>();
    const [item, setItem] = useState<any>(null);
    const { startLoading, stopLoading } = useLoading();

    useEffect(() => {
        if (id) {
            startLoading();
            getHistoryDetail(id)
                .then(setItem)
                .catch(console.error)
                .finally(() => stopLoading());
        }
    }, [id]);

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-100 ring-green-500/20';
        if (score >= 50) return 'text-yellow-600 bg-yellow-100 ring-yellow-500/20';
        return 'text-red-600 bg-red-100 ring-red-500/20';
    };

    if (!item) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-6 w-32" />
                </div>

                <div className="bg-white shadow sm:rounded-lg p-6 space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </div>

                <div className="bg-white shadow sm:rounded-lg overflow-hidden">
                    <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                        <Skeleton className="h-6 w-48" />
                    </div>
                    <div className="px-4 py-5 sm:p-6 space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-[90%]" />
                        <Skeleton className="h-4 w-[95%]" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-[80%]" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                    Proposal Details
                </h2>
                <Link to="/history" className="text-indigo-600 hover:text-indigo-900 font-medium">← Back to History</Link>
            </div>

            <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4">
                <div className="flex justify-between items-start">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-indigo-800">Requirements</h3>
                            <div className="mt-2 text-sm text-indigo-700">
                                <p>{item.question}</p>
                            </div>
                            <div className="mt-2 text-xs text-indigo-500 flex flex-col">
                                <span>
                                    {new Date(item.timestamp).getDate()}, {new Date(item.timestamp).toLocaleString('default', { month: 'long' })}, {new Date(item.timestamp).getFullYear()}
                                </span>
                                <span>
                                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    </div>
                    {item.fitscore !== undefined && (
                        <span className={`ml-4 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getScoreColor(item.fitscore)}`}>
                            Fit Score: {item.fitscore}/100
                        </span>
                    )}
                </div>
            </div>

            <div className="bg-white shadow sm:rounded-lg overflow-hidden">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Generated Proposal</h3>
                </div>
                <div className="px-4 py-5 sm:p-6">
                    <article className="prose prose-indigo max-w-none text-gray-800">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.answer}</ReactMarkdown>
                    </article>
                </div>
            </div>
        </div>
    );
};
