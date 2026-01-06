import React, { useState } from 'react';
import { Camera, Sparkles, X, Download, RefreshCw, Loader2, Maximize2 } from 'lucide-react';
import { AIService } from '../services/AIService';
import type { RoomLabel } from '../types';

interface AIRenderingOverlayProps {
    apiKey: string;
    onBack: () => void;
    activeRoom?: RoomLabel | null;
}

export const AIRenderingOverlay: React.FC<AIRenderingOverlayProps> = ({ apiKey, onBack, activeRoom }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [renderedImage, setRenderedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showComparison, setShowComparison] = useState(false);
    const [originalScreenshot, setOriginalScreenshot] = useState<string | null>(null);

    const handleRender = async () => {
        // R3F puts the ID on the container div, so we need to find the nested canvas
        const canvas = document.querySelector('#three-canvas canvas') as HTMLCanvasElement;

        if (!canvas) {
            setError("Could not find the 3D scene. Please try refreshing.");
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            // 1. Capture Screenshot
            const screenshot = canvas.toDataURL('image/png');
            setOriginalScreenshot(screenshot);

            // 2. Identify Context
            const activePrompt = activeRoom?.visualizationPrompt || "A photorealistic render of an architect-designed interior.";
            const activeRefs = activeRoom?.referenceImages || [];

            console.log("SENDING TO AI:", {
                room: activeRoom?.text,
                prompt: activePrompt,
                references: activeRefs.length
            });

            // 3. Send to AI
            const result = await AIService.renderPhotorealistic(screenshot, apiKey, activePrompt, activeRefs);
            setRenderedImage(result);
        } catch (err: any) {
            console.error("Rendering Error:", err);
            setError(err.message || "Failed to generate photorealistic render.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = () => {
        if (!renderedImage) return;
        const link = document.createElement('a');
        link.href = renderedImage;
        link.download = `archi-render-${Date.now()}.png`;
        link.click();
    };

    return (
        <div className="absolute inset-x-0 top-0 pointer-events-none p-6 flex flex-col items-center">
            {/* Control Bar */}
            {!renderedImage && (
                <div className="pointer-events-auto bg-black/80 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/20 flex flex-col items-center gap-4 max-w-md animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-3 text-white">
                        <div className="p-2 bg-indigo-500 rounded-lg">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Studio AI Renderer</h2>
                            <p className="text-xs text-white/60">Position camera then hit render</p>
                        </div>
                    </div>

                    <button
                        onClick={handleRender}
                        disabled={isGenerating || !apiKey}
                        className="group relative w-full overflow-hidden px-8 py-4 bg-white text-black rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    >
                        <div className="flex items-center justify-center gap-2">
                            {isGenerating ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>Developing...</span>
                                </>
                            ) : (
                                <>
                                    <Camera size={18} />
                                    <span>Generate AI Render</span>
                                </>
                            )}
                        </div>
                        {!apiKey && <p className="mt-2 text-[10px] text-red-500 font-normal">API Key required</p>}
                    </button>

                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-xs">
                            {error}
                        </div>
                    )}

                    {/* AI Payload Preview - Requested by User */}
                    <div className="w-full mt-4 p-4 bg-zinc-900/50 rounded-xl border border-white/10 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Active Context</span>
                            {activeRoom ? (
                                <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded-full font-bold">{activeRoom.text.toUpperCase()}</span>
                            ) : (
                                <span className="text-[10px] text-zinc-500 italic">No room in focus</span>
                            )}
                        </div>

                        <div className="space-y-1">
                            <span className="text-[9px] text-zinc-500 uppercase font-bold">Visualization Prompt</span>
                            <p className="text-[11px] text-zinc-300 leading-relaxed line-clamp-3 italic">
                                "{activeRoom?.visualizationPrompt || "Default architectural style..."}"
                            </p>
                        </div>

                        {activeRoom?.referenceImages && activeRoom.referenceImages.length > 0 && (
                            <div className="space-y-1">
                                <span className="text-[9px] text-zinc-500 uppercase font-bold">Style Context ({activeRoom.referenceImages.length} images)</span>
                                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                                    {activeRoom.referenceImages.slice(0, 5).map((img, i) => (
                                        <div key={i} className="w-8 h-8 rounded border border-white/10 overflow-hidden flex-shrink-0">
                                            <img src={img} className="w-full h-full object-cover opacity-60" alt="" />
                                        </div>
                                    ))}
                                    {activeRoom.referenceImages.length > 5 && (
                                        <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-[10px] text-zinc-500 font-bold">
                                            +{activeRoom.referenceImages.length - 5}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <p className="text-[9px] text-zinc-500 pt-2 border-t border-white/5 italic">
                            Gemini 3 will combine this viewport + prompt + references to generate the final render.
                        </p>
                    </div>
                </div>
            )}

            {/* Results Modal */}
            {renderedImage && (
                <div className="fixed inset-0 pointer-events-auto bg-black/95 z-50 flex flex-col animate-in fade-in duration-300">
                    <div className="flex justify-between items-center p-6 border-b border-white/10">
                        <div className="flex items-center gap-4 text-white">
                            <h2 className="text-xl font-bold font-serif italic tracking-wider">ArchiGenius <span className="text-indigo-400 not-italic font-sans font-medium text-sm ml-2">Photoreal V.4</span></h2>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setShowComparison(!showComparison)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${showComparison ? 'bg-white text-black' : 'text-white border-white/20 hover:bg-white/10'}`}
                            >
                                <Maximize2 size={16} />
                                <span className="text-sm font-medium">Compare</span>
                            </button>
                            <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors">
                                <Download size={16} />
                                <span className="text-sm font-medium">Download</span>
                            </button>
                            <button onClick={() => setRenderedImage(null)} className="p-2 text-white/50 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 relative overflow-hidden flex items-center justify-center p-8">
                        <div className="relative w-full h-full max-w-6xl flex items-center justify-center">
                            {showComparison && originalScreenshot ? (
                                <div className="grid grid-cols-2 gap-4 w-full h-full">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Digital Model (Input)</span>
                                        <img src={originalScreenshot} className="w-full h-full object-contain rounded-2xl border border-white/10" alt="Original" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <span className="text-indigo-400 text-[10px] uppercase font-bold tracking-widest">AI Masterpiece (Output)</span>
                                        <img src={renderedImage} className="w-full h-full object-contain rounded-2xl shadow-2xl ring-1 ring-white/20" alt="Render" />
                                    </div>
                                </div>
                            ) : (
                                <img src={renderedImage} className="max-w-full max-h-full object-contain rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10" alt="Final Render" />
                            )}
                        </div>
                    </div>

                    <div className="p-8 flex justify-center gap-6">
                        <button
                            onClick={() => { setRenderedImage(null); handleRender(); }}
                            className="flex items-center gap-2 px-8 py-3 rounded-xl border border-white/20 text-white hover:bg-white/10 transition-colors"
                        >
                            <RefreshCw size={18} />
                            <span>Remaster</span>
                        </button>
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 px-8 py-3 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 transition-colors"
                        >
                            <X size={18} />
                            <span>Return to Scene</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
