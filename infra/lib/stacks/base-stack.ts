import { KubectlV36Layer } from "@aws-cdk/lambda-layer-kubectl-v36";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as eks from "aws-cdk-lib/aws-eks";
import * as iam from "aws-cdk-lib/aws-iam";
import * as rds from "aws-cdk-lib/aws-rds";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
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
      amiType: eks.NodegroupAmiType[config.nodeAmiType],
      instanceTypes: [new ec2.InstanceType(config.nodeInstanceType)],
      minSize: 1,
      desiredSize: 2,
      maxSize: 3,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });
    const dataPlaneNamespace = new eks.KubernetesManifest(
      this,
      "DataPlaneNamespace",
      {
        cluster,
        overwrite: true,
        manifest: [
          {
            apiVersion: "v1",
            kind: "Namespace",
            metadata: { name: "dwlle" },
          },
        ],
      },
    );
    const dataPlaneRbac = new eks.KubernetesManifest(this, "DataPlaneRbac", {
      cluster,
      overwrite: true,
      manifest: [
        {
          apiVersion: "rbac.authorization.k8s.io/v1",
          kind: "Role",
          metadata: { name: "dwlle-deployer", namespace: "dwlle" },
          rules: [
            {
              apiGroups: [""],
              resources: [
                "configmaps",
                "secrets",
                "serviceaccounts",
                "services",
              ],
              verbs: ["get", "list", "watch", "create", "update", "patch"],
            },
            {
              apiGroups: [""],
              resources: ["pods"],
              verbs: ["get", "list", "watch"],
            },
            {
              apiGroups: [""],
              resources: ["pods/log"],
              verbs: ["get"],
            },
            {
              apiGroups: [""],
              resources: ["pods/exec", "pods/portforward"],
              verbs: ["create"],
            },
            {
              apiGroups: ["apps"],
              resources: ["deployments"],
              verbs: ["get", "list", "watch", "create", "update", "patch"],
            },
            {
              apiGroups: ["batch"],
              resources: ["jobs"],
              verbs: [
                "get",
                "list",
                "watch",
                "create",
                "update",
                "patch",
                "delete",
              ],
            },
          ],
        },
        {
          apiVersion: "rbac.authorization.k8s.io/v1",
          kind: "RoleBinding",
          metadata: { name: "dwlle-deployers", namespace: "dwlle" },
          subjects: [
            {
              kind: "Group",
              name: "dwlle-deployers",
              apiGroup: "rbac.authorization.k8s.io",
            },
          ],
          roleRef: {
            kind: "Role",
            name: "dwlle-deployer",
            apiGroup: "rbac.authorization.k8s.io",
          },
        },
      ],
    });
    dataPlaneRbac.node.addDependency(dataPlaneNamespace);

    const dataPlaneRole = new iam.Role(this, "DataPlaneRole", {
      assumedBy: new iam.ServicePrincipal(`pods.eks.${cdk.Aws.URL_SUFFIX}`),
    });
    dataPlaneRole.assumeRolePolicy?.addStatements(
      new iam.PolicyStatement({
        actions: ["sts:TagSession"],
        principals: [
          new iam.ServicePrincipal(`pods.eks.${cdk.Aws.URL_SUFFIX}`),
        ],
      }),
    );
    artifactsBucket.grantRead(dataPlaneRole);
    const storageRole = new iam.Role(this, "IcebergStorageRole", {
      assumedBy: new iam.ArnPrincipal(dataPlaneRole.roleArn),
    });
    storageRole.assumeRolePolicy?.addStatements(
      new iam.PolicyStatement({
        actions: ["sts:TagSession"],
        principals: [new iam.ArnPrincipal(dataPlaneRole.roleArn)],
      }),
    );
    dataBucket.grantReadWrite(storageRole);
    dataPlaneRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole", "sts:TagSession"],
        resources: [storageRole.roleArn],
      }),
    );
    const podIdentityAddon = new eks.CfnAddon(this, "PodIdentityAddon", {
      addonName: "eks-pod-identity-agent",
      clusterName: cluster.clusterName,
      resolveConflicts: "OVERWRITE",
    });
    const podIdentityAssociation = new eks.CfnPodIdentityAssociation(
      this,
      "DataPlanePodIdentityAssociation",
      {
        clusterName: cluster.clusterName,
        namespace: "dwlle",
        serviceAccount: "data-plane",
        roleArn: dataPlaneRole.roleArn,
      },
    );
    podIdentityAssociation.node.addDependency(podIdentityAddon);

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

    const database = new rds.DatabaseInstance(this, "Database", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.of(config.rdsEngineVersion, "16"),
      }),
      instanceType: new ec2.InstanceType(config.rdsInstanceClass),
      databaseName: "dolphinscheduler",
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

    const keycloakAdminSecret = new secretsmanager.Secret(
      this,
      "KeycloakAdminSecret",
      {
        generateSecretString: {
          secretStringTemplate: JSON.stringify({ username: "admin" }),
          generateStringKey: "password",
          excludePunctuation: true,
        },
        removalPolicy,
      },
    );
    const keycloakAlphaUserSecret = new secretsmanager.Secret(
      this,
      "KeycloakAlphaUserSecret",
      {
        generateSecretString: {
          secretStringTemplate: JSON.stringify({ username: "alpha-admin" }),
          generateStringKey: "password",
          excludePunctuation: true,
        },
        removalPolicy,
      },
    );

    const bastionRole = new iam.Role(this, "BastionRole", {
      assumedBy: new iam.ServicePrincipal(`ec2.${cdk.Aws.URL_SUFFIX}`),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore",
        ),
      ],
    });
    artifactsBucket.grantRead(bastionRole);
    if (database.secret) {
      database.secret.grantRead(bastionRole);
    }
    keycloakAdminSecret.grantRead(bastionRole);
    keycloakAlphaUserSecret.grantRead(bastionRole);
    bastionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["eks:DescribeCluster"],
        resources: [cluster.clusterArn],
      }),
    );
    cluster.awsAuth.addRoleMapping(bastionRole, {
      groups: ["dwlle-deployers"],
    });

    const bastionSecurityGroup = new ec2.SecurityGroup(
      this,
      "BastionSecurityGroup",
      { vpc },
    );
    cluster.clusterSecurityGroup.addIngressRule(
      bastionSecurityGroup,
      ec2.Port.tcp(443),
      "Allow private Kubernetes API access from the SSM bastion",
    );
    databaseSecurityGroup.addIngressRule(
      bastionSecurityGroup,
      ec2.Port.tcp(5432),
      "Allow PostgreSQL validation from the SSM bastion",
    );

    const bastion = new ec2.Instance(this, "Bastion", {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      instanceType: new ec2.InstanceType(config.bastionInstanceType),
      machineImage: ec2.MachineImage.genericLinux({
        [config.region]: config.bastionAmiId,
      }),
      role: bastionRole,
      securityGroup: bastionSecurityGroup,
      associatePublicIpAddress: false,
      requireImdsv2: true,
    });

    new cdk.CfnOutput(this, "ArtifactsBucketName", {
      value: artifactsBucket.bucketName,
    });
    new cdk.CfnOutput(this, "DataBucketName", { value: dataBucket.bucketName });
    new cdk.CfnOutput(this, "RepositoryName", {
      value: repository.repositoryName,
    });
    new cdk.CfnOutput(this, "ClusterName", { value: cluster.clusterName });
    new cdk.CfnOutput(this, "BastionInstanceId", {
      value: bastion.instanceId,
    });
    new cdk.CfnOutput(this, "DatabaseSecretArn", {
      value: database.secret?.secretArn ?? "",
    });
    new cdk.CfnOutput(this, "KeycloakAdminSecretArn", {
      value: keycloakAdminSecret.secretArn,
    });
    new cdk.CfnOutput(this, "KeycloakAlphaUserSecretArn", {
      value: keycloakAlphaUserSecret.secretArn,
    });
    new cdk.CfnOutput(this, "StorageRoleArn", { value: storageRole.roleArn });
    cdk.Tags.of(this).add("Project", "dwlle");
    cdk.Tags.of(this).add("Env", config.envName);
  }
}
