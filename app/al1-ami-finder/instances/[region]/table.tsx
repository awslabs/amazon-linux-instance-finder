"use client";

import { useState } from "react";
import Form from "react-bootstrap/Form";
import Table from "react-bootstrap/Table";
import { InstanceRow } from "@/lib/instance";
import { Sort } from "@/lib/sort";
import { SortOrder } from "@/lib/compare";

interface ColumnHeader {
  label: string;
  field: keyof InstanceRow;
}

const ColumnHeaders: ColumnHeader[] = [
  {
    label: "Instance ID",
    field: "instance_id",
  },
  {
    label: "Instance Type",
    field: "instance_type",
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
    label: "Instance State",
    field: "instance_state",
  },
  {
    label: "Launch Time",
    field: "launch_time",
  },
];

type FilterSet = {
  [field in keyof InstanceRow]?: string;
};

function InstancesTableHeading({
  columns,
  handleSorting,
  handleFiltering,
}: {
  columns: ColumnHeader[];
  handleSorting: (sortField: keyof InstanceRow, sortOrder: SortOrder) => void;
  handleFiltering: (fields: FilterSet) => void;
}) {
  const [sortField, setSortField] = useState<string>("");
  const [order, setOrder] = useState<SortOrder>(SortOrder.Asc);
  const [filters, setFilters] = useState<FilterSet>({});

  const handleSortingChange = (field: keyof InstanceRow) => {
    // Toggle order
    const sortOrder =
      field === sortField && order === SortOrder.Asc
        ? SortOrder.Desc
        : SortOrder.Asc;
    setSortField(field);
    setOrder(sortOrder);
    handleSorting(field, sortOrder);
  };

  const handleFilteringChange = (field: keyof InstanceRow, value: string) => {
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
  data: InstanceRow[];
  columns: ColumnHeader[];
}) {
  return (
    <tbody className="table-group-divider">
      {data.map((instance) => {
        return (
          <tr key={instance.instance_id}>
            {columns.map(({ field }) => {
              return field === "instance_id" ? (
                <th scope="row" key={field}>
                  {instance[field]}
                </th>
              ) : (
                <td key={field}>{instance[field]}</td>
              );
            })}
          </tr>
        );
      })}
    </tbody>
  );
}

function InstancesTable({ data }: { data: InstanceRow[] }) {
  const [tableData, setTableData] = useState(data);

  const handleSorting = (field: keyof InstanceRow, order: SortOrder) => {
    Sort(data, "Instance", field, order, setTableData);
  };

  const handleFiltering = (filters: FilterSet) => {
    const filteredData = data.filter((instance) => {
      return Object.entries(filters).every(([field, match]) => {
        const value = instance[field as keyof InstanceRow];
        if (value === undefined) {
          return match.length === 0;
        }
        return value.toLocaleLowerCase().includes(match.toLocaleLowerCase());
      });
    });
    setTableData(filteredData);
  };

  return (
    <Table className="table-striped">
      <InstancesTableHeading
        columns={ColumnHeaders}
        handleSorting={handleSorting}
        handleFiltering={handleFiltering}
      />
      <InstancesTableBody data={tableData} columns={ColumnHeaders} />
    </Table>
  );
}

export default InstancesTable;
