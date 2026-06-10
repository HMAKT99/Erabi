import { createDb as createRegistryDb, defaultVerifiers, RegistryService } from "@erabi/registry";
import { createDb } from "./db/client.js";
import { registryDirectory } from "./directory.js";
import { buildServer } from "./server.js";
import { ExchangeService } from "./service.js";

export * from "./auction.js";
export * from "./bus.js";
export * from "./db/client.js";
export * from "./db/schema.js";
export * from "./directory.js";
export * from "./errors.js";
export * from "./filter.js";
export * from "./pii.js";
export * from "./server.js";
export * from "./service.js";

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").at(-1)!);

if (isMain) {
  // Reference-node dev mode: an in-process registry backs the directory.
  const port = Number(process.env.EXCHANGE_PORT ?? 4002);
  const baseUrl = process.env.EXCHANGE_BASE_URL ?? `http://localhost:${port}`;
  const registryBaseUrl = process.env.REGISTRY_BASE_URL ?? "http://localhost:4001";
  const registry = new RegistryService({
    db: createRegistryDb(process.env.ERABI_REGISTRY_DB ?? ".data/registry.sqlite"),
    verifiers: defaultVerifiers(),
    nodeId: process.env.ERABI_NODE_ID ?? "erabi-node-dev-1",
    baseUrl: registryBaseUrl,
  });
  const service = new ExchangeService({
    db: createDb(process.env.ERABI_EXCHANGE_DB ?? ".data/exchange.sqlite"),
    directory: registryDirectory(registry),
    nodeId: process.env.ERABI_NODE_ID ?? "erabi-node-dev-1",
    baseUrl,
    registryBaseUrl,
  });
  buildServer(service)
    .listen({ port, host: "0.0.0.0" })
    .then(() => console.log(`exchange listening on ${baseUrl}`))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
