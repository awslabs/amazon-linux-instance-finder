"use client";

import { useRouter, useParams, usePathname } from "next/navigation";

import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";
import Nav from "react-bootstrap/Nav";

export interface ResourceTab {
  title: string;
  path: string;
}

const resourceTabList: ResourceTab[] = [
  {
    title: "Instances",
    path: "/al1-ami-finder/instances/",
  },
  {
    title: "Auto Scaling Groups",
    path: "/al1-ami-finder/auto-scaling-groups/",
  },
];

export function ResourceTabs({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();

  const onSelect = (path: string | null) => {
    router.push(`${path}${params["region"]}`);
  };
  const activeKey = resourceTabList.find((n) =>
    pathname.startsWith(n.path)
  )!.path;
  return (
    <Tabs onSelect={onSelect} activeKey={activeKey}>
      {resourceTabList.map((n) => {
        return (
          <Tab key={n.title} eventKey={n.path} title={n.title}>
            {children}
          </Tab>
        );
      })}
    </Tabs>
  );
}

export function RegionNav({ regions }: { regions: string[] }) {
  const params = useParams();
  const currentRegion = params["region"] as string;

  return (
    <Nav variant="pills" activeKey={currentRegion}>
      {regions.map((region) => (
        <Nav.Item key={region}>
          <Nav.Link eventKey={region} href={region}>
            {region}
          </Nav.Link>
        </Nav.Item>
      ))}
    </Nav>
  );
}
