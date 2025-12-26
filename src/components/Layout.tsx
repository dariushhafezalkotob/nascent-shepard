import React, { useEffect } from 'react';
import { EditorCanvas } from './EditorCanvas';
import { AIModal } from './AIModal';
import { AIService } from '../services/AIService';
import { RightSidebar } from './RightSidebar';
import { BottomBar } from './BottomBar';
import { NavigationWidget } from './NavigationWidget';
import { ObjectPopup } from './ObjectPopup';
import { useCanvas } from '../hooks/useCanvas';

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
        fitToView
    } = useCanvas();

    const [isAIModalOpen, setIsAIModalOpen] = React.useState(false);
    const [referenceImage, setReferenceImage] = React.useState<string | null>(null);
    const [referenceDims, setReferenceDims] = React.useState<{ width: number, depth: number } | null>(null);
    const [debugJson, setDebugJson] = React.useState<string>("");

    const handleAIGenerate = async (data: any, apiKey: string) => {
        try {
            const { walls: newWalls, labels: newLabels, generatedImage, rawResponse, dimensions } = await AIService.generateLayout(data, apiKey);

            if (generatedImage) {
                setReferenceImage(generatedImage);
                setReferenceDims(dimensions || null);
            }

            if (rawResponse) {
                setDebugJson(rawResponse);
            }

            // Append new walls and labels to history
            setHistory(prev => ({
                ...prev,
                walls: [...prev.walls, ...newWalls],
                labels: [...(prev.labels || []), ...newLabels]
            }), false); // Create new history entry
        } catch (e) {
            console.error(e);
            throw e; // Rethrow for modal to handle
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check for input focus to facilitate standard text editing undo/redo (optional, browser handles it usually but we might capture it?)
            // Actually, if we are focused on an input, we might want to let the browser handle text undo.
            // But our state is managed by React. Browser Undo might not work for React controlled inputs as expected if we don't respect it.
            // However, usually we want App-level undo if not inside a text field.
            // If inside text field, Ctrl+Z usually undoes text.
            // Let's check target.
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            if (e.key === 'z' && (e.metaKey || e.ctrlKey)) {
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
                e.preventDefault();
            } else if (e.key === 'y' && (e.metaKey || e.ctrlKey)) {
                redo();
                e.preventDefault();
            } else if ((e.key === 'Delete' || e.key === 'Backspace') && !e.repeat) {
                deleteSelection();
                // prevent default backspace navigation if any
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
        }), true); // replace=true (rely on snapshot)
    };

    const updateWall = (id: string, updates: any) => {
        setHistory(prev => ({
            ...prev,
            walls: prev.walls.map(w => w.id === id ? { ...w, ...updates } : w)
        }), true); // replace=true (rely on snapshot)
    };

    // Calculate popup position
    const selectedObject = state.selectedId ? state.objects.find(o => o.id === state.selectedId) : null;

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-white text-black font-sans">
            <div className="flex-1 flex flex-col relative">
                <div className="flex-1 relative overflow-hidden bg-white">
                    <EditorCanvas
                        canvasRef={canvasRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onWheel={handleWheel}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                    />
                    <NavigationWidget
                        onZoomIn={zoomIn}
                        onZoomOut={zoomOut}
                        onReset={fitToView}
                    />
                    {/* <DebugGeminiTest /> - Hidden for now, integrated into flow */}

                    {/* Reference Image Panel */}
                    {referenceImage && (
                        <div className="absolute top-4 left-4 z-10 bg-white p-2 rounded shadow-lg border border-zinc-200 max-w-[500px]">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase">AI Reference</h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            // Simple CSS flip for visualization
                                            const img = document.getElementById('ref-image');
                                            if (img) {
                                                const current = img.style.transform;
                                                img.style.transform = current === 'scaleY(-1)' ? 'none' : 'scaleY(-1)';
                                            }
                                        }}
                                        className="text-xs text-blue-500 hover:text-blue-700"
                                        title="Flip Vertical (Fix Inversion)"
                                    >
                                        Flip Vert
                                    </button>
                                    <button
                                        onClick={() => setReferenceImage(null)}
                                        className="text-zinc-400 hover:text-black"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                            <img
                                id="ref-image"
                                src={`data:image/png;base64,${referenceImage}`}
                                alt="AI Generation"
                                className="w-full rounded border border-zinc-100 object-cover transition-transform"
                                style={{
                                    // Make the image match the real-world aspect ratio
                                    // UPDATED: Use natural aspect ratio to avoid distortion per user request
                                    aspectRatio: 'auto',
                                    maxHeight: '400px'
                                }}
                            />
                            {referenceDims && (
                                <div className="mt-1 text-[10px] text-zinc-400 text-center">
                                    {referenceDims.width}m x {referenceDims.depth.toFixed(2)}m
                                </div>
                            )}

                            {/* Debug Raw JSON Button/View */}
                            <details className="mt-2 text-[10px]">
                                <summary className="cursor-pointer text-zinc-500 hover:text-black font-mono">View Raw AI JSON</summary>
                                <pre className="mt-1 p-1 bg-zinc-50 text-zinc-600 rounded overflow-auto max-h-[200px] border border-zinc-100 whitespace-pre-wrap font-mono">
                                    {debugJson || "No Data"}
                                </pre>
                            </details>
                        </div>
                    )}

                    {/* Object Property Popup */}
                    {selectedObject && (
                        <ObjectPopup
                            object={selectedObject}
                            position={{ x: window.innerWidth - 280, y: 100 }} // Fixed position on right side
                            variant="sidebar"
                            onUpdate={updateObject}
                            onClose={() => setHistory(prev => ({ ...prev, selectedId: null }))}
                            snapshot={snapshot}
                        />
                    )}

                    {/* Zoom/Pan Info Overlay */}
                    <div className="absolute bottom-4 right-4 text-xs text-zinc-400 pointer-events-none select-none bg-white/80 dark:bg-zinc-800/80 p-2 rounded backdrop-blur-sm border border-zinc-200 dark:border-zinc-700">
                        Zoom: {Math.round(state.zoom * 100)}% | Pan: {Math.round(state.pan.x)}, {Math.round(state.pan.y)}
                    </div>
                </div>

                <BottomBar
                    onToolSelect={(mode) => setViewState(prev => ({ ...prev, mode }))}
                    onOpenAI={() => setIsAIModalOpen(true)}
                />
            </div>

            <AIModal
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
                onGenerate={handleAIGenerate}
            />

            <RightSidebar
                selectedId={state.selectedId}
                walls={state.walls}
                objects={state.objects}
                updateObject={updateObject}
                updateWall={updateWall}
                snapshot={snapshot}
            />
        </div>
    );
};
