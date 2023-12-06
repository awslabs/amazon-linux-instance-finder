import { getAutoScalingGroupRows } from "@/lib/autoscalinggroup";
import AutoScalingGroupsTable from "./table";

async function Page({ params }: { params: { region: string } }) {
  return (
    <AutoScalingGroupsTable
      data={await getAutoScalingGroupRows(params.region)}
    />
  );
}

export default Page;
