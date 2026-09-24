-- Users who signed up before the profile trigger existed (e.g. while the auth PR was being
-- tried on a preview) have no profile. Give them the same default one the trigger would have.
-- Insert-only and idempotent: existing profiles are never touched.
insert into public.profile (id, nickname)
select u.id, 'Trainer-' || upper(substr(replace(u.id::text, '-', ''), 1, 4))
from auth.users u
where not exists (select 1 from public.profile p where p.id = u.id);
