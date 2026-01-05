import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { EllipsisVertical, Plus, Pencil, Pause, Play } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { usePlaces, useUpdatePlaceStatus } from "../../../hooks/usePlaces";
import {
  Place,
  PlaceStatus,
  ACCOMMODATION_TYPE_LABELS,
} from "../../../types/place.types";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { ROUTES, getRoute } from "../../../config/routes.config";
import { SkeletonLoader } from "../../components/common/SkeletonLoader";

const STATUS_COLORS: Record<PlaceStatus, string> = {
  [PlaceStatus.DRAFT]: "bg-gray-500",
  [PlaceStatus.LIVE]: "bg-green-500",
  [PlaceStatus.PAUSED]: "bg-yellow-500",
};

export function PlacesListPage() {
  const navigate = useNavigate();
  const { data: places, isLoading } = usePlaces();
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <SkeletonLoader className="h-8 w-48" />
          <SkeletonLoader className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="p-6">
            <SkeletonLoader className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Places</h1>
          <p className="text-muted-foreground mt-1">
            Manage your accommodation listings
          </p>
        </div>
        <Button onClick={() => navigate(ROUTES.ADMIN_PLACES_NEW)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Place
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Places</CardTitle>
          <CardDescription>{places?.length || 0} total places</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Place Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {places?.map((place) => (
                <TableRow key={place.id}>
                  <TableCell className="font-medium">{place.name}</TableCell>
                  <TableCell>{place.city}</TableCell>
                  <TableCell>{place.country}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {ACCOMMODATION_TYPE_LABELS[place.accommodationType]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[place.status]}>
                      {place.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(place.createdAt), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <EllipsisVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            navigate(
                              getRoute(ROUTES.ADMIN_PLACES_EDIT, {
                                id: place.id,
                              })
                            )
                          }
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusToggle(place)}
                        >
                          {place.status === PlaceStatus.LIVE ? (
                            <>
                              <Pause className="mr-2 h-4 w-4" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="mr-2 h-4 w-4" />
                              {place.status === PlaceStatus.PAUSED
                                ? "Resume"
                                : "Publish"}
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {(!places || places.length === 0) && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No places found. Create your first place to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
