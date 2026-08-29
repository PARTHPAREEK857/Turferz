import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSessionUser } from "@/server/auth/current-user";
import { listMyBookings } from "@/server/services/bookings";
import { listMyRegistrations } from "@/server/services/tournaments";
import { AccountDashboard } from "@/components/account-views";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const user = await getServerSessionUser();
  if (!user) redirect("/login?next=/account");

  const [bookings, registrations] = await Promise.all([
    listMyBookings(user),
    listMyRegistrations(user),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <p className="eyebrow">Account</p>
      <h1 className="sr-only">My account</h1>
      <div className="mt-4">
        <AccountDashboard user={user} initialBookings={bookings} initialRegistrations={registrations} />
      </div>
    </div>
  );
}
