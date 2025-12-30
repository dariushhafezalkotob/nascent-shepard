
import type { Wall, RoomLabel } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSegmentIntersection, projectPointOnSegment, distance, pointToSegmentDistance } from '../utils/geometry';
import { FURNITURE_TEMPLATES } from '../constants/FurnitureTemplates';
import type { Furniture } from '../types';

// --- PROMPTS ---

// 1. IMAGE GENERATION PROMPT
const IMAGE_GEN_PROMPT_TEMPLATE = (userPrompt: string, constraints?: { landWidth: number, landDepth: number }, aspectRatio?: string) => `
IMAGE_GENERATION_TASK: Generate a technical 2D floor plan.
OBJECTIVE: Technical drawing of ${userPrompt}.
${constraints ? `SITE_CONSTRAINTS: ${constraints.landWidth}m x ${constraints.landDepth}m rectangular site.` : ''}
${aspectRatio ? `ASPECT_RATIO: ${aspectRatio}.` : ''}
TECHNICAL_SPECIFICATIONS:
- VIEW: Top-down 2D orthographic projection.
- STYLE: Clean high-contrast architectural technical drawing. 
- STANDARD_SYMBOLS: Use only standard ISO architectural symbols for doors, windows, and furniture.
- CLEANLINESS: AVOID drawing extra shapes such as balcony railings, facade textures, decorative signs, or complex fixtures not included in walls/windows/standard furniture.
- CONTENT: Precise walls, room labels, openings, furniture layout (beds, sofas, kitchen belts, toilets, etc.).
- CORRIDORS: Minimum width must be 1.5 meters.
- OUTPUT_FORMAT: IMAGE ONLY. No preamble, no markers outside the plan.
`;

// 2. VISION ANALYSIS PROMPT - STEP A: STRUCTURE
const STRUCTURAL_PROMPT = (constraints?: { landWidth: number, landDepth: number }) => `
ACT AS A PRECISION ARCHITECTURAL SCANNER.
Scan the floor plan image for STRUCTURE: FOOTPRINT, ROOM BOUNDARIES, and OPENINGS.
${constraints ? `CONTEXT: This building is designed for a site of ${constraints.landWidth}m x ${constraints.landDepth}m.` : ''}

TOPOLOGICAL CONTINUITY RULES:
- SHARED VERTICES: Adjacent rooms MUST share the EXACT SAME coordinates for their common boundary. NO GAPS or "ghost corridors" are allowed between touching rooms.
- FOOTPRINT SATURATION: INTERNAL ROOMS must collectively fill 100% of the internal building area. There should be NO empty gaps between the internal room boundaries and the external footprint walls.
- OUTSIDE-IN LOGIC: First identify the overall building footprint, then partition it into internal spaces. 
- PROPORTIONAL PARTITIONING: Analyze the layout as a series of subdivisions. If the long axis is divided into multiple rooms, ensure their combined length exactly matches the footprint's length.
- WALL PRIORITY: Identify walls as continuous straight lines where possible. Do not "jump" between points; follow the structural lines.
- CORRIDOR STANDARD: Corridors and Hallways MUST have a minimum width of 1.5m. Ensure identified corners reflect this.
- OPENINGS/VOIDS: Identify gaps in walls without doors as "opening". Ensure they are correctly positioned as WallObjects.
- IGNORE furniture, appliances, and cabinetry when identifying structural corners.

TASKS:
1. Identify the building footprint (exterior walls) as an ordered list of points.
2. Identify all rooms and corridors. For each space return 'name' and 'corners' (polygon).
3. Identify all openings (doors, windows) return 'type', 'x', 'y', 'width'.

RETURN JSON ONLY:
{
  "footprint": [{"x": 0, "y": 0}, ...],
  "rooms": [
    {
      "name": "Room Name", 
      "corners": [{"x": 100, "y": 100}, {"x": 200, "y": 100}, {"x": 200, "y": 200}, {"x": 100, "y": 200}]
    }
  ],
  "openings": [
    {"type": "door", "x": 150, "y": 100, "width": 80, "hinge": "right", "swing": "in"}
  ],
  "overall_width_meters": ${constraints ? Math.max(constraints.landWidth, constraints.landDepth) : 15.0}
}
`;

// 3. VISION ANALYSIS PROMPT - STEP B: FURNITURE
const FURNITURE_PROMPT = (rooms: { name: string, x: number, y: number, w: number, h: number }[]) => `
ACT AS AN INTERIOR DESIGNER.
Using the provided floor plan image and the list of rooms identified below, find all FURNITURE items.

ROOMS CONTEXT (x,y is center):
${rooms.map(r => `- ${r.name} (Center: ${r.x},${r.y}, Size: ${r.w}x${r.h})`).join('\n')}

AVAILABLE FURNITURE TYPES:
${FURNITURE_TEMPLATES.map(t => `- ${t.id}: ${t.label} (Approx ${t.width}m x ${t.depth}m)`).join('\n')}

TASKS:
1. Identify all FURNITURE icons. 
2. FOR KITCHENS:
   - Do NOT identify individual cabinets. 
   - Instead, find the long RECTANGULAR BLOCKS which represent kitchen counters (Kitchen Belts).
   - Return these as "kitchen_belts" with "start" and "end" points (x, y). 
   - A straight counter is one belt. An L-shaped kitchen is TWO belts meeting at a corner.
3. Locate APPLIANCES (sink, stove, fridge) and return them as normal furniture items.
4. FOR OTHER ITEMS, use these PLACEMENT RULES:
   - BEDS: Back (headboard) MUST be against a wall.
   - WARDROBES / TV STANDS: Back MUST be against a wall, facing into the room.
   - SOFAS / ARMCHAIRS: Should face the ROOM CENTER or TV Stand, never face the wall.
   - NIGHTSTANDS: Place in PAIRS on both sides of the bed headboard.
   - TOILETS / SHOWERS: Back MUST be against a wall.
5. Return 'templateId', 'roomName', 'x', 'y', and 'rotation' (0=North, 90=East, etc).

RETURN JSON ONLY:
{
  "items": [
    { "templateId": "sofa-2", "roomName": "Living Room", "x": 120, "y": 120, "rotation": 90 },
    { "templateId": "bed-double", "roomName": "Bedroom", "x": 300, "y": 200, "rotation": 0 }
  ],
  "kitchen_belts": [
    { "start": {"x": 100, "y": 100}, "end": {"x": 300, "y": 100} }
  ]
}
`;

interface VisionRoom {
    name: string;
    corners: { x: number; y: number }[];
}

interface FurnitureItem {
    templateId: string;
    roomName: string;
    x: number;
    y: number;
    rotation?: number;
}

interface VisionOpening {
    type: 'door' | 'window';
    x: number;
    y: number;
    width: number;
    hinge?: 'left' | 'right';
    swing?: 'in' | 'out';
}

interface VisionResponse {
    footprint: { x: number; y: number }[];
    rooms: VisionRoom[];
    openings?: VisionOpening[];
    overall_width_meters?: number;
    overall_width?: number;
    items?: FurnitureItem[];
    kitchen_belts?: { start: { x: number, y: number }, end: { x: number, y: number } }[];
}

export class AIService {

    static async generateLayout(data: any, apiKey: string): Promise<{ walls: Wall[], objects: any[], furniture: Furniture[], labels: RoomLabel[], generatedImage?: string, rawResponse?: string, dimensions?: { width: number, depth: number } }> {
        console.log("Generating layout V7 (Furniture Architect)...");

        if (!apiKey) throw new Error("API Key required");

        const genAI = new GoogleGenerativeAI(apiKey);

        // 1. FEASIBILITY CHECK
        const landWidth = parseFloat(data.landWidth) || 0;
        const landDepth = parseFloat(data.landDepth) || 0;
        const landArea = landWidth * landDepth;
        const bedrooms = parseInt(data.bedrooms) || 0;
        const bathrooms = parseInt(data.bathrooms) || 0;

        // Area Estimates (Architectural Standards)
        const livingArea = 18;
        const kitchenArea = 9;
        const bedArea = bedrooms * 11; // 11m2 avg
        const bathArea = bathrooms * 4;
        const baseArea = livingArea + kitchenArea + bedArea + bathArea;
        const requiredArea = baseArea * 1.25; // +25% for walls and circulation

        if (requiredArea > landArea * 0.8) {
            throw new Error(`Architectural Warning: A ${bedrooms}-bedroom apartment requires approx ${requiredArea.toFixed(1)}m². Your land (${landArea}m²) is too small for a comfortable layout considering setbacks.`);
        }

        console.log(`Feasibility check passed. Required: ~${requiredArea.toFixed(1)}m², Available: ${landArea}m²`);

        // 2. PROGRAM GENERATION (Internal Reasoning for prompt)
        const userPrompt = `A ${bedrooms}-bedroom, ${bathrooms}-bathroom apartment on a ${landWidth}m x ${landDepth}m land. Priorities: ${data.priorities}. Include typical furniture layout if possible.`;

        // Extract selected model or default
        const selectedModel = data.model || 'gemini-2.5-flash-image';

        return this.mockOrRealImplementation(userPrompt, genAI, apiKey, { landWidth, landDepth, targetArea: requiredArea }, selectedModel);
    }

    private static async retryWithBackoff<T>(
        operation: () => Promise<T>,
        retries: number = 3,
        baseDelay: number = 2000
    ): Promise<T> {
        try {
            return await operation();
        } catch (error: any) {
            // Unmask the internal error if it exists
            const msg = error.message || JSON.stringify(error);

            // Check for Hard Quota Limit 0 (Model not available in region or tier)
            if (msg.includes('limit: 0') || msg.includes('API key not valid') || msg.includes('403') || msg.includes('400')) {
                console.error("Hard API Error (No Retry):", msg);
                // Throw a more friendly error if it's the limit issue
                if (msg.includes('limit: 0')) {
                    throw new Error("Your API Key does not have access to 'gemini-2.0-flash-exp'. Please check your Google AI Studio billing/plan or use a different model.");
                }
                throw error; // Throw immediately, do not retry
            }

            // Check for RETRYABLE Rate Limits
            // 429 is the standard code.
            const isRateLimit = msg.includes('429') ||
                msg.includes('Quota exceeded') ||
                msg.includes('rate-limit') ||
                msg.includes('503'); // Service Unavailable is often retryable

            if (isRateLimit && retries > 0) {
                console.warn(`Rate limit/Server error hit. Retries left: ${retries}`);

                // Try to extract strict "retry in X seconds" from error message
                let delay = baseDelay;
                const match = msg.match(/retry in\s+([0-9.]+)\s*s/i);
                if (match && match[1]) {
                    delay = (parseFloat(match[1]) * 1000) + 1000; // Wait requested time + 1s buffer
                } else {
                    // Exponential backoff if no specific time
                    delay = baseDelay * 2;
                }

                // Cap delay at 60 seconds to avoid "forever" hang
                if (delay > 60000) delay = 60000;

                console.log(`Waiting ${delay}ms before retrying...`);
                await new Promise(resolve => setTimeout(resolve, delay));

                return this.retryWithBackoff(operation, retries - 1, delay);
            }

            throw error; // Unknown error, throw
        }
    }

    // Expose this for testing/debugging (Widget)
    static async generateImage(userPrompt: string, apiKey: string, modelName: string = 'gemini-2.5-flash-image'): Promise<string> {
        if (!apiKey) throw new Error("API Key required");
        const genAI = new GoogleGenerativeAI(apiKey);

        console.log(`Requesting Image from ${modelName}...`);

        // Helper to run image gen with retries
        let base64Image: string | null = null;

        try {
            // @ts-ignore - internal usage
            const constraints = (this as any)._lastConstraints;

            // Determine Aspect Ratio
            let aspectRatio = "1:1";
            if (constraints && constraints.landWidth && constraints.landDepth) {
                const ratio = constraints.landWidth / constraints.landDepth;
                if (ratio > 1.4) aspectRatio = "16:9";
                else if (ratio > 1.1) aspectRatio = "4:3";
                else if (ratio < 0.7) aspectRatio = "9:16";
                else if (ratio < 0.9) aspectRatio = "3:4";
            }
            console.log(`Using Aspect Ratio: ${aspectRatio}`);

            let imgModel;
            let finalPrompt;

            if (modelName === 'gemini-2.5-flash-image' || modelName.includes('gemini-3')) {
                // CONFIG-BASED (New API)
                imgModel = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        // @ts-ignore
                        candidateCount: 1,
                        // @ts-ignore
                        responseModalities: ["IMAGE"],
                        // @ts-ignore
                        imageConfig: {
                            aspectRatio: aspectRatio
                        }
                    }
                });
                finalPrompt = IMAGE_GEN_PROMPT_TEMPLATE(userPrompt, constraints);
            } else {
                // PROMPT-BASED (Fallback for v2.0 or others)
                console.log("Using prompt-based aspect ratio enforcement.");
                imgModel = genAI.getGenerativeModel({ model: modelName });
                finalPrompt = IMAGE_GEN_PROMPT_TEMPLATE(userPrompt, constraints, aspectRatio);
            }

            const result = await this.retryWithBackoff(async () => {
                return await imgModel.generateContent(finalPrompt);
            }, 3, 5000);

            const response = await result.response;

            // Try to extract image from any part (sometimes text comes first)
            if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) {
                        base64Image = part.inlineData.data;
                        break;
                    }
                }

                if (!base64Image) {
                    console.log("No inline data found in parts:", response.candidates[0].content.parts);
                }
            }

            if (!base64Image) {
                // @ts-ignore
                if (response.images && response.images.length > 0) {
                    // @ts-ignore
                    base64Image = response.images[0];
                }
            }

            if (!base64Image) {
                throw new Error("Could not find image data in API response. Response: " + JSON.stringify(response));
            }

            return base64Image;

        } catch (e: any) {
            console.error("Image Gen Failed:", e);
            throw new Error(`Image Generation Failed: ${e.message}`);
        }
    }

    private static async mockOrRealImplementation(userPrompt: string, genAI: GoogleGenerativeAI, apiKey: string, constraints?: { landWidth: number, landDepth: number, targetArea: number }, modelName: string = 'gemini-2.5-flash-image') {

        // Store constraints temporarily for sub-calls (Hack for static method flow)
        (this as any)._lastConstraints = constraints;

        // --- STEP 1: IMAGE GENERATION ---
        console.log("Step 1: Dreaming Floor Plan...");
        const base64Image = await this.generateImage(userPrompt, apiKey, modelName);

        // --- STEP 2: VISION ANALYSIS ---
        console.log("Step 2: Vision Analysis...");
        // User requested exact model from their python script
        const visionModel = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        try {
            // STEP 2A: STRUCTURAL SCAN
            const structuralResp = await this.retryWithBackoff(async () => {
                return await visionModel.generateContent([
                    STRUCTURAL_PROMPT(constraints),
                    {
                        inlineData: {
                            data: base64Image!,
                            mimeType: "image/png"
                        }
                    }
                ]);
            }, 3, 2000);

            const structText = structuralResp.response.text();
            console.log("Step 2A (Structure):", structText);

            const cleanStruct = this.extractJSON(structText);
            const structData: VisionResponse = JSON.parse(cleanStruct);

            // STEP 2B: FURNITURE SCAN (Using room context)
            console.log("Step 2B: Furniture Scan...");
            const roomsForContext = structData.rooms.map(r => {
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                r.corners.forEach(p => {
                    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
                    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
                });
                return {
                    name: r.name,
                    x: (minX + maxX) / 2,
                    y: (minY + maxY) / 2,
                    w: maxX - minX,
                    h: maxY - minY
                };
            });

            const furnitureResp = await this.retryWithBackoff(async () => {
                return await visionModel.generateContent([
                    FURNITURE_PROMPT(roomsForContext),
                    {
                        inlineData: {
                            data: base64Image!,
                            mimeType: "image/png"
                        }
                    }
                ]);
            }, 3, 2000);

            const furnText = furnitureResp.response.text();
            console.log("Step 2B (Furniture):", furnText);

            const cleanFurn = this.extractJSON(furnText);
            const furnData = JSON.parse(cleanFurn);

            // CRITICAL: Ensure constraints are passed and used for scaling
            const visionResult = this.convertVisionToWalls(structData, furnData.items || [], structData.kitchen_belts || furnData.kitchen_belts || [], constraints?.targetArea || null, constraints);

            const finalWidth = visionResult.debugDims?.width || structData.overall_width_meters || structData.overall_width || 15;
            const finalDepth = visionResult.debugDims?.depth || 10;

            console.log(`>>> FINAL DIMENSIONS: ${finalWidth.toFixed(2)}m x ${finalDepth.toFixed(2)}m`);

            return {
                walls: visionResult.walls,
                objects: visionResult.objects,
                furniture: visionResult.furniture,
                labels: visionResult.labels,
                generatedImage: base64Image,
                rawResponse: cleanStruct + "\n" + cleanFurn,
                dimensions: { width: finalWidth, depth: finalDepth }
            };

        } catch (e: any) {
            console.error("Step 2 Failed:", e);
            throw new Error(`Vision Analysis Failed: ${e.message}`);
        }
    }

    private static extractJSON(text: string): string {
        return text
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .replace(/^[\s\S]*?\{/, '{')
            .replace(/\}[^}]*$/, '}')
            .trim();
    }

    private static convertVisionToWalls(data: VisionResponse, furnitureData: FurnitureItem[], kitchenBelts: { start: { x: number, y: number }, end: { x: number, y: number } }[], targetArea: number | null, constraints?: { landWidth: number, landDepth: number }): { walls: Wall[], objects: any[], furniture: Furniture[], labels: RoomLabel[], debugDims?: { width: number, depth: number } } {
        const labels: RoomLabel[] = [];
        const candidates: Wall[] = [];
        const finalObjects: any[] = [];
        const finalFurniture: Furniture[] = [];

        // 1. SCALING LOGIC
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

        const allPoints: { x: number, y: number }[] = [];
        if (data.footprint) allPoints.push(...data.footprint);
        data.rooms.forEach(r => {
            if (r.corners) allPoints.push(...r.corners);
        });

        allPoints.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        });

        // Avoid division by zero
        if (minX === Infinity) { minX = 0; maxX = 1000; minY = 0; maxY = 1000; }

        const unitWidth = maxX - minX;
        const unitHeight = maxY - minY;

        // SCALING STRATEGY: MAP DRAWING'S LONGEST AXIS TO SITE'S LONGEST AXIS (Refined)
        let scale = 0.015; // Default fallback

        const landW = constraints ? Number(constraints.landWidth) || 0 : 0;
        const landD = constraints ? Number(constraints.landDepth) || 0 : 0;
        const landLongest = Math.max(landW, landD);

        if (landLongest > 0) {
            // Priority 1: Strict "Longest-to-Longest" Mapping
            // 1. Find the longest axis of the Drawing units (D1)
            const drawingLongest = Math.max(unitWidth, unitHeight);

            // 2. Set scale so D1 = L1 (Site Longest)
            scale = drawingLongest > 0 ? landLongest / drawingLongest : 0.015;

            console.log(`>>> SCALER [REFINED]: Mapping Drawing Longest (${drawingLongest.toFixed(1)} units) to Site Longest (${landLongest}m). Scale=${scale.toFixed(6)}`);
        }
        else if (targetArea && data.footprint && data.footprint.length > 2) {
            // Priority 2: Area-based scaling fallback
            let unitArea = 0;
            for (let i = 0; i < data.footprint.length; i++) {
                const j = (i + 1) % data.footprint.length;
                unitArea += data.footprint[i].x * data.footprint[j].y;
                unitArea -= data.footprint[j].x * data.footprint[i].y;
            }
            unitArea = Math.abs(unitArea) / 2;
            if (unitArea > 0) {
                scale = Math.sqrt(targetArea / unitArea);
                console.log(`>>> SCALER: Area Mapping. Target=${targetArea}m². Scale=${scale.toFixed(6)}`);
            }
        } else {
            // Priority 3: AI overall_width_meters fallback
            const unitLongest = Math.max(unitWidth, unitHeight);
            const aiReportedMax = data.overall_width_meters || data.overall_width || 15.0;
            scale = unitLongest > 0 ? aiReportedMax / unitLongest : 0.015;
            console.log(`>>> SCALER: Fallback AI reported Max (${aiReportedMax}m). Scale=${scale.toFixed(6)}`);
        }

        // OFFSET & TRANSFORM
        // We center the building within the frame defined by landWidth/landDepth if they exist,
        // otherwise we just use the minX/minY offset.
        const tX = (val: number) => (val - minX) * scale;
        const tY = (val: number) => (val - minY) * scale;

        const EXTERNAL_THICKNESS = 0.2; // 20cm
        const INTERNAL_THICKNESS = 0.1; // 10cm
        const WALL_HEIGHT = 2.4;

        // 2. GENERATE FOOTPRINT WALLS (Thick Exterior)
        const footprintWalls: { start: { x: number, y: number }, end: { x: number, y: number }, thickness: number }[] = [];

        if (data.footprint && data.footprint.length > 2) {
            for (let i = 0; i < data.footprint.length; i++) {
                const p1 = data.footprint[i];
                const p2 = data.footprint[(i + 1) % data.footprint.length]; // Wrap around

                const start = { x: tX(p1.x), y: tY(p1.y) };
                const end = { x: tX(p2.x), y: tY(p2.y) };

                candidates.push({
                    id: uuidv4(),
                    start,
                    end,
                    thickness: EXTERNAL_THICKNESS,
                    height: WALL_HEIGHT
                });
                footprintWalls.push({ start, end, thickness: EXTERNAL_THICKNESS });
            }
        } else {
            console.warn("No valid footprint found in AI response, falling back to rooms-only.");
        }

        // Helper to check distance from point to wall segment
        const distToSegment = (p: { x: number, y: number }, sStart: { x: number, y: number }, sEnd: { x: number, y: number }) => {
            const A = p.x - sStart.x;
            const B = p.y - sStart.y;
            const C = sEnd.x - sStart.x;
            const D = sEnd.y - sStart.y;

            const dot = A * C + B * D;
            const len_sq = C * C + D * D;
            let param = -1;
            if (len_sq !== 0) // in case of 0 length line
                param = dot / len_sq;

            let xx, yy;

            if (param < 0) {
                xx = sStart.x;
                yy = sStart.y;
            }
            else if (param > 1) {
                xx = sEnd.x;
                yy = sEnd.y;
            }
            else {
                xx = sStart.x + param * C;
                yy = sStart.y + param * D;
            }

            const dx = p.x - xx;
            const dy = p.y - yy;
            return Math.sqrt(dx * dx + dy * dy);
        };

        // 3. GENERATE ROOM WALLS
        data.rooms.forEach(room => {
            if (!room.corners || room.corners.length < 2) return;

            for (let i = 0; i < room.corners.length; i++) {
                const p1 = room.corners[i];
                const p2 = room.corners[(i + 1) % room.corners.length];

                const start = { x: tX(p1.x), y: tY(p1.y) };
                const end = { x: tX(p2.x), y: tY(p2.y) };

                // Skip zero-length walls
                if (distance(start, end) < 0.05) continue;

                // Check overlap with External Walls
                let isExterior = false;
                const THRESHOLD = 0.4; // 40cm tolerance

                for (const fw of footprintWalls) {
                    const midX = (start.x + end.x) / 2;
                    const midY = (start.y + end.y) / 2;

                    const d = distToSegment({ x: midX, y: midY }, fw.start, fw.end);
                    if (d < THRESHOLD) {
                        isExterior = true;
                        break;
                    }
                }

                if (!isExterior) {
                    candidates.push({
                        id: uuidv4(),
                        start,
                        end,
                        thickness: INTERNAL_THICKNESS,
                        height: WALL_HEIGHT
                    });
                }
            }

            // Add Label at centroid
            let avgX = 0, avgY = 0;
            room.corners.forEach(c => { avgX += c.x; avgY += c.y; });
            labels.push({
                id: uuidv4(),
                text: room.name,
                x: tX(avgX / room.corners.length),
                y: tY(avgY / room.corners.length)
            });
        }); // End rooms forEach

        // --- ROBUST DEDUPLICATION & PLANARIZATION PASS (Vertex-First) ---
        const SNAP_DIST = 0.30; // Standard snapping radius
        const FOOTPRINT_SNAP_DIST = 0.60; // More aggressive snapping for room corners near footprint

        // 1. Collect all "Vertex Seeds" (Endpoints + Intersections)
        const seeds: { x: number; y: number }[] = [];
        candidates.forEach(w => {
            seeds.push(w.start);
            seeds.push(w.end);
        });

        for (let i = 0; i < candidates.length; i++) {
            const w1 = candidates[i];
            for (let j = i + 1; j < candidates.length; j++) {
                const w2 = candidates[j];
                const intersect = getSegmentIntersection(w1.start, w1.end, w2.start, w2.end);
                if (intersect) seeds.push(intersect);

                // Also add project of endpoints to other segments (T-junctions)
                const p1 = projectPointOnSegment(w1.start, w2.start, w2.end);
                if (p1.t > 0 && p1.t < 1 && distance(w1.start, p1.point) < SNAP_DIST) seeds.push(p1.point);
                const p2 = projectPointOnSegment(w1.end, w2.start, w2.end);
                if (p2.t > 0 && p2.t < 1 && distance(w1.end, p2.point) < SNAP_DIST) seeds.push(p2.point);
                const p3 = projectPointOnSegment(w2.start, w1.start, w1.end);
                if (p3.t > 0 && p3.t < 1 && distance(w2.start, p3.point) < SNAP_DIST) seeds.push(p3.point);
                const p4 = projectPointOnSegment(w2.end, w1.start, w1.end);
                if (p4.t > 0 && p4.t < 1 && distance(w2.end, p4.point) < SNAP_DIST) seeds.push(p4.point);
            }
        }

        // 2. Consolidate into Master Vertices (Clustering)
        const masterVertices: { x: number; y: number }[] = [];
        for (const seed of seeds) {
            // Agressive footprint snapping for seeds
            let snapped = { x: seed.x, y: seed.y };
            for (const fw of footprintWalls) {
                const proj = projectPointOnSegment(seed, fw.start, fw.end);
                if (distance(seed, proj.point) < FOOTPRINT_SNAP_DIST) {
                    snapped.x = proj.point.x;
                    snapped.y = proj.point.y;
                    break;
                }
            }

            let found = false;
            for (const mv of masterVertices) {
                if (distance(snapped, mv) < SNAP_DIST) {
                    found = true;
                    break;
                }
            }
            if (!found) masterVertices.push(snapped);
        }

        // 3. Reconstruct Walls
        const pieces: Wall[] = [];
        for (const base of candidates) {
            const wallPoints: { p: { x: number, y: number }, t: number }[] = [];
            for (const mv of masterVertices) {
                const proj = projectPointOnSegment(mv, base.start, base.end);
                if (distance(mv, proj.point) < 0.05) {
                    wallPoints.push({ p: mv, t: proj.t });
                }
            }

            wallPoints.sort((a, b) => a.t - b.t);

            for (let i = 0; i < wallPoints.length - 1; i++) {
                const p1 = wallPoints[i];
                const p2 = wallPoints[i + 1];
                if (p2.t - p1.t < 0.001) continue;
                pieces.push({
                    ...base,
                    id: uuidv4(),
                    start: p1.p,
                    end: p2.p
                });
            }
        }

        // 4. Final Deduplication
        const finalWalls: Wall[] = [];
        for (const p of pieces) {
            let duplicate = false;
            for (let k = 0; k < finalWalls.length; k++) {
                const f = finalWalls[k];
                const s1 = distance(p.start, f.start) < 0.01;
                const e1 = distance(p.end, f.end) < 0.01;
                const s2 = distance(p.start, f.end) < 0.01;
                const e2 = distance(p.end, f.start) < 0.01;

                if ((s1 && e1) || (s2 && e2)) {
                    if (!p.isVirtual && f.isVirtual) finalWalls[k] = p;
                    duplicate = true;
                    break;
                }
            }
            if (!duplicate) finalWalls.push(p);
        }

        // 5. Map Openings (Doors & Windows) - MOVED UP
        if (data.openings) {
            data.openings.forEach(op => {
                const ox = tX(op.x);
                const oy = tY(op.y);
                const oWidth = op.width * scale;

                let bestDist = Infinity;
                let bestWallIdx = -1;
                let bestProj: any = null;

                for (let i = 0; i < finalWalls.length; i++) {
                    const wall = finalWalls[i];
                    if (wall.isVirtual) continue;
                    const p = { x: ox, y: oy };
                    const dist = pointToSegmentDistance(p, wall.start, wall.end);
                    if (dist < 0.5 && dist < bestDist) {
                        bestDist = dist;
                        bestWallIdx = i;
                        bestProj = projectPointOnSegment(p, wall.start, wall.end);
                    }
                }

                if (bestWallIdx !== -1) {
                    const wall = finalWalls[bestWallIdx];

                    // ARCHITECTURAL DOOR STANDARDS Logic
                    let finalWidth = Math.max(0.6, Math.min(2.0, oWidth));
                    if (op.type === 'door') {
                        // Find nearest room to determine door type
                        let nearestRoom: any = null;
                        let minDist = Infinity;
                        (data.rooms || []).forEach(r => {
                            if (!r.corners || r.corners.length === 0) return;
                            let avgX = 0, avgY = 0;
                            r.corners.forEach(c => { avgX += c.x; avgY += c.y; });
                            const cx = avgX / r.corners.length;
                            const cy = avgY / r.corners.length;
                            const d = Math.sqrt(Math.pow(op.x - cx, 2) + Math.pow(op.y - cy, 2));
                            if (d < minDist) { minDist = d; nearestRoom = r; }
                        });

                        const roomName = (nearestRoom?.name || '').toLowerCase();
                        const isBath = roomName.includes('bath') || roomName.includes('toilet') || roomName.includes('wc') ||
                            roomName.includes('hamam') || roomName.includes('dastshui') || roomName.includes('service');
                        const isEntrance = roomName.includes('entrance') || roomName.includes('vorudi') || roomName.includes('entry');

                        if (isBath) finalWidth = 0.8;
                        else if (isEntrance) finalWidth = 1.0;
                        else finalWidth = 0.9; // Standard room door
                    }

                    finalObjects.push({
                        id: uuidv4(),
                        wallId: wall.id,
                        type: op.type,
                        position: bestProj.t,
                        width: finalWidth,
                        height: op.type === 'door' ? 2.1 : 1.2,
                        offset: op.type === 'door' ? 0 : 0.9,
                        hinge: op.hinge || 'left',
                        openDirection: op.swing || 'in'
                    });
                }
            });
        }

        // 6. PROCESS FURNITURE (Including Appliances & Advanced Snapping)
        const furnitureBuffer: any[] = [];

        furnitureData.forEach(f => {
            const template = FURNITURE_TEMPLATES.find(t => t.id === f.templateId);
            if (!template) return;

            let fx = tX(f.x);
            let fy = tY(f.y);
            let fRot = f.rotation || 0;

            const lowerId = f.templateId.toLowerCase();
            const isHeavy = lowerId.includes('bed') || lowerId.includes('wardrobe') || lowerId.includes('tv-stand') || lowerId.includes('fridge') || lowerId.includes('sink') || lowerId.includes('stove') || lowerId.includes('toilet') || lowerId.includes('shower') || lowerId.includes('bathtub') || lowerId.includes('vanity');

            // --- Advanced Wall Alignment & Docking Engine ---
            let bestAlignDist = Infinity;
            let bestWall: Wall | null = null;
            let bestProj: any = null;

            const alignThreshold = isHeavy ? 5.0 : (lowerId.includes('sofa') || lowerId.includes('armchair') ? 7.0 : 0.8);

            if (finalWalls && finalWalls.length > 0) {
                finalWalls.forEach((wall: Wall) => {
                    if (wall.isVirtual) return;
                    const proj = projectPointOnSegment({ x: fx, y: fy }, wall.start, wall.end);
                    const d = distance({ x: fx, y: fy }, proj.point);
                    if (d < alignThreshold && d < bestAlignDist) {
                        bestAlignDist = d;
                        bestWall = wall;
                        bestProj = proj;
                    }
                });
            }

            if (bestWall && bestProj) {
                const wallObj: Wall = bestWall; // Explicit cast to fix 'never' type errors
                const wallVec = { x: wallObj.end.x - wallObj.start.x, y: wallObj.end.y - wallObj.start.y };
                const wallAngleRad = Math.atan2(wallVec.y, wallVec.x);
                const wallAngleDeg = (wallAngleRad * 180 / Math.PI);

                // Parallel rotations are wallAngleDeg or wallAngleDeg + 180.
                const opt1 = (wallAngleDeg) % 360;
                const opt2 = (wallAngleDeg + 180) % 360;

                // Use room center as a guide to pick the better rotation (facing room)
                let roomX = labels[0]?.x || fx, roomY = labels[0]?.y || fy;
                if (labels.length > 0) {
                    const nearestLabel = labels.reduce((best, l) => {
                        const d = distance({ x: fx, y: fy }, l);
                        return d < best.d ? { l, d } : best;
                    }, { l: labels[0], d: Infinity });

                    if (nearestLabel.l) {
                        const room = data.rooms.find(r => r.name === nearestLabel.l.text);
                        if (room) {
                            let avgX = 0, avgY = 0;
                            room.corners.forEach(c => { avgX += c.x; avgY += c.y; });
                            roomX = tX(avgX / room.corners.length);
                            roomY = tY(avgY / room.corners.length);
                        }
                    }
                }

                const toRoom = { x: roomX - fx, y: roomY - fy };
                const roomAngle = (Math.atan2(toRoom.y, toRoom.x) * 180 / Math.PI);

                // Furniture "front" is at rotation + 90 degrees.
                const diff1 = Math.abs(((opt1 + 90) - roomAngle + 540) % 360 - 180);
                const diff2 = Math.abs(((opt2 + 90) - roomAngle + 540) % 360 - 180);

                fRot = diff1 < diff2 ? opt1 : opt2;

                // Snapping for beds and other "Heavy" items (within 5m)
                if (isHeavy && bestAlignDist < 5.0) {
                    const len = Math.sqrt(wallVec.x * wallVec.x + wallVec.y * wallVec.y);
                    let normal = { x: -wallVec.y / len, y: wallVec.x / len };

                    const toItem = { x: fx - bestProj.point.x, y: fy - bestProj.point.y };
                    const side = (toItem.x * normal.x + toItem.y * normal.y) > 0 ? 1 : -1;

                    const offset = (wallObj.thickness / 2) + (template.depth / 2);
                    fx = bestProj.point.x + normal.x * side * offset;
                    fy = bestProj.point.y + normal.y * side * offset;

                    // Force orientation to face away from wall normal
                    const angleToWallNormal = Math.atan2(normal.y * side, normal.x * side) * 180 / Math.PI;
                    fRot = (angleToWallNormal - 90);
                }
            }
            else if ((lowerId.includes('dining') || lowerId.includes('coffee') || lowerId.includes('table') || lowerId.includes('desk')) && labels.length > 0) {
                // Keep center-facing for non-wall-bound items
                const nearestRoom = labels.reduce((best, l) => {
                    const d = distance({ x: fx, y: fy }, l);
                    return d < best.d ? { l, d } : best;
                }, { l: labels[0], d: Infinity });

                if (nearestRoom.l) {
                    const room = data.rooms.find(r => r.name === nearestRoom.l.text);
                    if (room) {
                        let avgX = 0, avgY = 0;
                        room.corners.forEach(c => { avgX += c.x; avgY += c.y; });
                        const toCenter = { x: tX(avgX / room.corners.length) - fx, y: tY(avgY / room.corners.length) - fy };
                        fRot = (Math.atan2(toCenter.y, toCenter.x) * 180 / Math.PI) - 90;
                    }
                }
            }

            furnitureBuffer.push({
                id: uuidv4(),
                templateId: template.id,
                x: fx,
                y: fy,
                width: template.width,
                depth: template.depth,
                rotation: fRot,
                label: template.label,
                category: template.category
            });
        });

        // Nightstand Symmetric Nesting Pass
        furnitureBuffer.forEach(item => {
            if (item.templateId.includes('nightstand')) {
                // Find nearest bed
                const nearestBed = furnitureBuffer.find(b => b.templateId.includes('bed') && distance(item, b) < 2.0);
                if (nearestBed) {
                    const R_rad = nearestBed.rotation * (Math.PI / 180);
                    const cosR = Math.cos(R_rad);
                    const sinR = Math.sin(R_rad);

                    const vWidth = { x: cosR, y: -sinR };
                    const vDepth = { x: sinR, y: cosR };

                    // Decide left or right based on original AI projection
                    const toItem = { x: item.x - nearestBed.x, y: item.y - nearestBed.y };
                    const sideProjection = toItem.x * vWidth.x + toItem.y * vWidth.y;
                    const side = sideProjection > 0 ? 1 : -1;

                    // 1. Shift along Width (Local X)
                    const widthShift = side * (nearestBed.width / 2 + item.width / 2 + 0.05);

                    // 2. Shift along Depth (Local Z) to align with Headboard (Local Z = -depth/2)
                    const headboardShift = -(nearestBed.depth / 2) + (item.depth / 2);

                    item.x = nearestBed.x + vWidth.x * widthShift + vDepth.x * headboardShift;
                    item.y = nearestBed.y + vWidth.y * widthShift + vDepth.y * headboardShift;
                    item.rotation = nearestBed.rotation;
                }
            }
        });

        furnitureBuffer.forEach(f => finalFurniture.push(f));

        // 7. PROCESS KITCHEN BELTS (Procedural Cabinetry with Constraints)
        const extendBelts = (belts: { start: { x: number, y: number }, end: { x: number, y: number } }[]) => {
            const COUNTER_DEPTH = 0.57;
            const SNAP_THRESHOLD = 5.0;

            if (!belts || belts.length === 0) return;

            // --- 7a. Group Belts into Chains (L/U Shapes) ---
            const processed = new Set<number>();
            const chains: { start: { x: number, y: number }, end: { x: number, y: number } }[][] = [];

            while (processed.size < belts.length) {
                const chain: any[] = [];
                let firstIdx = -1;
                for (let i = 0; i < belts.length; i++) {
                    if (!processed.has(i)) { firstIdx = i; break; }
                }
                if (firstIdx === -1) break;

                chain.push({ ...belts[firstIdx] });
                processed.add(firstIdx);

                let changed = true;
                while (changed) {
                    changed = false;
                    for (let i = 0; i < belts.length; i++) {
                        if (processed.has(i)) continue;
                        const b = belts[i];
                        const cStart = chain[0].start;
                        const cEnd = chain[chain.length - 1].end;

                        const dStartStart = distance({ x: tX(b.start.x), y: tY(b.start.y) }, { x: tX(cStart.x), y: tY(cStart.y) });
                        const dStartEnd = distance({ x: tX(b.start.x), y: tY(b.start.y) }, { x: tX(cEnd.x), y: tY(cEnd.y) });
                        const dEndStart = distance({ x: tX(b.end.x), y: tY(b.end.y) }, { x: tX(cStart.x), y: tY(cStart.y) });
                        const dEndEnd = distance({ x: tX(b.end.x), y: tY(b.end.y) }, { x: tX(cEnd.x), y: tY(cEnd.y) });

                        const TOL = 0.3;
                        if (dStartEnd < TOL) { chain.push({ ...b }); processed.add(i); changed = true; }
                        else if (dEndEnd < TOL) { chain.push({ start: b.end, end: b.start }); processed.add(i); changed = true; }
                        else if (dEndStart < TOL) { chain.unshift({ ...b }); processed.add(i); changed = true; }
                        else if (dStartStart < TOL) { chain.unshift({ start: b.end, end: b.start }); processed.add(i); changed = true; }
                    }
                }
                chains.push(chain);
            }

            // --- 7b. Process each Chain ---
            for (const chain of chains) {
                const segments: { start: { x: number, y: number }, end: { x: number, y: number }, rot: number, normal: { x: number, y: number } }[] = [];

                for (const belt of chain) {
                    let s = { x: tX(belt.start.x), y: tY(belt.start.y) };
                    let e = { x: tX(belt.end.x), y: tY(belt.end.y) };

                    let bestWall: Wall | null = null;
                    let bestD = Infinity;
                    for (const w of finalWalls) {
                        if (w.isVirtual) continue;
                        const pS = projectPointOnSegment(s, w.start, w.end);
                        const pE = projectPointOnSegment(e, w.start, w.end);
                        const d = (distance(s, pS.point) + distance(e, pE.point)) / 2;
                        if (d < SNAP_THRESHOLD && d < bestD) { bestD = d; bestWall = w; }
                    }

                    if (bestWall) {
                        const snapS = projectPointOnSegment(s, bestWall.start, bestWall.end);
                        const snapE = projectPointOnSegment(e, bestWall.start, bestWall.end);
                        const wVec = { x: bestWall.end.x - bestWall.start.x, y: bestWall.end.y - bestWall.start.y };
                        let n = { x: -wVec.y, y: wVec.x };
                        const L = Math.sqrt(n.x * n.x + n.y * n.y);
                        n = { x: n.x / L, y: n.y / L };

                        const midDraw = { x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 };
                        const midSnap = { x: (snapS.point.x + snapE.point.x) / 2, y: (snapS.point.y + snapE.point.y) / 2 };
                        if ((midDraw.x - midSnap.x) * n.x + (midDraw.y - midSnap.y) * n.y < 0) { n.x = -n.x; n.y = -n.y; }

                        const off = (bestWall.thickness / 2) + (COUNTER_DEPTH / 2);
                        segments.push({
                            start: { x: snapS.point.x + n.x * off, y: snapS.point.y + n.y * off },
                            end: { x: snapE.point.x + n.x * off, y: snapE.point.y + n.y * off },
                            rot: (Math.atan2(n.y, n.x) * 180 / Math.PI) - 90,
                            normal: n
                        });
                    } else {
                        // Island orientation logic
                        const beltAngle = Math.atan2(e.y - s.y, e.x - s.x) * (180 / Math.PI);
                        let islandRot = beltAngle;

                        // Pick orientation that faces room center
                        if (labels.length > 0) {
                            const mid = { x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 };
                            const nearestLabel = labels.reduce((best, l) => {
                                const d = distance(mid, l);
                                return d < best.d ? { l, d } : best;
                            }, { l: labels[0], d: Infinity });

                            const toRoom = { x: nearestLabel.l.x - mid.x, y: nearestLabel.l.y - mid.y };
                            const roomAngle = Math.atan2(toRoom.y, toRoom.x) * 180 / Math.PI;

                            const diff1 = Math.abs((beltAngle + 90 - roomAngle + 540) % 360 - 180);
                            const diff2 = Math.abs((beltAngle - 90 - roomAngle + 540) % 360 - 180);
                            islandRot = (diff1 < diff2) ? beltAngle : (beltAngle + 180);
                        }

                        segments.push({
                            start: s, end: e,
                            rot: islandRot,
                            normal: { x: 0, y: 0 }
                        });
                    }
                }

                // --- 7c. Corner Intersection & Filling ---
                for (let i = 0; i < segments.length; i++) {
                    const seg = segments[i];
                    let currentStart = { ...seg.start };
                    let currentEnd = { ...seg.end };

                    if (i < segments.length - 1) {
                        const next = segments[i + 1];
                        const x1 = seg.start.x, y1 = seg.start.y, x2 = seg.end.x, y2 = seg.end.y;
                        const x3 = next.start.x, y3 = next.start.y, x4 = next.end.x, y4 = next.end.y;
                        const det = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);

                        if (Math.abs(det) > 0.001) {
                            const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / det;
                            const intersect = { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
                            currentEnd = { ...intersect };
                            next.start = { ...intersect };

                            finalFurniture.push({
                                id: uuidv4(), templateId: 'kitchen-corner-base',
                                x: intersect.x, y: intersect.y, width: 0.9, depth: 0.9,
                                rotation: seg.rot, label: 'Corner Cabinet', category: 'kitchen'
                            });
                            finalFurniture.push({
                                id: uuidv4(), templateId: 'kitchen-corner-upper',
                                x: intersect.x, y: intersect.y, width: 0.6, depth: 0.6,
                                rotation: seg.rot, label: 'Corner Upper', category: 'kitchen'
                            });
                        }
                    }

                    const beltVec = { x: currentEnd.x - currentStart.x, y: currentEnd.y - currentStart.y };
                    const dist = Math.sqrt(beltVec.x * beltVec.x + beltVec.y * beltVec.y);
                    if (dist < 0.1) continue;

                    const CORNER_SLOP = 0.45;
                    const endLimit = (i < segments.length - 1) ? dist - CORNER_SLOP : dist;
                    const startLimit = (i > 0) ? CORNER_SLOP : 0;

                    const SIZES = [0.6, 0.45, 0.3];
                    let cursor = startLimit;
                    let step = 0;

                    while (cursor < endLimit - 0.05) {
                        let bestSize = 0;
                        for (const size of SIZES) {
                            if (cursor + size > endLimit + 0.05) continue;

                            const cx = currentStart.x + (beltVec.x / dist) * (cursor + size / 2);
                            const cy = currentStart.y + (beltVec.y / dist) * (cursor + size / 2);

                            const appliance = finalFurniture.find(ff =>
                                (ff.templateId.includes('sink') || ff.templateId.includes('stove') || ff.templateId.includes('fridge')) &&
                                distance({ x: cx, y: cy }, ff) < (size / 2 + 0.05)
                            );

                            if (!appliance) {
                                bestSize = size;
                                break;
                            }
                        }

                        if (bestSize > 0) {
                            const cx = currentStart.x + (beltVec.x / dist) * (cursor + bestSize / 2);
                            const cy = currentStart.y + (beltVec.y / dist) * (cursor + bestSize / 2);

                            let tid = 'kitchen-counter';
                            if (bestSize === 0.45) tid = 'kitchen-counter-45';
                            if (bestSize === 0.3) tid = 'kitchen-counter-30';
                            if (bestSize === 0.6 && step % 5 === 2) tid = 'kitchen-drawers-3';

                            finalFurniture.push({
                                id: uuidv4(), templateId: tid,
                                x: cx, y: cy, width: bestSize, depth: COUNTER_DEPTH,
                                rotation: seg.rot, label: 'Cabinet', category: 'kitchen'
                            });

                            const overlapsWindow = finalObjects.some(obj => {
                                if (obj.type !== 'window') return false;
                                const w = finalWalls.find(wall => wall.id === obj.wallId);
                                if (!w) return false;
                                const proj = projectPointOnSegment({ x: cx, y: cy }, w.start, w.end);
                                if (distance({ x: cx, y: cy }, proj.point) > 0.6) return false;
                                const winWidthT = obj.width / distance(w.start, w.end);
                                return proj.t > (obj.position - winWidthT / 2 - 0.1) && proj.t < (obj.position + winWidthT / 2 + 0.1);
                            });

                            if (!overlapsWindow) {
                                let utid = 'kitchen-upper';
                                if (bestSize === 0.45) utid = 'kitchen-upper-45';
                                if (bestSize === 0.3) utid = 'kitchen-upper-30';

                                finalFurniture.push({
                                    id: uuidv4(), templateId: utid,
                                    x: cx, y: cy, width: bestSize, depth: 0.35,
                                    rotation: seg.rot, label: 'Upper Cabinet', category: 'kitchen'
                                });
                            }
                            cursor += bestSize;
                            step++;
                        } else {
                            cursor += 0.1;
                        }
                    }
                }
            }
        };

        extendBelts(kitchenBelts);

        const debugDims = {
            width: (landW > 0 && landD > 0) ? landW : tX(maxX) - tX(minX),
            depth: (landW > 0 && landD > 0) ? landD : tY(maxY) - tY(minY)
        };

        return { walls: finalWalls, objects: finalObjects, furniture: finalFurniture, labels, debugDims };
    }
}
