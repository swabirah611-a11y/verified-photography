alter table public.bookings enable row level security;

drop policy if exists "Public can submit bookings" on public.bookings;
drop policy if exists "CMS users can read bookings" on public.bookings;
drop policy if exists "CMS users can insert bookings" on public.bookings;
drop policy if exists "CMS users can update bookings" on public.bookings;
drop policy if exists "CMS users can delete bookings" on public.bookings;

-- Website visitors may submit only a new, unassigned and unpaid request.
-- They receive no SELECT, UPDATE, or DELETE access to any booking.
create policy "Public can submit bookings" on public.bookings
for insert to anon
with check (
  booking_status = 'pending'
  and payment_status = 'unpaid'
  and assigned_staff is null
);

create policy "CMS users can read bookings" on public.bookings
for select to authenticated
using (public.is_admin_or_editor());

create policy "CMS users can insert bookings" on public.bookings
for insert to authenticated
with check (public.is_admin_or_editor());

create policy "CMS users can update bookings" on public.bookings
for update to authenticated
using (public.is_admin_or_editor())
with check (public.is_admin_or_editor());

create policy "CMS users can delete bookings" on public.bookings
for delete to authenticated
using (public.is_admin_or_editor());
