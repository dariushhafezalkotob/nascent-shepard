import React, { useState } from 'react';
import { X, Sparkles, Loader2, Upload, Image as ImageIcon, Trash2, ArrowRight, Layout, Info, PlusCircle, Copy } from 'lucide-react';
import { AIService } from '../services/AIService';

interface AIDressingModalProps {
    isOpen: boolean;
    onClose: () => void;
    floorPlanImage: string | null; // Base64 of current canvas
    apiKey: string;
    onApplyFurniture: (placements: any[], imagesByCategory: Record<string, string[]>, roomMappings: Record<string, string>) => void;
    roomLabels: string[];
}

interface Concept {
    zone_name: string;
    concept_description: string;
    furniture_items: string[];
    placement_logic: string;
    visualization_prompt?: string;
    items?: Placement[];
}

interface Placement {
    templateId: string;
    x: number;
    y: number;
    rotation: number;
}

export const CATEGORIES = ['Shared', 'Private', 'Semi-private', 'Outdoor'];

export const AIDressingModal: React.FC<AIDressingModalProps> = ({ isOpen, onClose, floorPlanImage, apiKey, onApplyFurniture, roomLabels }) => {
    const [styleImagesByCategory, setStyleImagesByCategory] = useState<Record<string, string[]>>({
        'Shared': [],
        'Private': [],
        'Semi-private': [],
        'Outdoor': []
    });

    // Maps each room Label to a Category
    const [roomMappings, setRoomMappings] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};
        roomLabels.forEach(label => {
            const lower = label.toLowerCase();
            if (lower.includes('shared') || lower.includes('living') || lower.includes('dining')) initial[label] = 'Shared';
            else if (lower.includes('private') || lower.includes('bed') || lower.includes('bath')) initial[label] = 'Private';
            else if (lower.includes('semi') || lower.includes('office') || lower.includes('work') || lower.includes('study')) initial[label] = 'Semi-private';
            else if (lower.includes('outdoor') || lower.includes('garden') || lower.includes('patio')) initial[label] = 'Outdoor';
            else initial[label] = 'Shared'; // Default
        });
        return initial;
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ concepts: Concept[], placements?: Placement[] } | null>(null);

    if (!isOpen) return null;

    const handleStyleUpload = (category: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    // Create a canvas to compress the image
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Standardize max dimensions (e.g., 1200px)
                    const maxDim = 1200;
                    if (width > maxDim || height > maxDim) {
                        if (width > height) {
                            height *= maxDim / width;
                            width = maxDim;
                        } else {
                            width *= maxDim / height;
                            height = maxDim;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;

                    // Use better interpolation if needed, but standard is fine
                    ctx.drawImage(img, 0, 0, width, height);

                    // Compress as JPEG (0.8 quality is great balance)
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);

                    setStyleImagesByCategory(prev => ({
                        ...prev,
                        [category]: [...prev[category], compressedBase64]
                    }));
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const removeStyleImage = (category: string, index: number) => {
        setStyleImagesByCategory(prev => ({
            ...prev,
            [category]: prev[category].filter((_, i) => i !== index)
        }));
    };

    const handleSuggest = async () => {
        if (!floorPlanImage) {
            setError("Could not capture floor plan. Please try again.");
            return;
        }

        const allImages = Object.values(styleImagesByCategory).flat();
        if (allImages.length === 0) {
            setError("Please upload style reference images for at least one category.");
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            // We pass the categorized structure to suggestDressing
            const response = await AIService.suggestDressing(
                floorPlanImage,
                allImages,
                apiKey,
                roomLabels,
                { imagesByCategory: styleImagesByCategory, roomMappings }
            );
            setResult(response);
        } catch (err: any) {
            setError(err.message || "Failed to get design suggestions.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleApply = () => {
        if (result?.concepts) {
            onApplyFurniture(result.concepts, styleImagesByCategory, roomMappings);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h2 className="font-bold text-xl text-zinc-900">AI Interior Architect</h2>
                            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Concept Dressing & Spatial Logic</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full text-zinc-400 hover:text-zinc-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {!result ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Left: Floor Plan Preview */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-zinc-900">
                                    <Layout size={18} className="text-indigo-500" />
                                    <h3 className="font-bold text-sm uppercase tracking-tight">Active Floor Plan</h3>
                                </div>
                                <div className="aspect-video bg-zinc-100 rounded-xl border border-zinc-200 overflow-hidden relative shadow-inner">
                                    {floorPlanImage ? (
                                        <img src={floorPlanImage} alt="Floor Plan" className="w-full h-full object-contain" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-2">
                                            <Loader2 size={24} className="animate-spin" />
                                            <span className="text-xs font-semibold">Capturing layout...</span>
                                        </div>
                                    )}
                                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded-md border border-zinc-200 text-[10px] font-bold text-zinc-600 shadow-sm">
                                        SOURCE BLUEPRINT
                                    </div>
                                </div>
                                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex gap-3">
                                    <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-blue-700 leading-relaxed">
                                        The AI will analyze your <b>room labels</b> (e.g., Shared-Living, Private) to suggest appropriate furniture and vibes.
                                    </p>
                                </div>
                            </div>

                            {/* Right: Categorized Style Reference Upload */}
                            <div className="space-y-6 font-inter h-full flex flex-col">
                                <div className="flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-2 text-zinc-900" >
                                        <ImageIcon size={18} className="text-indigo-500" />
                                        <h3 className="font-bold text-sm uppercase tracking-tight">Categorized Style Guides</h3>
                                    </div>
                                    <div className="flex gap-2">
                                        {CATEGORIES.map(cat => (
                                            styleImagesByCategory[cat].length > 0 && (
                                                <span key={cat} className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100 uppercase">
                                                    {cat}: {styleImagesByCategory[cat].length}
                                                </span>
                                            )
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                                    {CATEGORIES.map(category => (
                                        <div key={category} className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{category} Area</h4>
                                                <span className="text-[10px] text-zinc-400 font-medium">
                                                    {category === 'Shared' ? 'Living, Dining, Entry' :
                                                        category === 'Private' ? 'Bedrooms, Baths' :
                                                            category === 'Semi-private' ? 'Study, Office' : 'Gardens, Balconies'}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-4 gap-2">
                                                {styleImagesByCategory[category].map((img, idx) => (
                                                    <div key={idx} className="aspect-square relative group rounded-lg overflow-hidden border border-zinc-200 bg-white">
                                                        <img src={img} alt={`${category} Ref ${idx}`} className="w-full h-full object-cover" />
                                                        <button
                                                            onClick={() => removeStyleImage(category, idx)}
                                                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <Trash2 size={10} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 rounded-lg hover:border-indigo-400 hover:bg-white cursor-pointer transition-all">
                                                    <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleStyleUpload(category, e)} />
                                                    <Upload size={16} className="text-zinc-400 mb-0.5" />
                                                    <span className="text-[9px] font-bold text-zinc-400 uppercase">Add {category}</span>
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Room Assignment logic */}
                                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 space-y-3 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <Layout size={14} className="text-indigo-500" />
                                        <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-widest">Assign Rooms to Categories</h4>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {roomLabels.map(room => (
                                            <div key={room} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-indigo-200 shadow-sm">
                                                <span className="text-[10px] font-bold text-zinc-700">{room}</span>
                                                <ArrowRight size={10} className="text-zinc-300" />
                                                <select
                                                    value={roomMappings[room]}
                                                    onChange={(e) => setRoomMappings(prev => ({ ...prev, [room]: e.target.value }))}
                                                    className="text-[10px] font-bold bg-transparent text-indigo-600 outline-none cursor-pointer"
                                                >
                                                    {CATEGORIES.map(cat => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Results Dashboard */
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            <div className="flex items-center justify-between bg-zinc-900 text-white p-4 rounded-xl shadow-lg">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-500 rounded-lg">
                                        <Sparkles size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm">Design Concepts Generated</h3>
                                        <p className="text-[10px] text-zinc-400">Based on Categorized Style Guides</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setResult(null)}
                                        className="text-xs font-bold uppercase tracking-widest px-4 py-2 border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
                                    >
                                        Refine
                                    </button>
                                    {result.concepts && result.concepts.some(c => c.items && c.items.length > 0) && (
                                        <button
                                            onClick={handleApply}
                                            className="text-xs font-bold uppercase tracking-widest px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95"
                                        >
                                            <PlusCircle size={14} /> Apply to Rooms
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {result.concepts.map((concept, idx) => (
                                    <div key={idx} className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                        <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
                                            <h4 className="font-bold text-indigo-600 text-sm">{concept.zone_name}</h4>
                                            <ArrowRight size={14} className="text-zinc-400" />
                                        </div>
                                        <div className="p-4 space-y-4">
                                            <div>
                                                <p className="text-xs font-semibold text-zinc-500 uppercase mb-1 flex items-center gap-1.5 leading-none">
                                                    <Layout size={12} /> Concept Vibe
                                                </p>
                                                <p className="text-sm text-zinc-800 leading-relaxed font-medium">{concept.concept_description}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-zinc-500 uppercase mb-2 flex items-center gap-1.5 leading-none">
                                                    <ImageIcon size={12} /> Suggested Pieces
                                                </p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {(concept.items || []).map((item: any, i: number) => (
                                                        <span key={i} className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-1 rounded-md">
                                                            {item.label || item.templateId || "Furniture"}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100">
                                                <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Placement Logic</p>
                                                <p className="text-xs text-zinc-600 leading-relaxed italic">{concept.placement_logic}</p>
                                            </div>

                                            {concept.visualization_prompt && (
                                                <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 group relative">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <p className="text-[10px] font-bold text-indigo-400 uppercase">Image Gen Prompt</p>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigator.clipboard.writeText(concept.visualization_prompt || "");
                                                                // Optional: Visual feedback could go here, but kept simple
                                                            }}
                                                            className="text-xs text-indigo-400 hover:text-indigo-600 flex items-center gap-1 active:scale-95 transition-transform"
                                                            title="Copy Prompt"
                                                        >
                                                            <Copy size={12} /> <span className="text-[10px]">COPY</span>
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-zinc-700 leading-relaxed font-mono bg-white p-2 rounded border border-zinc-100 select-all">
                                                        {concept.visualization_prompt}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
                    {!result ? (
                        <>
                            <div className="text-xs text-zinc-400 max-w-md">
                                The AI will process these images using multimodal vision. Large images may take 10-20 seconds.
                            </div>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <button onClick={onClose} className="flex-1 md:flex-none px-6 py-2.5 text-sm font-bold text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200 rounded-xl transition-all">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSuggest}
                                    disabled={isLoading || Object.values(styleImagesByCategory).every(arr => arr.length === 0)}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5"
                                >
                                    {isLoading ? <><Loader2 size={18} className="animate-spin" /> Analyzing Styles...</> : <><Sparkles size={18} /> Generate Dressing Concepts</>}
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Powered by Gemini 2.0 Flash</p>
                            <button onClick={onClose} className="w-full md:w-auto px-8 py-2.5 bg-zinc-900 hover:bg-black text-white text-sm font-bold rounded-xl shadow-lg transition-all">
                                Close Architect
                            </button>
                        </>
                    )}
                </div>

                {error && (
                    <div className="px-6 py-3 bg-red-50 border-t border-red-100 text-red-600 text-xs font-bold animate-in slide-in-from-bottom-2">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};
