import { CodePlaygroundView } from "@/components/code-playground-view";

export const metadata = {
  title: "JS Playground — LC Tracker",
  description: "Run JavaScript solve functions against quick test cases",
};

export default function PlaygroundPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <CodePlaygroundView />
    </div>
  );
}
