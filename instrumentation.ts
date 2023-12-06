import getRegions from "./lib/regions";

export async function register() {
  console.log("Loading AWS resources...");
  await getRegions();
  console.log("Loading complete.");
}
