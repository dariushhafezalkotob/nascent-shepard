import React, { useState } from 'react';
import { Camera, Sparkles, X, Download, RefreshCw, Loader2, Maximize2 } from 'lucide-react';
import { AIService } from '../services/AIService';
import type { RoomLabel } from '../types';

interface AIRenderingOverlayProps {
    apiKey: string;
    onBack: () => void;
    activeRoom?: RoomLabel | null;
    styleLibrary?: Record<string, string[]>;
    roomMappings?: Record<string, string>;
}

export const AIRenderingOverlay: React.FC<AIRenderingOverlayProps> = ({
    apiKey,
    onBack,
    activeRoom,
    styleLibrary = {},
    roomMappings = {}
}) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [renderedImage, setRenderedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showComparison, setShowComparison] = useState(false);
    const [originalScreenshot, setOriginalScreenshot] = useState<string | null>(null);

    const viewfinderRef = React.useRef<HTMLDivElement>(null);

    const handleRender = async () => {
        const canvas = document.querySelector('#three-canvas canvas') as HTMLCanvasElement;
        const viewfinder = viewfinderRef.current;

        if (!canvas || !viewfinder) {
            setError("Could not find the 3D scene or viewfinder.");
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            // ... (screenshot logic remains same)
            const canvasRect = canvas.getBoundingClientRect();
            const vfRect = viewfinder.getBoundingClientRect();
            const scaleX = canvas.width / canvasRect.width;
            const scaleY = canvas.height / canvasRect.height;
            const cropX = (vfRect.left - canvasRect.left) * scaleX;
            const cropY = (vfRect.top - canvasRect.top) * scaleY;
            const cropW = vfRect.width * scaleX;
            const cropH = vfRect.height * scaleY;

            const tempCanvas = document.createElement('canvas');
            const tCtx = tempCanvas.getContext('2d');
            if (!tCtx) throw new Error("Context failed");
            tempCanvas.width = cropW;
            tempCanvas.height = cropH;

            tCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
            const screenshot = tempCanvas.toDataURL('image/png');
            setOriginalScreenshot(screenshot);

            // 3. Identify Context using Library fallback
            const activePrompt = activeRoom?.visualizationPrompt || "A photorealistic render of an architect-designed interior.";

            const category = activeRoom ? roomMappings[activeRoom.id] : null;
            const activeRefs = activeRoom?.referenceImages?.length
                ? activeRoom.referenceImages
                : (category ? (styleLibrary[category] || []) : []);

            // 4. Send to AI
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
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center">
            {/* Viewfinder Layer */}
            {!renderedImage && (
                <div className="absolute inset-0 flex items-center justify-center">
                    {/* Side Masks Only */}
                    <div className="absolute left-0 top-0 bottom-0 w-[7.5vw] bg-black/40" />
                    <div className="absolute right-0 top-0 bottom-0 w-[7.5vw] bg-black/40" />

                    {/* Viewfinder Rectangle (16:9) */}
                    <div
                        ref={viewfinderRef}
                        className="w-[85vw] aspect-video border-2 border-white/50 rounded-sm shadow-[0_0_0_1px_rgba(0,0,0,0.5),0_0_40px_rgba(0,0,0,0.3)] relative flex items-center justify-center"
                    >
                        {/* Corner markers */}
                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-white" />
                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-white" />
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-white" />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-white" />

                        {/* Grid lines (optional but professional) */}
                        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20">
                            <div className="border border-white/30" />
                            <div className="border border-white/30" />
                            <div className="border border-white/30" />
                            <div className="border border-white/30" />
                            <div className="border border-white/30" />
                            <div className="border border-white/30" />
                            <div className="border border-white/30" />
                            <div className="border border-white/30" />
                            <div className="border border-white/30" />
                        </div>
                    </div>
                </div>
            )}

            {/* Control Bar */}
            {!renderedImage && (
                <div className="absolute top-6 pointer-events-auto bg-black/80 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/20 flex flex-col items-center gap-4 max-w-md animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-3 text-white">
                        <div className="p-2 bg-indigo-500 rounded-lg">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Studio AI Renderer</h2>
                            <p className="text-xs text-white/60">Compose shot inside frame then render</p>
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

                        {(() => {
                            const category = activeRoom ? roomMappings[activeRoom.id] : null;
                            const images = activeRoom?.referenceImages?.length ? activeRoom.referenceImages : (category ? (styleLibrary[category] || []) : []);

                            if (images.length === 0) return null;

                            return (
                                <div className="space-y-1">
                                    <span className="text-[9px] text-zinc-500 uppercase font-bold">Style Context ({images.length} images - {category})</span>
                                    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                                        {images.slice(0, 5).map((img, i) => (
                                            <div key={i} className="w-8 h-8 rounded border border-white/10 overflow-hidden flex-shrink-0">
                                                <img src={img} className="w-full h-full object-cover opacity-60" alt="" />
                                            </div>
                                        ))}
                                        {images.length > 5 && (
                                            <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-[10px] text-zinc-500 font-bold">
                                                +{images.length - 5}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

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
