import React from 'react';
import type { Wall, WallObject, Furniture } from '../types';
import { Ruler, ArrowUpFromLine, Info, Box, Layers, Settings2, RotateCcw, Type, FlipHorizontal, FlipVertical, RotateCw, Trash2, Sparkles, Loader2, Image as ImageIcon } from 'lucide-react';
import { AIService } from '../services/AIService';

interface RightSidebarProps {
    selectedId: string | null;
    walls: Wall[];
    objects: WallObject[];
    furniture: Furniture[];
    updateObject: (id: string, updates: Partial<WallObject>) => void;
    updateWall: (id: string, updates: Partial<Wall>) => void;
    updateFurniture: (id: string, updates: Partial<Furniture>) => void;
    snapshot: () => void;
    onDelete: () => void;
    globalWallHeight: number;
    updateGlobalWallHeight: (height: number) => void;
    apiKey: string;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
    selectedId,
    walls,
    objects,
    furniture,
    updateObject,
    updateWall,
    updateFurniture,
    snapshot,
    onDelete,
    globalWallHeight,
    updateGlobalWallHeight,
    apiKey
}) => {
    const selectedWall = walls.find((w) => w.id === selectedId);
    const selectedObject = objects.find((o) => o.id === selectedId);
    const selectedFurniture = furniture.find((f) => f.id === selectedId);

    const [modelingId, setModelingId] = React.useState<string | null>(null);

    const handleStyleApply = async (file: File) => {
        if (!selectedFurniture || !apiKey) return;

        setModelingId(selectedFurniture.id);

        try {
            // 1. Convert File to Base64
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
                reader.onload = () => {
                    const base64 = (reader.result as string).split(',')[1];
                    resolve(base64);
                };
            });
            reader.readAsDataURL(file);
            const base64 = await base64Promise;

            // 2. Call AI Service
            const recipe = await AIService.generateCustomModel(
                base64,
                selectedFurniture.category,
                selectedFurniture.label,
                apiKey
            );

            // 3. Update Furniture
            updateFurniture(selectedFurniture.id, { customRecipe: recipe });
        } catch (e) {
            console.error("Style Apply Failed:", e);
            alert("AI Modeling failed. Please check your API key and try again.");
        } finally {
            setModelingId(null);
        }
    };

    if (!selectedId) {
        return (
            <div className="w-80 bg-white border-l border-zinc-200 p-6 flex flex-col items-center justify-center text-zinc-400 text-center shadow-xl z-10">
                <Info size={48} className="mb-4 opacity-20" />
                <p className="text-sm">Select an object to view properties</p>
            </div>
        );
    }

    const handleObjectUpdate = (id: string, updates: Partial<WallObject>) => {
        snapshot();
        updateObject(id, updates);
    };

    return (
        <div className="w-80 bg-white border-l border-zinc-200 flex flex-col overflow-y-auto shadow-xl z-10 text-black flex-shrink-0">
            <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50">
                <h2 className="font-semibold text-sm uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                    <Settings2 size={16} />
                    {selectedWall ? 'Wall Properties' : selectedObject ? 'Object Properties' : selectedFurniture ? 'Furniture Properties' : 'Properties'}
                </h2>
            </div>

            <div className="p-6 space-y-8">
                {selectedWall && (
                    <>
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide flex items-center gap-2">
                                <Box size={14} /> Dimensions
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-semibold text-zinc-500 uppercase flex items-center gap-1.5">
                                        <ArrowUpFromLine size={12} /> Height
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={selectedWall.height || 2.4}
                                            onChange={(e) => updateWall(selectedWall.id, { height: Number(e.target.value) })}
                                            onFocus={snapshot}
                                            step="0.1"
                                            className="w-full px-3 py-2 bg-zinc-100 border border-zinc-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                        <span className="absolute right-3 top-2 text-xs text-zinc-400">m</span>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-semibold text-zinc-500 uppercase flex items-center gap-1.5">
                                        <Ruler size={12} /> Thickness
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={selectedWall.thickness}
                                            onChange={(e) => updateWall(selectedWall.id, { thickness: Number(e.target.value) })}
                                            onFocus={snapshot}
                                            step="0.01"
                                            className="w-full px-3 py-2 bg-zinc-100 border border-zinc-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                        <span className="absolute right-3 top-2 text-xs text-zinc-400">m</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-zinc-200">
                            <button
                                onClick={onDelete}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                            >
                                <Trash2 size={16} /> Delete Wall
                            </button>
                        </div>
                    </>
                )}

                {selectedObject && (
                    <>
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide flex items-center gap-2">
                                <Layers size={14} /> Dimensions
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-semibold text-zinc-500 uppercase">Width</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={selectedObject.width}
                                            onChange={(e) => updateObject(selectedObject.id, { width: Number(e.target.value) })}
                                            onFocus={snapshot}
                                            step="0.01"
                                            className="w-full px-3 py-2 bg-zinc-100 border border-zinc-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                        <span className="absolute right-3 top-2 text-xs text-zinc-400">m</span>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-semibold text-zinc-500 uppercase">Height</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={selectedObject.height || 2.1}
                                            onChange={(e) => updateObject(selectedObject.id, { height: Number(e.target.value) })}
                                            onFocus={snapshot}
                                            step="0.01"
                                            className="w-full px-3 py-2 bg-zinc-100 border border-zinc-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                        <span className="absolute right-3 top-2 text-xs text-zinc-400">m</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold text-zinc-500 uppercase">Elevation</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={selectedObject.offset || 0}
                                        onChange={(e) => updateObject(selectedObject.id, { offset: Number(e.target.value) })}
                                        onFocus={snapshot}
                                        step="0.01"
                                        className="w-full px-3 py-2 bg-zinc-100 border border-zinc-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                    <span className="absolute right-3 top-2 text-xs text-zinc-400">m</span>
                                </div>
                            </div>
                        </div>

                        {selectedObject.type === 'door' && (
                            <div className="space-y-4 pt-4 border-t border-zinc-200">
                                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide">Configuration</h3>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-semibold text-zinc-500 uppercase block">Hinge Position</label>
                                    <div className="flex bg-zinc-100 p-1 rounded-lg">
                                        <button
                                            onClick={() => handleObjectUpdate(selectedObject.id, { hinge: 'left' })}
                                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${selectedObject.hinge === 'left' ? 'bg-white shadow-sm text-blue-600' : 'text-zinc-500 hover:text-zinc-700'}`}
                                        >
                                            Left
                                        </button>
                                        <button
                                            onClick={() => handleObjectUpdate(selectedObject.id, { hinge: 'right' })}
                                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${selectedObject.hinge === 'right' ? 'bg-white shadow-sm text-blue-600' : 'text-zinc-500 hover:text-zinc-700'}`}
                                        >
                                            Right
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-semibold text-zinc-500 uppercase block">Swing Direction</label>
                                    <div className="flex bg-zinc-100 p-1 rounded-lg">
                                        <button
                                            onClick={() => handleObjectUpdate(selectedObject.id, { openDirection: 'in' })}
                                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${selectedObject.openDirection === 'in' ? 'bg-white shadow-sm text-blue-600' : 'text-zinc-500 hover:text-zinc-700'}`}
                                        >
                                            Inward
                                        </button>
                                        <button
                                            onClick={() => handleObjectUpdate(selectedObject.id, { openDirection: 'out' })}
                                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${selectedObject.openDirection === 'out' ? 'bg-white shadow-sm text-blue-600' : 'text-zinc-500 hover:text-zinc-700'}`}
                                        >
                                            Outward
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="pt-4 border-t border-zinc-200">
                            <button
                                onClick={onDelete}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-semibold transition-colors"
                            >
                                <Trash2 size={16} /> Delete Object
                            </button>
                        </div>
                    </>
                )}

                {selectedFurniture && (
                    <>
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide flex items-center gap-2">
                                <Type size={14} /> Basic Info
                            </h3>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold text-zinc-500 uppercase">Label</label>
                                <input
                                    type="text"
                                    value={selectedFurniture.label}
                                    onChange={(e) => updateFurniture(selectedFurniture.id, { label: e.target.value })}
                                    onFocus={snapshot}
                                    className="w-full px-3 py-2 bg-zinc-100 border border-zinc-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* --- AI STYLING & RECONSTRUCTION --- */}
                        <div className="space-y-4 pt-4 border-t border-zinc-200">
                            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide flex items-center gap-2">
                                <Sparkles size={14} className="text-indigo-500" /> AI Styling & Reconstruction
                            </h3>

                            <p className="text-[10px] text-zinc-500 leading-relaxed">
                                Upload an image of this item (e.g., a specific king bed) to generate a unique 3D model using AI.
                            </p>

                            <div
                                className={`relative group border-2 border-dashed rounded-xl p-4 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer
                                    ${modelingId === selectedFurniture.id ? 'bg-zinc-50 border-indigo-200' : 'bg-zinc-50 border-zinc-100 hover:border-indigo-100'}
                                `}
                            >
                                {modelingId === selectedFurniture.id ? (
                                    <>
                                        <Loader2 size={24} className="text-indigo-500 animate-spin" />
                                        <span className="text-xs font-medium text-indigo-600">Reconstructing...</span>
                                    </>
                                ) : (
                                    <>
                                        <ImageIcon size={24} className="text-zinc-300 group-hover:text-indigo-300" />
                                        <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-600">Choose Architecture Image</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file && apiKey) {
                                                    handleStyleApply(file);
                                                } else if (!apiKey) {
                                                    alert("Please enter an API Key in the AI Studio Modal first!");
                                                }
                                            }}
                                        />
                                    </>
                                )}
                            </div>

                            {selectedFurniture.customRecipe && (
                                <div className="p-3 bg-green-50 rounded-lg border border-green-100 flex items-start gap-2">
                                    <Box size={14} className="text-green-600 mt-0.5" />
                                    <div>
                                        <p className="text-[10px] font-bold text-green-700 uppercase">Custom 3D Model Active</p>
                                        <p className="text-[10px] text-green-600 line-clamp-1">{selectedFurniture.customRecipe.description || 'AI Reconstructed primitives'}</p>
                                        <button
                                            onClick={() => updateFurniture(selectedFurniture.id, { customRecipe: undefined })}
                                            className="mt-1 text-[9px] font-bold text-green-700 hover:underline"
                                        >
                                            Reset to Default
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4 pt-4 border-t border-zinc-200">
                            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide flex items-center gap-2">
                                <Box size={14} /> Dimensions
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-semibold text-zinc-500 uppercase">Width</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={selectedFurniture.width}
                                            onChange={(e) => updateFurniture(selectedFurniture.id, { width: Number(e.target.value) })}
                                            onFocus={snapshot}
                                            step="0.01"
                                            className="w-full px-3 py-2 bg-zinc-100 border border-zinc-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                        <span className="absolute right-3 top-2 text-xs text-zinc-400">m</span>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-semibold text-zinc-500 uppercase">Depth</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={selectedFurniture.depth}
                                            onChange={(e) => updateFurniture(selectedFurniture.id, { depth: Number(e.target.value) })}
                                            onFocus={snapshot}
                                            step="0.01"
                                            className="w-full px-3 py-2 bg-zinc-100 border border-zinc-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                        <span className="absolute right-3 top-2 text-xs text-zinc-400">m</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold text-zinc-500 uppercase flex items-center gap-1.5">
                                    <RotateCcw size={12} /> Rotation
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={selectedFurniture.rotation || 0}
                                        onChange={(e) => updateFurniture(selectedFurniture.id, { rotation: Number(e.target.value) })}
                                        onFocus={snapshot}
                                        step="1"
                                        className="w-full px-3 py-2 bg-zinc-100 border border-zinc-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                    <span className="absolute right-3 top-2 text-xs text-zinc-400">°</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="360"
                                    value={selectedFurniture.rotation || 0}
                                    onChange={(e) => updateFurniture(selectedFurniture.id, { rotation: Number(e.target.value) })}
                                    onMouseDown={snapshot}
                                    className="w-full mt-2 accent-blue-500"
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-zinc-200">
                            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide flex items-center gap-2">
                                <Settings2 size={14} /> Quick Actions
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => {
                                        snapshot();
                                        updateFurniture(selectedFurniture.id, { rotation: (selectedFurniture.rotation + 90) % 360 });
                                    }}
                                    className="flex flex-col items-center justify-center gap-2 p-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors border border-transparent hover:border-zinc-300"
                                    title="Rotate 90°"
                                >
                                    <RotateCw size={18} />
                                    <span className="text-[10px] font-bold">90°</span>
                                </button>
                                <button
                                    onClick={() => {
                                        snapshot();
                                        updateFurniture(selectedFurniture.id, { flipX: !selectedFurniture.flipX });
                                    }}
                                    className={`flex flex-col items-center justify-center gap-2 p-2 rounded-lg transition-colors border ${selectedFurniture.flipX ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-zinc-100 hover:bg-zinc-200 border-transparent hover:border-zinc-300'}`}
                                    title="Flip Horizontal"
                                >
                                    <FlipHorizontal size={18} />
                                    <span className="text-[10px] font-bold">Flip H</span>
                                </button>
                                <button
                                    onClick={() => {
                                        snapshot();
                                        updateFurniture(selectedFurniture.id, { flipY: !selectedFurniture.flipY });
                                    }}
                                    className={`flex flex-col items-center justify-center gap-2 p-2 rounded-lg transition-colors border ${selectedFurniture.flipY ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-zinc-100 hover:bg-zinc-200 border-transparent hover:border-zinc-300'}`}
                                    title="Flip Vertical"
                                >
                                    <FlipVertical size={18} />
                                    <span className="text-[10px] font-bold">Flip V</span>
                                </button>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-zinc-200">
                            <button
                                onClick={onDelete}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                            >
                                <Trash2 size={16} /> Delete Item
                            </button>
                        </div>
                    </>
                )}
            </div>

            {!selectedId && (
                <div className="mt-auto p-6 border-t border-zinc-200 bg-zinc-50">
                    <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide flex items-center gap-2 mb-4">
                        <Settings2 size={14} /> Global Settings
                    </h3>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-zinc-500 uppercase flex items-center gap-1.5">
                            <ArrowUpFromLine size={12} /> Default Wall Height
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                value={globalWallHeight}
                                onChange={(e) => updateGlobalWallHeight(Number(e.target.value))}
                                onFocus={snapshot}
                                step="0.1"
                                className="w-full px-3 py-2 bg-white border border-zinc-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                            <span className="absolute right-3 top-2 text-xs text-zinc-400">m</span>
                        </div>
                        <input
                            type="range"
                            min="2.5"
                            max="3.3"
                            step="0.1"
                            value={globalWallHeight}
                            onChange={(e) => updateGlobalWallHeight(Number(e.target.value))}
                            onMouseDown={snapshot}
                            className="w-full mt-2 accent-blue-500"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
