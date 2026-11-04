import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "../../..");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("data plane deployment inputs", () => {
  test("manifests use pinned ECR images and no sensitive literals", () => {
    for (const name of ["dolphinscheduler", "polaris", "trino", "seatunnel"]) {
      const manifest = read(`deploy/aws/manifests/${name}.yaml`);
      expect(manifest).toContain("__REPOSITORY_URI__");
      expect(manifest).not.toContain(":latest");
      expect(manifest).not.toContain("arn:aws:");
      expect(manifest).not.toContain("amazonaws.com");
    }
  });

  test("remote deployment configures credential vending without public downloads", () => {
    const polaris = read("deploy/aws/manifests/polaris.yaml");
    const remote = read("deploy/aws/remote-data-plane.sh");
    expect(polaris).toContain('"roleArn":"__STORAGE_ROLE_ARN__"');
    expect(remote).toContain("STORAGE_ROLE_ARN");
    expect(remote).not.toContain("https://");
    expect(remote).not.toContain("docker pull");
    expect(remote).not.toContain("pip install");
    expect(remote).not.toContain("wget ");
  });

  test("artifact manifest contains versions and SHA256 values", () => {
    const manifest = JSON.parse(read("versions.json")) as {
      artifacts: { version: string; sha256: string }[];
    };
    for (const artifact of manifest.artifacts) {
      expect(artifact.version).not.toBe("latest");
      expect(artifact.sha256).toMatch(/^[a-f0-9]{64}$/);
    }
  });
});
