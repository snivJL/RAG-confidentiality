import ChatClient from "@/components/chat-client";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return (
    <div className="flex h-[calc(100dvh_-_96px)] flex-col">
      <ChatClient />
    </div>
  );
}
