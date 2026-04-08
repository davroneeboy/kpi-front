import { redirect } from "next/navigation";

/** Eski havolalar uchun: /kirish → / */
export default function KirishRedirectPage() {
  redirect("/");
}
