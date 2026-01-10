import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { ROOTSTOCK_TESTNET } from "./constants";

export const config = createConfig({
  chains: [ROOTSTOCK_TESTNET],
  connectors: [injected()],
  transports: { [ROOTSTOCK_TESTNET.id]: http(ROOTSTOCK_TESTNET.rpcUrls.default.http[0]) },
});