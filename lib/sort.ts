import { Dispatch, SetStateAction } from "react";
import { Comparers as AutoScalingGroupComparers } from "./autoscalinggroup";
import { Comparers as InstanceComparers } from './instance';
import { Comparer, DefaultComparer, SortOrder } from "./compare";


const ComparisonFunctions = {
  Instance: InstanceComparers,
  AutoScalingGroup: AutoScalingGroupComparers
}

export function Sort<T extends Partial<Record<keyof T, string | undefined>>>(objects: T[], type: keyof typeof ComparisonFunctions, key: keyof T, sortOrder: SortOrder, updateHandler: Dispatch<SetStateAction<T[]>>): void {
  const comparers = ComparisonFunctions[type] as Partial<Record<keyof T, Comparer>>;

  if (!comparers) {
    throw new Error(`No comparers found for type ${type}`);
  }

  const comparer = comparers[key] || DefaultComparer;
  const sortedData = [...objects].sort((a, b) => comparer(a[key], b[key]) * sortOrder);
  updateHandler(sortedData as T[]);
}