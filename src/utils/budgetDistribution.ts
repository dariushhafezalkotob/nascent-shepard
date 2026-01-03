import type { Furniture } from '../types';
import { FURNITURE_TEMPLATES } from '../constants/FurnitureTemplates';

/**
 * Distributes a total budget across a list of furniture items based on their template weights.
 * @param furniture - List of furniture items in the layout
 * @param totalBudget - Total decoration budget provided by the user
 * @returns A mapping of furniture ID to its allocated budget
 */
export const distributeBudget = (furniture: Furniture[], totalBudget: number): Record<string, number> => {
    if (!furniture.length || totalBudget <= 0) return {};

    // 1. Calculate total weight
    let totalWeight = 0;
    const itemsWithWeights = furniture.map(item => {
        const template = FURNITURE_TEMPLATES.find(t => t.id === item.templateId);
        const weight = template?.budgetWeight || 1.0;
        totalWeight += weight;
        return { id: item.id, weight };
    });

    // 2. Allocate budget proportionally
    const allocation: Record<string, number> = {};
    itemsWithWeights.forEach(item => {
        // Round to nearest integer for cleaner UI
        allocation[item.id] = Math.round((item.weight / totalWeight) * totalBudget);
    });

    return allocation;
};
