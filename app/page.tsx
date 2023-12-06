import { redirect } from "next/navigation";
import getRegions from "@/lib/regions";
import NotFoundAlert from "./notfound";

// If Next.js thinks this is static it will try to preload all the
// data during compilation.
export const dynamic = "force-dynamic";

export default async function Page() {
  const regions = await getRegions();
  if (regions.length === 0) {
    return <NotFoundAlert />;
  }
  redirect(`/al1-ami-finder/instances/${regions[0]}`);
}
