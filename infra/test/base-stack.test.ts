import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";

import { loadConfig } from "../lib/config/load";
import { DwlleBaseStack } from "../lib/stacks/base-stack";

describe("DwlleBaseStack", () => {
  for (const envName of ["dev-global", "dev-cn"]) {
    test(`${envName} applies security and partition constraints`, () => {
      const app = new cdk.App();
      const config = loadConfig(envName);
      const stack = new DwlleBaseStack(app, `Dwlle-${envName}-Base`, config);
      const template = Template.fromStack(stack);
      const json = JSON.stringify(template.toJSON());

      expect(json).not.toContain("arn:aws:");

      template.hasResourceProperties("AWS::S3::Bucket", {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });
      template.hasResourceProperties("AWS::RDS::DBInstance", {
        PubliclyAccessible: false,
        StorageEncrypted: true,
        DeletionProtection: true,
        EngineVersion: config.rdsEngineVersion,
        DBName: "dolphinscheduler",
      });
      template.hasResourceProperties("AWS::EC2::Instance", {
        ImageId: config.bastionAmiId,
        InstanceType: config.bastionInstanceType,
        NetworkInterfaces: [{ AssociatePublicIpAddress: false }],
      });
      template.hasResourceProperties("AWS::EKS::Nodegroup", {
        AmiType: config.nodeAmiType,
      });

      const ingressResources = template.findResources(
        "AWS::EC2::SecurityGroupIngress",
      );
      for (const resource of Object.values(ingressResources)) {
        const properties = resource.Properties;
        expect(properties.CidrIp).not.toBe("0.0.0.0/0");
        expect(properties.CidrIpv6).not.toBe("::/0");
      }
    });
  }
});
