import { redirect } from "next/navigation";

/**
 * Any unmatched path lands on the home page rather than a 404 screen. Note the
 * response is a 307 to `/`, not a 404 — crawlers and monitoring will see a
 * redirect for every mistyped URL.
 */
export default function NotFound() {
  redirect("/");
}
