import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import "@testing-library/jest-dom/vitest";

const createStorage = () => {
	const store = new Map<string, string>();

	return {
		clear: () => {
			store.clear();
		},
		getItem: (key: string) => {
			return store.get(key) ?? null;
		},
		key: (index: number) => {
			return Array.from(store.keys())[index] ?? null;
		},
		removeItem: (key: string) => {
			store.delete(key);
		},
		setItem: (key: string, value: string) => {
			store.set(String(key), String(value));
		},
		get length() {
			return store.size;
		},
	} satisfies Storage;
};

const installStorage = ({ key, value }: { key: "localStorage" | "sessionStorage"; value: Storage }) => {
	Object.defineProperty(window, key, {
		configurable: true,
		value,
		writable: true,
	});
	Object.defineProperty(globalThis, key, {
		configurable: true,
		value,
		writable: true,
	});
};

const localStorageMock = createStorage();
const sessionStorageMock = createStorage();

installStorage({
	key: "localStorage",
	value: localStorageMock,
});
installStorage({
	key: "sessionStorage",
	value: sessionStorageMock,
});

if (!window.matchMedia) {
	window.matchMedia = ((query: string) =>
		({
			matches: false,
			media: query,
			onchange: null,
			addListener: () => undefined,
			removeListener: () => undefined,
			addEventListener: () => undefined,
			removeEventListener: () => undefined,
			dispatchEvent: () => false,
		}) satisfies MediaQueryList) as typeof window.matchMedia;
}

afterEach(() => {
	cleanup();
	localStorageMock.clear();
	sessionStorageMock.clear();
});
