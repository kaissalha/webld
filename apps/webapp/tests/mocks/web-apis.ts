class ResizeObserverMock {
	observe() {
		// noop
	}

	unobserve() {
		// noop
	}

	disconnect() {
		// noop
	}
}

global.ResizeObserver = ResizeObserverMock;

class IntersectionObserverMock {
	readonly root: Element | Document | null = null;
	readonly rootMargin = "";
	readonly scrollMargin = "";
	readonly thresholds: ReadonlyArray<number> = [];

	observe() {
		// noop
	}

	unobserve() {
		// noop
	}

	disconnect() {
		// noop
	}

	takeRecords(): IntersectionObserverEntry[] {
		return [];
	}
}

global.IntersectionObserver = IntersectionObserverMock;
