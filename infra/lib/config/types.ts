export type Partition = "aws" | "aws-cn";
export type RemovalPolicyName = "retain" | "destroy";

export interface EnvConfig {
  readonly envName: string;
  readonly partition: Partition;
  readonly region: string;
  readonly vpcCidr: string;
  readonly availabilityZones: string[];
  readonly eksVersion: string;
  readonly nodeInstanceType: string;
  readonly nodeAmiType: "AL2023_ARM_64_STANDARD";
  readonly rdsInstanceClass: string;
  readonly rdsEngineVersion: string;
  readonly bastionAmiId: string;
  readonly bastionInstanceType: string;
  readonly removalPolicy: RemovalPolicyName;
}
