export interface SavedPlan {
    id: string;
    name: string;
    date: number;
    data: any;
}

const STORAGE_KEY_PREFIX = 'nascent_shepard_plan_';
const AUTOSAVE_KEY = 'nascent_shepard_autosave';
const PLANS_LIST_KEY = 'nascent_shepard_plans_list';

export const StorageService = {
    // Save current active session for persistence on refresh
    autosave(state: any) {
        try {
            localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(state));
        } catch (e) {
            console.error('Autosave failed:', e);
        }
    },

    // Load the last active session
    loadAutosave() {
        try {
            const data = localStorage.getItem(AUTOSAVE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Load autosave failed:', e);
            return null;
        }
    },

    clearAutosave() {
        localStorage.removeItem(AUTOSAVE_KEY);
    },

    // Save a named project snapshot
    saveProject(name: string, state: any) {
        try {
            const id = `plan_${Date.now()}`;
            const project: SavedPlan = {
                id,
                name,
                date: Date.now(),
                data: state
            };

            // Save the data
            localStorage.setItem(`${STORAGE_KEY_PREFIX}${id}`, JSON.stringify(project));

            // Update plans list index
            const list = this.getSavedPlansList();
            list.push({ id, name, date: project.date });
            localStorage.setItem(PLANS_LIST_KEY, JSON.stringify(list));

            return id;
        } catch (e) {
            console.error('Save project failed:', e);
            return null;
        }
    },

    // Get list of saved plans (metadata only)
    getSavedPlansList(): { id: string, name: string, date: number }[] {
        try {
            const list = localStorage.getItem(PLANS_LIST_KEY);
            return list ? JSON.parse(list) : [];
        } catch (e) {
            return [];
        }
    },

    // Load full data for a specific plan
    loadProject(id: string): any | null {
        try {
            const data = localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`);
            if (!data) return null;
            const parsed = JSON.parse(data);
            return parsed.data;
        } catch (e) {
            console.error('Load project failed:', e);
            return null;
        }
    },

    // Delete a project
    deleteProject(id: string) {
        try {
            localStorage.removeItem(`${STORAGE_KEY_PREFIX}${id}`);
            const list = this.getSavedPlansList().filter(p => p.id !== id);
            localStorage.setItem(PLANS_LIST_KEY, JSON.stringify(list));
        } catch (e) {
            console.error('Delete failed:', e);
        }
    },

    // Clear everything
    clearAll() {
        localStorage.removeItem(AUTOSAVE_KEY);
        const list = this.getSavedPlansList();
        list.forEach(p => localStorage.removeItem(`${STORAGE_KEY_PREFIX}${p.id}`));
        localStorage.removeItem(PLANS_LIST_KEY);
    }
};
