import { vi } from "vitest";

vi.mock("next-intl", async () => {
	const actual = await import("next-intl");
	return {
		...actual,
		useTranslations: () => (key: string) => key,
	};
});

// Mock server-side translations
vi.mock("next-intl/server", () => {
	const getTranslations = async () => {
		const t = (key: string) => key;

		t.rich = (
			key: string,
			{
				link,
				strong,
			}: {
				link?: (chunk: React.ReactNode) => React.ReactNode;
				strong?: (chunk: React.ReactNode) => React.ReactNode;
			}
		) => {
			return link ? link(key) : strong ? strong(key) : key;
		};

		return t;
	};

	const getLocale = () => "en";

	return { getTranslations, getLocale };
});
