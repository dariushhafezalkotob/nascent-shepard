import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { EditorState, Point, Wall, WallObject, RoomLabel, Furniture } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { distance, pointToSegmentDistance, projectPointOnSegment, sub, add, scale, isPointInPolygon } from '../utils/geometry';
import { useHistory } from './useHistory';
import { detectRooms } from '../utils/roomDetection';
import { FURNITURE_TEMPLATES } from '../constants/FurnitureTemplates';

export const useCanvas = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // History State (Undoable)
    const {
        state: historyState,
        set: setHistory,
        undo,
        redo,
        snapshot,
        clear: clearHistory,
        canUndo,
        canRedo
    } = useHistory<{
        walls: Wall[];
        objects: WallObject[];
        furniture: Furniture[];
        labels: RoomLabel[];
        selectedId: string | null;
        globalWallHeight: number;
    }>({
        walls: [],
        objects: [],
        furniture: [],
        labels: [],
        selectedId: null,
        globalWallHeight: 2.8,
    });

    // View State (Not undoable)
    const [viewState, setViewState] = useState<{
        mode: EditorState['mode'];
        pan: Point;
        zoom: number;
    }>({
        mode: 'select',
        pan: { x: 0, y: 0 },
        zoom: 50, // 50 pixels = 1 meter
    });

    // Merged State
    const state: EditorState = useMemo(() => ({
        ...historyState,
        ...viewState
    }), [historyState, viewState]);

    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<Point | null>(null);
    const [activeWallId, setActiveWallId] = useState<string | null>(null);
    const [movingWallId, setMovingWallId] = useState<string | null>(null);
    const [movingObjectId, setMovingObjectId] = useState<string | null>(null);
    const [movingFurnitureId, setMovingFurnitureId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState<Point | null>(null);

    // Coordinate conversion
    const screenToWorld = useCallback((p: Point): Point => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        // The p.x and p.y here are already relative to the canvas element
        return {
            x: (p.x - canvas.width / 2 - viewState.pan.x) / viewState.zoom,
            y: (p.y - canvas.height / 2 - viewState.pan.y) / viewState.zoom,
        };
    }, [viewState.pan, viewState.zoom]);

    const worldToScreen = useCallback((p: Point): Point => {
        return {
            x: p.x * viewState.zoom + viewState.pan.x + canvasRef.current!.width / 2,
            y: p.y * viewState.zoom + viewState.pan.y + canvasRef.current!.height / 2,
        };
    }, [viewState.pan, viewState.zoom]);

    // Calculate Rooms
    const rooms = useMemo(() => detectRooms(state.walls), [state.walls]);

    // Drawing Logic
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear and set transform
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Scaled Font Metrics
        const fontScale = viewState.zoom / 50;

        // Draw Rooms (Area & Names)
        rooms.forEach(room => {
            const screenCentroid = worldToScreen(room.centroid);

            // Find matching label for this room
            const matchingLabel = state.labels.find(l => isPointInPolygon({ x: l.x, y: l.y }, room.path));
            const roomName = matchingLabel ? matchingLabel.text : "Room";

            // Draw Area Text & Name
            ctx.save();
            ctx.fillStyle = '#666666';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Scaled Font Sizes
            const nameSize = Math.max(8, 16 * fontScale);
            const areaSize = Math.max(7, 14 * fontScale);

            // Name
            ctx.fillStyle = '#000000';
            ctx.font = `bold ${nameSize}px sans-serif`;
            ctx.fillText(roomName, screenCentroid.x, screenCentroid.y - (10 * fontScale));

            // Area
            ctx.fillStyle = '#666666';
            ctx.font = `bold ${areaSize}px sans-serif`;
            ctx.fillText(`${room.area.toFixed(2)}m²`, screenCentroid.x, screenCentroid.y + (10 * fontScale));

            // Optional: visual fill for room
            ctx.beginPath();
            const start = worldToScreen(room.path[0]);
            ctx.moveTo(start.x, start.y);
            for (let i = 1; i < room.path.length; i++) {
                const p = worldToScreen(room.path[i]);
                ctx.lineTo(p.x, p.y);
            }
            ctx.closePath();
            ctx.fillStyle = 'rgba(200, 200, 200, 0.1)';
            ctx.fill();
            ctx.restore();
        });

        // Labels are now handled inside room detection for dynamic fitting
        // (Removed separate labels loop)

        // Grid disabled

        // Helper: Draw Dimension Line
        const drawDimension = (p1: Point, p2: Point, text: string, offset: number = 20) => {
            const s1 = worldToScreen(p1);
            const s2 = worldToScreen(p2);

            const dx = s2.x - s1.x;
            const dy = s2.y - s1.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len === 0) return;

            const nx = -dy / len;
            const ny = dx / len;

            const offX = nx * offset;
            const offY = ny * offset;

            const d1 = { x: s1.x + offX, y: s1.y + offY };
            const d2 = { x: s2.x + offX, y: s2.y + offY };

            ctx.beginPath();
            ctx.strokeStyle = '#999999'; // Gray measurement lines
            ctx.lineWidth = 1;
            ctx.lineWidth = 1 * (viewState.zoom / 50); // Scale line width

            // Main line
            ctx.moveTo(d1.x, d1.y);
            ctx.lineTo(d2.x, d2.y);

            // Extension lines
            const extSize = 5 * (viewState.zoom / 50);
            ctx.moveTo(s1.x, s1.y);
            ctx.lineTo(d1.x + nx * extSize, d1.y + ny * extSize);
            ctx.moveTo(s2.x, s2.y);
            ctx.lineTo(d2.x + nx * extSize, d2.y + ny * extSize);

            ctx.stroke();

            // Arrows
            const arrowSize = 4 * (viewState.zoom / 50);
            const angle = Math.atan2(d2.y - d1.y, d2.x - d1.x);

            ctx.beginPath();
            ctx.fillStyle = '#999999'; // Gray arrows
            ctx.moveTo(d1.x, d1.y);
            ctx.lineTo(d1.x + Math.cos(angle + Math.PI / 6) * arrowSize, d1.y + Math.sin(angle + Math.PI / 6) * arrowSize);
            ctx.lineTo(d1.x + Math.cos(angle - Math.PI / 6) * arrowSize, d1.y + Math.sin(angle - Math.PI / 6) * arrowSize);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(d2.x, d2.y);
            ctx.lineTo(d2.x - Math.cos(angle + Math.PI / 6) * arrowSize, d2.y - Math.sin(angle + Math.PI / 6) * arrowSize);
            ctx.lineTo(d2.x - Math.cos(angle - Math.PI / 6) * arrowSize, d2.y - Math.sin(angle - Math.PI / 6) * arrowSize);
            ctx.fill();

            // Text
            const midX = (d1.x + d2.x) / 2;
            const midY = (d1.y + d2.y) / 2;

            ctx.save();
            ctx.translate(midX, midY);
            let textAngle = angle;
            if (textAngle > Math.PI / 2 || textAngle < -Math.PI / 2) {
                textAngle += Math.PI;
            }
            ctx.rotate(textAngle);
            const dimFontSize = Math.max(6, 12 * (viewState.zoom / 50));
            ctx.fillStyle = '#999999'; // Gray measurement text
            ctx.font = `${dimFontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(text, 0, -2);
            ctx.restore();
        };

        // Draw Walls
        state.walls.forEach(wall => {
            const isSelected = state.selectedId === wall.id;
            const start = worldToScreen(wall.start);
            const end = worldToScreen(wall.end);
            const thickness = wall.thickness * state.zoom;

            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len === 0) return;

            const nx = -dy / len;
            const ny = dx / len;

            if (wall.isVirtual) {
                // Virtual Wall (Dashed Line)
                ctx.beginPath();
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.strokeStyle = isSelected ? '#60a5fa' : '#999999';
                ctx.lineWidth = isSelected ? 2 : 1;
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
            } else {
                // Wall Body
                ctx.beginPath();
                const p1 = { x: start.x + nx * thickness / 2, y: start.y + ny * thickness / 2 };
                const p2 = { x: end.x + nx * thickness / 2, y: end.y + ny * thickness / 2 };
                const p3 = { x: end.x - nx * thickness / 2, y: end.y - ny * thickness / 2 };
                const p4 = { x: start.x - nx * thickness / 2, y: start.y - ny * thickness / 2 };

                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.lineTo(p3.x, p3.y);
                ctx.lineTo(p4.x, p4.y);
                ctx.closePath();

                ctx.fillStyle = isSelected ? '#1e40af' : '#000000';
                ctx.fill();
                ctx.strokeStyle = isSelected ? '#60a5fa' : '#000000';
                ctx.lineWidth = isSelected ? 2 : 1;
                ctx.stroke();
            }

            // Draw Dimensions
            const dist = distance(wall.start, wall.end);
            const dimOffset = 30 * fontScale;
            drawDimension(wall.start, wall.end, `${dist.toFixed(2)}m`, dimOffset);

            // Draw Objects
            const wallVec = { x: wall.end.x - wall.start.x, y: wall.end.y - wall.start.y };
            const wallAngle = Math.atan2(wallVec.y, wallVec.x);

            state.objects.filter(o => o.wallId === wall.id).forEach(obj => {
                const objPos = {
                    x: wall.start.x + wallVec.x * obj.position,
                    y: wall.start.y + wallVec.y * obj.position
                };
                const screenPos = worldToScreen(objPos);
                const width = obj.width * state.zoom;

                ctx.save();
                ctx.translate(screenPos.x, screenPos.y);
                ctx.rotate(wallAngle);

                // Clear wall fill
                ctx.clearRect(-width / 2, -thickness / 2 - 1, width, thickness + 2);

                // Draw Object
                if (obj.type === 'window') {
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(-width / 2, -thickness / 2, width, thickness);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(-width / 2 + 2, -thickness / 4, width - 4, thickness / 2);
                } else if (obj.type === 'door') {
                    // Frame
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(-width / 2, -thickness / 2);
                    ctx.lineTo(-width / 2, thickness / 2);
                    ctx.moveTo(width / 2, -thickness / 2);
                    ctx.lineTo(width / 2, thickness / 2);
                    ctx.stroke();

                    // Swing
                    const isRight = obj.hinge === 'right';
                    const isOut = obj.openDirection === 'out';
                    const swingDir = isOut ? -1 : 1;
                    const hingeX = isRight ? width / 2 : -width / 2;
                    const hingeY = -thickness / 2 * swingDir;

                    ctx.beginPath();

                    const startAngle = isRight ? Math.PI : 0;
                    const endAngle = isRight
                        ? Math.PI - (Math.PI / 2 * swingDir)
                        : (Math.PI / 2 * swingDir);

                    const counterClockwise = (obj.hinge === 'left' && isOut) || (isRight && !isOut);

                    ctx.arc(hingeX, hingeY, width, startAngle, endAngle, counterClockwise);

                    ctx.strokeStyle = '#ef4444';
                    ctx.setLineDash([4, 4]);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    // Leaf
                    ctx.beginPath();
                    ctx.moveTo(hingeX, -thickness / 2 * swingDir);
                    ctx.lineTo(hingeX, -thickness / 2 * swingDir + (obj.openDirection === 'out' ? -width : width));
                    ctx.strokeStyle = '#000000';
                    ctx.stroke();
                } else if (obj.type === 'opening') {
                    // Openings just clear the wall area, no additional graphics
                    // The clearRect above (line 287) already does the heavy lifting.
                    // We can optionally draw some dashed boundary lines to indicate it's a selectable area
                    ctx.strokeStyle = '#cccccc';
                    ctx.setLineDash([2, 4]);
                    ctx.lineWidth = 1;
                    ctx.strokeRect(-width / 2, -thickness / 2, width, thickness);
                    ctx.setLineDash([]);
                }

                if (state.selectedId === obj.id) {
                    ctx.strokeStyle = '#3b82f6';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(-width / 2 - 2, -thickness / 2 - 2, width + 4, thickness + 4);
                }

                ctx.restore();
            });
        });

        // Draw Furniture
        state.furniture.forEach(item => {
            const isSelected = state.selectedId === item.id;
            const screenPos = worldToScreen({ x: item.x, y: item.y });
            const w = item.width * viewState.zoom;
            const d = item.depth * viewState.zoom;
            const rotation = (item.rotation || 0) * (Math.PI / 180);

            ctx.save();
            ctx.translate(screenPos.x, screenPos.y);
            ctx.rotate(rotation);
            // Apply flips
            ctx.scale(item.flipX ? -1 : 1, item.flipY ? -1 : 1);

            // Shadow / Glow for selection
            if (isSelected) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = 'rgba(59, 130, 246, 0.5)';
            }

            // --- Specialized Rendering Logic ---
            const drawFurnitureIcon = () => {
                ctx.fillStyle = isSelected ? '#eff6ff' : '#ffffff';
                ctx.strokeStyle = isSelected ? '#3b82f6' : '#333333';
                ctx.lineWidth = 1;

                if (item.category === 'bedroom') {
                    // Bed Frame
                    ctx.strokeRect(-w / 2, -d / 2, w, d);
                    // Pillow(s)
                    const pillowW = w * 0.35;
                    const pillowH = d * 0.2;
                    ctx.strokeRect(-w * 0.4, -d / 2 + d * 0.05, pillowW, pillowH);
                    if (item.width > 1.2) {
                        ctx.strokeRect(w * 0.05, -d / 2 + d * 0.05, pillowW, pillowH);
                    }
                    // Blanket line
                    ctx.beginPath();
                    ctx.moveTo(-w / 2, -d / 2 + d * 0.35);
                    ctx.lineTo(w / 2, -d / 2 + d * 0.35);
                    ctx.stroke();
                } else if (item.category === 'living' && item.templateId.includes('sofa')) {
                    // Sofa Base
                    ctx.strokeRect(-w / 2, -d / 2, w, d);
                    // Backrest
                    const backrestT = d * 0.2;
                    ctx.strokeRect(-w / 2, -d / 2, w, backrestT);
                    // Armrests
                    const armrestW = w * 0.1;
                    ctx.strokeRect(-w / 2, -d / 2, armrestW, d);
                    ctx.strokeRect(w / 2 - armrestW, -d / 2, armrestW, d);
                } else if (item.templateId === 'dining-table') {
                    // Table
                    ctx.strokeRect(-w / 2, -d / 2, w, d);
                    // Chairs (simplified as small squares)
                    const chairSize = Math.min(w, d) * 0.25;
                    // Long sides
                    const chairCount = Math.floor(w / (chairSize * 1.5));
                    for (let i = 0; i < chairCount; i++) {
                        const ox = -w / 2 + (i + 0.5) * (w / chairCount);
                        ctx.strokeRect(ox - chairSize / 2, -d / 2 - chairSize, chairSize, chairSize);
                        ctx.strokeRect(ox - chairSize / 2, d / 2, chairSize, chairSize);
                    }
                } else if (item.templateId === 'kitchen-island') {
                    // Island
                    ctx.strokeRect(-w / 2, -d / 2, w, d);
                    // Draw stools (circles)
                    const stoolSize = Math.min(w, d) * 0.2;
                    const stoolCount = 3;
                    for (let i = 0; i < stoolCount; i++) {
                        const ox = -w / 2 + (i + 0.5) * (w / stoolCount);
                        ctx.beginPath();
                        ctx.arc(ox, d / 2 + stoolSize * 0.3, stoolSize / 2, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                } else if (item.templateId === 'stove') {
                    ctx.strokeRect(-w / 2, -d / 2, w, d);
                    // Draw 4 burners
                    const r = Math.min(w, d) * 0.15;
                    ctx.beginPath();
                    ctx.arc(-w * 0.2, -d * 0.2, r, 0, Math.PI * 2);
                    ctx.arc(w * 0.2, -d * 0.2, r, 0, Math.PI * 2);
                    ctx.arc(-w * 0.2, d * 0.2, r, 0, Math.PI * 2);
                    ctx.arc(w * 0.2, d * 0.2, r, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (item.templateId === 'wardrobe') {
                    ctx.strokeRect(-w / 2, -d / 2, w, d);
                    // Cross lines
                    ctx.beginPath();
                    ctx.moveTo(-w / 2, -d / 2);
                    ctx.lineTo(w / 2, d / 2);
                    ctx.moveTo(w / 2, -d / 2);
                    ctx.lineTo(-w / 2, d / 2);
                    ctx.stroke();
                } else if (item.category === 'bathroom' && item.templateId === 'toilet') {
                    // Tank
                    ctx.strokeRect(-w / 2, -d / 2, w, d * 0.3);
                    // Bowl
                    ctx.beginPath();
                    ctx.ellipse(0, d * 0.1, w * 0.35, d * 0.4, 0, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (item.templateId === 'bathtub') {
                    ctx.strokeRect(-w / 2, -d / 2, w, d);
                    // Inner rim
                    ctx.beginPath();
                    ctx.roundRect(-w / 2 + w * 0.1, -d / 2 + d * 0.1, w * 0.8, d * 0.8, d * 0.2);
                    ctx.stroke();
                } else if (item.templateId === 'sink' || item.templateId === 'vanity') {
                    ctx.strokeRect(-w / 2, -d / 2, w, d);
                    // Basin
                    ctx.beginPath();
                    ctx.roundRect(-w * 0.35, -d * 0.3, w * 0.7, d * 0.6, 5);
                    ctx.stroke();
                    // Faucet (small circle)
                    ctx.beginPath();
                    ctx.arc(0, -d * 0.35, d * 0.05, 0, Math.PI * 2);
                    ctx.stroke();
                } else {
                    // Default fallback: slightly rounded box
                    ctx.beginPath();
                    ctx.roundRect(-w / 2, -d / 2, w, d, 2);
                    ctx.stroke();
                }
            };

            drawFurnitureIcon();

            // Label (only if zoom is high enough or selected)
            if (isSelected || viewState.zoom > 30) {
                ctx.shadowBlur = 0;
                const fontSize = Math.max(4, 8 * fontScale);
                ctx.fillStyle = isSelected ? '#1d4ed8' : '#94a3b8';
                ctx.font = `${fontSize}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                // Move text to bottom or center
                ctx.fillText(item.label, 0, d / 2 + 10 * fontScale);
            }

            ctx.restore();
        });

        // Draw Vertices
        state.walls.forEach(wall => {
            const drawVertex = (p: Point) => {
                const sp = worldToScreen(p);
                const radius = Math.max(2, 4 * fontScale);
                ctx.beginPath();
                ctx.arc(sp.x, sp.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = '#3b82f6';
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = Math.max(0.5, 1 * fontScale);
                ctx.stroke();
            };
            if (state.selectedId === wall.id) {
                drawVertex(wall.start);
                drawVertex(wall.end);
            }
        });

        // Draw Total Area HUD
        const totalArea = rooms.reduce((sum, room) => sum + room.area, 0);
        if (totalArea > 0) {
            ctx.save();
            const hudScale = Math.max(0.6, fontScale); // Don't let HUD get too tiny
            const hudWidth = 140 * hudScale;
            const hudHeight = 40 * hudScale;
            const hudFontSize = 16 * hudScale;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // Semi-transparent background
            ctx.fillRect(canvas.width - hudWidth - 20, 20, hudWidth, hudHeight);
            ctx.strokeStyle = '#e4e4e7'; // zinc-200
            ctx.lineWidth = 1;
            ctx.strokeRect(canvas.width - hudWidth - 20, 20, hudWidth, hudHeight);

            ctx.fillStyle = '#000000';
            ctx.font = `bold ${hudFontSize}px sans-serif`;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(`Total: ${totalArea.toFixed(2)}m²`, canvas.width - 35, 20 + (hudHeight / 2));
            ctx.restore();
        }

    }, [state, worldToScreen, rooms]);

    useEffect(() => {
        let handle: number;
        const loop = () => {
            draw();
            handle = requestAnimationFrame(loop);
        };
        loop();
        return () => window.cancelAnimationFrame(handle);
    }, [draw]);

    // Helper: Snap to vertices and walls
    const snapToVertex = (p: Point, threshold: number = 0.05): Point => {
        const worldThreshold = threshold;

        // 1. Snap to Vertices (Priority 1)
        for (const wall of state.walls) {
            if (distance(p, wall.start) < worldThreshold) return wall.start;
            if (distance(p, wall.end) < worldThreshold) return wall.end;
        }

        // 2. Snap to Wall Body (T-Junctions) (Priority 2)
        for (const wall of state.walls) {
            if (pointToSegmentDistance(p, wall.start, wall.end) < worldThreshold) {
                const { point } = projectPointOnSegment(p, wall.start, wall.end);
                return point;
            }
        }

        // 3. Grid Snapping (Base Layer)
        // Snap to nearest 5cm grid
        let snappedX = Math.round(p.x / 0.05) * 0.05;
        let snappedY = Math.round(p.y / 0.05) * 0.05;

        // 4. Alignment Snap (Override Grid if aligned with existing point)
        let snappedXDist = Infinity;
        let snappedYDist = Infinity;

        // Collect all interesting points (start and end of all walls)
        const points: Point[] = [];
        state.walls.forEach(w => {
            points.push(w.start);
            points.push(w.end);
        });

        for (const pt of points) {
            const dx = Math.abs(p.x - pt.x);
            const dy = Math.abs(p.y - pt.y);

            // Snap X (Vertical Alignment)
            // If the original point is close to aligning with pt.x, use pt.x instead of grid x
            if (dx < worldThreshold && dx < snappedXDist) {
                snappedX = pt.x;
                snappedXDist = dx;
            }

            // Snap Y (Horizontal Alignment)
            if (dy < worldThreshold && dy < snappedYDist) {
                snappedY = pt.y;
                snappedYDist = dy;
            }
        }

        return { x: snappedX, y: snappedY };
    };

    // Helper: Find closest wall to a point
    const getClosestWall = useCallback((p: Point) => {
        let bestDist = Infinity;
        let bestWall: Wall | null = null;
        let projection: { point: Point; t: number } | null = null;
        let angle = 0;

        for (const wall of state.walls) {
            if (wall.isVirtual) continue;
            const dist = pointToSegmentDistance(p, wall.start, wall.end);
            if (dist < bestDist) {
                bestDist = dist;
                bestWall = wall;
                const proj = projectPointOnSegment(p, wall.start, wall.end);
                projection = proj;

                const dx = wall.end.x - wall.start.x;
                const dy = wall.end.y - wall.start.y;
                angle = Math.atan2(dy, dx); // Angle of the wall segment
            }
        }

        return { wall: bestWall, distance: bestDist, projection, angle };
    }, [state.walls]);

    // Helper: Align furniture to wall
    const alignFurnitureToWall = useCallback((item: Furniture, worldPos: Point) => {
        const lowerId = item.templateId.toLowerCase();
        const isSofa = lowerId.includes('sofa');
        const isBed = lowerId.includes('bed');

        // Always update position to follow mouse by default
        let newItem = { ...item, x: worldPos.x, y: worldPos.y };

        if (!isSofa && !isBed) return newItem;

        const { wall, distance: wallDist } = getClosestWall(worldPos);
        const threshold = isSofa ? 7.0 : 5.0;
        if (!wall || wallDist > threshold) return newItem;


        // Determine the orientation that faces AWAY from the wall
        const wallVec = { x: wall.end.x - wall.start.x, y: wall.end.y - wall.start.y };
        const len = Math.sqrt(wallVec.x ** 2 + wallVec.y ** 2);
        const nx = -wallVec.y / len;
        const ny = wallVec.x / len;

        const { point: projPoint } = projectPointOnSegment(worldPos, wall.start, wall.end);

        // Vector from wall projection to furniture center
        const toCenter = { x: worldPos.x - projPoint.x, y: worldPos.y - projPoint.y };
        const side = (toCenter.x * nx + toCenter.y * ny) > 0 ? 1 : -1;

        // The vector from wall to furniture center (facing the room)
        const facingAngle = Math.atan2(ny * side, nx * side) * 180 / Math.PI;

        // Furniture "front" (+Z) faces towards facingAngle.
        // Screen orientation for rotation R is R+90.
        // R+90 = facingAngle => R = facingAngle - 90.
        const targetRotation = (facingAngle - 90);

        newItem.rotation = targetRotation;

        if (isBed && wallDist < 5.0) {
            // Beds must snap so the back edge touches the wall.
            const offsetDist = (item.depth / 2) + (wall.thickness / 2);
            newItem.x = projPoint.x + nx * side * offsetDist;
            newItem.y = projPoint.y + ny * side * offsetDist;
        } else {
            // Sofas just update rotation and keep moving position
            newItem.x = worldPos.x;
            newItem.y = worldPos.y;
        }

        return newItem;
    }, [getClosestWall]);

    // Event Handlers
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const worldPos = screenToWorld(mousePos);

        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            setIsDragging(true);
            setDragStart(mousePos);
            return;
        }

        if (viewState.mode === 'select') {
            let hitId: string | null = null;
            let isEndpoint = false;

            // Check Furniture (Reverse loop to pick top-most item)
            const reversedFurniture = [...state.furniture].reverse();
            for (const item of reversedFurniture) {
                const lp = worldPos;
                const dx = lp.x - item.x;
                const dy = lp.y - item.y;
                const rad = (item.rotation || 0) * (Math.PI / 180);
                const rx = dx * Math.cos(-rad) - dy * Math.sin(-rad);
                const ry = dx * Math.sin(-rad) + dy * Math.cos(-rad);

                if (Math.abs(rx) < item.width / 2 && Math.abs(ry) < item.depth / 2) {
                    hitId = item.id;
                    setMovingFurnitureId(item.id);
                    setDragOffset({ x: dx, y: dy });
                    snapshot();
                    break;
                }
            }

            // FORCE UPDATE selection
            if (hitId) {
                setHistory(prev => ({ ...prev, selectedId: hitId }), false);
            } else {
                setHistory(prev => ({ ...prev, selectedId: null }), false);
            }
            // Check objects
            if (!hitId) {
                for (const obj of state.objects) {
                    const wall = state.walls.find(w => w.id === obj.wallId);
                    if (wall) {
                        const wallVec = { x: wall.end.x - wall.start.x, y: wall.end.y - wall.start.y };
                        const objPos = {
                            x: wall.start.x + wallVec.x * obj.position,
                            y: wall.start.y + wallVec.y * obj.position
                        };
                        if (distance(worldPos, objPos) < obj.width / 2) {
                            hitId = obj.id;
                            setMovingObjectId(obj.id);
                            snapshot();
                            break;
                        }
                    }
                }

                // Check walls (Endpoints first for resizing)
                if (!hitId) {
                    const threshold = 10 / viewState.zoom;
                    for (const wall of state.walls) {
                        if (distance(worldPos, wall.start) < threshold) {
                            hitId = wall.id;
                            setMovingWallId(wall.id);
                            setDragOffset({ x: 'start' as any, y: 0 });
                            isEndpoint = true;
                            snapshot();
                            break;
                        }
                        if (distance(worldPos, wall.end) < threshold) {
                            hitId = wall.id;
                            setMovingWallId(wall.id);
                            setDragOffset({ x: 'end' as any, y: 0 });
                            isEndpoint = true;
                            snapshot();
                            break;
                        }
                    }
                }

                // Check wall bodies
                if (!hitId && !isEndpoint) {
                    for (const wall of state.walls) {
                        if (pointToSegmentDistance(worldPos, wall.start, wall.end) < wall.thickness / 2 + (5 / viewState.zoom)) {
                            hitId = wall.id;
                            setMovingWallId(wall.id);
                            setDragOffset(worldPos);
                            snapshot();
                            break;
                        }
                    }
                }

                if (state.selectedId !== hitId) {
                    setHistory(prev => ({ ...prev, selectedId: hitId }), false);
                }
            }
        } else if (viewState.mode === 'wall') {
            const startPos = snapToVertex(worldPos);
            const newWall: Wall = {
                id: uuidv4(),
                start: startPos,
                end: startPos,
                thickness: 0.2,
                height: historyState.globalWallHeight
            };
            setHistory(prev => ({
                ...prev,
                walls: [...prev.walls, newWall],
                selectedId: newWall.id
            }), false);
            setActiveWallId(newWall.id);
        }
    }, [viewState.mode, viewState.zoom, state.furniture, state.objects, state.walls, state.selectedId, screenToWorld, setHistory, snapshot]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const worldPos = screenToWorld(mousePos);

        if (isDragging && dragStart) {
            const dx = mousePos.x - dragStart.x;
            const dy = mousePos.y - dragStart.y;
            setViewState(prev => ({ ...prev, pan: { x: prev.pan.x + dx, y: prev.pan.y + dy } }));
            setDragStart(mousePos);
            return;
        }

        if (activeWallId) {
            const snappedPos = snapToVertex(worldPos);
            setHistory(prev => ({
                ...prev,
                walls: prev.walls.map(w => w.id === activeWallId ? { ...w, end: snappedPos } : w)
            }), true);
        }

        if (movingObjectId) {
            setHistory(prev => {
                const obj = prev.objects.find(o => o.id === movingObjectId);
                if (!obj) return prev;
                const wall = prev.walls.find(w => w.id === obj.wallId);
                if (!wall) return prev;
                const { t } = projectPointOnSegment(worldPos, wall.start, wall.end);
                return {
                    ...prev,
                    objects: prev.objects.map(o => o.id === movingObjectId ? { ...o, position: t } : o)
                };
            }, true);
        }

        if (movingFurnitureId) {
            setHistory(prev => {
                const item = prev.furniture.find(f => f.id === movingFurnitureId);
                if (!item || !dragOffset) return prev;
                let rawX = worldPos.x - dragOffset.x;
                let rawY = worldPos.y - dragOffset.y;

                const alignedItem = alignFurnitureToWall(item, { x: rawX, y: rawY });

                return {
                    ...prev,
                    furniture: prev.furniture.map(f => f.id === movingFurnitureId ? { ...f, x: alignedItem.x, y: alignedItem.y, rotation: alignedItem.rotation } : f)
                };
            }, true);
        }

        if (movingWallId && dragOffset) {
            let currentPos = worldPos;
            if (e.shiftKey) {
                const dx = Math.abs(worldPos.x - dragOffset.x);
                const dy = Math.abs(worldPos.y - dragOffset.y);
                if (dx > dy) currentPos = { x: worldPos.x, y: dragOffset.y };
                else currentPos = { x: dragOffset.x, y: worldPos.y };
            }

            if ((dragOffset.x as any) === 'start') {
                const snappedPos = snapToVertex(currentPos);
                setHistory(prev => {
                    const movingWall = prev.walls.find(w => w.id === movingWallId);
                    if (!movingWall) return prev;
                    const oldStart = movingWall.start;
                    const oldEnd = movingWall.end;
                    return {
                        ...prev,
                        walls: prev.walls.map(w => {
                            let start = w.start;
                            let end = w.end;
                            if (distance(start, oldStart) < 0.001) start = snappedPos;
                            if (distance(end, oldStart) < 0.001) end = snappedPos;
                            const wasOnWall = (p: Point) => pointToSegmentDistance(p, oldStart, oldEnd) < 0.05;
                            if (wasOnWall(start) && distance(start, oldStart) > 0.05 && distance(start, oldEnd) > 0.05) {
                                const { t } = projectPointOnSegment(start, oldStart, oldEnd);
                                start = add(snappedPos, scale(sub(oldEnd, snappedPos), t));
                            }
                            if (wasOnWall(end) && distance(end, oldStart) > 0.05 && distance(end, oldEnd) > 0.05) {
                                const { t } = projectPointOnSegment(end, oldStart, oldEnd);
                                end = add(snappedPos, scale(sub(oldEnd, snappedPos), t));
                            }
                            return { ...w, start, end };
                        })
                    };
                }, true);
            } else if ((dragOffset.x as any) === 'end') {
                const snappedPos = snapToVertex(currentPos);
                setHistory(prev => {
                    const movingWall = prev.walls.find(w => w.id === movingWallId);
                    if (!movingWall) return prev;
                    const oldStart = movingWall.start;
                    const oldEnd = movingWall.end;
                    return {
                        ...prev,
                        walls: prev.walls.map(w => {
                            let start = w.start;
                            let end = w.end;
                            if (distance(start, oldEnd) < 0.001) start = snappedPos;
                            if (distance(end, oldEnd) < 0.001) end = snappedPos;
                            const wasOnWall = (p: Point) => pointToSegmentDistance(p, oldStart, oldEnd) < 0.05;
                            if (wasOnWall(start) && distance(start, oldStart) > 0.05 && distance(start, oldEnd) > 0.05) {
                                const { t } = projectPointOnSegment(start, oldStart, oldEnd);
                                start = add(oldStart, scale(sub(snappedPos, oldStart), t));
                            }
                            if (wasOnWall(end) && distance(end, oldStart) > 0.05 && distance(end, oldEnd) > 0.05) {
                                const { t } = projectPointOnSegment(end, oldStart, oldEnd);
                                end = add(oldStart, scale(sub(snappedPos, oldStart), t));
                            }
                            return { ...w, start, end };
                        })
                    };
                }, true);
            } else {
                const dx = currentPos.x - dragOffset.x;
                const dy = currentPos.y - dragOffset.y;
                setHistory(prev => {
                    const movingWall = prev.walls.find(w => w.id === movingWallId);
                    if (!movingWall) return prev;
                    const oldStart = movingWall.start;
                    const oldEnd = movingWall.end;
                    const newStart = { x: oldStart.x + dx, y: oldStart.y + dy };
                    const newEnd = { x: oldEnd.x + dx, y: oldEnd.y + dy };
                    return {
                        ...prev,
                        walls: prev.walls.map(w => {
                            if (w.id === movingWallId) return { ...w, start: newStart, end: newEnd };
                            let start = w.start;
                            let end = w.end;
                            if (distance(start, oldStart) < 0.05) start = newStart;
                            else if (distance(start, oldEnd) < 0.05) start = newEnd;
                            if (distance(end, oldStart) < 0.05) end = newStart;
                            else if (distance(end, oldEnd) < 0.05) end = newEnd;
                            return { ...w, start, end };
                        })
                    };
                }, true);
                setDragOffset(currentPos);
            }
        }
    }, [screenToWorld, isDragging, dragStart, activeWallId, movingObjectId, movingFurnitureId, movingWallId, dragOffset, setHistory]);

    const handleMouseUp = useCallback(() => {
        if (activeWallId) {
            setViewState(prev => ({ ...prev, mode: 'select' }));
        }
        setIsDragging(false);
        setDragStart(null);
        setActiveWallId(null);
        setMovingWallId(null);
        setMovingObjectId(null);
        setMovingFurnitureId(null);
        setDragOffset(null);
    }, [activeWallId]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        const newZoom = Math.max(10, Math.min(200, viewState.zoom - e.deltaY * 0.1));
        setViewState(prev => ({ ...prev, zoom: newZoom }));
    }, [viewState.zoom]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('application/react-dnd-type');
        const templateId = e.dataTransfer.getData('application/react-dnd-template');
        const worldPos = screenToWorld({ x: e.clientX, y: e.clientY });

        if (type === 'furniture' && templateId) {
            const template = FURNITURE_TEMPLATES.find(t => t.id === templateId);
            if (template) {
                const newItem: Furniture = {
                    id: uuidv4(),
                    templateId: template.id,
                    x: worldPos.x,
                    y: worldPos.y,
                    width: template.width,
                    depth: template.depth,
                    rotation: 0,
                    label: template.label,
                    category: template.category
                };
                const alignedItem = alignFurnitureToWall(newItem, worldPos);

                snapshot();
                setHistory(prev => ({
                    ...prev,
                    furniture: [...(prev.furniture || []), alignedItem],
                    selectedId: alignedItem.id
                }), false);
            }
        } else if (type === 'door' || type === 'window' || type === 'opening') {
            // Find nearest wall to drop door/window/opening
            let bestDist = Infinity;
            let bestWall = null;
            let bestT = 0;

            for (const wall of state.walls) {
                if (wall.isVirtual) continue;
                const dist = pointToSegmentDistance(worldPos, wall.start, wall.end);
                if (dist < 0.5 && dist < bestDist) {
                    const { t } = projectPointOnSegment(worldPos, wall.start, wall.end);
                    bestDist = dist;
                    bestWall = wall;
                    bestT = t;
                }
            }

            if (bestWall) {
                const newObj: WallObject = {
                    id: uuidv4(),
                    wallId: bestWall.id,
                    type: type as any,
                    position: bestT,
                    width: type === 'door' ? 0.9 : (type === 'window' ? 1.2 : 1.5),
                    height: type === 'door' ? 2.1 : (type === 'window' ? 1.2 : 2.1),
                    offset: type === 'door' ? 0 : (type === 'window' ? 0.9 : 0),
                    hinge: 'left',
                    openDirection: 'in'
                };
                snapshot();
                setHistory(prev => ({
                    ...prev,
                    objects: [...prev.objects, newObj],
                    selectedId: newObj.id
                }), false);
            }
        }
    }, [screenToWorld, state.walls, snapshot, setHistory]);

    const deleteSelection = useCallback(() => {
        if (!state.selectedId) return;
        snapshot();
        setHistory(prev => ({
            ...prev,
            walls: prev.walls.filter(w => w.id !== state.selectedId),
            objects: prev.objects.filter(o => o.id !== state.selectedId && o.wallId !== state.selectedId),
            furniture: (prev.furniture || []).filter(f => f.id !== state.selectedId),
            labels: prev.labels.filter(l => l.id !== state.selectedId),
            selectedId: null
        }), false);
    }, [state.selectedId, state.walls, snapshot, setHistory]);

    const zoomIn = useCallback(() => setViewState(prev => ({ ...prev, zoom: Math.min(200, prev.zoom * 1.2) })), []);
    const zoomOut = useCallback(() => setViewState(prev => ({ ...prev, zoom: Math.max(10, prev.zoom / 1.2) })), []);
    const fitToView = useCallback(() => setViewState(prev => ({ ...prev, zoom: 50, pan: { x: 0, y: 0 } })), []);

    const resetCanvas = useCallback(() => {
        clearHistory({
            walls: [],
            objects: [],
            furniture: [],
            labels: [],
            selectedId: null,
            globalWallHeight: 2.8,
        });
        setViewState({
            mode: 'select',
            pan: { x: 0, y: 0 },
            zoom: 50
        });
    }, [clearHistory]);

    return {
        canvasRef,
        state,
        setHistory,
        setViewState,
        snapshot,
        undo,
        redo,
        canUndo,
        canRedo,
        deleteSelection,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleWheel,
        handleDragOver,
        handleDrop,
        worldToScreen,
        zoomIn,
        zoomOut,
        fitToView,
        resetCanvas
    };
};
