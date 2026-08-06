import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { moduleMap } from "@/lib/modules";

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  if (!moduleMap[module] && module !== "settings") notFound();
  return <AppShell activeModule={module} />;
}
