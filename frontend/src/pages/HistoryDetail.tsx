import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getHistoryDetail } from '../api';
import { useLoading } from '../context/LoadingContext';
import { Skeleton } from '../components/ui/Skeleton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BackArrowIcon } from '../assets/svgs/BackArrowIcon';
import { InfoCircleIcon } from '../assets/svgs/InfoCircleIcon';

interface HistoryItem {
    id: string;
    timestamp: string;
    question: string;
    answer: string;
    fitscore?: number;
}

export const HistoryDetail = () => {
    const { id } = useParams<{ id: string }>();
    const [item, setItem] = useState<HistoryItem | null>(null);
    const { startLoading, stopLoading } = useLoading();

    useEffect(() => {
        if (id) {
            startLoading();
            getHistoryDetail(id)
                .then(setItem)
                .catch(console.error)
                .finally(() => stopLoading());
        }
    }, [id, startLoading, stopLoading]);

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
        <div className="space-y-6 3xl:space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl 3xl:text-5xl">
                    Proposal Details
                </h2>
                <Link to="/history" className="text-indigo-600 hover:text-indigo-900 font-medium inline-flex items-center 3xl:text-xl">
                    <BackArrowIcon className="w-4 h-4 3xl:w-6 3xl:h-6 mr-1" />
                    Back to History
                </Link>
            </div>

            <div className="bg-white shadow sm:rounded-lg overflow-hidden border border-gray-100">
                <div className="bg-indigo-50/50 px-4 py-5 sm:px-6 3xl:p-10 border-b border-indigo-100">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-start flex-1">
                            <div className="flex-shrink-0 mt-1">
                                <InfoCircleIcon className="h-5 w-5 3xl:h-8 3xl:w-8 text-indigo-500" />
                            </div>
                            <div className="ml-3 3xl:ml-6">
                                <h3 className="text-sm 3xl:text-xl font-bold text-gray-900 uppercase tracking-wider">Requirements</h3>
                                <div className="mt-2 text-sm 3xl:text-lg text-gray-700 leading-relaxed italic">
                                    <p className="block md:hidden">"{truncateWords(item.question, 40)}"</p>
                                    <p className="hidden md:block">"{item.question.length > 800 ? item.question.substring(0, 800) + "..." : item.question}"</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 3xl:gap-4 w-full sm:w-auto self-stretch sm:self-auto">
                            {item.fitscore !== undefined && (
                                <span className={`inline-flex items-center rounded-full px-3 py-1 3xl:px-4 3xl:py-2 text-xs 3xl:text-lg font-bold ring-1 ring-inset ${getScoreColor(item.fitscore)}`}>
                                    Fit Score: {item.fitscore}/100
                                </span>
                            )}
                            <div className="text-[10px] 3xl:text-sm text-gray-500 flex flex-col items-end">
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
                <div className="px-4 py-5 sm:px-6 3xl:p-10 border-b border-gray-200">
                    <h3 className="text-lg 3xl:text-3xl leading-6 font-medium text-gray-900">Generated Proposal</h3>
                </div>
                <div className="px-4 py-5 sm:p-6 3xl:p-12">
                    <article className="prose prose-indigo 3xl:prose-2xl max-w-none text-gray-800">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.answer}</ReactMarkdown>
                    </article>
                </div>
            </div>
        </div>
    );
};
