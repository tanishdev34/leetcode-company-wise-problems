import { WhiteboardView } from "@/components/whiteboard-view";

export const metadata = {
  title: "Whiteboard — LC Tracker",
  description: "A lightweight sketchpad for interview and DSA visual notes",
};

export default function WhiteboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <WhiteboardView />
    </div>
  );
}
