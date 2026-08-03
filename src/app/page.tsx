import { redirect } from "next/navigation";

// The middleware sends logged-out visitors to /login,
// so anyone reaching this page is signed in.
export default function Home() {
  redirect("/dashboard");
}
