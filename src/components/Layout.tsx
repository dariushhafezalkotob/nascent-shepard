import React, { useEffect } from 'react';
import { EditorCanvas } from './EditorCanvas';
import { ThreeDViewer } from './ThreeDViewer';
import { AIModal } from './AIModal';
import { AIService } from '../services/AIService';
import { RightSidebar } from './RightSidebar';
import { BottomBar } from './BottomBar';
import { NavigationWidget } from './NavigationWidget';
import { ObjectPopup } from './ObjectPopup';
import { useCanvas } from '../hooks/useCanvas';
import { StorageService } from '../services/StorageService';
import { SavedPlansModal } from './SavedPlansModal';
import { MaterialsSidebar } from './MaterialsSidebar';
import { DecorationSetupModal } from './DecorationSetupModal';
import { ProductPickerPopup } from './ProductPickerPopup';
import { detectRooms } from '../utils/roomDetection';
import { AIDressingModal } from './AIDressingModal';
import { distributeBudget } from '../utils/budgetDistribution';
import { AIRenderingOverlay } from './AIRenderingOverlay';
import type { Choice, Point, RoomLabel } from '../types';
import { Lock, Unlock, Sliders, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

export const Layout: React.FC = () => {
    const {
        canvasRef,
        state,
        setHistory,
        setViewState,
        undo,
        redo,
        snapshot,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleWheel,
        handleDrop,
        handleDragOver,
        deleteSelection,
        zoomIn,
        zoomOut,
        fitToView,
        resetCanvas,
        setBackground
    } = useCanvas();

    const [activeTab, setActiveTab] = React.useState<'layout' | 'furniture' | 'surfaces' | '3d' | 'rendering'>('layout');
    const [isAIModalOpen, setIsAIModalOpen] = React.useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = React.useState(false);
    const [isDecorationModalOpen, setIsDecorationModalOpen] = React.useState(false);
    const [capturedFloorPlan, setCapturedFloorPlan] = React.useState<string | null>(null);
    const [referenceImage, setReferenceImage] = React.useState<string | null>(null);
    const [referenceDims, setReferenceDims] = React.useState<{ width: number, depth: number } | null>(null);
    const [debugJson, setDebugJson] = React.useState<string>("");
    const [apiKey, setApiKey] = React.useState<string>("");
    const [isAIDressingOpen, setIsAIDressingOpen] = React.useState(false);
    const [isTracePanelMinimized, setIsTracePanelMinimized] = React.useState(false);
    const [activeRoomLabel, setActiveRoomLabel] = React.useState<RoomLabel | null>(null);

    // 1. Initial Load from Autosave
    useEffect(() => {
        const saved = StorageService.loadAutosave();
        // Load if saved data exists (even if empty, to respect a 'New' state)
        if (saved) {
            console.log("Persistence: Loading saved session");
            // Use clearHistory logic for initial load to avoid 'undo' to nothing if it's the first render
            resetCanvas(); // Reset defaults first
            setHistory(saved, true); // Then apply saved (replace)
        }
    }, [setHistory, resetCanvas]); // Only on mount

    // 3. Auto-Switch Tabs on Selection
    useEffect(() => {
        if (!state.selectedId) return;

        // Check if Furniture
        if (state.furniture.some(f => f.id === state.selectedId)) {
            if (activeTab !== 'furniture') setActiveTab('furniture');
            return;
        }

        // Check if Wall or Object
        const isWall = state.walls.some(w => w.id === state.selectedId);
        const isObject = state.objects.some(o => o.id === state.selectedId);

        if ((isWall || isObject) && activeTab !== 'layout') {
            setActiveTab('layout');
        }
    }, [state.selectedId, state.furniture, state.walls, state.objects]);

    // Debounced autosave
    useEffect(() => {
        // Only autosave if the state has meaningful content OR we explicitly want to save the 'empty' state
        StorageService.autosave(state);
    }, [state]);

    // 3. Auto-redistribute budget when furniture changes
    useEffect(() => {
        if (state.decorationBudget && state.decorationBudget > 0) {
            const newItemBudgetMap = distributeBudget(state.furniture, state.decorationBudget);
            // Check if map actually changed to avoid infinite loops
            if (JSON.stringify(newItemBudgetMap) !== JSON.stringify(state.itemBudgetMap)) {
                setHistory(prev => ({ ...prev, itemBudgetMap: newItemBudgetMap }), true);
            }
        }
    }, [state.furniture, state.decorationBudget, state.itemBudgetMap, setHistory]);

    const handleAIGenerate = async (data: any, apiKey: string) => {
        // --- 0. DIRECT IMPORT MODE (NO AI) ---
        if (data.mode === 'import' && data.importedImage) {
            console.log("Direct Import Mode: Loading image as background...");
            // Load the image purely locally for manual tracing
            const img = new Image();
            img.src = `data:image/png;base64,${data.importedImage}`;
            img.onload = () => {
                // scale = 1 means 1 pixel = 1 pixel on canvas (at 100% zoom)
                // But canvas zoom=50 means 50px=1m.
                // So if image is 1000px wide, and we want it to be "10 meters" wide,
                // 10m * 50px/m = 500px on screen.
                // We don't know the meters yet. The USER must scale it.
                // Let's just set it to natural size and let user resize.
                setBackground(img, img.naturalWidth, img.naturalHeight);
            };
            setIsAIModalOpen(false);
            return;
        }

        // --- 1. AI GENERATION MODE ---
        try {
            const { walls: newWalls, objects: newObjects, furniture: newFurniture, labels: newLabels, generatedImage, rawResponse, dimensions, background } = await AIService.generateLayout(data, apiKey);

            if (generatedImage) {
                setReferenceImage(generatedImage);
                setReferenceDims(dimensions || null);

                // If we have background scaling data (Import Mode), set it as trace background
                if (background) {
                    const img = new Image();
                    img.src = `data:image/png;base64,${generatedImage}`;
                    img.onload = () => {
                        // Calculate width/height in meters
                        const widthMeters = background.width * background.metersPerPixel;
                        const heightMeters = background.height * background.metersPerPixel;

                        // Set background centered at 0,0 (or match logic)
                        // We'll place it at 0,0 for now so user can draw relative to origin
                        setBackground(img, widthMeters, heightMeters, background.x || 0, background.y || 0); // x,y
                    };
                }
            }

            if (rawResponse) {
                setDebugJson(rawResponse);
            }

            setHistory(prev => ({
                ...prev,
                walls: [...prev.walls, ...newWalls],
                objects: [...prev.objects, ...newObjects],
                furniture: [...(prev.furniture || []), ...newFurniture],
                labels: [...(prev.labels || []), ...newLabels]
            }), false);

            // Open decoration setup after generation
            setTimeout(() => setIsDecorationModalOpen(true), 1500);
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const handleDecorationConfirm = (style: string, budget: number) => {
        const itemBudgetMap = distributeBudget(state.furniture, budget);
        setHistory(prev => ({
            ...prev,
            decorationStyle: style,
            decorationBudget: budget,
            itemBudgetMap
        }), true);
        setIsDecorationModalOpen(false);
    };

    const handleProductSelect = (furnitureId: string, choice: Choice) => {
        setHistory(prev => ({
            ...prev,
            furniture: prev.furniture.map(f => f.id === furnitureId ? { ...f, selectedChoice: choice } : f)
        }), true);
    };

    const totalSpent = state.furniture.reduce((acc, f) => {
        const itemPrice = f.selectedChoice?.price ?? state.itemBudgetMap?.[f.id] ?? 0;
        return acc + itemPrice;
    }, 0);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.key === 'z' && (e.metaKey || e.ctrlKey)) {
                if (e.shiftKey) redo(); else undo();
                e.preventDefault();
            } else if (e.key === 'y' && (e.metaKey || e.ctrlKey)) {
                redo();
                e.preventDefault();
            } else if ((e.key === 'Delete' || e.key === 'Backspace') && !e.repeat) {
                deleteSelection();
                if (e.key === 'Backspace') e.preventDefault();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, deleteSelection]);

    const updateObject = (id: string, updates: any) => {
        setHistory(prev => ({
            ...prev,
            objects: prev.objects.map(o => o.id === id ? { ...o, ...updates } : o)
        }), true);
    };

    const updateWall = (id: string, updates: any) => {
        setHistory(prev => ({
            ...prev,
            walls: prev.walls.map(w => w.id === id ? { ...w, ...updates } : w)
        }), true);
    };

    const updateFurniture = (id: string, updates: any) => {
        setHistory(prev => ({
            ...prev,
            furniture: prev.furniture.map(f => f.id === id ? { ...f, ...updates } : f)
        }), true);
    };

    const updateLabel = (id: string, updates: any) => {
        setHistory(prev => ({
            ...prev,
            labels: (prev.labels || []).map(l => l.id === id ? { ...l, ...updates } : l)
        }), true);
    };

    const updateGlobalWallHeight = (height: number) => {
        const h = Math.min(3.3, Math.max(2.5, height));
        setHistory(prev => ({
            ...prev,
            globalWallHeight: h,
            walls: prev.walls.map(w => ({ ...w, height: h }))
        }), true);
    };

    const handleApplyMaterial = (id: string, materialId: string, type: 'wall' | 'floor', side?: 'A' | 'B') => {
        if (type === 'wall') {
            if (side === 'A') {
                updateWall(id, { materialSideA: materialId });
            } else if (side === 'B') {
                updateWall(id, { materialSideB: materialId });
            } else {
                updateWall(id, { materialId });
            }
        } else {
            setHistory(prev => ({
                ...prev,
                floorMaterials: {
                    ...(prev.floorMaterials || {}),
                    [id]: materialId
                }
            }), true);
        }
    };

    const handleNewPlan = () => {
        if (confirm("START NEW DESIGN?\n\nThis will clear the current layout. Make sure you've saved if you want to keep it!")) {
            resetCanvas();
            setReferenceImage(null);
            setReferenceDims(null);
            setDebugJson("");
            StorageService.clearAutosave();
            setActiveTab('layout');
        }
    };

    const handleLoadPlan = (data: any) => {
        if (data) {
            setHistory(data, false);
            setIsSaveModalOpen(false);
        }
    };

    const handleApplyAIDressing = (concepts: any[], imagesByCategory: Record<string, string[]>, roomMappings: Record<string, string>) => {
        console.log("Applying Room-Aware AI Dressing:", concepts);
        const newFurniture: any[] = [];
        const currentRooms = detectRooms(state.walls);

        // Helper: Point in Polygon check
        const isPointInRoom = (p: Point, roomPath: Point[]) => {
            let inside = false;
            for (let i = 0, j = roomPath.length - 1; i < roomPath.length; j = i++) {
                const xi = roomPath[i].x, yi = roomPath[i].y;
                const xj = roomPath[j].x, yj = roomPath[j].y;
                const intersect = ((yi > p.y) !== (yj > p.y)) && (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
            return inside;
        };

        // Helper: Normalize name for fuzzy matching (removes trailing A/B/C or 1/2/3)
        const normalize = (s: string) => s.toLowerCase().trim().replace(/[-_\s]*(?:[a-z]|[0-9])$/i, '');

        // Use a Set to track which labels received properties to avoid duplicates
        const updatedLabelMap = new Map<string, any>();

        // 1. Process each concept and apply to ALL matching rooms
        concepts.forEach(concept => {
            const conceptName = concept.zone_name.toLowerCase().trim();
            const normalizedConcept = normalize(conceptName);

            // Find all labels that match this concept
            const matchingLabels = state.labels.filter(l => {
                const labelText = l.text.toLowerCase().trim();
                const normalizedLabel = normalize(labelText);

                return labelText.includes(conceptName) ||
                    conceptName.includes(labelText) ||
                    normalizedLabel === normalizedConcept ||
                    normalizedLabel.includes(normalizedConcept);
            });

            console.log(`Concept "${concept.zone_name}" matched labels:`, matchingLabels.map(l => l.text));

            matchingLabels.forEach(label => {
                // Find physical room polygon containing this label point
                const room = currentRooms.find(r => isPointInRoom({ x: label.x, y: label.y }, r.path));

                if (room) {
                    // Apply properties to the label
                    const category = roomMappings[label.text];
                    const relevantImages = category ? (imagesByCategory[category] || []) : [];

                    updatedLabelMap.set(label.id, {
                        ...label,
                        visualizationPrompt: concept.visualization_prompt || label.visualizationPrompt,
                        referenceImages: relevantImages
                    });

                    // Apply furniture items to the room geometry
                    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                    room.path.forEach(p => {
                        minX = Math.min(minX, p.x);
                        maxX = Math.max(maxX, p.x);
                        minY = Math.min(minY, p.y);
                        maxY = Math.max(maxY, p.y);
                    });
                    const roomW = maxX - minX;
                    const roomH = maxY - minY;

                    (concept.items || []).forEach((item: any) => {
                        // Standard Dimension Dataset for Correction
                        const label = (item.label || "").toLowerCase();
                        let width = item.width || 1;
                        let depth = item.depth || 1;

                        if (label.includes('sofa') && label.includes('3')) { width = 2.1; depth = 0.95; }
                        else if (label.includes('sofa') && label.includes('2')) { width = 1.6; depth = 0.9; }
                        else if (label.includes('sofa')) { width = 2.1; depth = 0.95; }
                        else if (label.includes('armchair') || label.includes('accent chair')) { width = 0.9; depth = 0.9; }
                        else if (label.includes('king') && label.includes('bed')) { width = 2.0; depth = 2.1; }
                        else if (label.includes('queen') && label.includes('bed')) { width = 1.6; depth = 2.1; }
                        else if (label.includes('bed')) { width = 1.6; depth = 2.1; }
                        else if (label.includes('dining table') && label.includes('6')) { width = 1.8; depth = 0.9; }
                        else if (label.includes('dining table')) { width = 1.4; depth = 0.8; }
                        else if (label.includes('coffee table')) { width = 1.2; depth = 0.75; }
                        else if (label.includes('desk')) { width = 1.4; depth = 0.7; }
                        else if (label.includes('office chair')) { width = 0.65; depth = 0.65; }
                        else if (label.includes('wardrobe')) { depth = 0.6; } // Keep AI width if feasible
                        else if (label.includes('side table')) { width = 0.5; depth = 0.5; }
                        else if (label.includes('dining chair')) { width = 0.5; depth = 0.5; }

                        newFurniture.push({
                            id: Math.random().toString(36).substring(2, 9),
                            templateId: item.templateId?.toString().split(' ')[0] || 'sofa',
                            x: minX + (item.x_rel * roomW),
                            y: minY + (item.y_rel * roomH),
                            rotation: (item.rotation || 0),
                            width: width,
                            depth: depth,
                            label: item.label || 'Furniture',
                            category: item.category || 'living'
                        });
                    });
                } else {
                    console.warn(`Label "${label.text}" is not inside any detected room polygon.`);
                }
            });
        });

        // 2. Finalize label updates (merging updated ones with unchanged ones)
        const finalLabels = state.labels.map(l => updatedLabelMap.get(l.id) || l);

        if (newFurniture.length > 0 || updatedLabelMap.size > 0) {
            setHistory(prev => ({
                ...prev,
                furniture: [...prev.furniture, ...newFurniture],
                labels: finalLabels
            }), true);
        }
    };

    const handleOpenAIDressing = () => {
        if (canvasRef.current) {
            try {
                const canvas = canvasRef.current;
                const tempCanvas = document.createElement('canvas');
                const ctx = tempCanvas.getContext('2d');
                if (!ctx) return;

                const targetRatio = 16 / 9;
                const currentRatio = canvas.width / canvas.height;

                let outWidth = canvas.width;
                let outHeight = canvas.height;

                if (currentRatio > targetRatio) {
                    // Wider than 16:9 - Pad top/bottom
                    outHeight = canvas.width / targetRatio;
                } else {
                    // Taller than 16:9 - Pad sides
                    outWidth = canvas.height * targetRatio;
                }

                tempCanvas.width = outWidth;
                tempCanvas.height = outHeight;

                // Fill with white
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, outWidth, outHeight);

                // Center original canvas
                const x = (outWidth - canvas.width) / 2;
                const y = (outHeight - canvas.height) / 2;
                ctx.drawImage(canvas, x, y);

                const dataUrl = tempCanvas.toDataURL('image/png');
                setCapturedFloorPlan(dataUrl);
                setIsAIDressingOpen(true);
            } catch (e) {
                console.error("Failed to capture canvas:", e);
                alert("Could not capture floor plan. Please ensure the canvas is visible.");
            }
        } else {
            setIsAIDressingOpen(true);
        }
    };

    const selectedObject = state.selectedId ? state.objects.find(o => o.id === state.selectedId) : null;

    const worldToScreen = (p: { x: number, y: number }) => {
        return {
            x: p.x * state.zoom + state.pan.x,
            y: p.y * state.zoom + state.pan.y
        };
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-white text-black font-sans">
            <div className="flex-1 flex flex-col relative min-w-0 shadow-inner">
                <div className="flex-1 relative overflow-hidden bg-white">
                    {activeTab === '3d' || activeTab === 'surfaces' || activeTab === 'rendering' ? (
                        <ThreeDViewer
                            walls={state.walls}
                            objects={state.objects}
                            furniture={state.furniture}
                            labels={state.labels}
                            globalWallHeight={state.globalWallHeight ?? 2.8}
                            onUpdateWallHeight={updateGlobalWallHeight}
                            onApplyMaterial={handleApplyMaterial}
                            floorMaterials={state.floorMaterials}
                            hideSettings={activeTab === 'surfaces' || activeTab === 'rendering'}
                            onActiveRoomChange={setActiveRoomLabel}
                        />
                    ) : (
                        <EditorCanvas
                            canvasRef={canvasRef}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onWheel={handleWheel}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                        />
                    )}

                    {/* 2D Room Labels Overlay */}
                    {activeTab === 'layout' && state.labels.map(label => {
                        const screenPos = worldToScreen({ x: label.x, y: label.y });
                        if (!screenPos) return null;
                        return (
                            <div
                                key={label.id}
                                className="absolute transform -translate-x-1/2 -translate-y-1/2 px-2 py-1 bg-white/80 backdrop-blur-sm rounded border border-gray-200 shadow-sm text-xs font-semibold text-gray-700 pointer-events-auto cursor-pointer hover:bg-white hover:border-blue-400 hover:text-blue-600 transition-all select-none z-10"
                                style={{
                                    left: screenPos.x,
                                    top: screenPos.y,
                                    maxWidth: '120px',
                                    textAlign: 'center'
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const newName = prompt('Rename Room:', label.text);
                                    if (newName) updateLabel(label.id, { text: newName });
                                }}
                            >
                                {label.text}
                            </div>
                        );
                    })}

                    {activeTab !== '3d' && activeTab !== 'surfaces' && activeTab !== 'rendering' && (
                        <NavigationWidget
                            onZoomIn={zoomIn}
                            onZoomOut={zoomOut}
                            onReset={fitToView}
                        />
                    )}

                    {activeTab === 'rendering' && <AIRenderingOverlay apiKey={apiKey} onBack={() => setActiveTab('3d')} activeRoom={activeRoomLabel} />}

                    {referenceImage && activeTab === 'layout' && (
                        <div className="absolute top-4 left-4 z-10 bg-white p-2 rounded shadow-lg border border-zinc-200 w-[30vw] max-w-[400px] min-w-[200px] max-h-[85vh] flex flex-col overflow-hidden">
                            <div className="flex justify-between items-center mb-2 flex-shrink-0">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase">
                                    AI Reference {referenceDims && `(${referenceDims.width}m x ${referenceDims.depth}m)`}
                                </h3>
                                <div className="flex gap-2">
                                    <button onClick={() => setReferenceImage(null)} className="text-zinc-400 hover:text-black">×</button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto scrollbar-hide">
                                <img src={`data:image/png;base64,${referenceImage}`} alt="AI Reference" className="w-full h-auto max-h-full rounded border border-zinc-100 object-contain" />
                                {debugJson && (
                                    <details className="mt-2">
                                        <summary className="text-[10px] text-zinc-400 cursor-pointer hover:text-zinc-600">View Scan Data</summary>
                                        <pre className="text-[9px] text-zinc-400 bg-zinc-50 p-2 rounded mt-1 overflow-auto max-h-32 scrollbar-hide">
                                            {debugJson}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        </div>
                    )}

                    {selectedObject && (
                        <ObjectPopup
                            object={selectedObject}
                            position={{ x: window.innerWidth - 280, y: 100 }}
                            variant="sidebar"
                            onUpdate={updateObject}
                            onClose={() => setHistory(prev => ({ ...prev, selectedId: null }))}
                            snapshot={snapshot}
                        />
                    )}

                    {activeTab !== 'surfaces' && (
                        <div className="absolute bottom-4 right-4 text-xs text-zinc-400 pointer-events-none select-none bg-white/80 p-2 rounded backdrop-blur-sm border border-zinc-200">
                            Zoom: {Math.round(state.zoom * 100)}% | Pan: {Math.round(state.pan.x)}, {Math.round(state.pan.y)}
                        </div>
                    )}

                    {activeTab === 'furniture' && state.selectedId && state.furniture.find(f => f.id === state.selectedId) && (
                        <ProductPickerPopup
                            item={state.furniture.find(f => f.id === state.selectedId)!}
                            allocatedBudget={state.itemBudgetMap?.[state.selectedId ?? ''] || 0}
                            totalBudget={state.decorationBudget || 0}
                            totalSpent={totalSpent}
                            style={state.decorationStyle || 'Modern'}
                            onSelect={(choice) => handleProductSelect(state.selectedId!, choice)}
                            onClose={() => setHistory(prev => ({ ...prev, selectedId: null }), false)}
                        />
                    )}

                    {/* MANUALLY IMPORTED BACKGROUND SETTINGS */}
                    {state.backgroundImage && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg border border-zinc-200 p-3 min-w-[280px] z-50">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xs font-semibold text-zinc-900 flex items-center gap-2">
                                    <Sliders className="w-3 h-3" /> Trace Settings
                                </h3>
                                <div className="flex gap-1">
                                    <button onClick={() => setViewState(prev => ({ ...prev, backgroundLocked: !prev.backgroundLocked }))}
                                        className={`p-1 rounded ${state.backgroundLocked ? 'bg-amber-100 text-amber-600' : 'text-zinc-400 hover:text-zinc-600'}`}
                                        title={state.backgroundLocked ? "Unlock Background" : "Lock Background"}>
                                        {state.backgroundLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                    </button>
                                    <button onClick={() => setViewState(prev => ({ ...prev, backgroundImage: null }))}
                                        className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50"
                                        title="Remove Background">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => setIsTracePanelMinimized(prev => !prev)}
                                        className="p-1 rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50"
                                        title={isTracePanelMinimized ? "Expand" : "Minimize"}>
                                        {isTracePanelMinimized ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                                    </button>
                                </div>
                            </div>

                            {!isTracePanelMinimized && (
                                <div className={`space-y-3 ${state.backgroundLocked ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] text-zinc-500 uppercase tracking-wider flex justify-between">
                                            <span>Image Scale</span>
                                            <span className="font-mono text-zinc-400">{state.backgroundScale?.toFixed(3)}</span>
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input type="range" min="0.001" max="0.2" step="0.001"
                                                value={state.backgroundScale || 0.05}
                                                onChange={(e) => setViewState(prev => ({ ...prev, backgroundScale: parseFloat(e.target.value) }))}
                                                className="flex-1 accent-zinc-900 cursor-pointer" />
                                        </div>
                                        <p className="text-[9px] text-zinc-400 leading-tight">Drag slider until your 12m wall matches grid lines (1 large square = 1m).</p>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Position Offset</label>
                                        <div className="flex gap-2">
                                            <div className="flex items-center gap-1 flex-1 border rounded px-1">
                                                <span className="text-[10px] text-zinc-400 font-mono">X</span>
                                                <input type="number" step="0.1"
                                                    value={state.backgroundOffset?.x || 0}
                                                    onChange={(e) => setViewState(prev => ({ ...prev, backgroundOffset: { ...((prev.backgroundOffset || { y: 0 }) as Point), x: parseFloat(e.target.value) } }))}
                                                    className="w-full h-6 text-xs outline-none bg-transparent" />
                                            </div>
                                            <div className="flex items-center gap-1 flex-1 border rounded px-1">
                                                <span className="text-[10px] text-zinc-400 font-mono">Y</span>
                                                <input type="number" step="0.1"
                                                    value={state.backgroundOffset?.y || 0}
                                                    onChange={(e) => setViewState(prev => ({ ...prev, backgroundOffset: { ...((prev.backgroundOffset || { x: 0 }) as Point), y: parseFloat(e.target.value) } }))}
                                                    className="w-full h-6 text-xs outline-none bg-transparent" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <BottomBar
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onToolSelect={(mode: any) => setViewState(prev => ({ ...prev, mode }))}
                    onOpenAI={() => setIsAIModalOpen(true)}
                    onOpenAIDressing={handleOpenAIDressing}
                    onNew={handleNewPlan}
                    onLoad={() => setIsSaveModalOpen(true)}
                />
            </div>

            <SavedPlansModal
                isOpen={isSaveModalOpen}
                onClose={() => setIsSaveModalOpen(false)}
                currentState={state}
                onLoad={handleLoadPlan}
            />

            <AIModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} onGenerate={handleAIGenerate} apiKey={apiKey} setApiKey={setApiKey} />

            {activeTab !== 'rendering' && (activeTab === 'furniture' || activeTab === 'layout') && (
                <RightSidebar
                    selectedId={state.selectedId}
                    walls={state.walls}
                    objects={state.objects}
                    furniture={state.furniture}
                    labels={state.labels}
                    updateObject={updateObject}
                    updateWall={updateWall}
                    updateFurniture={updateFurniture}
                    updateLabel={updateLabel}
                    snapshot={snapshot}
                    onDelete={deleteSelection}
                    globalWallHeight={state.globalWallHeight ?? 2.8}
                    updateGlobalWallHeight={updateGlobalWallHeight}
                    apiKey={apiKey}
                />
            )}

            {activeTab === 'surfaces' && (
                <MaterialsSidebar onClose={() => setActiveTab('layout')} />
            )}

            <DecorationSetupModal
                isOpen={isDecorationModalOpen}
                onClose={() => setIsDecorationModalOpen(false)}
                onConfirm={handleDecorationConfirm}
            />
            {isAIDressingOpen && (
                <AIDressingModal
                    isOpen={isAIDressingOpen}
                    onClose={() => setIsAIDressingOpen(false)}
                    floorPlanImage={capturedFloorPlan || state.backgroundImage?.src || ""}
                    roomLabels={state.labels.map(l => l.text)}
                    onApplyFurniture={handleApplyAIDressing}
                    apiKey={apiKey}
                />
            )}
        </div>
    );
};
