import { validateRequest } from "@/lib/auth/utils";
import { redirect } from "next/navigation";

export default async function Home() {
  const { user } = await validateRequest();

  if (user) {
    redirect("/dashboard");
  } else {
    redirect("/sign-in");
  }
}
