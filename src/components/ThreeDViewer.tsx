import React, { Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, ContactShadows, Environment, Text, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Settings2, ArrowUpFromLine, Home } from 'lucide-react';
import { detectRooms } from '../utils/roomDetection';
import type { Wall, Furniture, WallObject, ModelRecipe } from '../types';
import { SURFACE_MATERIALS } from '../constants/SurfaceMaterials';

const FurnitureLabel: React.FC<{ text: string; position: [number, number, number]; rotation?: [number, number, number]; fontSize?: number }> = ({ text, position, rotation = [0, 0, 0], fontSize = 0.08 }) => (
    <Text
        position={position}
        rotation={rotation}
        fontSize={fontSize}
        color="#222"
        anchorX="center"
        anchorY="middle"
        maxWidth={0.5}
        textAlign="center"
    >
        {text.toUpperCase()}
    </Text>
);

interface ThreeDViewerProps {
    walls: Wall[];
    objects: any[];
    furniture: Furniture[];
    globalWallHeight: number;
    onUpdateWallHeight: (height: number) => void;
    onApplyMaterial?: (id: string, materialId: string, type: 'wall' | 'floor', side?: 'A' | 'B') => void;
    floorMaterials?: Record<string, string>;
    hideSettings?: boolean;
}

const DynamicModel: React.FC<{ recipe: ModelRecipe; label?: string }> = ({ recipe, label }) => {
    return (
        <group>
            {recipe.parts.map((part, i) => (
                <mesh
                    key={i}
                    position={part.position}
                    rotation={part.rotation || [0, 0, 0]}
                    castShadow
                    receiveShadow
                >
                    {part.type === 'box' && <boxGeometry args={part.args as [number, number, number]} />}
                    {part.type === 'cylinder' && <cylinderGeometry args={part.args as [number, number, number, number]} />}
                    {part.type === 'sphere' && <sphereGeometry args={part.args as [number, number, number]} />}

                    <meshStandardMaterial
                        color={part.color}
                        opacity={part.opacity ?? 1}
                        transparent={(part.opacity ?? 1) < 1}
                        metalness={part.metalness ?? 0}
                        roughness={part.roughness ?? 0.8}
                        emissive={part.emissive}
                        emissiveIntensity={part.emissiveIntensity}
                    />
                </mesh>
            ))}
            {label && (
                <FurnitureLabel text={label} position={[0, 1, 0]} />
            )}
        </group>
    );
};

const SofaModel: React.FC<{ width: number; depth: number; label?: string }> = ({ width, depth, label }) => {
    const seatHeight = 0.35;
    const armWidth = 0.18;
    const armHeight = 0.6;
    const fabricColor = "#f1f3f5"; // Plush off-white/light grey as in image

    return (
        <group>
            {/* Thick Frame Arms */}
            <mesh position={[-width / 2 + armWidth / 2, armHeight / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[armWidth, armHeight, depth]} />
                <meshStandardMaterial color={fabricColor} roughness={0.8} />
            </mesh>
            <mesh position={[width / 2 - armWidth / 2, armHeight / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[armWidth, armHeight, depth]} />
                <meshStandardMaterial color={fabricColor} roughness={0.8} />
            </mesh>

            {/* Base / Lower Frame */}
            <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
                <boxGeometry args={[width - 2 * armWidth + 0.02, 0.4, depth - 0.05]} />
                <meshStandardMaterial color={fabricColor} roughness={0.8} />
            </mesh>

            {/* Seat Cushion */}
            <mesh position={[0, seatHeight + 0.1, 0.02]} castShadow receiveShadow>
                <boxGeometry args={[width - 2 * armWidth - 0.02, 0.2, depth - 0.05]} />
                <meshStandardMaterial color={fabricColor} roughness={0.8} />
            </mesh>

            {/* Backrest Cushion */}
            <mesh position={[0, armHeight + 0.1, -depth / 2 + 0.1]} castShadow receiveShadow>
                <boxGeometry args={[width - 2 * armWidth - 0.05, 0.5, 0.2]} />
                <meshStandardMaterial color={fabricColor} roughness={0.8} />
            </mesh>

            {/* Hidden Legs */}
            {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
                <mesh key={i} position={[x * (width / 2 - 0.05), 0.025, z * (depth / 2 - 0.05)]}>
                    <cylinderGeometry args={[0.03, 0.03, 0.05, 16]} />
                    <meshStandardMaterial color="#222" />
                </mesh>
            ))}

            {label && (
                <FurnitureLabel text={label} position={[0, 0.1, depth / 2 + 0.005]} />
            )}
        </group>
    );
};

const BedModel: React.FC<{ width: number; depth: number; color: string; label?: string }> = ({ width, depth, color, label }) => {
    const frameHeight = 0.3;
    const mattressHeight = 0.2;

    return (
        <group>
            {/* Frame */}
            <mesh position={[0, frameHeight / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[width, frameHeight, depth]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Mattress */}
            <mesh position={[0, frameHeight + mattressHeight / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[width * 0.95, mattressHeight, depth * 0.95]} />
                <meshStandardMaterial color="#f8f9fa" />
            </mesh>
            {/* Headboard */}
            <mesh position={[0, 0.5, -depth / 2 + 0.05]} castShadow receiveShadow>
                <boxGeometry args={[width, 1, 0.1]} />
                <meshStandardMaterial color={color} />
            </mesh>

            {label && (
                <FurnitureLabel text={label} position={[0, frameHeight + 0.05, depth / 2 + 0.005]} />
            )}
        </group>
    );
};

const LSofaModel: React.FC<{ width: number; depth: number; label?: string }> = ({ label }) => {
    // Material: Cream/Beige Fabric (matching user's request)
    const fabricColor = "#f2ebd4";
    const armHeight = 0.65;
    const backHeight = 0.85;
    const totalDepth = 0.9;
    const chaiseDepth = 1.6;

    return (
        <group>
            {/* Feet */}
            {[[-1.2, 0.4], [1.2, 0.4], [-1.2, -0.4], [1.2, -0.4], [-1.2, 1.4]].map((pos, i) => (
                <mesh key={i} position={[pos[0], 0.025, pos[1]]}>
                    <cylinderGeometry args={[0.04, 0.03, 0.05]} />
                    <meshStandardMaterial color="#111" />
                </mesh>
            ))}

            {/* Left Armrest */}
            <mesh position={[-1.3, (armHeight - 0.05) / 2 + 0.05, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.2, armHeight - 0.05, totalDepth]} />
                <meshStandardMaterial color={fabricColor} roughness={0.9} />
            </mesh>

            {/* Right Armrest */}
            <mesh position={[1.3, (armHeight - 0.05) / 2 + 0.05, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.2, armHeight - 0.05, totalDepth]} />
                <meshStandardMaterial color={fabricColor} roughness={0.9} />
            </mesh>

            {/* Chaise Seat */}
            <mesh position={[-0.75, 0.2 + 0.05, 0.35]} castShadow receiveShadow>
                <boxGeometry args={[0.85, 0.4, chaiseDepth]} />
                <meshStandardMaterial color={fabricColor} roughness={0.9} />
            </mesh>

            {/* Main Seat */}
            <mesh position={[0.5, 0.2 + 0.05, 0]} castShadow receiveShadow>
                <boxGeometry args={[1.65, 0.4, totalDepth]} />
                <meshStandardMaterial color={fabricColor} roughness={0.9} />
            </mesh>

            {/* Backrest Structure */}
            <mesh position={[0, 0.35 + 0.05, -0.4]} castShadow receiveShadow>
                <boxGeometry args={[2.6, 0.7, 0.2]} />
                <meshStandardMaterial color={fabricColor} roughness={0.9} />
            </mesh>

            {/* Back Cushions */}
            <group position={[0, 0, 0]}>
                {[-0.8, 0.05, 0.9].map((x, i) => (
                    <mesh key={i} position={[x, 0.65, -0.25]} rotation={[-0.1, 0, 0]} castShadow receiveShadow>
                        <boxGeometry args={[0.8, 0.45, 0.15]} />
                        <meshStandardMaterial color={fabricColor} roughness={0.9} />
                    </mesh>
                ))}
            </group>

            {/* Pull Tabs */}
            <mesh position={[-0.75, 0.3, 1.15]} castShadow receiveShadow>
                <boxGeometry args={[0.12, 0.12, 0.01]} />
                <meshStandardMaterial color={fabricColor} roughness={0.9} />
            </mesh>
            <mesh position={[0.5, 0.3, 0.45]} castShadow receiveShadow>
                <boxGeometry args={[0.12, 0.12, 0.01]} />
                <meshStandardMaterial color={fabricColor} roughness={0.9} />
            </mesh>

            {label && (
                <FurnitureLabel text={label} position={[0, backHeight + 0.1, 0]} />
            )}
        </group>
    );
};

// Armchair is a specific single-seat version of the plush sofa (Reference Image 2)
const ArmchairModel: React.FC<{ width: number; depth: number; label?: string }> = ({ width, depth, label }) => {
    const seatHeight = 0.35;
    const armWidth = 0.18;
    const armHeight = 0.6;
    const fabricColor = "#f1f3f5";

    return (
        <group>
            {/* Thick Frame Arms */}
            <mesh position={[-width / 2 + armWidth / 2, armHeight / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[armWidth, armHeight, depth]} />
                <meshStandardMaterial color={fabricColor} roughness={0.8} />
            </mesh>
            <mesh position={[width / 2 - armWidth / 2, armHeight / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[armWidth, armHeight, depth]} />
                <meshStandardMaterial color={fabricColor} roughness={0.8} />
            </mesh>
            {/* Deep Cushion Base */}
            <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
                <boxGeometry args={[width - 2 * armWidth + 0.02, 0.4, depth - 0.05]} />
                <meshStandardMaterial color={fabricColor} roughness={0.8} />
            </mesh>
            {/* Seat Cushion */}
            <mesh position={[0, seatHeight + 0.1, 0.02]} castShadow receiveShadow>
                <boxGeometry args={[width - 2 * armWidth - 0.02, 0.2, depth - 0.05]} />
                <meshStandardMaterial color={fabricColor} roughness={0.8} />
            </mesh>
            {/* Backrest Cushion */}
            <mesh position={[0, armHeight, -depth / 2 + 0.1]} castShadow receiveShadow>
                <boxGeometry args={[width - 2 * armWidth - 0.05, 0.4, 0.2]} />
                <meshStandardMaterial color={fabricColor} roughness={0.8} />
            </mesh>
            {label && (
                <FurnitureLabel text={label} position={[0, 0.1, depth / 2 + 0.005]} />
            )}
        </group>
    );
};

const ChairModel: React.FC<{ isStool?: boolean }> = ({ isStool = false }) => {
    const seatHeight = isStool ? 0.7 : 0.45;
    const woodColor = "#d2b48c"; // Light oak/walnut for the frame
    const cushionColor = "#495057"; // Grey fabric
    const seatWidth = 0.45;

    if (isStool) {
        return (
            <group>
                {/* Seat Cushion */}
                <mesh position={[0, seatHeight, 0]}>
                    <boxGeometry args={[0.35, 0.08, 0.35]} />
                    <meshStandardMaterial color={cushionColor} />
                </mesh>
                {/* Tapered Legs */}
                {[[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]].map((pos, i) => (
                    <mesh key={i} position={[pos[0], seatHeight / 2, pos[1]]}>
                        <cylinderGeometry args={[0.015, 0.025, seatHeight, 12]} />
                        <meshStandardMaterial color={woodColor} />
                    </mesh>
                ))}
            </group>
        );
    }

    // High-Detail Designer Chair
    return (
        <group>
            {/* Organic Side Frame */}
            {[-1, 1].map((side) => (
                <group key={side} position={[side * (seatWidth / 2 + 0.01), 0, 0]}>
                    {/* Tapered Front Leg */}
                    <mesh position={[0, 0.22, 0.12]} rotation={[0.08, 0, 0]}>
                        <cylinderGeometry args={[0.015, 0.025, 0.45, 12]} />
                        <meshStandardMaterial color={woodColor} />
                    </mesh>
                    {/* Tapered Back Leg */}
                    <mesh position={[0, 0.35, -0.18]} rotation={[-0.15, 0, 0]}>
                        <cylinderGeometry args={[0.015, 0.02, 0.7, 12]} />
                        <meshStandardMaterial color={woodColor} />
                    </mesh>
                    {/* Sculpted Armrest */}
                    <mesh position={[0, 0.62, -0.05]} rotation={[0.1 + Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.018, 0.018, 0.35, 12]} />
                        <meshStandardMaterial color={woodColor} />
                    </mesh>
                </group>
            ))}

            {/* Seat Frame / Support */}
            <mesh position={[0, seatHeight - 0.05, -0.03]}>
                <boxGeometry args={[seatWidth, 0.03, 0.35]} />
                <meshStandardMaterial color={woodColor} />
            </mesh>

            {/* Plush Seat Cushion */}
            <mesh position={[0, seatHeight, -0.03]}>
                <boxGeometry args={[seatWidth, 0.08, seatWidth]} />
                <meshStandardMaterial color={cushionColor} />
            </mesh>

            {/* Thick Padded Wrap-around Backrest */}
            <group position={[0, 0.62, -0.1]} rotation={[0.1, 0, 0]}>
                <mesh rotation={[Math.PI / 2, 0, Math.PI]}>
                    <torusGeometry args={[0.22, 0.05, 16, 32, Math.PI]} />
                    <meshStandardMaterial color={cushionColor} />
                </mesh>
            </group>
        </group>
    );
};

const TableModel: React.FC<{ width: number; depth: number; color: string; height?: number; type?: 'dining' | 'coffee' | 'island'; label?: string }> = ({ width, depth, color, height = 0.75, type = 'dining', label }) => {
    const legWidth = 0.05;
    const topThickness = 0.04;
    const isCoffeeTable = type === 'coffee';
    const isIsland = type === 'island';
    const finalHeight = isCoffeeTable ? 0.35 : height;

    return (
        <group>
            {/* Table Top */}
            <mesh position={[0, finalHeight - topThickness / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[width, topThickness, depth]} />
                <meshStandardMaterial color={color} />
            </mesh>

            {/* Legs (for non-island tables) */}
            {!isIsland && [
                [-width / 2 + legWidth, -depth / 2 + legWidth],
                [width / 2 - legWidth, -depth / 2 + legWidth],
                [-width / 2 + legWidth, depth / 2 - legWidth],
                [width / 2 - legWidth, depth / 2 - legWidth]
            ].map((pos, i) => (
                <mesh key={i} position={[pos[0], finalHeight / 2, pos[1]]} castShadow receiveShadow>
                    <boxGeometry args={[legWidth, finalHeight, legWidth]} />
                    <meshStandardMaterial color={color} />
                </mesh>
            ))}

            {/* Solid Island Base */}
            {isIsland && (
                <group>
                    {/* Main Cabinet Body */}
                    <mesh position={[0, (finalHeight - topThickness) / 2, -0.1]} castShadow receiveShadow>
                        <boxGeometry args={[width * 0.96, finalHeight - topThickness, depth * 0.7]} />
                        <meshStandardMaterial color={color} />
                    </mesh>
                    {/* Dark Toe Kick Detail */}
                    <mesh position={[0, 0.05, -0.1]} castShadow receiveShadow>
                        <boxGeometry args={[width * 0.94, 0.1, depth * 0.65]} />
                        <meshStandardMaterial color="#212529" roughness={0.8} />
                    </mesh>
                    {/* Decorative Panel Lines (Front) */}
                    {Array.from({ length: 4 }).map((_, i) => (
                        <mesh key={`panel-${i}`} position={[(i - 1.5) * (width * 0.2), (finalHeight - topThickness) / 2, -0.1 + (depth * 0.35) + 0.005]}>
                            <boxGeometry args={[0.005, finalHeight - topThickness - 0.1, 0.01]} />
                            <meshStandardMaterial color="#adb5bd" metalness={0.2} roughness={0.5} />
                        </mesh>
                    ))}
                </group>
            )}

            {/* Chairs for Dining Table */}
            {type === 'dining' && (
                <group>
                    {/* Long sides (width) */}
                    {(() => {
                        const sideChairCount = Math.max(1, Math.floor(width / 0.6));
                        const chairs = [];
                        for (let i = 0; i < sideChairCount; i++) {
                            const offset = (i - (sideChairCount - 1) / 2) * 0.6;
                            chairs.push(
                                <group key={`long-top-${i}`} position={[offset, 0, depth / 2 + 0.35]} rotation={[0, Math.PI, 0]}>
                                    <ChairModel />
                                </group>
                            );
                            chairs.push(
                                <group key={`long-bottom-${i}`} position={[offset, 0, -depth / 2 - 0.35]}>
                                    <ChairModel />
                                </group>
                            );
                        }
                        return chairs;
                    })()}

                    {/* Short sides (ends) */}
                    {(() => {
                        const endChairCount = Math.max(0, Math.floor(depth / 0.8));
                        const chairs = [];
                        for (let i = 0; i < endChairCount; i++) {
                            const offset = (i - (endChairCount - 1) / 2) * 0.6;
                            chairs.push(
                                <group key={`end-left-${i}`} position={[-width / 2 - 0.35, 0, offset]} rotation={[0, Math.PI / 2, 0]}>
                                    <ChairModel />
                                </group>
                            );
                            chairs.push(
                                <group key={`end-right-${i}`} position={[width / 2 + 0.35, 0, offset]} rotation={[0, -Math.PI / 2, 0]}>
                                    <ChairModel />
                                </group>
                            );
                        }
                        return chairs;
                    })()}
                </group>
            )}

            {/* Stools for Island */}
            {isIsland && (
                <group>
                    <group position={[0.4, 0, depth / 2 + 0.25]} rotation={[0, Math.PI, 0]}><ChairModel isStool /></group>
                    <group position={[-0.4, 0, depth / 2 + 0.25]} rotation={[0, Math.PI, 0]}><ChairModel isStool /></group>
                </group>
            )}

            {label && (
                <FurnitureLabel text={label} position={[0, finalHeight + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} />
            )}
        </group>
    );
};

const TVStandModel: React.FC<{ width: number; depth: number; color: string; label?: string }> = ({ width, depth, color, label }) => {
    const standHeight = 0.45;
    return (
        <group>
            {/* Stand Base */}
            <mesh position={[0, standHeight / 2, 0]}>
                <boxGeometry args={[width, standHeight, depth]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* TV Screen */}
            <mesh position={[0, standHeight + 0.5, 0]}>
                <boxGeometry args={[width * 0.8, 0.7, 0.05]} />
                <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Display face */}
            <mesh position={[0, standHeight + 0.5, 0.03]}>
                <boxGeometry args={[width * 0.75, 0.65, 0.001]} />
                <meshStandardMaterial color="#000" emissive="#050505" />
            </mesh>
            {label && (
                <FurnitureLabel text={label} position={[0, 0.1, depth / 2 + 0.005]} />
            )}
        </group>
    );
};

const StorageModel: React.FC<{ width: number; depth: number; height: number; color: string; label?: string }> = ({ width, depth, height, color, label }) => (
    <group>
        <mesh position={[0, height / 2, 0]}>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial color={color} />
        </mesh>
        {label && (
            <FurnitureLabel text={label} position={[0, 0.1, depth / 2 + 0.005]} />
        )}
    </group>
);

const WardrobeModel: React.FC<{ width: number; depth: number; height: number; color: string; label?: string }> = ({ width, depth, height, color, label }) => (
    <group>
        <mesh position={[0, height / 2, 0]}>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial color={color} />
        </mesh>
        {/* Door Divider */}
        <mesh position={[0, height / 2, depth / 2 + 0.005]}>
            <boxGeometry args={[0.01, height, 0.01]} />
            <meshStandardMaterial color="#333" />
        </mesh>
        {/* Handles */}
        <mesh position={[-0.05, height / 2, depth / 2 + 0.02]}>
            <boxGeometry args={[0.02, 0.2, 0.02]} />
            <meshStandardMaterial color="#aaa" />
        </mesh>
        <mesh position={[0.05, height / 2, depth / 2 + 0.02]}>
            <boxGeometry args={[0.02, 0.2, 0.02]} />
            <meshStandardMaterial color="#aaa" />
        </mesh>
        {label && (
            <FurnitureLabel text={label} position={[0, 0.1, depth / 2 + 0.025]} />
        )}
    </group>
);

const KitchenModel: React.FC<{ width: number; depth: number; type: string; label?: string }> = ({ width, depth, type, label }) => {
    const counterH = 0.9;
    const toeKickH = 0.1;
    const countertopT = 0.04;
    const bodyH = counterH - toeKickH;

    if (type === 'fridge') {
        return (
            <group>
                <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
                    <boxGeometry args={[width, 1.8, depth]} />
                    <meshStandardMaterial color="#ccc" metalness={0.5} roughness={0.3} />
                </mesh>
                <mesh position={[width / 2 - 0.05, 1.2, depth / 2 + 0.01]} castShadow receiveShadow>
                    <boxGeometry args={[0.02, 0.4, 0.02]} />
                    <meshStandardMaterial color="#555" />
                </mesh>
                {label && (
                    <FurnitureLabel text={label} position={[0, 0.2, depth / 2 + 0.005]} />
                )}
            </group>
        );
    }

    if (type.includes('cabinet-base') || type.includes('kitchen-drawers') || type.includes('kitchen-oven')) {
        const isOven = type.includes('oven');
        return (
            <group>
                {/* Body */}
                <mesh position={[0, toeKickH + (bodyH - countertopT) / 2, 0]} castShadow receiveShadow>
                    <boxGeometry args={[width, bodyH - countertopT, depth]} />
                    <meshStandardMaterial color="#f8f9fa" />
                </mesh>
                {/* Countertop */}
                <mesh position={[0, counterH - countertopT / 2, 0.01 / 2]} castShadow receiveShadow>
                    <boxGeometry args={[width + 0.005, countertopT, depth + 0.01]} />
                    <meshStandardMaterial color="#495057" />
                </mesh>
                {/* Toe Kick */}
                <mesh position={[0, toeKickH / 2, depth / 2 - 0.05]} castShadow receiveShadow>
                    <boxGeometry args={[width, toeKickH, 0.1]} />
                    <meshStandardMaterial color="#adb5bd" />
                </mesh>

                {isOven ? (
                    <group>
                        <mesh position={[0, toeKickH + bodyH * 0.45, depth / 2 + 0.01]} castShadow receiveShadow>
                            <boxGeometry args={[width * 0.9, bodyH * 0.7, 0.02]} />
                            <meshStandardMaterial color="#333" metalness={0.8} />
                        </mesh>
                        <mesh position={[0, toeKickH + bodyH * 0.7, depth / 2 + 0.05]} castShadow receiveShadow>
                            <boxGeometry args={[width * 0.5, 0.02, 0.04]} />
                            <meshStandardMaterial color="#ced4da" />
                        </mesh>
                        {/* Burners on top */}
                        {[[-0.15, 0.15], [0.15, 0.15], [-0.15, -0.15], [0.15, -0.15]].map((p, i) => (
                            <mesh key={i} position={[p[0], counterH, p[1]]} castShadow receiveShadow>
                                <cylinderGeometry args={[0.08, 0.08, 0.01, 16]} />
                                <meshStandardMaterial color="#111" />
                            </mesh>
                        ))}
                    </group>
                ) : type.includes('drawers') ? (
                    [0.3, 0.55, 0.8].map((y, i) => (
                        <mesh key={i} position={[0, toeKickH + bodyH * y * 0.75, depth / 2 + 0.01]} castShadow receiveShadow>
                            <boxGeometry args={[width * 0.8, 0.01, 0.03]} />
                            <meshStandardMaterial color="#ced4da" />
                        </mesh>
                    ))
                ) : (
                    <mesh position={[0, toeKickH + bodyH * 0.7, depth / 2 + 0.01]} castShadow receiveShadow>
                        <boxGeometry args={[width * 0.8, 0.01, 0.03]} />
                        <meshStandardMaterial color="#ced4da" />
                    </mesh>
                )}
                {label && (
                    <FurnitureLabel text={label} position={[0, toeKickH + 0.1, depth / 2 + 0.005]} />
                )}
            </group>
        );
    }

    if (type.includes('sink')) {
        return (
            <group>
                <mesh position={[0, toeKickH + (bodyH - countertopT) / 2, 0]}>
                    <boxGeometry args={[width, bodyH - countertopT, depth]} />
                    <meshStandardMaterial color="#f8f9fa" />
                </mesh>
                <mesh position={[0, counterH - countertopT / 2, 0]}>
                    <boxGeometry args={[width, countertopT, depth]} />
                    <meshStandardMaterial color="#495057" />
                </mesh>
                {/* Basin */}
                <mesh position={[0, counterH - 0.05, 0]} castShadow receiveShadow>
                    <boxGeometry args={[width * 0.6, 0.15, depth * 0.6]} />
                    <meshStandardMaterial color="#888" metalness={0.9} />
                </mesh>
                <mesh position={[0, counterH + 0.1, -depth * 0.3]} rotation={[0, 0, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.01, 0.01, 0.2]} />
                    <meshStandardMaterial color="#aaa" metalness={1} />
                </mesh>
                {label && (
                    <FurnitureLabel text={label} position={[0, toeKickH + 0.1, depth / 2 + 0.005]} />
                )}
            </group>
        );
    }

    if (type.includes('upper')) {
        const h = type.includes('corner') ? 0.6 : 1.0;
        return (
            <group position={[0, 1.5, 0]}>
                <mesh position={[0, h / 2, 0]}>
                    <boxGeometry args={[width, h, depth]} />
                    <meshStandardMaterial color="#f8f9fa" />
                </mesh>
                <mesh position={[0, 0.1, depth / 2 + 0.01]}>
                    <boxGeometry args={[width * 0.8, 0.01, 0.02]} />
                    <meshStandardMaterial color="#ced4da" />
                </mesh>
                {label && (
                    <FurnitureLabel text={label} position={[0, 0.2, depth / 2 + 0.005]} />
                )}
            </group>
        );
    }

    return null;
};

const PlumbingModel: React.FC<{ width: number; depth: number; height: number; type: 'toilet' | 'tub' | 'shower' | 'vanity'; label?: string }> = ({ width, depth, height, type, label }) => {
    if (type === 'toilet') {
        return (
            <group>
                <mesh position={[0, 0.2, 0.1]}>
                    <cylinderGeometry args={[0.2, 0.2, 0.4, 16]} />
                    <meshStandardMaterial color="#f8f9fa" />
                </mesh>
                <mesh position={[0, 0.4, -0.2]}>
                    <boxGeometry args={[0.4, 0.8, 0.25]} />
                    <meshStandardMaterial color="#f8f9fa" />
                </mesh>
                {label && (
                    <FurnitureLabel text={label} position={[0, 0.1, 0.3]} />
                )}
            </group>
        );
    }
    if (type === 'tub') {
        return (
            <group>
                <mesh position={[0, 0.25, 0]}>
                    <boxGeometry args={[width, 0.5, depth]} />
                    <meshStandardMaterial color="#e9ecef" />
                </mesh>
                {/* Water/Basin */}
                <mesh position={[0, 0.4, 0]}>
                    <boxGeometry args={[width * 0.85, 0.2, depth * 0.85]} />
                    <meshStandardMaterial color="#a5f3fc" transparent opacity={0.4} />
                </mesh>
                {label && (
                    <FurnitureLabel text={label} position={[0, 0.1, depth / 2 + 0.005]} />
                )}
            </group>
        );
    }
    if (type === 'vanity') {
        const vH = 0.85;
        return (
            <group>
                <mesh position={[0, vH / 2, 0]}>
                    <boxGeometry args={[width, vH, depth]} />
                    <meshStandardMaterial color="#fff" />
                </mesh>
                {/* Sink on top */}
                <mesh position={[0, vH + 0.05, 0]}>
                    <boxGeometry args={[0.4, 0.1, 0.3]} />
                    <meshStandardMaterial color="#f8f9fa" />
                </mesh>
                {label && (
                    <FurnitureLabel text={label} position={[0, 0.2, depth / 2 + 0.005]} />
                )}
            </group>
        );
    }
    // Shower
    return (
        <group>
            {/* Tray */}
            <mesh position={[0, 0.05, 0]}>
                <boxGeometry args={[width, 0.1, depth]} />
                <meshStandardMaterial color="#eee" />
            </mesh>
            {/* Glass Panels */}
            <mesh position={[0, height / 2 + 0.1, 0]}>
                <boxGeometry args={[width, height, depth]} />
                <meshStandardMaterial color="#a5f3fc" transparent opacity={0.2} metalness={0.9} />
            </mesh>
            {/* Shower head */}
            <mesh position={[0, height, -depth / 2 + 0.05]}>
                <boxGeometry args={[0.05, 0.05, 0.2]} />
                <meshStandardMaterial color="#aaa" />
            </mesh>
            {label && (
                <FurnitureLabel text={label} position={[0, 0.1, depth / 2 + 0.005]} />
            )}
        </group>
    );
};

const LampModel: React.FC<{ type: 'table' | 'floor'; label?: string; intensity: number }> = ({ type, label, intensity }) => {
    const isFloor = type === 'floor';
    const height = isFloor ? 1.4 : 0.45;
    const baseR = isFloor ? 0.15 : 0.08;
    const stemR = 0.015;
    const shadeR = isFloor ? 0.25 : 0.15;
    const shadeH = isFloor ? 0.35 : 0.2;
    const lightColor = "#fff9db"; // Warm incandescent glow

    return (
        <group>
            {/* Base */}
            <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[baseR, baseR * 1.1, 0.04, 24]} />
                <meshStandardMaterial color="#333" />
            </mesh>
            {/* Stem */}
            <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[stemR, stemR, height, 12]} />
                <meshStandardMaterial color="#444" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Shade (Glowing) */}
            <mesh position={[0, height, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[shadeR * 0.7, shadeR, shadeH, 24, 1, true]} />
                <meshStandardMaterial
                    color="#fff"
                    emissive={lightColor}
                    emissiveIntensity={intensity * 1.5}
                    transparent
                    opacity={0.9}
                />
            </mesh>
            {/* Top Cap */}
            <mesh position={[0, height + shadeH / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[shadeR * 0.7, 24]} />
                <meshStandardMaterial color="#ddd" />
            </mesh>

            {/* Actual Light Source */}
            <pointLight
                position={[0, height, 0]}
                intensity={intensity}
                distance={5}
                decay={2}
                color={lightColor}
                castShadow
                shadow-bias={-0.001}
            />

            {label && (
                <FurnitureLabel text={label} position={[0, 0.1, shadeR + 0.05]} />
            )}
        </group>
    );
};

const RoofModel: React.FC<{ walls: Wall[]; height: number }> = ({ walls, height }) => {
    // Calculate bounding box of all wall points
    const points = walls.flatMap(w => [w.start, w.end]);
    if (points.length === 0) return null;

    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));

    const width = maxX - minX;
    const depth = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    return (
        <mesh position={[centerX, height, centerY]} receiveShadow={false} castShadow={false}>
            <boxGeometry args={[width + 0.4, 0.1, depth + 0.4]} />
            <meshStandardMaterial color="#ffffff" roughness={0.5} />
        </mesh>
    );
};

const DoorModel: React.FC<{ width: number; height: number; thickness: number; hinge: 'left' | 'right'; openDirection: 'in' | 'out' }> = ({ width, height, thickness, hinge, openDirection }) => {
    const doorThickness = 0.04;
    const openAngle = (Math.PI / 2); // 90 degrees (Full Open)

    // Hinge logic
    const isRight = hinge === 'right';
    const isOut = openDirection === 'out';
    const hingeSide = isRight ? 1 : -1;
    const swingDir = isOut ? -1 : 1;

    // The door leaf rotates around the hinge point at the edge
    const hingeX = (width / 2) * hingeSide;

    return (
        <group>
            {/* Door Frame (3 pieces: Left, Right, Top) */}
            <group>
                {/* Left Frame Piece - Shifted 5mm into the wall for overlap */}
                <mesh position={[-width / 2 - 0.02, height / 2, 0]}>
                    <boxGeometry args={[0.06, height + 0.05, thickness + 0.02]} />
                    <meshStandardMaterial color="#4e342e" />
                </mesh>
                {/* Right Frame Piece - Shifted 5mm into the wall for overlap */}
                <mesh position={[width / 2 + 0.02, height / 2, 0]}>
                    <boxGeometry args={[0.06, height + 0.05, thickness + 0.02]} />
                    <meshStandardMaterial color="#4e342e" />
                </mesh>
                {/* Top Frame Piece */}
                <mesh position={[0, height + 0.025, 0]}>
                    <boxGeometry args={[width + 0.1, 0.05, thickness + 0.02]} />
                    <meshStandardMaterial color="#4e342e" />
                </mesh>
            </group>
            {/* Door Leaf (Rotated) */}
            <group position={[hingeX, 0, 0]} rotation={[0, openAngle * hingeSide * swingDir, 0]}>
                <mesh position={[-hingeX, height / 2, 0]}>
                    <boxGeometry args={[width, height, doorThickness]} />
                    <meshStandardMaterial color="#8d6e63" />
                </mesh>
                {/* Handle */}
                <mesh position={[-hingeX * 1.8, height / 2, 0.05 * swingDir]}>
                    <sphereGeometry args={[0.025, 16, 16]} />
                    <meshStandardMaterial color="#ffd700" metalness={0.8} roughness={0.2} />
                </mesh>
            </group>
        </group>
    );
};

const WindowModel: React.FC<{ width: number; height: number; thickness: number }> = ({ width, height, thickness }) => {
    const frameWidth = 0.06;
    const vMullionCount = Math.max(1, Math.floor(width / 1.0));

    return (
        <group>
            <mesh position={[0, frameWidth / 2 - 0.005, 0]}>
                <boxGeometry args={[width + 0.02, frameWidth + 0.01, thickness + 0.02]} />
                <meshStandardMaterial color="#333333" />
            </mesh>
            <mesh position={[0, height - frameWidth / 2 + 0.005, 0]}>
                <boxGeometry args={[width + 0.02, frameWidth + 0.01, thickness + 0.02]} />
                <meshStandardMaterial color="#333333" />
            </mesh>
            <mesh position={[-width / 2 - 0.005, height / 2, 0]}>
                <boxGeometry args={[frameWidth + 0.01, height + 0.02, thickness + 0.02]} />
                <meshStandardMaterial color="#333333" />
            </mesh>
            <mesh position={[width / 2 + 0.005, height / 2, 0]}>
                <boxGeometry args={[frameWidth + 0.01, height + 0.02, thickness + 0.02]} />
                <meshStandardMaterial color="#333333" />
            </mesh>
            <mesh position={[0, height / 2, 0]}>
                <boxGeometry args={[width - frameWidth, height - frameWidth, thickness * 0.4]} />
                <meshStandardMaterial color="#a5f3fc" transparent opacity={0.6} metalness={0.9} roughness={0.1} />
            </mesh>
            {Array.from({ length: vMullionCount }).map((_, i) => (
                <mesh key={`v-${i}`} position={[-width / 2 + (width / (vMullionCount + 1)) * (i + 1), height / 2, 0]}>
                    <boxGeometry args={[0.02, height - frameWidth, thickness + 0.01]} />
                    <meshStandardMaterial color="#333333" />
                </mesh>
            ))}
        </group>
    );
};

const WallObjectMesh: React.FC<{ obj: WallObject; wall: Wall }> = ({ obj, wall }) => {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const wallAngle = Math.atan2(dy, dx);

    // Position along the wall
    const posX = wall.start.x + dx * obj.position;
    const posY = wall.start.y + dy * obj.position;

    // Architectural Constraints: Max height is wall height - 10cm
    const finalHeight = Math.min(obj.height, wall.height - 0.1);

    // Logic for Balcony Door (if height > 1.8m, start from ground)
    const isBalconyStyle = obj.type === 'window' && finalHeight > 1.8;
    const finalOffset = isBalconyStyle || obj.type === 'door' ? 0 : obj.offset;

    return (
        <group position={[posX, finalOffset, posY]} rotation={[0, -wallAngle, 0]}>
            {obj.type === 'door' ? (
                <DoorModel
                    width={obj.width}
                    height={finalHeight}
                    thickness={wall.thickness}
                    hinge={obj.hinge || 'left'}
                    openDirection={obj.openDirection || 'in'}
                />
            ) : (
                <WindowModel
                    width={obj.width}
                    height={finalHeight}
                    thickness={wall.thickness}
                />
            )}
        </group>
    );
};

// --- CORE LOGIC ---

// Helper Component to render a piece of wall
const WallSection: React.FC<{
    id: string;
    start: [number, number];
    end: [number, number];
    thickness: number;
    height: number;
    offset?: number;
    color?: string;
    transparent?: boolean;
    opacity?: number;
    materialId?: string;
    materialSideA?: string;
    materialSideB?: string;
}> = ({ id, start, end, thickness, height, offset = 0, color = "#f1f3f5", transparent = false, opacity = 1, materialId, materialSideA, materialSideB }) => {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length < 0.01) return null;

    const angle = Math.atan2(dy, dx);
    const midX = (start[0] + end[0]) / 2;
    const midY = (start[1] + end[1]) / 2;


    return (
        <mesh
            position={[midX, offset + height / 2, midY]}
            rotation={[0, -angle, 0]}
            castShadow
            receiveShadow
            userData={{ type: 'wall', id }}
        >
            <boxGeometry args={[length, height, thickness]} />
            {/* Box UV Mapping: 
                0: +x (Side End), 1: -x (Side Start)
                2: +y (Top), 3: -y (Bottom)
                4: +z (Side A), 5: -z (Side B)
            */}
            {[0, 1, 2, 3, 4, 5].map((idx) => {
                let mId = materialId;
                let w = length;
                let h = height;

                if (idx === 0 || idx === 1) { w = thickness; h = height; }
                if (idx === 2 || idx === 3) { w = length; h = thickness; }
                if (idx === 4) { mId = materialSideA || materialId; w = length; h = height; }
                if (idx === 5) { mId = materialSideB || materialId; w = length; h = height; }

                return (
                    <PhysicsMaterial
                        key={idx}
                        index={idx}
                        matId={mId}
                        width={w}
                        height={h}
                        color={color}
                        transparent={transparent}
                        opacity={opacity}
                    />
                );
            })}
        </mesh>
    );
};

class MaterialErrorBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { hasError: boolean }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() { return { hasError: true }; }
    render() {
        if (this.state.hasError) return this.props.fallback;
        return this.props.children;
    }
}

const TextureMaterial: React.FC<{
    index: number;
    mat: any;
    width: number;
    height: number;
    color: string;
    transparent: boolean;
    opacity: number;
    side?: THREE.Side;
    attach?: string;
}> = ({ index, mat, width, height, color, transparent, opacity, side, attach }) => {
    const baseTexture = useTexture(mat.textureUrl) as THREE.Texture;

    // Create a unique instance for this surface segment to avoid shared state bugs
    const texture = React.useMemo(() => {
        const t = baseTexture.clone();
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        return t;
    }, [baseTexture]);

    React.useLayoutEffect(() => {
        if (texture && mat.realSize) {
            texture.repeat.set(width / mat.realSize[0], height / mat.realSize[1]);
            texture.needsUpdate = true;
        }
    }, [texture, mat.realSize, width, height]);

    // Ensure we dispose of the clone when the segment unmounts
    React.useEffect(() => {
        return () => {
            texture.dispose();
        };
    }, [texture]);

    return (
        <meshStandardMaterial
            attach={attach || `material-${index}`}
            color={mat.color || color}
            map={texture}
            transparent={transparent}
            opacity={opacity}
            roughness={mat.roughness ?? 0.8}
            metalness={mat.metalness ?? 0}
            side={side || THREE.FrontSide}
        />
    );
};

const PhysicsMaterial: React.FC<{
    index: number;
    matId?: string;
    width: number;
    height: number;
    color: string;
    transparent: boolean;
    opacity: number;
    side?: THREE.Side;
    attach?: string;
}> = ({ index, matId, width, height, color, transparent, opacity, side, attach }) => {
    const mat = SURFACE_MATERIALS.find(m => m.id === matId);

    const fallbackMat = (
        <meshStandardMaterial
            attach={attach || `material-${index}`}
            color={mat?.color || color}
            transparent={transparent}
            opacity={opacity}
            roughness={mat?.roughness ?? 0.8}
            metalness={mat?.metalness ?? 0}
            side={side || THREE.FrontSide}
        />
    );

    if (!mat?.textureUrl) {
        return fallbackMat;
    }

    return (
        <MaterialErrorBoundary fallback={fallbackMat}>
            <React.Suspense fallback={fallbackMat}>
                <TextureMaterial
                    index={index}
                    mat={mat}
                    width={width}
                    height={height}
                    color={color}
                    transparent={transparent}
                    opacity={opacity}
                    side={side}
                    attach={attach}
                />
            </React.Suspense>
        </MaterialErrorBoundary>
    );
};

// Component to render a wall with "holes"
const SegmentedWall: React.FC<{ wall: Wall; objects: WallObject[] }> = ({ wall, objects }) => {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const wallLength = Math.sqrt(dx * dx + dy * dy);

    // 1. Calculate spans for all objects [start_t, end_t] where t is [0, 1]
    const spans = objects.map(obj => {
        const halfWidthT = (obj.width / 2) / wallLength;
        return {
            start: Math.max(0, obj.position - halfWidthT),
            end: Math.min(1, obj.position + halfWidthT),
            obj
        };
    }).sort((a, b) => a.start - b.start);

    // 2. Generate wall pieces for the "gaps" between objects
    const wallPieces: React.ReactNode[] = [];
    let lastT = 0;

    spans.forEach((span, i) => {
        // Main wall segment before the object
        if (span.start > lastT) {
            wallPieces.push(
                <WallSection
                    key={`wall-${i}`}
                    start={[wall.start.x + dx * lastT, wall.start.y + dy * lastT]}
                    end={[wall.start.x + dx * span.start, wall.start.y + dy * span.start]}
                    thickness={wall.thickness}
                    height={wall.height}
                    color={wall.isVirtual ? "#4dabf7" : "#f1f3f5"}
                    transparent={wall.isVirtual}
                    opacity={wall.isVirtual ? 0.3 : 1}
                    materialId={wall.materialId}
                    materialSideA={wall.materialSideA}
                    materialSideB={wall.materialSideB}
                    id={wall.id}
                />
            );
        }

        // Architectural Constraints: Normalized dimensions for wall segmentation
        const finalObjHeight = Math.min(span.obj.height, wall.height - 0.1);
        const isBalconyStyle = span.obj.type === 'window' && finalObjHeight > 1.8;
        const finalObjOffset = isBalconyStyle || span.obj.type === 'door' ? 0 : span.obj.offset;

        const sillHeight = finalObjOffset;
        const headerHeight = wall.height - (finalObjOffset + finalObjHeight);

        // Sill (Below - mostly for windows)
        if (sillHeight > 0.01) {
            wallPieces.push(
                <WallSection
                    key={`sill-${i}`}
                    start={[wall.start.x + dx * span.start, wall.start.y + dy * span.start]}
                    end={[wall.start.x + dx * span.end, wall.start.y + dy * span.end]}
                    thickness={wall.thickness}
                    height={sillHeight}
                    offset={0}
                    materialId={wall.materialId}
                    materialSideA={wall.materialSideA}
                    materialSideB={wall.materialSideB}
                    id={wall.id}
                />
            );
        }
        // Header (Above - for BOTH doors and windows)
        if (headerHeight > 0.01) {
            wallPieces.push(
                <WallSection
                    key={`header-${i}`}
                    start={[wall.start.x + dx * span.start, wall.start.y + dy * span.start]}
                    end={[wall.start.x + dx * span.end, wall.start.y + dy * span.end]}
                    thickness={wall.thickness}
                    height={headerHeight}
                    offset={finalObjOffset + finalObjHeight}
                    materialId={wall.materialId}
                    materialSideA={wall.materialSideA}
                    materialSideB={wall.materialSideB}
                    id={wall.id}
                />
            );
        }

        lastT = span.end;
    });

    // Final wall segment after the last object
    if (lastT < 1) {
        wallPieces.push(
            <WallSection
                key="wall-final"
                start={[wall.start.x + dx * lastT, wall.start.y + dy * lastT]}
                end={[wall.end.x, wall.end.y]}
                thickness={wall.thickness}
                height={wall.height}
                color={wall.isVirtual ? "#4dabf7" : "#f1f3f5"}
                transparent={wall.isVirtual}
                opacity={wall.isVirtual ? 0.3 : 1}
                materialId={wall.materialId}
                materialSideA={wall.materialSideA}
                materialSideB={wall.materialSideB}
                id={wall.id}
            />
        );
    }

    return <group>{wallPieces}</group>;
};

const FurnitureMesh: React.FC<{ item: Furniture, lightIntensity: number }> = ({ item, lightIntensity }) => {
    const rotationRad = (item.rotation * Math.PI) / 180;

    // Map templateIds to components
    const renderModel = () => {
        if (item.customRecipe) return <DynamicModel recipe={item.customRecipe} label={item.label} />;

        const lowerId = item.templateId.toLowerCase();

        // Seating Hierarchy: Check specific armchairs first, then general sofas, then dining chairs
        if (lowerId.includes('armchair')) return <ArmchairModel width={item.width} depth={item.depth} label={item.label} />;
        if (lowerId.includes('sofa-l')) return <LSofaModel width={item.width} depth={item.depth} label={item.label} />;
        if (lowerId.includes('sofa')) return <SofaModel width={item.width} depth={item.depth} label={item.label} />;
        if (lowerId.includes('chair')) return <ChairModel />;

        // Beds
        if (lowerId.includes('bed')) return <BedModel width={item.width} depth={item.depth} color="#495057" label={item.label} />;

        // Tables
        if (lowerId.includes('dining')) return <TableModel width={item.width} depth={item.depth} color="#8d6e63" type="dining" label={item.label} />;
        if (lowerId.includes('coffee')) return <TableModel width={item.width} depth={item.depth} color="#8d6e63" type="coffee" label={item.label} />;
        if (lowerId.includes('island')) return <TableModel width={item.width} depth={item.depth} color="#f8f9fa" type="island" label={item.label} />;
        if (lowerId.includes('table')) return <TableModel width={item.width} depth={item.depth} color="#adb5bd" label={item.label} />;
        if (lowerId.includes('desk')) return <TableModel width={item.width} depth={item.depth} color="#5d4037" label={item.label} />;

        // Storage & TV
        if (lowerId.includes('wardrobe') || lowerId.includes('closet')) return <WardrobeModel width={item.width} depth={item.depth} height={2.1} color="#e9ecef" label={item.label} />;
        if (lowerId.includes('tv')) return <TVStandModel width={item.width} depth={item.depth} color="#343a40" label={item.label} />;
        if (item.category === 'bedroom' && lowerId.includes('stand')) return <StorageModel width={item.width} depth={item.depth} height={0.5} color="#dee2e6" label={item.label} />; // Nightstands

        // Lighting
        if (lowerId.includes('lamp-table')) return <LampModel type="table" label={item.label} intensity={lightIntensity} />;
        if (lowerId.includes('lamp-floor')) return <LampModel type="floor" label={item.label} intensity={lightIntensity} />;

        // Kitchen/Appliances
        if (lowerId.includes('fridge')) return <KitchenModel width={item.width} depth={item.depth} type="fridge" label={item.label} />;
        if (lowerId.includes('oven')) return <KitchenModel width={item.width} depth={item.depth} type="kitchen-oven" label={item.label} />;
        if (lowerId.includes('drawers')) return <KitchenModel width={item.width} depth={item.depth} type="kitchen-drawers" label={item.label} />;
        if (lowerId.includes('sink')) return <KitchenModel width={item.width} depth={item.depth} type="sink" label={item.label} />;
        if (lowerId.includes('stove')) return <KitchenModel width={item.width} depth={item.depth} type="kitchen-oven" label={item.label} />; // Map stove to oven/cooktop variant
        if (lowerId.includes('counter') || lowerId.includes('cabinet-base')) return <KitchenModel width={item.width} depth={item.depth} type="cabinet-base" label={item.label} />;
        if (lowerId.includes('upper')) return <KitchenModel width={item.width} depth={item.depth} type="cabinet-upper" label={item.label} />;

        // Bathroom/Plumbing
        if (lowerId.includes('toilet')) return <PlumbingModel width={item.width} depth={item.depth} height={0.8} type="toilet" label={item.label} />;
        if (lowerId.includes('tub')) return <PlumbingModel width={item.width} depth={item.depth} height={0.5} type="tub" label={item.label} />;
        if (lowerId.includes('shower')) return <PlumbingModel width={item.width} depth={item.depth} height={2.0} type="shower" label={item.label} />;
        if (lowerId.includes('vanity') || lowerId.includes('wash')) return <PlumbingModel width={item.width} depth={item.depth} height={0.85} type="vanity" label={item.label} />;

        // Fallback for categories
        if (item.category === 'kitchen') return <StorageModel width={item.width} depth={item.depth} height={0.9} color="#ced4da" label={item.label} />;
        if (item.category === 'bathroom') return <PlumbingModel width={item.width} depth={item.depth} height={2.2} type="shower" label={item.label} />;

        return (
            <mesh position={[0, 0.4, 0]}>
                <boxGeometry args={[item.width, 0.8, item.depth]} />
                <meshStandardMaterial color="#ced4da" />
            </mesh>
        );
    };
    return (
        <group position={[item.x, 0, item.y]} rotation={[0, -rotationRad, 0]}>
            {renderModel()}
        </group>
    );
};

const MaterialDropHandler: React.FC<{
    onApplyMaterial?: (id: string, materialId: string, type: 'wall' | 'floor', side?: 'A' | 'B') => void;
    containerRef: any;
}> = ({ onApplyMaterial, containerRef }) => {
    const { camera, raycaster, scene } = useThree();

    React.useEffect(() => {
        const handleDrop = (e: any) => {
            const materialId = e.detail.materialId;
            const dropPos = (window as any).lastDropPos;
            if (!dropPos || !onApplyMaterial || !containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();

            // Convert screen coords to NDC relative to the container
            const mouse = new THREE.Vector2(
                ((dropPos.x - rect.left) / rect.width) * 2 - 1,
                -((dropPos.y - rect.top) / rect.height) * 2 + 1
            );

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(scene.children, true);

            // Find first hit with userData
            for (const hit of intersects) {
                const data = hit.object.userData;
                if (data && data.type && data.id) {
                    let side: 'A' | 'B' | undefined;
                    if (data.type === 'wall' && hit.face) {
                        // hit.face.normal is in local space for the mesh
                        const normal = hit.face.normal;
                        if (normal.z > 0.5) side = 'A';
                        else if (normal.z < -0.5) side = 'B';
                    }
                    onApplyMaterial(data.id, materialId, data.type as 'wall' | 'floor', side);
                    break;
                }
            }
        };

        window.addEventListener('material-dropped', handleDrop);
        return () => window.removeEventListener('material-dropped', handleDrop);
    }, [camera, raycaster, scene, onApplyMaterial, containerRef]);

    return null;
};

export const ThreeDViewer: React.FC<ThreeDViewerProps> = ({ walls, objects, furniture, globalWallHeight, onUpdateWallHeight, onApplyMaterial, floorMaterials, hideSettings }) => {
    const [showRoof, setShowRoof] = React.useState(false);
    const [lightIntensity, setLightIntensity] = React.useState(1.0);
    const [ambientIntensity, setAmbientIntensity] = React.useState(0.1);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const rooms = React.useMemo(() => detectRooms(walls), [walls]);

    // Native drop handling
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const materialId = (window as any).draggingMaterialId;
        if (!materialId || !onApplyMaterial || !containerRef.current) return;

        // Note: We'll trigger a custom event or use a ref-based raycaster
        // to find exactly what we hit.
        // For simplicity since we are outside R3F context, we dispatch
        // a signal that the R3F scene will catch.
        (window as any).lastDropPos = { x: e.clientX, y: e.clientY };
        window.dispatchEvent(new CustomEvent('material-dropped', {
            detail: { materialId }
        }));
    };

    return (
        <div
            ref={containerRef}
            className="w-full h-full bg-zinc-950 relative"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
        >
            {/* Floating Settings Panel */}
            {!hideSettings && (
                <div className="absolute top-4 right-4 z-10 w-64 bg-white/90 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 p-4 text-black animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-2 mb-4 border-b border-zinc-200 pb-2">
                        <Settings2 size={16} className="text-zinc-500" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600">3D Settings</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2">
                                Lamp Intensity
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min="0"
                                    max="4"
                                    step="0.1"
                                    value={lightIntensity}
                                    onChange={(e) => setLightIntensity(Number(e.target.value))}
                                    className="flex-1 accent-orange-500 cursor-pointer h-1.5 bg-zinc-200 rounded-lg appearance-none"
                                />
                                <div className="w-12 text-center text-xs font-bold bg-orange-50 text-orange-700 py-1 rounded border border-orange-100">
                                    {lightIntensity.toFixed(1)}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2">
                                Ambient Light
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={ambientIntensity}
                                    onChange={(e) => setAmbientIntensity(Number(e.target.value))}
                                    className="flex-1 accent-blue-500 cursor-pointer h-1.5 bg-zinc-200 rounded-lg appearance-none"
                                />
                                <div className="w-12 text-center text-xs font-bold bg-blue-50 text-blue-700 py-1 rounded border border-blue-100">
                                    {ambientIntensity.toFixed(2)}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2">
                                <ArrowUpFromLine size={12} /> Wall Height
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min="2.5"
                                    max="3.3"
                                    step="0.1"
                                    value={globalWallHeight}
                                    onChange={(e) => onUpdateWallHeight(Number(e.target.value))}
                                    className="flex-1 accent-indigo-600 cursor-pointer h-1.5 bg-zinc-200 rounded-lg appearance-none"
                                />
                                <div className="w-12 text-center text-xs font-bold bg-indigo-50 text-indigo-700 py-1 rounded border border-indigo-100">
                                    {globalWallHeight.toFixed(1)}m
                                </div>
                            </div>
                            <p className="text-[9px] text-zinc-400 italic">Range: 2.5m - 3.3m</p>
                        </div>

                        <div className="border-t border-zinc-100 pt-3">
                            <button
                                onClick={() => setShowRoof(!showRoof)}
                                className={`w-full flex items-center justify-between p-2 rounded-lg transition-all duration-200 ${showRoof ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Home size={14} />
                                    <span className="text-xs font-bold uppercase tracking-wide">Show Roof</span>
                                </div>
                                <div className={`w-8 h-4 rounded-full relative transition-colors ${showRoof ? 'bg-white/30' : 'bg-zinc-200'}`}>
                                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${showRoof ? 'right-0.5' : 'left-0.5'}`} />
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Canvas shadows gl={{ antialias: true }}>
                <PerspectiveCamera makeDefault position={[12, 12, 12]} fov={40} />
                <MaterialDropHandler onApplyMaterial={onApplyMaterial} containerRef={containerRef} />
                <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.1} />

                <Suspense fallback={null}>
                    <Environment preset="city" />

                    <group>
                        {/* General Base Floor (Lowered to avoid overlap) */}
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
                            <planeGeometry args={[100, 100]} />
                            <meshStandardMaterial color="#f8f9fa" />
                        </mesh>
                        <Grid
                            args={[100, 100]}
                            sectionColor="#adb5bd"
                            cellColor="#dee2e6"
                            infiniteGrid
                            position={[0, -0.01, 0]} // Fixed grid height 1cm below room floors
                        />

                        {/* Room Floors */}
                        {rooms.map((room) => {
                            const shape = new THREE.Shape();
                            room.path.forEach((p, i) => {
                                // 2D (x,y) -> 3D (x,0,y). Since rotation is -PI/2 on X:
                                // local (x, y) -> world (x, 0, -y).
                                // To get world (x, 0, y), we use local (x, -y).
                                if (i === 0) shape.moveTo(p.x, -p.y);
                                else shape.lineTo(p.x, -p.y);
                            });
                            shape.closePath();

                            // Find material using stable Room ID
                            const floorMatId = floorMaterials?.[room.id];

                            // Calculate bounding box for texture scaling
                            const minX = Math.min(...room.path.map(p => p.x));
                            const maxX = Math.max(...room.path.map(p => p.x));
                            const minY = Math.min(...room.path.map(p => p.y));
                            const maxY = Math.max(...room.path.map(p => p.y));
                            const roomWidth = maxX - minX;
                            const roomHeight = maxY - minY;

                            return (
                                <mesh
                                    key={room.id}
                                    rotation={[-Math.PI / 2, 0, 0]}
                                    position={[0, 0.005, 0]} // Baseline 
                                    receiveShadow
                                    userData={{ type: 'floor', id: room.id }}
                                >
                                    <extrudeGeometry args={[shape, { depth: 0.01, bevelEnabled: false }]} />
                                    <PhysicsMaterial
                                        index={0}
                                        matId={floorMatId}
                                        width={1} // Absolute scaling for world-unit UVs
                                        height={1}
                                        color="#f3f4f6"
                                        transparent={false}
                                        opacity={1}
                                        side={THREE.DoubleSide}
                                        attach="material"
                                    />
                                </mesh>
                            );
                        })}

                        {/* Walls (Physical only, segmented for holes) */}
                        {walls.filter(w => !w.isVirtual).map(wall => (
                            <SegmentedWall
                                key={wall.id}
                                wall={wall}
                                objects={objects.filter(o => o.wallId === wall.id)}
                            />
                        ))}

                        {/* Doors & Windows (Physical sub-meshes) */}
                        {objects.filter(o => o.type !== 'opening').map(obj => {
                            const parentWall = walls.find(w => w.id === obj.wallId);
                            if (!parentWall) return null;
                            return <WallObjectMesh key={obj.id} obj={obj} wall={parentWall} />;
                        })}

                        {/* Furniture */}
                        {furniture.map(f => <FurnitureMesh key={f.id} item={f} lightIntensity={lightIntensity} />)}

                        {/* Roof */}
                        {showRoof && <RoofModel walls={walls} height={globalWallHeight} />}
                    </group>

                    <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={30} blur={2.5} far={10} />
                </Suspense>

                <ambientLight intensity={ambientIntensity} />
                <hemisphereLight intensity={ambientIntensity * 2} color="#ffffff" groundColor="#212529" />
            </Canvas>
        </div>
    );
};
