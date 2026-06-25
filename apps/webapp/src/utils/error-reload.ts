/**
 * Build an error-boundary retry handler, preferring React's `unstable_retry`,
 * then the route's `reset`, then a full page reload as a last resort.
 */
export const createErrorReloadHandler = (reset?: () => void, unstable_retry?: () => void) => () => {
	if (unstable_retry) {
		unstable_retry();
	} else if (reset) {
		reset();
	} else {
		window.location.reload();
	}
};
