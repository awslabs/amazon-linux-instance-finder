import getRegions from "@/lib/regions";
import { ResourceTabs, RegionNav } from "./tabs";

export default async function AmiFinderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ResourceTabs>{children}</ResourceTabs>
      <RegionNav regions={await getRegions()}></RegionNav>
    </>
  );
}
