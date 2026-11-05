import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "../../..");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("data plane deployment inputs", () => {
  test("manifests use immutable ECR images and no sensitive literals", () => {
    for (const name of ["dolphinscheduler", "polaris", "trino", "seatunnel"]) {
      const manifest = read(`deploy/aws/manifests/${name}.yaml`);
      expect(manifest).toMatch(/__REPOSITORY_URI__@__[A-Z]+_IMAGE_DIGEST__/);
      expect(manifest).not.toContain(":latest");
      expect(manifest).not.toContain("arn:aws:");
      expect(manifest).not.toContain("amazonaws.com");
    }
  });

  test("deployment entry points require local verified artifacts without public fallbacks", () => {
    const deploy = read("deploy/aws/deploy-data-plane.sh");
    const remote = read("deploy/aws/remote-data-plane.sh");
    for (const script of [deploy, remote]) {
      expect(script).not.toContain("docker pull");
      expect(script).not.toContain("pip install");
      expect(script).not.toContain("wget ");
      expect(script).not.toContain("curl ");
    }
    expect(deploy).toContain('stage-artifacts" --verify-only');
    expect(deploy).toContain('stage-images" --verify-only');
    expect(deploy).toContain("docker load");
    expect(remote).not.toContain("https://");
  });

  test("configuration, secret, and image changes reach running pods", () => {
    const remote = read("deploy/aws/remote-data-plane.sh");
    const expectedAnnotations = new Map([
      ["dolphinscheduler", ["__DS_CONFIG_SHA256__", "__RDS_SECRET_SHA256__"]],
      ["polaris", ["__POLARIS_CONFIG_SHA256__", "__POLARIS_AUTH_SHA256__"]],
      ["trino", ["__TRINO_CONFIG_SHA256__", "__POLARIS_AUTH_SHA256__"]],
    ]);
    for (const [name, annotations] of expectedAnnotations) {
      const manifest = read(`deploy/aws/manifests/${name}.yaml`);
      for (const annotation of annotations) {
        expect(manifest).toContain(annotation);
        expect(remote).toContain(annotation);
      }
    }
    expect(remote).toContain("sha256sum");
    expect(remote).not.toContain("manifests/namespace.yaml");
    expect(remote.indexOf("kubectl delete job polaris-setup")).toBeLessThan(
      remote.indexOf("manifests/service-account.yaml"),
    );
  });

  test("artifact manifest contains pinned versions and SHA256 values", () => {
    const manifest = JSON.parse(read("versions.json")) as {
      artifacts: { version: string; sha256: string }[];
      images: { version: string; digest: string; sha256: string }[];
    };
    for (const artifact of manifest.artifacts) {
      expect(artifact.version).not.toBe("latest");
      expect(artifact.sha256).toMatch(/^[a-f0-9]{64}$/);
    }
    for (const image of manifest.images) {
      expect(image.version).not.toBe("latest");
      expect(image.digest).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(image.sha256).toMatch(/^[a-f0-9]{64}$/);
    }
  });
});
