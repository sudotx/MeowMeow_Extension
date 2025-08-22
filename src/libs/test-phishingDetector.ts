import levenshtein from "fast-levenshtein";

const DEFAULT_LEVENSHTEIN_TOLERANCE = 3;

interface CheckDomainResult {
	result: boolean;
	type: "allowed" | "blocked" | "fuzzy" | "unknown";
	extra?: string;
}

const defaultCheckResponse: CheckDomainResult = { result: false, type: "unknown" };

let whitelist = new Set<string>();
let blacklist = new Set<string>();

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


export function normalizeDomain(url: string): string {
	try {
		const u = new URL(url);
		return u.hostname.toLowerCase().replace(/^www\./, "");
	} catch {
		// fallback for plain domains without protocol
		return url.replace(/^www\./, "").toLowerCase();
	}
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
        if (isConfusable(goodDomain, cleanDomain)) {
            return { result: true, type: "fuzzy", extra: goodDomain };
        }
		const distance = levenshtein.get(goodDomain, cleanDomain);
		if (distance <= DEFAULT_LEVENSHTEIN_TOLERANCE) {
			return { result: true, type: "fuzzy", extra: goodDomain };
		}
	}

	return defaultCheckResponse;
}
