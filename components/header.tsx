import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { HeaderClient } from "./header-client";

export async function Header() {
  const session = await getServerSession(authOptions);

  return <HeaderClient session={session} />;
}
