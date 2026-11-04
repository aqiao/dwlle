import { KubectlV36Layer } from "@aws-cdk/lambda-layer-kubectl-v36";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as eks from "aws-cdk-lib/aws-eks";
import * as rds from "aws-cdk-lib/aws-rds";
import * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";

import type { EnvConfig } from "../config/types";

export class DwlleBaseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, config: EnvConfig) {
    super(scope, id, {
      env: {
        region: config.region,
      },
    });

    const removalPolicy =
      config.removalPolicy === "destroy"
        ? cdk.RemovalPolicy.DESTROY
        : cdk.RemovalPolicy.RETAIN;

    const vpc = new ec2.Vpc(this, "Vpc", {
      ipAddresses: ec2.IpAddresses.cidr(config.vpcCidr),
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        { name: "Public", subnetType: ec2.SubnetType.PUBLIC },
        { name: "Private", subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      ],
    });

    const artifactsBucket = new s3.Bucket(this, "ArtifactsBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy,
      versioned: true,
    });

    const dataBucket = new s3.Bucket(this, "DataBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy,
      versioned: true,
    });

    const repository = new ecr.Repository(this, "Repository", {
      imageScanOnPush: true,
      lifecycleRules: [{ maxImageCount: 20 }],
      removalPolicy,
    });

    const cluster = new eks.Cluster(this, "Cluster", {
      kubectlLayer: new KubectlV36Layer(this, "KubectlLayer"),
      version: eks.KubernetesVersion.of(config.eksVersion),
      vpc,
      endpointAccess: eks.EndpointAccess.PRIVATE,
      defaultCapacity: 0,
    });

    cluster.addNodegroupCapacity("Workers", {
      instanceTypes: [new ec2.InstanceType(config.nodeInstanceType)],
      minSize: 1,
      desiredSize: 2,
      maxSize: 3,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    const databaseSecurityGroup = new ec2.SecurityGroup(
      this,
      "DatabaseSecurityGroup",
      { vpc },
    );
    databaseSecurityGroup.addIngressRule(
      cluster.clusterSecurityGroup,
      ec2.Port.tcp(5432),
      "Allow PostgreSQL access from the data plane",
    );

    new rds.DatabaseInstance(this, "Database", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_4,
      }),
      instanceType: new ec2.InstanceType(config.rdsInstanceClass),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [databaseSecurityGroup],
      publiclyAccessible: false,
      storageEncrypted: true,
      multiAz: false,
      deletionProtection: true,
      removalPolicy,
      backupRetention: cdk.Duration.days(7),
      deleteAutomatedBackups: false,
      credentials: rds.Credentials.fromGeneratedSecret("dwlleAdmin"),
    });

    new cdk.CfnOutput(this, "ArtifactsBucketName", {
      value: artifactsBucket.bucketName,
    });
    new cdk.CfnOutput(this, "DataBucketName", { value: dataBucket.bucketName });
    new cdk.CfnOutput(this, "RepositoryName", {
      value: repository.repositoryName,
    });
    new cdk.CfnOutput(this, "ClusterName", { value: cluster.clusterName });

    cdk.Tags.of(this).add("Project", "dwlle");
    cdk.Tags.of(this).add("Env", config.envName);
  }
}
