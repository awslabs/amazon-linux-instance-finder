import { DescribeRegionsCommand, EC2Client } from "@aws-sdk/client-ec2";
import { getAutoScalingGroupRows } from "./autoscalinggroup";
import { getInstanceRows } from "./instance";
import { PromisePool } from "@supercharge/promise-pool";

// The number of regions to query at a time
const MaxConcurrency = 5;

let regionCache: string[] | undefined;

// getRegions() has a side effect of populating the ASG, Instance, Launch
// Configuration, and Launch Template caches. This will help us hide regions
// that the customer has access to, but which do not have any relevant data.
async function getRegions(): Promise<string[]> {
  if (regionCache !== undefined) return regionCache;

  const client = new EC2Client();
  const result = await client.send(new DescribeRegionsCommand({}));
  const accessibleRegions: string[] = result.Regions!.map(
    (region) => region.RegionName!
  );

  regionCache = [];

  const { results, errors } = await PromisePool.withConcurrency(MaxConcurrency)
    .for(accessibleRegions)
    .process(async (region) => {
      const [instancesInRegion, autoScalingGroupsInRegion] = await Promise.all([
        hasAutoScalingGroupsInRegion(region),
        hasInstancesInRegion(region),
      ]);
      return { region, instancesInRegion, autoScalingGroupsInRegion };
    });
  if (errors.length > 0) throw errors;

  regionCache = results
    .filter(
      (result) => result.instancesInRegion || result.autoScalingGroupsInRegion
    )
    .map((result) => result.region);

  console.log(`Cached regions: ${regionCache}`);
  return regionCache;
}

async function hasAutoScalingGroupsInRegion(region: string): Promise<boolean> {
  console.log(`Checking ASGs in ${region}`);
  return (await getAutoScalingGroupRows(region)).length > 0;
}

async function hasInstancesInRegion(region: string): Promise<boolean> {
  console.log(`Checking instances in ${region}`);
  return (await getInstanceRows(region)).length > 0;
}

export default getRegions;
