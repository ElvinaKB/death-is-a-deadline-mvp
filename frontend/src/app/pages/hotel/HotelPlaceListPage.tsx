import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil } from "lucide-react";
import { ENDPOINTS } from "../../../config/endpoints.config";
import { QUERY_KEYS } from "../../../config/queryKeys.config";
import { ROUTES, getRoute } from "../../../config/routes.config";
import { useApiQuery } from "../../../hooks/useApi";
import {
  ACCOMMODATION_TYPE_LABELS,
  PlacesResponse,
  PlaceStatus,
} from "../../../types/place.types";
import { DataTable } from "../../components/common/DataTable";
import { TableColumn } from "../../../types/api.types";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";

const STATUS_COLORS: Record<PlaceStatus, string> = {
  [PlaceStatus.DRAFT]: "bg-muted/20 text-muted",
  [PlaceStatus.LIVE]: "bg-success/20 text-success",
  [PlaceStatus.PAUSED]: "bg-warning/20 text-warning",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    amount,
  );

type PlaceRow = PlacesResponse["places"][0];

export function HotelPlacesListPage() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<PlaceStatus | "ALL">("ALL");

  const { data, isLoading } = useApiQuery<PlacesResponse>({
    queryKey: [QUERY_KEYS.HOTEL_PLACES, currentPage, filter],
    endpoint: ENDPOINTS.HOTEL_PLACES_LIST, // GET /hotel/places
    params: {
      page: currentPage,
      limit: 10,
      ...(filter !== "ALL" ? { status: filter } : {}),
    },
  });

  const columns: TableColumn<PlaceRow>[] = [
    {
      header: "Property",
      field: "name",
      render: (row) => (
        <div>
          <p className="font-medium text-fg text-sm">{row.name}</p>
          <p className="text-xs text-muted">
            {row.city}, {row.country}
          </p>
        </div>
      ),
    },
    {
      header: "Type",
      field: "accommodationType",
      render: (row) => (
        <Badge variant="outline" className="text-xs">
          {ACCOMMODATION_TYPE_LABELS[row.accommodationType]}
        </Badge>
      ),
    },
    {
      header: "Status",
      field: "status",
      render: (row) => (
        <Badge className={`text-xs ${STATUS_COLORS[row.status]}`}>
          {row.status.charAt(0) + row.status.slice(1).toLowerCase()}
        </Badge>
      ),
    },
    {
      header: "Inventory",
      field: "maxInventory",
      render: (row) => (
        <div className="text-sm">
          <p className="font-medium text-fg">{row.maxInventory}</p>
          <p className="text-xs text-muted">rooms/beds</p>
        </div>
      ),
    },
    {
      header: "Retail Price",
      field: "retailPrice",
      render: (row) => (
        <div className="text-sm">
          <p className="font-medium text-fg">
            {formatCurrency(row.retailPrice)}
          </p>
          <p className="text-xs text-muted">per night</p>
        </div>
      ),
    },
    {
      header: "Min Bid",
      field: "minimumBid",
      render: (row) => (
        <div className="text-sm">
          <p className="font-medium text-fg">
            {formatCurrency(row.minimumBid)}
          </p>
          <p className="text-xs text-muted">per night</p>
        </div>
      ),
    },
    {
      header: "Availability",
      field: "allowedDaysOfWeek",
      render: (row) => {
        const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
        const allowed = row.allowedDaysOfWeek ?? [0, 1, 2, 3, 4, 5, 6];
        return (
          <div className="flex gap-0.5">
            {DAY_LABELS.map((label, index) => (
              <span
                key={index}
                className={`text-[10px] px-1 py-0.5 rounded font-medium ${
                  allowed.includes(index)
                    ? "bg-brand/20 text-brand"
                    : "bg-muted/10 text-muted/40"
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      header: "",
      field: "id",
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          className="border-line text-fg hover:bg-glass h-8 text-xs gap-1.5"
          onClick={() =>
            navigate(getRoute(ROUTES.HOTEL_PLACES_EDIT, { id: row.id }))
          }
        >
          <Pencil className="h-3.5 w-3.5" />
          Manage
        </Button>
      ),
    },
  ];

  const places = data?.places || [];

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg">
          My Properties
        </h1>
        <p className="text-muted mt-1 text-sm">
          {places.length > 0
            ? `You have ${data?.total ?? places.length} propert${(data?.total ?? places.length) === 1 ? "y" : "ies"} listed`
            : "Your listed properties will appear here"}
        </p>
      </div>

      <Tabs
        defaultValue="ALL"
        value={filter}
        onValueChange={(v) => {
          setFilter(v as PlaceStatus | "ALL");
          setCurrentPage(1);
        }}
      >
        <TabsList className="bg-glass border border-line">
          {(
            [
              "ALL",
              PlaceStatus.LIVE,
              PlaceStatus.PAUSED,
              PlaceStatus.DRAFT,
            ] as const
          ).map((val) => (
            <TabsTrigger
              key={val}
              value={val}
              className="data-[state=active]:bg-brand data-[state=active]:text-white text-xs sm:text-sm"
            >
              {val === "ALL"
                ? "All"
                : val.charAt(0) + val.slice(1).toLowerCase()}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={filter} className="mt-4 sm:mt-6">
          <Card className="glass-2 border-line">
            <CardHeader className="pb-2 px-4 sm:px-6">
              <CardTitle className="text-fg text-base sm:text-lg">
                Properties
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 overflow-x-auto">
              <DataTable
                columns={columns}
                data={places}
                loading={isLoading}
                pagination={
                  data
                    ? {
                        currentPage,
                        totalPages: Math.ceil(data.total / (data.limit || 10)),
                        totalItems: data.total,
                        onPageChange: setCurrentPage,
                      }
                    : undefined
                }
                emptyMessage="No properties found."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
