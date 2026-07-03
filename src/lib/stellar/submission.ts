import { Horizon, Keypair, Memo, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import {
  StellarNetworkConfig,
  StellarProofKind,
  StellarProofRecord,
  StellarSubmissionResult,
} from "./types";

const DEFAULT_TESTNET_HORIZON = "https://horizon-testnet.stellar.org";
const DEFAULT_MAINNET_HORIZON = "https://horizon.stellar.org";
const DEFAULT_FUTURENET_HORIZON = "https://horizon-futurenet.stellar.org";

export function getStellarNetworkConfig(): StellarNetworkConfig {
  const networkName =
    (process.env.STELLAR_NETWORK || "testnet").toLowerCase() as StellarNetworkConfig["networkName"];

  const networkPassphrase =
    process.env.STELLAR_NETWORK_PASSPHRASE ||
    (networkName === "mainnet"
      ? Networks.PUBLIC
      : networkName === "futurenet"
        ? Networks.FUTURENET
        : Networks.TESTNET);

  const horizonUrl =
    process.env.STELLAR_HORIZON_URL ||
    (networkName === "mainnet"
      ? DEFAULT_MAINNET_HORIZON
      : networkName === "futurenet"
        ? DEFAULT_FUTURENET_HORIZON
        : DEFAULT_TESTNET_HORIZON);

  return {
    networkName,
    networkPassphrase,
    horizonUrl,
    issuerPublicKey: process.env.STELLAR_ISSUER_PUBLIC_KEY,
    issuerSecretKey: process.env.STELLAR_ISSUER_SECRET_KEY,
  };
}

export function isStellarSubmissionEnabled(): boolean {
  const config = getStellarNetworkConfig();
  return Boolean(config.issuerSecretKey && config.issuerSecretKey.trim());
}

export function buildAnchorDataKey(kind: StellarProofKind, proofId: string): string {
  const kindCode =
    kind === "counsellor_credential"
      ? "cc"
      : kind === "health_passport"
        ? "hp"
        : "wr";
  const key = `sc:${kindCode}:${proofId.slice(0, 52)}`;
  return key.slice(0, 64);
}

function buildAnchorMemo(proofId: string): Memo {
  const memoText = `SC:${proofId.slice(0, 20)}`.slice(0, 28);
  return Memo.text(memoText);
}

export async function submitProofToStellar(
  proof: StellarProofRecord,
): Promise<StellarSubmissionResult> {
  const config = getStellarNetworkConfig();
  const anchorKey = buildAnchorDataKey(proof.kind, proof.proofId);

  if (!config.issuerSecretKey) {
    return {
      submitted: false,
      dryRun: true,
      network: config.networkName,
      proof,
      anchorKey,
      error:
        "STELLAR_ISSUER_SECRET_KEY is not configured. Proof generated in dry-run mode.",
    };
  }

  const keypair = Keypair.fromSecret(config.issuerSecretKey);
  const server = new Horizon.Server(config.horizonUrl);

  try {
    const account = await server.loadAccount(keypair.publicKey());
    const timeBounds = {
      minTime: Math.floor(Date.now() / 1000).toString(),
      maxTime: (Math.floor(Date.now() / 1000) + 300).toString(),
    };

    const transaction = new TransactionBuilder(account, {
      fee: (await server.fetchBaseFee()).toString(),
      networkPassphrase: config.networkPassphrase,
      timebounds: timeBounds,
    })
      .addOperation(
        Operation.manageData({
          name: anchorKey,
          value: Buffer.from(proof.anchor.payloadHash, "utf8"),
        }),
      )
      .addMemo(buildAnchorMemo(proof.proofId))
      .build();

    transaction.sign(keypair);

    const response = await server.submitTransaction(transaction);

    return {
      submitted: true,
      dryRun: false,
      network: config.networkName,
      proof: {
        ...proof,
        status: "anchored",
        anchor: {
          ...proof.anchor,
          metadata: {
            ...proof.anchor.metadata,
            networkPassphrase: config.networkPassphrase,
            txHash: response.hash,
            ledger: response.ledger,
            memo: `${anchorKey}`,
            submittedAt: new Date().toISOString(),
          },
        },
        updatedAt: new Date().toISOString(),
      },
      transactionHash: response.hash,
      ledger: response.ledger,
      anchorKey,
      horizonResponse: response as unknown as Record<string, unknown>,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Stellar submission error";
    return {
      submitted: false,
      dryRun: false,
      network: config.networkName,
      proof,
      anchorKey,
      error: message,
    };
  }
}
