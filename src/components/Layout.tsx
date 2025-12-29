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
        resetCanvas
    } = useCanvas();

    const [activeTab, setActiveTab] = React.useState<'layout' | 'furniture' | 'surfaces' | '3d'>('layout');
    const [isAIModalOpen, setIsAIModalOpen] = React.useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = React.useState(false);
    const [referenceImage, setReferenceImage] = React.useState<string | null>(null);
    const [referenceDims, setReferenceDims] = React.useState<{ width: number, depth: number } | null>(null);
    const [debugJson, setDebugJson] = React.useState<string>("");

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

    // 2. Autosave on change
    useEffect(() => {
        // Only autosave if the state has meaningful content OR we explicitly want to save the 'empty' state
        StorageService.autosave(state);
    }, [state]);

    const handleAIGenerate = async (data: any, apiKey: string) => {
        try {
            const { walls: newWalls, objects: newObjects, furniture: newFurniture, labels: newLabels, generatedImage, rawResponse, dimensions } = await AIService.generateLayout(data, apiKey);

            if (generatedImage) {
                setReferenceImage(generatedImage);
                setReferenceDims(dimensions || null);
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
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

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

    const updateGlobalWallHeight = (height: number) => {
        const h = Math.min(3.3, Math.max(2.5, height));
        setHistory(prev => ({
            ...prev,
            globalWallHeight: h,
            walls: prev.walls.map(w => ({ ...w, height: h }))
        }), true);
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

    const selectedObject = state.selectedId ? state.objects.find(o => o.id === state.selectedId) : null;

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-white text-black font-sans">
            <div className="flex-1 flex flex-col relative min-w-0 shadow-inner">
                <div className="flex-1 relative overflow-hidden bg-white">
                    {activeTab === '3d' ? (
                        <ThreeDViewer
                            walls={state.walls}
                            objects={state.objects}
                            furniture={state.furniture}
                            globalWallHeight={state.globalWallHeight ?? 2.8}
                            onUpdateWallHeight={updateGlobalWallHeight}
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

                    {activeTab !== '3d' && (
                        <NavigationWidget
                            onZoomIn={zoomIn}
                            onZoomOut={zoomOut}
                            onReset={fitToView}
                        />
                    )}

                    {referenceImage && (
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

                    <div className="absolute bottom-4 right-4 text-xs text-zinc-400 pointer-events-none select-none bg-white/80 p-2 rounded backdrop-blur-sm border border-zinc-200">
                        Zoom: {Math.round(state.zoom * 100)}% | Pan: {Math.round(state.pan.x)}, {Math.round(state.pan.y)}
                    </div>
                </div>

                <BottomBar
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onToolSelect={(mode: any) => setViewState(prev => ({ ...prev, mode }))}
                    onOpenAI={() => setIsAIModalOpen(true)}
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

            <AIModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} onGenerate={handleAIGenerate} />

            {(activeTab === 'furniture' || activeTab === 'layout') && (
                <RightSidebar
                    selectedId={state.selectedId}
                    walls={state.walls}
                    objects={state.objects}
                    furniture={state.furniture}
                    updateObject={updateObject}
                    updateWall={updateWall}
                    updateFurniture={updateFurniture}
                    snapshot={snapshot}
                    onDelete={deleteSelection}
                    globalWallHeight={state.globalWallHeight ?? 2.8}
                    updateGlobalWallHeight={updateGlobalWallHeight}
                />
            )}
        </div>
    );
};
