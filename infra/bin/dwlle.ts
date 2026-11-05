#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";

import { loadConfig } from "../lib/config/load";
import { DwlleBaseStack } from "../lib/stacks/base-stack";

const app = new cdk.App();
const envName = app.node.tryGetContext("env") as string | undefined;

if (!envName) {
  throw new Error("Context env is required, for example: -c env=dev-global");
}

const config = loadConfig(envName);
new DwlleBaseStack(app, `Dwlle-${config.envName}-DataPlane`, config);
app.synth();
