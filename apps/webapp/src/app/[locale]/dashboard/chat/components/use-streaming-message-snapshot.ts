"use client";

import { useCallback, useRef } from "react";

import type { BaseChatUIMessage } from "@starter/server";

const areStreamingSnapshotValuesEqual = (left: unknown, right: unknown): boolean => {
	if (Object.is(left, right)) {
		return true;
	}

	if (left == null || right == null || typeof left !== "object" || typeof right !== "object") {
		return false;
	}

	if (Array.isArray(left) || Array.isArray(right)) {
		if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
			return false;
		}

		return left.every((value, index) => areStreamingSnapshotValuesEqual(value, right[index]));
	}

	const leftRecord = left as Record<string, unknown>;
	const rightRecord = right as Record<string, unknown>;
	const leftKeys = Object.keys(leftRecord);
	const rightKeys = Object.keys(rightRecord);

	if (leftKeys.length !== rightKeys.length) {
		return false;
	}

	return leftKeys.every(
		(key) => key in rightRecord && areStreamingSnapshotValuesEqual(leftRecord[key], rightRecord[key])
	);
};

const snapshotStreamingValue = <T>(nextValue: T, previousValue: T | undefined): T => {
	if (previousValue !== undefined && areStreamingSnapshotValuesEqual(previousValue, nextValue)) {
		return previousValue;
	}

	return structuredClone(nextValue);
};

const createStreamingMessageSnapshot = (
	message: BaseChatUIMessage,
	previousSnapshot?: BaseChatUIMessage
): BaseChatUIMessage => {
	const nextMetadata =
		message.metadata === undefined
			? undefined
			: snapshotStreamingValue(message.metadata, previousSnapshot?.metadata);
	const nextParts = message.parts.map((part, index) => snapshotStreamingValue(part, previousSnapshot?.parts[index]));

	if (
		previousSnapshot &&
		previousSnapshot.id === message.id &&
		previousSnapshot.role === message.role &&
		previousSnapshot.metadata === nextMetadata &&
		previousSnapshot.parts.length === nextParts.length &&
		previousSnapshot.parts.every((part, index) => part === nextParts[index])
	) {
		return previousSnapshot;
	}

	return {
		...message,
		metadata: nextMetadata,
		parts: nextParts,
	};
};

export const useStreamingMessageSnapshot = () => {
	const streamingSnapshotRef = useRef<BaseChatUIMessage | undefined>(undefined);

	return useCallback((message?: BaseChatUIMessage) => {
		if (!message) {
			streamingSnapshotRef.current = undefined;
			return undefined;
		}

		const nextStreamingMessage = createStreamingMessageSnapshot(message, streamingSnapshotRef.current);
		streamingSnapshotRef.current = nextStreamingMessage;
		return nextStreamingMessage;
	}, []);
};
