import { Outlet } from "react-router-dom";

export function StudentLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Outlet />
    </div>
  );
}
