import { EC2, LaunchTemplateVersion } from "@aws-sdk/client-ec2";

export interface LaunchTemplateNameVersion {
  name: string;
  version: string;
}

let cache: Record<string, LaunchTemplateVersion> = {};

export async function getLaunchTemplateVersions(
  region: string,
  templates: LaunchTemplateNameVersion[]
): Promise<Record<string, LaunchTemplateVersion>> {
  const results: Record<string, LaunchTemplateVersion> = {};

  const templatesToGet = templates.filter(
    (template) =>
      cache[launchTemplateKey(template.name, template.version)] === undefined
  );

  templates
    .filter(
      (template) =>
        cache[launchTemplateKey(template.name, template.version)] !== undefined
    )
    .forEach((template) => {
      const key = launchTemplateKey(template.name, template.version);
      results[key] = cache[key];
    });

  if (templatesToGet.length > 0) {
    const ec2 = new EC2({ region });
    for (const template of templatesToGet) {
      const response = await ec2.describeLaunchTemplateVersions({
        LaunchTemplateName: template.name,
        Versions: [template.version.toString()],
      });

      const templateVersion = response.LaunchTemplateVersions![0];
      const key = launchTemplateKey(template.name, template.version);

      cache[key] = templateVersion;
      results[key] = templateVersion;
    }
  }
  return results;
}

function launchTemplateKey(name: string, version: number | string) {
  return `${name}:${version.toString()}`;
}
