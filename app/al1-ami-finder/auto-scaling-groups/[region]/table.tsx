"use client";

import { useState } from "react";
import Form from "react-bootstrap/Form";
import Table from "react-bootstrap/Table";
import { SortOrder } from "@/lib/compare";
import { Sort } from "@/lib/sort";
import {
  getAutoScalingGroupRows,
  AutoScalingGroupRow,
} from "@/lib/autoscalinggroup";

type ColumnHeader = {
  label: string;
  field: keyof AutoScalingGroupRow;
};

const ColumnHeaders: ColumnHeader[] = [
  {
    label: "Name",
    field: "auto_scaling_group_name",
  },
  {
    label: "Image ID",
    field: "image_id",
  },
  {
    label: "Image Description",
    field: "image_description",
  },
  {
    label: "Launch Configuration",
    field: "launch_configuration_name",
  },
  {
    label: "Launch Template ID",
    field: "launch_template_id",
  },
  {
    label: "Launch Template Name",
    field: "launch_template_name",
  },
  {
    label: "Launch Template Version",
    field: "launch_template_version",
  },
];

type FilterSet = {
  [field in keyof AutoScalingGroupRow]?: string;
};

function InstancesTableHeading({
  columns,
  handleSorting,
  handleFiltering,
}: {
  columns: ColumnHeader[];
  handleSorting: (
    sortField: keyof AutoScalingGroupRow,
    sortOrder: SortOrder
  ) => void;
  handleFiltering: (fields: FilterSet) => void;
}) {
  const [sortField, setSortField] = useState<string>("");
  const [order, setOrder] = useState<SortOrder>(SortOrder.Asc);
  const [filters, setFilters] = useState<FilterSet>({});

  const handleSortingChange = (field: keyof AutoScalingGroupRow) => {
    // Toggle order
    const sortOrder =
      field === sortField && order === SortOrder.Asc
        ? SortOrder.Desc
        : SortOrder.Asc;
    setSortField(field);
    setOrder(sortOrder);
    handleSorting(field, sortOrder);
  };

  const handleFilteringChange = (
    field: keyof AutoScalingGroupRow,
    value: string
  ) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    handleFiltering(newFilters);
  };

  return (
    <thead>
      <tr>
        {columns.map(({ field, label }) => {
          let direction: string = "";
          if (field === sortField) {
            if (order === SortOrder.Asc) {
              direction = "up";
            } else if (order === SortOrder.Desc) {
              direction = "down";
            }
          }
          direction = direction || "up";
          return (
            <th key={field} onClick={() => handleSortingChange(field)}>
              <button type="button" className="btn btn-light btn-sm">
                <i className={`bi bi-sort-${direction}`} />
              </button>
              {label}
            </th>
          );
        })}
      </tr>
      <tr>
        {columns.map(({ field }) => {
          return (
            <th key={field}>
              <Form.Control
                name={field}
                onChange={(event) =>
                  handleFilteringChange(field, event.target.value)
                }
              ></Form.Control>
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

function InstancesTableBody({
  data,
  columns,
}: {
  data: AutoScalingGroupRow[];
  columns: ColumnHeader[];
}) {
  return (
    <tbody className="table-group-divider">
      {data.map((group) => {
        return (
          // An auto scaling group name might be repeated in different rows,
          // but (name, image_id) will be a unique tuple, so use it as
          // the key.
          <tr key={group.auto_scaling_group_name + group.image_id}>
            {columns.map(({ field }) => {
              return field === "auto_scaling_group_name" ? (
                <th scope="row" key={field}>
                  {group[field]}
                </th>
              ) : (
                <td key={field}>{group[field]}</td>
              );
            })}
          </tr>
        );
      })}
    </tbody>
  );
}

function AutoScalingGroupTable({ data }: { data: AutoScalingGroupRow[] }) {
  const [tableData, setTableData] = useState(data);

  const handleSorting = (
    sortField: keyof AutoScalingGroupRow,
    sortOrder: SortOrder
  ) => {
    Sort(data, "AutoScalingGroup", sortField, sortOrder, setTableData);
  };

  const handleFiltering = (filters: FilterSet) => {
    const filteredData = data.filter((autoScalingGroup) => {
      return Object.entries(filters).every(([field, match]) => {
        const value = autoScalingGroup[field as keyof AutoScalingGroupRow];
        if (value === undefined) {
          return match.length === 0;
        }
        return value.toLocaleLowerCase().includes(match.toLocaleLowerCase());
      });
    });
    setTableData(filteredData);
  };

  return (
    <div>
      <Table className="table-striped">
        <InstancesTableHeading
          columns={ColumnHeaders}
          handleSorting={handleSorting}
          handleFiltering={handleFiltering}
        />
        <InstancesTableBody data={tableData} columns={ColumnHeaders} />
      </Table>
    </div>
  );
}

export default AutoScalingGroupTable;
