export const enum SortOrder {
  Asc = 1,
  Desc = -1,
}

export type Comparer = (a: string | undefined, b: string | undefined) => number;

export function IdComparer(a: string = "", b: string = ""): number {
    const [, x] = a.split("-");
    const [, y] = b.split("-");
    return (parseInt(x, 16) > parseInt(y, 16)) ? 1 : -1;
}

const instanceSizes = ["nano", "micro", "small", "medium", "large"];

export function InstanceTypeComparer(a: string = "", b: string = ""): number {
    const [afamily, asize] = a.split(".");
    const [bfamily, bsize] = b.split(".");

    if (afamily !== bfamily) {
      return afamily.localeCompare(bfamily, "en");
    }

    if (asize === bsize) return 0;

    // Handle case where one instance's size is .metal
    if (asize === "metal" && bsize !== "metal") return 1;
    if (asize !== "metal" && bsize === "metal") return -1;

    if (asize.endsWith("xlarge") && bsize.endsWith("xlarge")) {
      // Compare the multipliers in front of xlarge (e.g. 2xlarge, 4xlarge, etc.).
      // Treat "xlarge" as "1xlarge".
      const [amult] = asize.split("xlarge");
      const [bmult] = bsize.split("xlarge");
      return (parseInt(amult || "1") - parseInt(bmult || "1"))
    }

    // We've already eliminated .metal instances above. We've also eliminated
    // the case where both instance sizes are multiples of xlarge. So, if
    // either instance ends with "xlarge", it must be the larger one.
    if (asize.endsWith("xlarge")) return 1;
    if (bsize.endsWith("xlarge")) return -1;

    return (instanceSizes.indexOf(asize) - instanceSizes.indexOf(bsize))
}

const instanceStates = ["pending", "running",  "shutting-down",  "stopping",  "stopped",  "terminated"];

export function InstanceStateComparer(a: string = "", b: string = ""): number {
    return instanceStates.indexOf(a) - instanceStates.indexOf(b);
}

export function LexicographicalComparer(a: string = "", b: string = ""): number {
    return a.toString().localeCompare(b.toString(), "en", { numeric: true });
}

export const DefaultComparer = LexicographicalComparer;


