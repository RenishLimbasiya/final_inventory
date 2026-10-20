import { redirect } from "next/navigation";

/** Preserve existing dashboard links after moving the dashboard to /. */
export default function LegacyDashboardPage() {
  redirect("/");
}
