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
  readonly rdsInstanceClass: string;
  readonly removalPolicy: RemovalPolicyName;
}
