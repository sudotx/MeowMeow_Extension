import levenshtein from "fast-levenshtein";
import { allowedDomainsDb, blockedDomainsDb, fuzzyDomainsDb, initialUpdateDone } from "./db";

const DEFAULT_LEVENSHTEIN_TOLERANCE = 3;

interface CheckDomainResult {
	result: boolean;
	type: "allowed" | "blocked" | "fuzzy" | "unknown";
	extra?: string;
}

let domainCheckCache = new Map<string, CheckDomainResult>();
let lastCacheClear = Date.now();

export function clearDomainCheckCache() {
	const now = Date.now();
	if (now - lastCacheClear > 1000 * 60 * 60) { // clear cache every hour
		domainCheckCache = new Map();
		lastCacheClear = now;
	}
}

const defaultCheckResponse = { result: false, type: "unknown" } as CheckDomainResult;

export async function checkDomain(domain: string): Promise<CheckDomainResult> {
	await initialUpdateDone;
	if (!domain || !allowedDomainsDb.data.size) return defaultCheckResponse;

	clearDomainCheckCache();
	if (!domainCheckCache.has(domain)) {
		domainCheckCache.set(domain, _checkDomain(domain));
	}

	return domainCheckCache.get(domain)!;
}


function _checkDomain(domain: string): CheckDomainResult {
	const subDomainsToCheck: string[] = [];
	const parts = domain.split('.');
	for (let i = 0; i < parts.length - 1; i++) {
		subDomainsToCheck.push(parts.slice(i).join('.'));
	}

	for (const subDomain of subDomainsToCheck) {
		if (allowedDomainsDb.data.has(subDomain)) {
			return { result: false, type: "allowed" };
		}
		if (blockedDomainsDb.data.has(subDomain)) {
			return { result: true, type: "blocked" };
		}
	}

	let fuzzyResult: CheckDomainResult | undefined
	for (const fuzzyDomain of fuzzyDomainsDb.data) {
		if (fuzzyResult) break;
		for (const subDomain of subDomainsToCheck) {
			const distance = levenshtein.get(fuzzyDomain, subDomain);
			if (distance <= DEFAULT_LEVENSHTEIN_TOLERANCE) {
				console.log("fuzzy match", { subDomain, fuzzyDomain, distance });
				fuzzyResult = { result: true, type: "fuzzy", extra: fuzzyDomain };
				break;
			}
		}
	}

	return fuzzyResult ?? defaultCheckResponse
}