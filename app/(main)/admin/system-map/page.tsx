import { SystemMapView } from "@/components/system-map-view";

export const metadata = {
  title: "System Map — LC Tracker",
  description: "Admin architecture graph for the local codebase",
};

export default function AdminSystemMapPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <SystemMapView />
    </div>
  );
}
