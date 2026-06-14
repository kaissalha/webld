import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type PackageJson = {
	devDependencies: Record<string, string>;
};

// Get the webapp directory path
const webappDir = path.resolve(__dirname, "..");

// Read package.json and get devDependencies
const packageJson = JSON.parse(fs.readFileSync(path.join(webappDir, "package.json"), "utf8")) as PackageJson;
const devDependencies = Object.keys(packageJson.devDependencies || {});

// Function to get all .ts, .tsx files in src directory
const getAllFiles = ({ dirPath, arrayOfFiles = [] }: { dirPath: string; arrayOfFiles?: string[] }): string[] => {
	const files = fs.readdirSync(dirPath);

	files.forEach((file) => {
		const filePath = path.join(dirPath, file);
		if (fs.statSync(filePath).isDirectory()) {
			arrayOfFiles = getAllFiles({ dirPath: filePath, arrayOfFiles });
		} else if (/\.(ts|tsx)$/.test(file)) {
			arrayOfFiles.push(filePath);
		}
	});

	return arrayOfFiles;
};

// Function to check if a file imports any devDependencies
const checkFileForDevDeps = ({
	filePath,
	devDependencies,
}: {
	filePath: string;
	devDependencies: string[];
}): string[] => {
	const content = fs.readFileSync(filePath, "utf8");
	const foundDevDeps: string[] = [];

	devDependencies.forEach((dep) => {
		// Check for different import syntaxes
		const importPatterns = [
			`import .* from ['"]${dep}['"]`,
			`import ['"]${dep}['"]`,
			`require\\(['"]${dep}['"]\\)`,
		];

		importPatterns.forEach((pattern) => {
			if (new RegExp(pattern).test(content)) {
				foundDevDeps.push(dep);
			}
		});
	});

	return foundDevDeps;
};

describe("Source code dependency checks", () => {
	it("should not use devDependencies in src directory", () => {
		const srcPath = path.join(webappDir, "src");
		const srcFiles = getAllFiles({ dirPath: srcPath });
		const violations: {
			file: string;
			deps: string[];
		}[] = [];

		srcFiles.forEach((file) => {
			const foundDevDeps = checkFileForDevDeps({
				filePath: file,
				devDependencies,
			});

			if (foundDevDeps.length > 0) {
				violations.push({
					file: path.relative(webappDir, file),
					deps: foundDevDeps,
				});
			}
		});

		if (violations.length > 0) {
			const errorMessage = violations
				.map(({ file, deps }) => `${file} imports devDependencies: ${deps.join(", ")}`)
				.join("\n");
			throw new Error(`Found devDependencies in src directory:\n${errorMessage}`);
		}

		expect(violations).toHaveLength(0);
	});
});
