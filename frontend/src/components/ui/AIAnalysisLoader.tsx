import { Sparkles } from 'lucide-react';

interface AIAnalysisLoaderProps {
    status?: string;
}

export const AIAnalysisLoader = ({ status = "AI is analysing..." }: AIAnalysisLoaderProps) => {
    return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4 bg-white rounded-lg border border-gray-100 shadow-sm min-h-[300px]">
            <div className="relative">
                <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-20"></div>
                <div className="relative p-4 bg-indigo-50 rounded-full ring-1 ring-indigo-100">
                    <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" />
                </div>
            </div>
            <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 transition-all duration-500 ease-in-out">
                    {status}
                </h3>
                <p className="text-sm text-gray-500 max-w-xs mx-auto">
                    Reviewing your requirements and crafting a tailored proposal.
                    This usually takes a few seconds.
                </p>
            </div>
            <div className="flex gap-1 mt-2">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
            </div>
        </div>
    );
};
