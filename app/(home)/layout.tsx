import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { authOptions } from "@/lib/auth";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="flex flex-col">
      <Header />

      <main className="flex-1 bg-muted/40">{children}</main>
    </div>
  );
}
