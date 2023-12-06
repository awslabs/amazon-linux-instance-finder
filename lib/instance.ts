import {
  EC2Client,
  GetConsoleOutputCommand,
  Instance,
  paginateDescribeInstances,
} from "@aws-sdk/client-ec2";
import {
  IdComparer,
  InstanceStateComparer,
  InstanceTypeComparer,
} from "./compare";
import { getImages, AL1ImageMatcher } from "./image";
import { PromisePool } from "@supercharge/promise-pool";

const GetConsoleOutputConcurrency = 10;

const AL1ConsoleOutputMatcher =
  /^Amazon Linux AMI release 201[1-8](?:\.\d+)?\r?\nKernel/m;

export const Comparers = {
  instance_id: IdComparer,
  image_id: IdComparer,
  instance_type: InstanceTypeComparer,
  instance_state: InstanceStateComparer,
};

export interface InstanceRow {
  instance_id: string;
  image_id: string;
  image_description: string;
  instance_type: string;
  instance_state: string;
  launch_time: string;
}

export async function getInstances(region: string): Promise<Instance[]> {
  const instances: Instance[] = [];
  const client = new EC2Client({ region });
  const paginator = paginateDescribeInstances(
    { client },
    {
      Filters: [
        {
          Name: "instance-state-name",
          Values: ["pending", "running", "stopping", "stopped"],
        },
        // This filter helps cut down on the returned results, as we
        // don't care about Windows or commercial Linux instances.
        {
          Name: "platform-details",
          Values: ["Linux/UNIX"],
        },
      ],
    }
  );
  for await (const page of paginator) {
    for (const reservation of page.Reservations!) {
      instances.push(...reservation.Instances!);
    }
  }
  return instances;
}

const instanceRowCache: Record<string, InstanceRow[]> = {};

export async function getInstanceRows(region: string): Promise<InstanceRow[]> {
  if (instanceRowCache[region] !== undefined) {
    return instanceRowCache[region];
  }

  console.log(`Fetching instances for ${region}`);

  const instances = await getInstances(region);

  // Preload all the image descriptions
  const imageIndex = await getImages(
    region,
    instances.map((i) => i.ImageId!)
  );

  const consoleMatches = await getConsoleMatches(
    region,
    instances.map((i) => i.InstanceId!)
  );

  const rows: InstanceRow[] = instances
    .filter(
      (instance) =>
        AL1ImageMatcher.test(imageIndex[instance.ImageId!].Description || "") ||
        consoleMatches.includes(instance.InstanceId!)
    )
    .map((instance) => {
      return {
        instance_id: instance.InstanceId!,
        image_id: instance.ImageId!,
        image_description: imageIndex[instance.ImageId!].Description || "",
        instance_type: instance.InstanceType!,
        instance_state: instance.State!.Name!,
        launch_time: instance.LaunchTime!.toISOString(),
      };
    });

  instanceRowCache[region] = rows;
  return rows;
}

const consoleMatchCache: Record<string, boolean> = {};

// Returns a list of instance IDs that have console output indicating that
// AL1 is being run on the instance.
async function getConsoleMatches(
  region: string,
  instanceIds: string[]
): Promise<string[]> {
  // Filter out all instance IDs whose values are known
  const instanceIdsToCheck = instanceIds.filter(
    (instanceId) => consoleMatchCache[instanceId] === undefined
  );

  if (instanceIdsToCheck.length > 0) {
    await PromisePool.withConcurrency(GetConsoleOutputConcurrency)
      .for(instanceIdsToCheck)
      .process(async (instanceId) => {
        const output = await getConsoleOutput(region, instanceId);
        consoleMatchCache[instanceId] =
          output === undefined ? false : AL1ConsoleOutputMatcher.test(output);
      });
  }

  return Object.keys(consoleMatchCache).filter(
    (instanceId) => consoleMatchCache[instanceId] === true
  );
}

async function getConsoleOutput(
  region: string,
  instanceId: string
): Promise<string | undefined> {
  const client = new EC2Client({ region });
  console.log(`Fetching console output for ${instanceId}`);
  const { Output: output } = await client.send(
    new GetConsoleOutputCommand({
      InstanceId: instanceId,
    })
  );
  if (output === undefined) {
    return undefined;
  }
  return Buffer.from(output || "", "base64").toString("utf-8");
}
