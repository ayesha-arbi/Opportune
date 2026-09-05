import { redirect } from "next/navigation";

// The middleware already routes "/" by session state; this is a fallback.
export default function Home() {
  redirect("/login");
}
