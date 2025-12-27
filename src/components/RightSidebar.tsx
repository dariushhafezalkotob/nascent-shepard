import type { Wall, WallObject, Furniture } from '../types';
import { Ruler, ArrowUpFromLine, Info, Box, Layers, Settings2, RotateCcw, Type, FlipHorizontal, FlipVertical, RotateCw, Trash2 } from 'lucide-react';

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
    onDelete
}) => {
    const selectedWall = walls.find((w) => w.id === selectedId);
    const selectedObject = objects.find((o) => o.id === selectedId);
    const selectedFurniture = furniture.find((f) => f.id === selectedId);

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
        </div>
    );
};
