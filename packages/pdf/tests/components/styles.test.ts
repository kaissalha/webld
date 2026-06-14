import { describe, expect, it, vi } from "vitest";

const registerMock = vi.fn();

// Mock Font.register to avoid network calls
vi.mock("@react-pdf/renderer", () => ({
	Font: {
		register: registerMock,
	},
	StyleSheet: {
		create: <T extends Record<string, object>>(styles: T): T => styles,
	},
}));

const loadStyles = async () => {
	const module = await import("../../src/components/styles");
	return module.baseStyles;
};

describe("baseStyles", () => {
	it("registers Geist font family", async () => {
		registerMock.mockClear();
		vi.resetModules();
		await loadStyles();
		expect(registerMock).toHaveBeenCalledWith(
			expect.objectContaining({
				family: "Geist",
				fonts: expect.arrayContaining([
					expect.objectContaining({ fontWeight: 400, fontStyle: "normal" }),
					expect.objectContaining({ fontWeight: 500 }),
					expect.objectContaining({ fontWeight: 600 }),
					expect.objectContaining({ fontWeight: 700 }),
				]),
			})
		);
	});

	it("defines page styles", async () => {
		const baseStyles = await loadStyles();
		expect(baseStyles.page).toBeDefined();
		expect(baseStyles.page.fontFamily).toBe("Geist");
		expect(baseStyles.page.fontSize).toBe(10);
		expect(baseStyles.page.padding).toBe(40);
	});

	it("defines header styles", async () => {
		const baseStyles = await loadStyles();
		expect(baseStyles.header).toBeDefined();
		expect(baseStyles.header.flexDirection).toBe("row");
		expect(baseStyles.header.marginBottom).toBe(30);
	});

	it("defines title styles", async () => {
		const baseStyles = await loadStyles();
		expect(baseStyles.title).toBeDefined();
		expect(baseStyles.title.fontSize).toBe(24);
		expect(baseStyles.title.fontWeight).toBe(700);
	});

	it("defines text variant styles", async () => {
		const baseStyles = await loadStyles();
		expect(baseStyles.text).toBeDefined();
		expect(baseStyles.textMuted).toBeDefined();
		expect(baseStyles.textBold).toBeDefined();
		expect(baseStyles.textMuted.color).toBe("#707070");
		expect(baseStyles.textBold.fontWeight).toBe(600);
	});

	it("defines layout styles", async () => {
		const baseStyles = await loadStyles();
		expect(baseStyles.row).toBeDefined();
		expect(baseStyles.column).toBeDefined();
		expect(baseStyles.section).toBeDefined();
		expect(baseStyles.row.flexDirection).toBe("row");
		expect(baseStyles.column.flexDirection).toBe("column");
	});

	it("defines divider styles", async () => {
		const baseStyles = await loadStyles();
		expect(baseStyles.divider).toBeDefined();
		expect(baseStyles.divider.borderBottomWidth).toBe(1);
		expect(baseStyles.divider.borderBottomColor).toBe("#E8E7E1");
	});

	it("defines footer styles with absolute positioning", async () => {
		const baseStyles = await loadStyles();
		expect(baseStyles.footer).toBeDefined();
		expect(baseStyles.footer.position).toBe("absolute");
		expect(baseStyles.footer.bottom).toBe(20);
	});

	it("registers fonts on each fresh module load (Geist + Playfair per evaluation)", async () => {
		registerMock.mockClear();
		vi.resetModules();
		await loadStyles();
		expect(registerMock).toHaveBeenCalledTimes(2);

		registerMock.mockClear();
		vi.resetModules();
		await loadStyles();
		expect(registerMock).toHaveBeenCalledTimes(2);
	});
});
