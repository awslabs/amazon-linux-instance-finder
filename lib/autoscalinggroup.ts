import { IdComparer } from "./compare";
import {
  AutoScalingClient,
  AutoScalingGroup,
  LaunchConfiguration,
  paginateDescribeAutoScalingGroups,
  LaunchTemplateOverrides,
  DescribeLaunchConfigurationsCommand,
} from "@aws-sdk/client-auto-scaling";

import {
  LaunchTemplateNameVersion,
  getLaunchTemplateVersions,
} from "./launchtemplate";

import {
  Image,
  LaunchTemplateSpecification,
  LaunchTemplateVersion,
} from "@aws-sdk/client-ec2";
import { getImages, AL1ImageMatcher, resolveImageID } from "./image";

export const Comparers = {
  image_id: IdComparer,
};

export interface AutoScalingGroupRow {
  auto_scaling_group_name: string;
  image_id: string;
  image_description: string;
  launch_configuration_name?: string;
  launch_template_id?: string;
  launch_template_name?: string;
  launch_template_version?: string;
}

const rowCache: Record<string, AutoScalingGroupRow[]> = {};

export async function getAutoScalingGroupRows(
  region: string
): Promise<AutoScalingGroupRow[]> {
  if (rowCache[region] !== undefined) {
    return rowCache[region];
  }

  const autoScalingGroups = await getAutoScalingGroups(region);

  // Batch-load all referenced Launch Templates.
  // Start with Launch Templates that are directly referenced as attributes.
  const templatesToGet: LaunchTemplateNameVersion[] = autoScalingGroups
    .filter((group) => group.LaunchTemplate?.LaunchTemplateName !== undefined)
    .map((group) => {
      return {
        name: group.LaunchTemplate?.LaunchTemplateName!,
        version: group.LaunchTemplate?.Version!,
      };
    });

  // Next, check Mixed Instance policies.
  for (const group of autoScalingGroups) {
    const mixedInstancesPolicy = group.MixedInstancesPolicy;

    if (mixedInstancesPolicy === undefined) continue;

    // First, check for any templates at the top of the Mixed Instance Policy
    if (mixedInstancesPolicy.LaunchTemplate !== undefined) {
      const launchTemplate = mixedInstancesPolicy.LaunchTemplate;
      templatesToGet.push({
        name: launchTemplate.LaunchTemplateSpecification?.LaunchTemplateName!,
        version: launchTemplate.LaunchTemplateSpecification?.Version!,
      });

      // Also check for any launch template overridesQ
      for (const override of launchTemplate.Overrides || []) {
        if (
          override.LaunchTemplateSpecification?.LaunchTemplateName !== undefined
        ) {
          templatesToGet.push({
            name: override.LaunchTemplateSpecification?.LaunchTemplateName,
            version: override.LaunchTemplateSpecification?.Version!,
          });
        }
      }
    }
  }

  const launchTemplateIndex = await getLaunchTemplateVersions(
    region,
    templatesToGet
  );

  // Batch-load all referenced Launch Configurations.
  const launchConfigurationsToGet = autoScalingGroups
    .filter((g) => g.LaunchConfigurationName !== undefined)
    .map((g) => g.LaunchConfigurationName!);

  const launchConfigurationIndex = await getLaunchConfigurations(
    region,
    launchConfigurationsToGet
  );

  // Batch-load all images referenced by the Launch Configurations
  // and Launch Template Versions.
  const imagesToGet: string[] = [];
  for (const name in launchConfigurationIndex) {
    imagesToGet.push(launchConfigurationIndex[name].ImageId!);
  }
  for (const key in launchTemplateIndex) {
    imagesToGet.push(launchTemplateIndex[key].LaunchTemplateData!.ImageId!);
  }
  const imageIndex = await getImages(region, imagesToGet);

  const results: AutoScalingGroupRow[] = [];
  for (const group of autoScalingGroups) {
    if (group.MixedInstancesPolicy !== undefined) {
      for (const override of group.MixedInstancesPolicy.LaunchTemplate
        ?.Overrides ?? []) {
        results.push(
          await buildRow({
            region,
            group,
            launchConfigurationIndex,
            launchTemplateIndex,
            imageIndex,
            overrides: override,
          })
        );
      }
    } else {
      results.push(
        await buildRow({
          region,
          group,
          launchConfigurationIndex,
          launchTemplateIndex,
          imageIndex,
        })
      );
    }
  }
  rowCache[region] = results.filter((result) =>
    AL1ImageMatcher.test(result.image_description)
  );
  return rowCache[region];
}

interface buildRowProps {
  region: string;
  group: AutoScalingGroup;
  launchConfigurationIndex: Record<string, LaunchConfiguration>;
  launchTemplateIndex: Record<string, LaunchTemplateVersion>;
  imageIndex: Record<string, Image>;
  overrides?: LaunchTemplateOverrides;
}

async function buildRow(props: buildRowProps): Promise<AutoScalingGroupRow> {
  const row: Partial<AutoScalingGroupRow> = {
    auto_scaling_group_name: props.group.AutoScalingGroupName!,
  };
  if (props.group.LaunchConfigurationName !== undefined) {
    row.launch_configuration_name = props.group.LaunchConfigurationName;
    row.image_id = await resolveImageID(
      props.region,
      props.launchConfigurationIndex[row.launch_configuration_name!].ImageId!
    );
    row.image_description = props.imageIndex[row.image_id].Description || "";
    return row as AutoScalingGroupRow;
  }

  let spec: LaunchTemplateSpecification;
  if (props.overrides?.LaunchTemplateSpecification !== undefined) {
    spec = props.overrides.LaunchTemplateSpecification;
  } else if (props.group.MixedInstancesPolicy?.LaunchTemplate !== undefined) {
    spec =
      props.group.MixedInstancesPolicy.LaunchTemplate
        .LaunchTemplateSpecification!;
  } else {
    spec = props.group.LaunchTemplate!;
  }

  row.launch_template_id = spec?.LaunchTemplateId;
  row.launch_template_name = spec?.LaunchTemplateName;
  row.launch_template_version = spec?.Version;
  const launchTemplate =
    props.launchTemplateIndex[
      launchTemplateKey(spec?.LaunchTemplateName!, spec?.Version!)
    ];
  row.image_id = await resolveImageID(
    props.region,
    launchTemplate.LaunchTemplateData?.ImageId!
  );
  row.image_description = props.imageIndex[row.image_id].Description || "";
  return row as AutoScalingGroupRow;
}

export async function getAutoScalingGroups(
  region: string
): Promise<AutoScalingGroup[]> {
  const result: AutoScalingGroup[] = [];
  const client = new AutoScalingClient({ region });
  const paginator = paginateDescribeAutoScalingGroups({ client }, {});
  for await (const page of paginator) {
    result.push(...(page.AutoScalingGroups ?? []));
  }
  return result;
}

// Launch Configurations

const launchConfigurationCache: Record<string, LaunchConfiguration> = {};

export async function getLaunchConfigurations(
  region: string,
  names: string[]
): Promise<Record<string, LaunchConfiguration>> {
  const results: Record<string, LaunchConfiguration> = {};

  // Determine which launch configuraitons to get.
  const toGet = names.filter(
    (name) => launchConfigurationCache[name] === undefined
  );

  names
    .filter((name) => launchConfigurationCache[name] !== undefined)
    .forEach((name) => (results[name] = launchConfigurationCache[name]));

  if (toGet.length > 0) {
    const client = new AutoScalingClient({ region });

    // Use up to 50 launch configuration names at a time.
    for (let i = 0; i < toGet.length; i += 50) {
      const names = toGet.slice(i, i + 50);
      const page = await client.send(
        new DescribeLaunchConfigurationsCommand({
          LaunchConfigurationNames: toGet,
        })
      );

      for (const lc of page.LaunchConfigurations ?? []) {
        launchConfigurationCache[lc.LaunchConfigurationName!] = lc;
        results[lc.LaunchConfigurationName!] = lc;
      }
    }
  }

  return results;
}

function launchTemplateKey(name: string, version: number | string) {
  return `${name}:${version.toString()}`;
}
