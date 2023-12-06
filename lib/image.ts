import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { EC2Client, Image, paginateDescribeImages } from "@aws-sdk/client-ec2";

export const AL1ImageMatcher =
  /Amazon Linux AMI (?:(?:amzn-ami-)?201[4-8]|VPC NAT|i386|x86_64)/;

const ssmPrefix = "resolve:ssm:";

const imageCache: Record<string, Image> = {};

// getImages returns a map of image IDs to Image objects.
export async function getImages(
  region: string,
  imageIDs: string[]
): Promise<Record<string, Image>> {
  const results: Record<string, Image> = {};

  // Fill in initial results from cache
  imageIDs
    .filter((id) => imageCache[id] !== undefined)
    .forEach((id) => (results[id] = imageCache[id]));

  // Remove any image IDs that are already cached
  const toGet = imageIDs.filter((id) => imageCache[id] === undefined);

  if (toGet.length > 0) {
    const client = new EC2Client({ region });
    const paginator = paginateDescribeImages(
      { client },
      {
        ImageIds: await Promise.all(
          imageIDs.map((id) => resolveImageID(region, id))
        ),
      }
    );
    for await (const page of paginator) {
      for (const image of page.Images || []) {
        imageCache[image.ImageId!] = image;
        results[image.ImageId!] = image;
      }
    }
  }
  return results;
}

const resolutionCache: Record<string, string> = {};

export async function resolveImageID(
  region: string,
  id: string
): Promise<string> {
  if (!id.startsWith(ssmPrefix)) return id;

  const imagePath = id.substring(ssmPrefix.length);

  if (resolutionCache[imagePath] !== undefined) {
    return resolutionCache[imagePath];
  }

  const ssm = new SSMClient({ region });
  const response = await ssm.send(new GetParameterCommand({ Name: imagePath }));
  const imageID = response.Parameter?.Value;
  if (imageID === undefined)
    throw new Error(`Unable to resolve image ID for ${imagePath}`);
  resolutionCache[imagePath] = imageID;
  return imageID;
}
