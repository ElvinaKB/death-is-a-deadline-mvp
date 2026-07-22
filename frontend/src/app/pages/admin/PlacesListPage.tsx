import { useMemo, useState } from "react";
import {
  EllipsisVertical,
  Pause,
  Pencil,
  Play,
  Plus,
  MessageSquareQuote,
  Mail,
  Search,
  MapPin,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ENDPOINTS } from "../../../config/endpoints.config";
import { QUERY_KEYS } from "../../../config/queryKeys.config";
import { ROUTES, getRoute } from "../../../config/routes.config";
import { useApiQuery, useApiMutation } from "../../../hooks/useApi";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Switch } from "../../components/ui/switch";
import { Input } from "../../components/ui/input";
import { toast } from "sonner";

const STATUS_COLORS: Record<PlaceStatus, string> = {
  [PlaceStatus.DRAFT]: "bg-muted/20 text-muted hover:bg-muted/30",
  [PlaceStatus.LIVE]: "bg-success/20 text-success hover:bg-success/30",
  [PlaceStatus.PAUSED]: "bg-warning/20 text-warning hover:bg-warning/30",
};

type PlaceRow = PlacesResponse["places"][0];

export function PlacesListPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<PlaceStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  // Track which placeId is currently sending an invite to show per-row loading
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Fetch the full set (not paginated) so grouping-by-city and search work
  // across every hotel, not just one page. Fine for the foreseeable hotel
  // count; when this grows past a few hundred, move grouping/search server-side.
  const { data, isLoading } = useApiQuery<PlacesResponse>({
    queryKey: [QUERY_KEYS.PLACES, filter],
    endpoint: ENDPOINTS.PLACES_LIST,
    params: {
      limit: 1000,
      ...(filter !== "ALL" ? { status: filter } : {}),
    },
  });

  const updateStatus = useUpdatePlaceStatus([QUERY_KEYS.PLACES, filter]);

  const resendInvite = useApiMutation<{ message: string }, { placeId: string }>(
    {
      endpoint: ENDPOINTS.RESEND_HOTEL_INVITE, // POST /admin/places/resend-invite
      showErrorToast: true,
      onSuccess: (_, variables) => {
        toast.success("Invite email resent successfully");
        setResendingId(null);
      },
      onError: () => {
        setResendingId(null);
      },
    },
  );

  const handleResendInvite = (placeId: string) => {
    setResendingId(placeId);
    resendInvite.mutate({ placeId });
  };

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

  const getStatusBadge = (status: PlaceStatus) => (
    <Badge className={STATUS_COLORS[status]}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );

  const columns: TableColumn<PlaceRow>[] = [
    {
      header: "Name",
      field: "name",
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
      header: "Hotel Account",
      field: "email",
      render: (row) => {
        // hasHotelAccount is included by the backend in the list response.
        // true  → hotel user exists, no action needed
        // false → no account yet, show resend invite (only if place has an email)
        const hasAccount = row.hasHotelAccount as boolean | undefined;

        if (hasAccount === undefined || !row.email) {
          // No email on the place — nothing to send
          return <span className="text-xs text-muted">No email</span>;
        }

        if (hasAccount) {
          return (
            <span className="text-xs text-success flex items-center gap-1">
              ✓ Account active
            </span>
          );
        }

        return (
          <Button
            variant="outline"
            size="sm"
            className="border-line text-fg hover:bg-glass h-7 text-xs gap-1.5"
            disabled={resendingId === row.id}
            onClick={() => handleResendInvite(row.id)}
          >
            <Mail className="h-3.5 w-3.5" />
            {resendingId === row.id ? "Sending..." : "Resend Invite"}
          </Button>
        );
      },
    },
    {
      header: "Status",
      field: "status",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={row.status === PlaceStatus.LIVE}
            onCheckedChange={(checked) => {
              updateStatus.mutate({
                id: row.id,
                status: checked ? PlaceStatus.LIVE : PlaceStatus.PAUSED,
              });
            }}
            disabled={updateStatus.isPending}
          />
          <span className="text-xs text-muted">
            {row.status === PlaceStatus.LIVE
              ? "Live"
              : row.status === PlaceStatus.PAUSED
                ? "Paused"
                : "Draft"}
          </span>
        </div>
      ),
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
          <DropdownMenuContent className="bg-bg" align="end">
            <DropdownMenuItem
              onClick={() =>
                navigate(getRoute(ROUTES.ADMIN_PLACES_EDIT, { id: row.id }))
              }
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                navigate(
                  getRoute(ROUTES.ADMIN_PLACES_TESTIMONIALS, { id: row.id }),
                )
              }
            >
              <MessageSquareQuote className="mr-2 h-4 w-4" />
              Testimonials
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

            {/* Resend invite option in dropdown too — for places without an account */}
            {!(row as any).hasHotelAccount && row.email && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleResendInvite(row.id)}
                  disabled={resendingId === row.id}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {resendingId === row.id ? "Sending..." : "Resend Invite"}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const places = data?.places || [];

  // Search by hotel name or city (case-insensitive). Client-side for now —
  // works today and covers "find a specific city or a name" without a backend
  // change; can move to a server query when the list gets large.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return places;
    return places.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.city || "").toLowerCase().includes(q),
    );
  }, [places, search]);

  // Bundle by city so every LA / SD / SF hotel sits together. Group key is
  // city (+ country to keep same-named cities in different countries apart).
  const cityGroups = useMemo(() => {
    const map = new Map<string, PlaceRow[]>();
    for (const p of filtered) {
      const city = (p.city || "").trim();
      const country = (p.country || "").trim();
      const label = city
        ? country
          ? `${city}, ${country}`
          : city
        : "No city set";
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(p);
    }
    return [...map.entries()]
      .map(
        ([label, list]) =>
          [
            label,
            [...list].sort((a, b) =>
              (a.name || "").localeCompare(b.name || ""),
            ),
          ] as [string, PlaceRow[]],
      )
      .sort((a, b) => {
        // "No city set" always sinks to the bottom.
        if (a[0] === "No city set") return 1;
        if (b[0] === "No city set") return -1;
        return a[0].localeCompare(b[0]);
      });
  }, [filtered]);

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
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-fg">
                {isLoading
                  ? "Places List"
                  : `${filtered.length} place${filtered.length === 1 ? "" : "s"} · ${cityGroups.length} ${cityGroups.length === 1 ? "city" : "cities"}`}
              </CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by hotel name or city…"
                  className="bg-glass border-line pl-9 text-fg"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {isLoading ? (
                <DataTable columns={columns} data={[]} loading />
              ) : cityGroups.length === 0 ? (
                <div className="text-center py-12 border border-line rounded-lg glass">
                  <p className="text-muted">
                    {search.trim()
                      ? `No places match "${search.trim()}".`
                      : "No places found. Create your first place to get started."}
                  </p>
                </div>
              ) : (
                cityGroups.map(([label, list]) => (
                  <div key={label} className="space-y-3">
                    <div className="flex items-center gap-2 text-fg">
                      <MapPin className="h-4 w-4 text-brand" />
                      <h3 className="font-semibold">{label}</h3>
                      <span className="text-xs text-muted">
                        ({list.length})
                      </span>
                    </div>
                    <DataTable columns={columns} data={list} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
