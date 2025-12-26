
import type { Wall, RoomLabel } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSegmentIntersection, projectPointOnSegment, distance } from '../utils/geometry';

// --- PROMPTS ---

// 1. IMAGE GENERATION PROMPT
// We ask for a clean, high-contrast plan.
const IMAGE_GEN_PROMPT_TEMPLATE = (userPrompt: string, constraints?: { landWidth: number, landDepth: number }) => `
Create a high-contrast, top-down 2D architectural floor plan for: ${userPrompt}.
${constraints ? `IMPORTANT: The building must fit precisely within a ${constraints.landWidth}m x ${constraints.landDepth}m rectangular site. Determine the OPTIMAL PLACEMENT of the building on the site for best functionality and layout.` : ''}
Style: Technical drawing, white background, black walls, distinct room labels if possible.
View: Top-down orthographic.
NO 3D perspective.
`;

// 2. VISION ANALYSIS PROMPT (High Precision)
const VISION_PROMPT = (constraints?: { landWidth: number, landDepth: number }) => `
ACT AS A PRECISION ARCHITECTURAL SCANNER.
Scan the floor plan image. The THICK BLACK LINES represent the WALLS.
${constraints ? `CONTEXT: This building is designed for a site of ${constraints.landWidth}m x ${constraints.landDepth}m.` : ''}

TASKS:
1. Identify the building footprint (exterior walls) and all internal rooms.
2. Use Image Coordinates: (0,0) is the TOP-LEFT of the image.
3. Provide the 'footprint' as an ordered list of (x,y) points.
4. Provide all 'rooms' with 'name', 'x', 'y', 'width', and 'height'.

RETURN JSON ONLY:
{
  "footprint": [{"x": 0, "y": 0}, ...],
  "rooms": [
    {
      "name": "Room Name", 
      "x": 100, "y": 100, "width": 200, "height": 200,
      "open_edges": ["top", "bottom", "left", "right"] // List edges that have NO physical wall (open-plan)
    }
  ],
  "overall_width_meters": ${constraints ? Math.max(constraints.landWidth, constraints.landDepth) : 15.0}
}
`;

interface VisionRoom {
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    open_edges?: string[]; // "top" | "bottom" | "left" | "right"
}

interface VisionResponse {
    footprint: { x: number; y: number }[];
    rooms: VisionRoom[];
    overall_width_meters?: number; // meters (This will be treated as the LONGEST leg)
    overall_width?: number; // fallback
}

export class AIService {

    static async generateLayout(data: any, apiKey: string): Promise<{ walls: Wall[], labels: RoomLabel[], generatedImage?: string, rawResponse?: string, dimensions?: { width: number, depth: number } }> {
        console.log("Generating layout V6 (Constrained Architect)...");

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
        const userPrompt = `A ${bedrooms}-bedroom, ${bathrooms}-bathroom apartment on a ${landWidth}m x ${landDepth}m land. Priorities: ${data.priorities}.`;

        return this.mockOrRealImplementation(userPrompt, genAI, apiKey, { landWidth, landDepth, targetArea: requiredArea });
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
    static async generateImage(userPrompt: string, apiKey: string): Promise<string> {
        if (!apiKey) throw new Error("API Key required");
        const genAI = new GoogleGenerativeAI(apiKey);

        console.log("Requesting Image from gemini-2.5-flash-image...");

        // Helper to run image gen with retries
        let base64Image: string | null = null;

        try {
            const imgModel = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash-image" });

            const result = await this.retryWithBackoff(async () => {
                // @ts-ignore - internal usage
                const constraints = (this as any)._lastConstraints;
                return await imgModel.generateContent(IMAGE_GEN_PROMPT_TEMPLATE(userPrompt, constraints));
            }, 3, 5000); // Start with 5s delay just in case

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

    private static async mockOrRealImplementation(userPrompt: string, genAI: GoogleGenerativeAI, apiKey: string, constraints?: { landWidth: number, landDepth: number, targetArea: number }) {

        // Store constraints temporarily for sub-calls (Hack for static method flow)
        (this as any)._lastConstraints = constraints;

        // --- STEP 1: IMAGE GENERATION ---
        console.log("Step 1: Dreaming Floor Plan...");
        const base64Image = await this.generateImage(userPrompt, apiKey);

        // --- STEP 2: VISION ANALYSIS ---
        console.log("Step 2: Vision Analysis...");
        // User requested exact model from their python script
        const visionModel = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        try {
            const result = await this.retryWithBackoff(async () => {
                return await visionModel.generateContent([
                    VISION_PROMPT(constraints),
                    {
                        inlineData: {
                            data: base64Image!,
                            mimeType: "image/png"
                        }
                    }
                ]);
            }, 3, 2000);

            const textJSON = result.response.text();
            console.log("Step 2 Output:", textJSON);

            const cleanJson = textJSON
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .replace(/^[\s\S]*?\{/, '{')
                .replace(/\}[^}]*$/, '}')
                .trim();

            const data: VisionResponse = JSON.parse(cleanJson);

            // CRITICAL: Ensure constraints are passed and used for scaling
            const visionResult = this.convertVisionToWalls(data, constraints?.targetArea || null, constraints);

            const finalWidth = visionResult.debugDims?.width || data.overall_width_meters || data.overall_width || 15;
            const finalDepth = visionResult.debugDims?.depth || 10;

            console.log(`>>> FINAL DIMENSIONS: ${finalWidth.toFixed(2)}m x ${finalDepth.toFixed(2)}m`);

            return {
                walls: visionResult.walls,
                labels: visionResult.labels,
                generatedImage: base64Image,
                rawResponse: cleanJson,
                dimensions: { width: finalWidth, depth: finalDepth }
            };

        } catch (e: any) {
            console.error("Step 2 Failed:", e);
            throw new Error(`Vision Analysis Failed: ${e.message}`);
        }
    }

    private static convertVisionToWalls(data: VisionResponse, targetArea: number | null, constraints?: { landWidth: number, landDepth: number }): { walls: Wall[], labels: RoomLabel[], debugDims?: { width: number, depth: number } } {
        const labels: RoomLabel[] = [];
        const candidates: Wall[] = [];

        // 1. SCALING LOGIC
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

        const allPoints: { x: number, y: number }[] = [];
        if (data.footprint) allPoints.push(...data.footprint);
        data.rooms.forEach(r => {
            allPoints.push({ x: r.x, y: r.y });
            allPoints.push({ x: r.x + r.width, y: r.y + r.height });
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

        // SCALING STRATEGY: DIRECT MAPPING TO SITE
        let scale = 0.015; // Default fallback

        const landLongest = constraints ? Math.max(Number(constraints.landWidth) || 0, Number(constraints.landDepth) || 0) : 0;

        if (landLongest > 0) {
            // User requested: Use the longest dimension from input as the master scale
            const maxUnitDim = Math.max(unitWidth, unitHeight);
            scale = maxUnitDim > 0 ? landLongest / maxUnitDim : 0.015;
            console.log(`>>> SCALER: Strict Mapping. Master Dimension=${landLongest}m. Scale=${scale.toFixed(6)}`);
        }
        else if (targetArea && data.footprint && data.footprint.length > 2) {
            // Area-based scaling fallback
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
            // AI Hallucination fallback
            const maxUnitDim = Math.max(unitWidth, unitHeight);
            const realMaxLengthMeters = data.overall_width_meters || data.overall_width || 15.0;
            scale = maxUnitDim > 0 ? realMaxLengthMeters / maxUnitDim : 0.015;
            console.log(`>>> SCALER: Fallback Mapping. RealMax=${realMaxLengthMeters}m. Scale=${scale.toFixed(6)}`);
        }

        // OFFSET & TRANSFORM
        const transformX = (val: number) => (val - minX) * scale;
        const transformY = (val: number) => (val - minY) * scale;

        const tX = (val: number) => transformX(val);
        const tY = (val: number) => transformY(val);

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
            const rx = tX(room.x);
            const ry = tY(room.y);
            const rw = room.width * scale;
            const rh = room.height * scale;

            // 4 Candidate Segments
            const segments = [
                { start: { x: rx, y: ry }, end: { x: rx + rw, y: ry } },         // Top
                { start: { x: rx + rw, y: ry }, end: { x: rx + rw, y: ry + rh } }, // Right
                { start: { x: rx + rw, y: ry + rh }, end: { x: rx, y: ry + rh } }, // Bottom
                { start: { x: rx, y: ry + rh }, end: { x: rx, y: ry } }          // Left
            ];

            segments.forEach(seg => {
                // Check overlap with External Walls
                let isExterior = false;
                const THRESHOLD = 0.4; // 40cm tolerance

                for (const fw of footprintWalls) {
                    const midX = (seg.start.x + seg.end.x) / 2;
                    const midY = (seg.start.y + seg.end.y) / 2;

                    const d = distToSegment({ x: midX, y: midY }, fw.start, fw.end);
                    if (d < THRESHOLD) {
                        isExterior = true;
                        break;
                    }
                }

                if (!isExterior) {
                    // Create Internal Wall
                    const isVirtual = room.open_edges?.includes(
                        ['top', 'right', 'bottom', 'left'][segments.indexOf(seg)]
                    ) || false;

                    candidates.push({
                        id: uuidv4(),
                        start: seg.start,
                        end: seg.end,
                        thickness: isVirtual ? 0.05 : INTERNAL_THICKNESS,
                        height: WALL_HEIGHT,
                        isVirtual
                    });
                }
            });

            // Add Label
            labels.push({
                id: uuidv4(),
                text: room.name,
                x: rx + rw / 2,
                y: ry + rh / 2
            });
        });

        // --- ROBUST DEDUPLICATION & PLANARIZATION PASS (Vertex-First) ---
        const SNAP_DIST = 0.15; // 15cm snapping radius

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
            let found = false;
            for (const mv of masterVertices) {
                if (distance(seed, mv) < SNAP_DIST) {
                    found = true;
                    break;
                }
            }
            if (!found) masterVertices.push(seed);
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

        const debugDims = {
            width: tX(maxX) - tX(minX),
            depth: tY(maxY) - tY(minY)
        };

        return { walls: finalWalls, labels, debugDims };
    }
}
