import { createDb } from "./db/client.js";
import { buildServer } from "./server.js";
import { RegistryService } from "./service.js";
import { defaultVerifiers } from "./verifiers.js";

export * from "./db/client.js";
export * from "./db/schema.js";
export * from "./errors.js";
export * from "./server.js";
export * from "./service.js";
export * from "./verifiers.js";

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").at(-1)!);

if (isMain) {
  const port = Number(process.env.REGISTRY_PORT ?? 4001);
  const baseUrl = process.env.REGISTRY_BASE_URL ?? `http://localhost:${port}`;
  const service = new RegistryService({
    db: createDb(process.env.ERABI_REGISTRY_DB ?? ".data/registry.sqlite"),
    verifiers: defaultVerifiers(),
    nodeId: process.env.ERABI_NODE_ID ?? "erabi-node-dev-1",
    baseUrl,
  });
  const app = buildServer(service);
  app
    .listen({ port, host: "0.0.0.0" })
    .then(() => console.log(`registry listening on ${baseUrl}`))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
