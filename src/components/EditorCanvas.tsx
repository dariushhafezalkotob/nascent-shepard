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
        if (canvas) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            const handleResize = () => {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            };

            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
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
