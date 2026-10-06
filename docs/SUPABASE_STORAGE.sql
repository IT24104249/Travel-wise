-- Run in Supabase SQL Editor after creating a private bucket named receipts.
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do update set public = false;

create policy "authenticated users can upload receipts"
on storage.objects for insert to authenticated
with check (bucket_id = 'receipts');

create policy "authenticated users can read receipts"
on storage.objects for select to authenticated
using (bucket_id = 'receipts');
