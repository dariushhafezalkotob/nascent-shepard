import { useState, useCallback } from 'react';

interface HistoryState<T> {
    past: T[];
    present: T;
    future: T[];
}

export const useHistory = <T>(initialState: T) => {
    const [state, setState] = useState<HistoryState<T>>({
        past: [],
        present: initialState,
        future: [],
    });

    const canUndo = state.past.length > 0;
    const canRedo = state.future.length > 0;

    const undo = useCallback(() => {
        setState((currentState) => {
            if (currentState.past.length === 0) return currentState;

            const previous = currentState.past[currentState.past.length - 1];
            const newPast = currentState.past.slice(0, currentState.past.length - 1);

            return {
                past: newPast,
                present: previous,
                future: [currentState.present, ...currentState.future],
            };
        });
    }, []);

    const redo = useCallback(() => {
        setState((currentState) => {
            if (currentState.future.length === 0) return currentState;

            const next = currentState.future[0];
            const newFuture = currentState.future.slice(1);

            return {
                past: [...currentState.past, currentState.present],
                present: next,
                future: newFuture,
            };
        });
    }, []);

    const set = useCallback((newPresent: T | ((prev: T) => T), replace: boolean = false) => {
        setState((currentState) => {
            const resolvedPresent = newPresent instanceof Function
                ? newPresent(currentState.present)
                : newPresent;

            if (replace) {
                return {
                    ...currentState,
                    present: resolvedPresent,
                };
            }

            return {
                past: [...currentState.past, currentState.present],
                present: resolvedPresent,
                future: [], // Clear future on new action
            };
        });
    }, []);

    // Helper to explicitly push the current state to history
    // content is not changed, but a checkpoint is made.
    const snapshot = useCallback(() => {
        setState((currentState) => {
            return {
                past: [...currentState.past, currentState.present],
                present: currentState.present,
                future: [],
            };
        });
    }, []);

    return {
        state: state.present,
        set,
        undo,
        redo,
        canUndo,
        canRedo,
        snapshot,
        // Expose full history state if needed for debugging
        history: state
    };
};
