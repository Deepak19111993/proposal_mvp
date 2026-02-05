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

    const truncateWords = (text: string, limit: number) => {
        const words = text.split(' ');
        if (words.length > limit) {
            return words.slice(0, limit).join(' ') + '...';
        }
        return text;
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-100 ring-green-500/20';
        if (score >= 50) return 'text-yellow-600 bg-yellow-100 ring-yellow-500/20';
        return 'text-red-600 bg-red-100 ring-red-500/20';
    };

    if (!item) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-6 w-32" />
                </div>

                <div className="bg-white shadow sm:rounded-lg overflow-hidden border border-gray-100">
                    <div className="bg-indigo-50/50 px-4 py-5 sm:px-6 border-b border-indigo-100">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-start flex-1">
                                <Skeleton className="h-5 w-5 mt-1 rounded-full shrink-0" />
                                <div className="ml-3 space-y-2 flex-1">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-12 w-full" />
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                                <Skeleton className="h-7 w-32 rounded-full" />
                                <div className="space-y-1 flex flex-col items-end">
                                    <Skeleton className="h-3 w-24" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                            </div>
                        </div>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl">
                    Proposal Details
                </h2>
                <Link to="/history" className="text-indigo-600 hover:text-indigo-900 font-medium inline-flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to History
                </Link>
            </div>

            <div className="bg-white shadow sm:rounded-lg overflow-hidden border border-gray-100">
                <div className="bg-indigo-50/50 px-4 py-5 sm:px-6 border-b border-indigo-100">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-start flex-1">
                            <div className="flex-shrink-0 mt-1">
                                <svg className="h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Requirements</h3>
                                <div className="mt-2 text-sm text-gray-700 leading-relaxed italic">
                                    <p className="block md:hidden">"{truncateWords(item.question, 20)}"</p>
                                    <p className="hidden md:block">"{item.question.length > 400 ? item.question.substring(0, 400) + "..." : item.question}"</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 w-full sm:w-auto self-stretch sm:self-auto">
                            {item.fitscore !== undefined && (
                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${getScoreColor(item.fitscore)}`}>
                                    Fit Score: {item.fitscore}/100
                                </span>
                            )}
                            <div className="text-[10px] text-gray-500 flex flex-col items-end">
                                <span>
                                    {new Date(item.timestamp).getDate()}, {new Date(item.timestamp).toLocaleString('default', { month: 'long' })}, {new Date(item.timestamp).getFullYear()}
                                </span>
                                <span>
                                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    </div>
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
