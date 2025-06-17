import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

export async function Header() {
  const session = await getServerSession(authOptions);

  return (
    <header className="w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/*  brand / logo  */}
        <Link href="/chat" className="text-lg font-semibold">
          RAG Demo
        </Link>

        {/*  right-side user actions  */}
        {session?.user ? (
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {session.user.email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirect: true, callbackUrl: "/login" });
              }}
            >
              <Button size="sm" className="h-8" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        ) : (
          <Button asChild size="sm" className="h-8">
            <Link href="/login">Sign in</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
