import { useCallback, useReducer } from "react"
import { cloneGrid, type EditorGrid, makeGrid } from "./types"

const MAX_HISTORY = 60

interface State {
	grid: EditorGrid
	past: EditorGrid[]
	future: EditorGrid[]
}

type Action =
	| { type: "commit"; grid: EditorGrid } // a finished edit -> new undo step
	| { type: "setName"; name: string }
	| { type: "replace"; grid: EditorGrid } // new/resize/clear/load -> also an undo step
	| { type: "undo" }
	| { type: "redo" }

function pushPast(past: EditorGrid[], grid: EditorGrid): EditorGrid[] {
	const next = past.length >= MAX_HISTORY ? past.slice(1) : past.slice()
	next.push(grid)
	return next
}

function reducer(state: State, action: Action): State {
	switch (action.type) {
		case "commit":
		case "replace":
			return { grid: action.grid, past: pushPast(state.past, state.grid), future: [] }
		case "setName":
			// Renaming isn't worth its own undo step.
			return { ...state, grid: { ...state.grid, name: action.name } }
		case "undo": {
			if (!state.past.length) return state
			const prev = state.past[state.past.length - 1]
			return { grid: prev, past: state.past.slice(0, -1), future: [state.grid, ...state.future] }
		}
		case "redo": {
			if (!state.future.length) return state
			const next = state.future[0]
			return { grid: next, past: pushPast(state.past, state.grid), future: state.future.slice(1) }
		}
	}
}

export function useEditor(initialWidth = 32, initialDepth = 32) {
	const [state, dispatch] = useReducer(reducer, undefined, () => ({
		grid: makeGrid(initialWidth, initialDepth),
		past: [],
		future: [],
	}))

	const commit = useCallback((grid: EditorGrid) => dispatch({ type: "commit", grid }), [])
	const setName = useCallback((name: string) => dispatch({ type: "setName", name }), [])
	const replace = useCallback((grid: EditorGrid) => dispatch({ type: "replace", grid }), [])
	const undo = useCallback(() => dispatch({ type: "undo" }), [])
	const redo = useCallback(() => dispatch({ type: "redo" }), [])

	const newGrid = useCallback(
		(width: number, depth: number) => replace(makeGrid(width, depth, state.grid.name)),
		[replace, state.grid.name],
	)

	const resize = useCallback(
		(width: number, depth: number) => {
			const next = makeGrid(width, depth, state.grid.name)
			const copyW = Math.min(width, state.grid.width)
			const copyD = Math.min(depth, state.grid.depth)
			for (let z = 0; z < copyD; z++) {
				for (let x = 0; x < copyW; x++) {
					const from = z * state.grid.width + x
					const to = z * width + x
					next.ids[to] = state.grid.ids[from]
					next.heights[to] = state.grid.heights[from]
				}
			}
			replace(next)
		},
		[replace, state.grid],
	)

	const clear = useCallback(() => replace(makeGrid(state.grid.width, state.grid.depth, state.grid.name)), [replace, state.grid])

	const load = useCallback((grid: EditorGrid) => replace(cloneGrid(grid)), [replace])

	return {
		grid: state.grid,
		commit,
		setName,
		newGrid,
		resize,
		clear,
		load,
		undo,
		redo,
		canUndo: state.past.length > 0,
		canRedo: state.future.length > 0,
	}
}
