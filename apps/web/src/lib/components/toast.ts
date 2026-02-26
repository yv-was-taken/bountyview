import { writable } from 'svelte/store';

export interface ToastMessage {
	id: string;
	type: 'success' | 'error' | 'info';
	message: string;
}

const { subscribe, update } = writable<ToastMessage[]>([]);

export const toasts = { subscribe };

export function addToast(type: ToastMessage['type'], message: string, durationMs = 4000) {
	const id = crypto.randomUUID();
	update((all) => [...all, { id, type, message }]);

	setTimeout(() => {
		dismissToast(id);
	}, durationMs);
}

export function dismissToast(id: string) {
	update((all) => all.filter((t) => t.id !== id));
}

export const toast = {
	success: (msg: string) => addToast('success', msg),
	error: (msg: string) => addToast('error', msg),
	info: (msg: string) => addToast('info', msg)
};
