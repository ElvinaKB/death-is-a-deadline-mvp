import { useApiQuery } from "../../../hooks/useApi";
import { ENDPOINTS } from "../../../config/endpoints.config";
import { QUERY_KEYS } from "../../../config/queryKeys.config";
import { DataTable } from "../../components/common/DataTable";
import { TableColumn } from "../../../types/api.types";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

interface WishlistDestination {
  destination: string;
  count: number;
}

export function WishlistTallyPage() {
  const { data, isLoading } = useApiQuery<{ destinations: WishlistDestination[] }>({
    queryKey: [QUERY_KEYS.PROFILE_WISHLIST_TALLY],
    endpoint: ENDPOINTS.PROFILE_WISHLIST_TALLY,
  });

  const destinations = data?.destinations ?? [];
  const topCount = destinations[0]?.count ?? 0;

  const columns: TableColumn<WishlistDestination>[] = [
    {
      header: "Destination",
      field: "destination",
    },
    {
      header: "Requests",
      field: "count",
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="font-semibold text-fg w-8">{row.count}</span>
          <div className="h-1.5 flex-1 max-w-40 rounded-full bg-line/40 overflow-hidden">
            <div
              className="h-full rounded-full bg-gold"
              style={{ width: `${topCount ? (row.count / topCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-fg">Destination Requests</h1>
        <p className="text-muted mt-1">
          What travelers typed into "Where do you want to go next?" on their profile —
          use this to prioritize where to sign new hotels.
        </p>
      </div>

      <Card className="bg-glass-2 border-line">
        <CardHeader>
          <CardTitle className="text-fg">
            {data ? `${destinations.length} distinct destination${destinations.length === 1 ? "" : "s"} requested` : "Destinations"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={destinations}
            loading={isLoading}
            emptyMessage="No destination requests yet"
          />
        </CardContent>
      </Card>
    </div>
  );
}
