import OwnerConsole from "@/features/owner/OwnerConsole";
export const metadata = { title: "站主管理", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default function Page() { return <OwnerConsole />; }
