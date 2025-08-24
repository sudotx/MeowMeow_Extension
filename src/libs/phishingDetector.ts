import levenshtein from "fast-levenshtein";
import { allowedDomainsDb, blockedDomainsDb, initialUpdateDone } from "./db";

const DEFAULT_LEVENSHTEIN_TOLERANCE = 3;

interface CheckDomainResult {
	result: boolean;
	type: "allowed" | "blocked" | "fuzzy" | "unknown";
	extra?: string;
}

const confusable_characters: { [key: string]: string[] } = {
	'a': ['@', 'à', 'á', 'â', 'ã', 'ä', 'å'],
	'b': ['8'],
	'c': ['ç', '¢', '©'],
	'e': ['3', '€', 'è', 'é', 'ê', 'ë'],
	'i': ['1', 'l', '!', '|', 'ì', 'í', 'î', 'ï'],
	'l': ['1', 'i', '|'],
	'o': ['0', 'ò', 'ó', 'ô', 'õ', 'ö'],
	's': ['5', '§'],
	'u': ['ù', 'ú', 'û', 'ü'],
	'z': ['2'],
	'g': ['9'],
	'q': ['9'],
};

let domainCheckCache = new Map<string, CheckDomainResult>();
let lastCacheClear = Date.now();

function clearDomainCheckCache() {
	const now = Date.now();
	if (now - lastCacheClear > 1000 * 60 * 60) { // clear cache every hour
		domainCheckCache = new Map();
		lastCacheClear = now;
	}
}

const defaultCheckResponse: CheckDomainResult = { result: false, type: "unknown" };

function isConfusable(s1: string, s2: string): boolean {
	if (s1.length !== s2.length) {
		return false;
	}

	for (let i = 0; i < s1.length; i++) {
		const char1 = s1[i];
		const char2 = s2[i];

		if (char1 !== char2) {
			const confusable = confusable_characters[char1];
			if (!confusable || !confusable.includes(char2)) {
				return false;
			}
		}
	}

	return true;
}

function normalizeDomain(domain: string): string {
    return domain.toLowerCase().replace(/^www\./, "");
}

function _checkDomain(domain: string): CheckDomainResult {
    const normalizedDomain = normalizeDomain(domain);
	const subDomainsToCheck: string[] = [];
	const parts = normalizedDomain.split('.');
	for (let i = 0; i < parts.length - 1; i++) {
		subDomainsToCheck.push(parts.slice(i).join('.'));
	}

    // Check for exact matches on blacklists and whitelists first
	for (const subDomain of subDomainsToCheck) {
		if (allowedDomainsDb.data.has(subDomain)) {
			return { result: false, type: "allowed" };
		}
		if (blockedDomainsDb.data.has(subDomain)) {
			return { result: true, type: "blocked" };
		}
	}

    // Then check for fuzzy/confusable matches against the whitelist
    for (const goodDomain of allowedDomainsDb.data) {
        if (isConfusable(goodDomain, normalizedDomain)) {
            return { result: true, type: "fuzzy", extra: goodDomain };
        }
        const distance = levenshtein.get(goodDomain, normalizedDomain);
        if (distance > 0 && distance <= DEFAULT_LEVENSHTEIN_TOLERANCE) {
            return { result: true, type: "fuzzy", extra: goodDomain };
        }
    }

	return defaultCheckResponse;
}

export async function checkDomain(domain: string): Promise<CheckDomainResult> {
	await initialUpdateDone;
	if (!domain || !allowedDomainsDb.data.size) return defaultCheckResponse;

	clearDomainCheckCache();
	if (!domainCheckCache.has(domain)) {
		domainCheckCache.set(domain, _checkDomain(domain));
	}

	return domainCheckCache.get(domain)!;
}
