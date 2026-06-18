import { redirect } from "next/navigation";

type Props = {
  searchParams?: { email?: string };
};

/** Legacy merchant login URL — unified sign-in lives at /login */
export default function MerchantLoginRedirectPage({ searchParams }: Props) {
  const email = searchParams?.email?.trim();
  const query = email ? `?email=${encodeURIComponent(email)}` : "";
  redirect(`/login${query}`);
}
