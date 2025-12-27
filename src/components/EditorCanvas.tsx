import React, { useEffect } from 'react';

interface EditorCanvasProps {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    onWheel: (e: React.WheelEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
    canvasRef,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onWheel,
    onDrop,
    onDragOver
}) => {
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = canvas?.parentElement;
        if (!canvas || !container) return;

        const resizeCanvas = () => {
            const { clientWidth, clientHeight } = container;
            canvas.width = clientWidth;
            canvas.height = clientHeight;
        };

        const observer = new ResizeObserver(() => {
            resizeCanvas();
        });

        observer.observe(container);
        resizeCanvas();

        return () => observer.disconnect();
    }, [canvasRef]);

    return (
        <div className="relative w-full h-full overflow-hidden bg-white">
            <canvas
                ref={canvasRef}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onWheel={onWheel}
                onDrop={onDrop}
                onDragOver={onDragOver}
                className="block touch-none cursor-crosshair"
            />
        </div>
    );
};
