import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { EnvConfig } from "./types";

export function loadConfig(envName: string): EnvConfig {
  const config = JSON.parse(
    readFileSync(join(process.cwd(), "config", `${envName}.json`), "utf8"),
  ) as EnvConfig;

  if (
    !config.envName ||
    !config.partition ||
    !config.region ||
    !config.vpcCidr
  ) {
    throw new Error("Missing required environment configuration");
  }
  if (config.availabilityZones.length < 2) {
    throw new Error("At least two availability zones are required");
  }
  if (config.availabilityZones.some((az) => !az.startsWith(config.region))) {
    throw new Error("Availability zone must belong to the configured region");
  }
  return config;
}
