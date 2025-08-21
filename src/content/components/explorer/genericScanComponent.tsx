import { EXPLORER_CHAIN_PREFIX_MAP } from "../../../libs/constants";
import { type EtherscanAlikeExplorerConfig, injectPrice } from "../etherscanInjectPrice";
import { injectTags } from "../new/injectPrice";
import { hideSpamTxns } from "../etherscanHideScamTxn";

export default function injectExplorerComponent() {
	let name = new URL(document.baseURI).hostname;
	let prefix = EXPLORER_CHAIN_PREFIX_MAP[name];
	if (!prefix) return;

	const config: EtherscanAlikeExplorerConfig = {
		name,
		chainPrefix: prefix + ':',
	};

	injectPrice(config);
	injectTags();
	hideSpamTxns(config);
}