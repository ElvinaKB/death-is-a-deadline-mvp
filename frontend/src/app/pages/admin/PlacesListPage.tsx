import { useState } from "react";
import { EllipsisVertical, Pause, Pencil, Play, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ENDPOINTS } from "../../../config/endpoints.config";
import { QUERY_KEYS } from "../../../config/queryKeys.config";
import { ROUTES, getRoute } from "../../../config/routes.config";
import { useApiQuery } from "../../../hooks/useApi";
import { useUpdatePlaceStatus } from "../../../hooks/usePlaces";
import {
  ACCOMMODATION_TYPE_LABELS,
  Place,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

const STATUS_COLORS: Record<PlaceStatus, string> = {
  [PlaceStatus.DRAFT]: "bg-muted/20 text-muted hover:bg-muted/30",
  [PlaceStatus.LIVE]: "bg-success/20 text-success hover:bg-success/30",
  [PlaceStatus.PAUSED]: "bg-warning/20 text-warning hover:bg-warning/30",
};

type PlaceRow = PlacesResponse["places"][0];

export function PlacesListPage() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<PlaceStatus | "ALL">("ALL");

  const { data, isLoading } = useApiQuery<PlacesResponse>({
    queryKey: [QUERY_KEYS.PLACES, currentPage, filter],
    endpoint: ENDPOINTS.PLACES_LIST,
    params: {
      page: currentPage,
      limit: 10,
      ...(filter !== "ALL" ? { status: filter } : {}),
    },
  });

  const updateStatus = useUpdatePlaceStatus();

  const handleStatusToggle = (place: Place) => {
    let newStatus: PlaceStatus;

    if (place.status === PlaceStatus.LIVE) {
      newStatus = PlaceStatus.PAUSED;
    } else if (place.status === PlaceStatus.PAUSED) {
      newStatus = PlaceStatus.LIVE;
    } else {
      newStatus = PlaceStatus.LIVE;
    }

    updateStatus.mutate({ id: place.id, status: newStatus });
  };

  const getStatusBadge = (status: PlaceStatus) => {
    return (
      <Badge className={STATUS_COLORS[status]}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </Badge>
    );
  };

  const columns: TableColumn<PlaceRow>[] = [
    {
      header: "Name",
      field: "name",
    },
    {
      header: "City",
      field: "city",
    },
    {
      header: "Country",
      field: "country",
    },
    {
      header: "Type",
      field: "accommodationType",
      render: (row) => (
        <Badge variant="outline">
          {ACCOMMODATION_TYPE_LABELS[row.accommodationType]}
        </Badge>
      ),
    },
    {
      header: "Status",
      field: "status",
      render: (row) => getStatusBadge(row.status),
    },
    {
      header: "Created",
      field: "createdAt",
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      header: "Actions",
      field: "id",
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <EllipsisVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                navigate(getRoute(ROUTES.ADMIN_PLACES_EDIT, { id: row.id }))
              }
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusToggle(row)}>
              {row.status === PlaceStatus.LIVE ? (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  {row.status === PlaceStatus.PAUSED ? "Resume" : "Publish"}
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
  const places = data?.places || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-fg">Places</h1>
          <p className="text-muted mt-1">Manage your accommodation listings</p>
        </div>
        <Button
          onClick={() => navigate(ROUTES.ADMIN_PLACES_NEW)}
          className="btn-bid"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Place
        </Button>
      </div>

      <Tabs
        defaultValue="ALL"
        value={filter}
        onValueChange={(v) => setFilter(v as PlaceStatus | "ALL")}
      >
        <TabsList className="bg-glass border border-line">
          <TabsTrigger
            value="ALL"
            className="data-[state=active]:bg-brand data-[state=active]:text-white"
          >
            All
          </TabsTrigger>
          <TabsTrigger
            value={PlaceStatus.DRAFT}
            className="data-[state=active]:bg-brand data-[state=active]:text-white"
          >
            Draft
          </TabsTrigger>
          <TabsTrigger
            value={PlaceStatus.LIVE}
            className="data-[state=active]:bg-brand data-[state=active]:text-white"
          >
            Live
          </TabsTrigger>
          <TabsTrigger
            value={PlaceStatus.PAUSED}
            className="data-[state=active]:bg-brand data-[state=active]:text-white"
          >
            Paused
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          <Card className="glass-2 border-line">
            <CardHeader>
              <CardTitle className="text-fg">Places List</CardTitle>
            </CardHeader>
            <CardContent>
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
                emptyMessage="No places found. Create your first place to get started."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
