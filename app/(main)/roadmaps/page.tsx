import { RoadmapView } from "@/components/roadmap-view"

export const metadata = {
  title: "Roadmaps — LC Tracker",
  description: "Study roadmaps for interview preparation",
}

export default function RoadmapsPage() {
  return (
    <div className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6">
      <RoadmapView />
    </div>
  )
}
