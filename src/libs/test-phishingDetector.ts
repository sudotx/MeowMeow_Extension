import levenshtein from "fast-levenshtein";

const DEFAULT_LEVENSHTEIN_TOLERANCE = 2; // tighten since we only compare to whitelist

interface CheckDomainResult {
	result: boolean;
	type: "allowed" | "blocked" | "fuzzy" | "unknown";
	extra?: string;
}

const defaultCheckResponse: CheckDomainResult = { result: false, type: "unknown" };

let whitelist = new Set<string>();
let blacklist = new Set<string>();

// Normalize domains (strip protocol, www)
export function normalizeDomain(url: string): string {
	return url
		.replace(/^https?:\/\//, "")
		.replace(/^www\./, "")
		.toLowerCase();
}

// Load JSON
export async function loadDomainsFromJson(path: string) {
	const response = await fetch(path);
	const data = await response.json();

	if (data.whitelisted) {
		data.whitelisted.forEach((d: string) => whitelist.add(normalizeDomain(d)));
	}
	if (data.blacklisted) {
		data.blacklisted.forEach((d: string) => blacklist.add(normalizeDomain(d)));
	}
}

loadDomainsFromJson("/safe-urls.json");

// Core check
export function checkDomain(domain: string): CheckDomainResult {
	if (!domain) return defaultCheckResponse;

	const cleanDomain = normalizeDomain(domain);

	// Exact whitelist
	if (whitelist.has(cleanDomain)) {
		return { result: false, type: "allowed" };
	}

	// Exact blacklist
	if (blacklist.has(cleanDomain)) {
		return { result: true, type: "blocked" };
	}

	// Fuzzy: check if domain is close to a whitelisted one
	for (const goodDomain of whitelist) {
		const distance = levenshtein.get(goodDomain, cleanDomain);
		if (distance <= DEFAULT_LEVENSHTEIN_TOLERANCE) {
			return { result: true, type: "fuzzy", extra: goodDomain };
		}
	}

	return defaultCheckResponse;
}
