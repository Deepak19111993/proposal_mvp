import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { askGemini } from '../api';
import { useLoading } from '../context/LoadingContext';
import { Skeleton } from '../components/ui/Skeleton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const Home = () => {
    const [question, setQuestion] = useState('');

    const [result, setResult] = useState<{ answer: string, question: string, fitscore?: number } | null>(null);
    const { startLoading, stopLoading, loading } = useLoading();
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user?.role === 'SUPER_ADMIN') {
            navigate('/users');
        }
    }, [user, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        startLoading();
        setResult(null);
        try {
            const reqBody = { question };
            const data = await askGemini(reqBody);
            setResult(data);
        } catch (error: any) {
            console.error(error);
            setResult({ question, answer: error.message || 'Error connecting to server.' });
        }
        stopLoading();
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-100 ring-green-500/20';
        if (score >= 50) return 'text-yellow-600 bg-yellow-100 ring-yellow-500/20';
        return 'text-red-600 bg-red-100 ring-red-500/20';
    };

    const isSubmitDisabled = loading || !question.trim();

    return (
        <div className="space-y-8 max-w-[750px] mx-auto">
            <div className="text-center">
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
                    Proposal <span className="text-indigo-600">Generator</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl">
                    Describe your requirements, and I'll generate a detailed proposal with a compatibility score.
                </p>
            </div>

            <div className="bg-white py-6 px-[15px] sm:px-[25px] shadow sm:rounded-lg">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="question" className="block text-sm font-medium text-gray-700">
                            Project Requirements (Paste Job Description Here)
                        </label>
                        <div className="mt-1">
                            <textarea
                                id="question"
                                rows={6}
                                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="E.g., I need a mobile app for a food delivery service... (Copy-paste the full job description)"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isSubmitDisabled}
                            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 ${isSubmitDisabled ? 'opacity-75 cursor-not-allowed bg-indigo-400 hover:bg-indigo-400' : ''}`}
                        >
                            {loading ? 'Generating Proposal...' : 'Generate Proposal'}
                        </button>
                    </div>
                </form>
            </div>

            {loading && !result && (
                <div className="space-y-6">
                    <div className="bg-white shadow sm:rounded-lg overflow-hidden p-6 space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-[90%]" />
                        <Skeleton className="h-4 w-[95%]" />
                        <div className="pt-4 space-y-3">
                            <Skeleton className="h-8 w-1/4" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                        <div className="pt-4 space-y-3">
                            <Skeleton className="h-8 w-1/4" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                        </div>
                    </div>
                </div>
            )}

            {result && (
                <div className="space-y-6">
                    <div className="bg-white shadow sm:rounded-lg overflow-hidden">
                        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">Generated Proposal</h3>
                            {result.fitscore !== undefined && (
                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getScoreColor(result.fitscore)}`}>
                                    Fit Score: {result.fitscore}/100
                                </span>
                            )}
                        </div>
                        <div className="px-4 py-5 sm:p-6">
                            <article className="prose prose-indigo max-w-none text-gray-800">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.answer}</ReactMarkdown>
                            </article>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
