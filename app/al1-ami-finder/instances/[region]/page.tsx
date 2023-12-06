import InstancesTable from "./table";
import { getInstanceRows } from "@/lib/instance";

async function Page({ params }: { params: { region: string } }) {
  return <InstancesTable data={await getInstanceRows(params.region)} />;
}

export default Page;
