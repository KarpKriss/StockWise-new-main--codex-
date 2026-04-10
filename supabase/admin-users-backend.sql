alter table public.profiles
add column if not exists operator_number text;

create unique index if not exists profiles_operator_number_unique
on public.profiles (operator_number)
where operator_number is not null and btrim(operator_number) <> '';

create unique index if not exists profiles_user_id_unique
on public.profiles (user_id)
where user_id is not null;
