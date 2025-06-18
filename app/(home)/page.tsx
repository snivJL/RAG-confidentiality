import ChatClient from "@/components/chat-client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return (
    <div className="flex h-[calc(100dvh_-_96px)] flex-col">
      <ChatClient />
    </div>
  );
}
