import React, { useState } from 'react';
import { Sparkles, X, Download, RefreshCw, Loader2, Maximize2, Image as ImageIcon } from 'lucide-react';
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
    const [userCustomPrompt, setUserCustomPrompt] = useState("");
    const [userStyleImage, setUserStyleImage] = useState<string | null>(null);
    const [isEditingMode, setIsEditingMode] = useState(false);
    const [editStyleImage, setEditStyleImage] = useState<string | null>(null);
    const [isApplyingEdit, setIsApplyingEdit] = useState(false);

    const viewfinderRef = React.useRef<HTMLDivElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setUserStyleImage(reader.result as string);
        reader.readAsDataURL(file);
    };

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
            // 1. Capture Viewport immediately
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

            // Force output to a clean 16:9 HD resolution
            const TARGET_WIDTH = 1280;
            const TARGET_HEIGHT = 720;
            tempCanvas.width = TARGET_WIDTH;
            tempCanvas.height = TARGET_HEIGHT;

            tCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
            const screenshot = tempCanvas.toDataURL('image/png');
            setOriginalScreenshot(screenshot);

            // 2. Prepare AI Request
            let finalPrompt = userCustomPrompt;
            if (userStyleImage) {
                finalPrompt = `Replace all the items in image 1 with items in image 2. Do not change furniture places and rotations. ${finalPrompt}`;
            } else if (!finalPrompt) {
                finalPrompt = activeRoom?.visualizationPrompt || "A photorealistic render of an architect-designed interior.";
            }

            const category = activeRoom ? roomMappings[activeRoom.id] : null;
            let activeRefs = activeRoom?.referenceImages?.length
                ? [...activeRoom.referenceImages]
                : (category ? [...(styleLibrary[category] || [])] : []);

            if (userStyleImage) {
                activeRefs = [userStyleImage, ...activeRefs];
            }

            // 3. Send to AI
            const result = await AIService.renderPhotorealistic(screenshot, apiKey, finalPrompt, activeRefs);
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

    const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setEditStyleImage(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleApplyEdit = async () => {
        if (!renderedImage || !editStyleImage) return;
        setIsApplyingEdit(true);
        setError(null);

        try {
            const prompt = "replace all the items in image 1 with items in image 2. Do not change furniture places and rotations; maintain the exact layout of Image 1.";
            // In this phase, Image 1 is the previous Rendered AI image.
            // Image 2 is the newly uploaded editStyleImage.
            const result = await AIService.renderPhotorealistic(renderedImage, apiKey, prompt, [editStyleImage]);
            setRenderedImage(result);
            setEditStyleImage(null);
            setIsEditingMode(false);
        } catch (err: any) {
            console.error("Edit Transformation Error:", err);
            setError(err.message || "Failed to edit render.");
        } finally {
            setIsApplyingEdit(false);
        }
    };

    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center">
            {/* Viewfinder Layer (Always visible when not showing results) */}
            {!renderedImage && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="absolute left-0 top-0 bottom-0 w-[7.5vw] bg-black/40" />
                    <div className="absolute right-0 top-0 bottom-0 w-[7.5vw] bg-black/40" />
                    <div
                        ref={viewfinderRef}
                        className="w-[85vw] aspect-video border-2 border-white/50 rounded-sm shadow-[0_0_0_1px_rgba(0,0,0,0.5),0_0_40px_rgba(0,0,0,0.3)] relative flex items-center justify-center transition-opacity duration-500"
                        style={{ opacity: isGenerating ? 0.3 : 1 }}
                    >
                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-white" />
                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-white" />
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-white" />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-white" />
                        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20">
                            {[...Array(9)].map((_, i) => <div key={i} className="border border-white/30" />)}
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar Controls */}
            {!renderedImage && (
                <div className="absolute top-6 pointer-events-auto bg-black/80 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/20 flex flex-col gap-4 w-[400px] animate-in fade-in slide-in-from-top-4 duration-500 overflow-y-auto max-h-[90vh] scrollbar-hide">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-white">
                            <div className="p-2 bg-indigo-500 rounded-lg">
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">Studio AI Renderer</h2>
                                <p className="text-xs text-white/60">Configure style then hit Generate</p>
                            </div>
                        </div>
                        <button onClick={onBack} className="p-2 text-white/40 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-4 py-2 border-y border-white/10">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                <Maximize2 size={12} /> Detailed Context
                            </label>
                            <textarea
                                value={userCustomPrompt}
                                onChange={(e) => setUserCustomPrompt(e.target.value)}
                                placeholder="Add specific details or leave blank for auto-architectural focus..."
                                className="w-full h-24 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition-colors resize-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                <ImageIcon size={12} /> Reference Style (Optional)
                            </label>
                            <label className="block cursor-pointer">
                                <div className="h-20 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-white/5 transition-all overflow-hidden">
                                    {userStyleImage ? (
                                        <div className="relative w-full h-full">
                                            <img src={userStyleImage} className="w-full h-full object-cover" alt="Style" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                <RefreshCw size={20} className="text-white" />
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <Download size={20} className="text-white/20" />
                                            <span className="text-[10px] text-white/40">Drop style image here</span>
                                        </>
                                    )}
                                </div>
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                            </label>
                        </div>
                    </div>

                    <button
                        onClick={handleRender}
                        disabled={isGenerating || !apiKey}
                        className="group relative w-full overflow-hidden px-8 py-4 bg-white text-black rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    >
                        <div className="flex items-center justify-center gap-2">
                            {isGenerating ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>Syncing & Rendering...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles size={18} />
                                    <span>Capture & Render</span>
                                </>
                            )}
                        </div>
                        {!apiKey && <p className="mt-2 text-[10px] text-red-500 font-normal text-center">API Key required</p>}
                    </button>

                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-[10px]">
                            {error}
                        </div>
                    )}
                </div>
            )}

            {/* Results Persistent Modal */}
            {renderedImage && (
                <div className="fixed inset-0 pointer-events-auto bg-black/95 z-50 flex flex-col animate-in fade-in duration-300">
                    <div className="flex justify-between items-center p-6 border-b border-white/10">
                        <div className="flex items-center gap-4 text-white">
                            <h2 className="text-xl font-bold font-serif italic tracking-wider">ArchiGenius <span className="text-indigo-400 not-italic font-sans font-medium text-sm ml-2 font-mono uppercase tracking-widest">MASTER_RENDER.HD</span></h2>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setShowComparison(!showComparison)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${showComparison ? 'bg-white text-black' : 'text-white border-white/20 hover:bg-white/10'}`}
                            >
                                <Maximize2 size={16} />
                                <span className="text-sm font-medium">Compare</span>
                            </button>
                            <button onClick={() => { setRenderedImage(null); handleRender(); }} className="flex items-center gap-2 px-4 py-2 border border-white/20 text-white rounded-full hover:bg-white/10 transition-colors">
                                <RefreshCw size={16} />
                                <span className="text-sm font-medium">Retake / Regenerate</span>
                            </button>
                            <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 shadow-lg transition-colors">
                                <Download size={16} />
                                <span className="text-sm font-medium">Export</span>
                            </button>
                            <button onClick={() => setRenderedImage(null)} className="p-2 text-white/50 hover:text-white transition-colors ml-4">
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 relative overflow-hidden flex items-center justify-center p-8 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 to-black">
                        <div className="relative w-full h-full max-w-6xl flex items-center justify-center">
                            {showComparison && originalScreenshot ? (
                                <div className="grid grid-cols-2 gap-4 w-full h-full scale-[0.98]">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest text-center">Reference Geometry (viewport)</span>
                                        <img src={originalScreenshot} className="w-full h-full object-contain rounded-2xl border border-white/10 shadow-2xl" alt="Original" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <span className="text-indigo-400 text-[10px] uppercase font-bold tracking-widest text-center">Architectural AI Masterpiece</span>
                                        <img src={renderedImage} className="w-full h-full object-contain rounded-2xl shadow-[0_0_50px_rgba(79,70,229,0.2)] ring-1 ring-white/20 border border-white/20" alt="Render" />
                                    </div>
                                </div>
                            ) : (
                                <div className="relative group">
                                    <img src={renderedImage} className="max-w-full max-h-full object-contain rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10" alt="Final Render" />
                                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur px-3 py-1 rounded text-[10px] text-white/50 font-mono border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        ARCHI_PHOTO_GEN_V4
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-8 flex justify-center gap-6 border-t border-white/5 bg-black/50">
                        <div className="flex items-center gap-4">
                            {!isEditingMode ? (
                                <>
                                    <span className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold mr-4">Geometry Verified | Lighting Calibrated</span>
                                    <button
                                        onClick={() => setIsEditingMode(true)}
                                        className="flex items-center gap-2 px-10 py-4 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 transition-all hover:scale-105 shadow-[0_10px_30px_rgba(79,70,229,0.3)]"
                                    >
                                        <Sparkles size={18} />
                                        <span>PROCEED TO EDITING</span>
                                    </button>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-6 animate-in slide-in-from-bottom-8 duration-500">
                                    <div className="flex items-center gap-8">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Target Render</span>
                                            <div className="w-24 h-16 rounded-lg border border-white/20 overflow-hidden opacity-50">
                                                <img src={renderedImage} className="w-full h-full object-cover" alt="Source" />
                                            </div>
                                        </div>
                                        <div className="text-zinc-700">
                                            <Sparkles size={24} className="animate-pulse" />
                                        </div>
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-indigo-400 text-[10px] uppercase font-bold tracking-widest">New Style Ref</span>
                                            <label className="w-24 h-16 rounded-lg border-2 border-dashed border-indigo-500/30 flex items-center justify-center cursor-pointer hover:bg-indigo-500/5 transition-all overflow-hidden bg-zinc-900 group">
                                                {editStyleImage ? (
                                                    <img src={editStyleImage} className="w-full h-full object-cover" alt="New Style" />
                                                ) : (
                                                    <Download size={20} className="text-indigo-500/50 group-hover:scale-110 transition-transform" />
                                                )}
                                                <input type="file" accept="image/*" onChange={handleEditImageUpload} className="hidden" />
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setIsEditingMode(false)}
                                            className="px-8 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleApplyEdit}
                                            disabled={!editStyleImage || isApplyingEdit}
                                            className="flex items-center gap-3 px-12 py-4 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 transition-all disabled:opacity-30 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                                        >
                                            {isApplyingEdit ? (
                                                <>
                                                    <Loader2 size={18} className="animate-spin" />
                                                    <span>Transforming Style...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <RefreshCw size={18} />
                                                    <span>Apply Style Transformation</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 italic">"Replace all items in Image 1 with items in Image 2. No changes to placement or rotation."</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
