# Admin Users Backend

Ten pakiet domyka 4 rzeczy dla panelu `Uzytkownicy`:

1. trwaly `operator_number`
2. bezpieczny reset hasla
3. pelne usuwanie uzytkownika
4. stabilne tworzenie kont przez backend administracyjny

## 1. SQL

Uruchom w SQL Editor:

- `supabase/admin-users-backend.sql`

To doda:

- kolumne `profiles.operator_number`
- unikalnosc `operator_number`
- unikalnosc `profiles.user_id` potrzebna do bezpiecznego `upsert`

## 2. Sekrety Edge Function

Ustaw w Supabase secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 3. Deploy funkcji

Nazwa funkcji:

- `admin-users`

Pliki:

- `supabase/functions/admin-users/index.ts`
- `supabase/functions/_shared/cors.ts`

Po deployu frontend wywola funkcje przez:

- `supabase.functions.invoke("admin-users")`

## 4. Obslugiwane akcje

- `list`
- `create`
- `update`
- `reset-password`
- `delete`

## 5. Uwagi

- tylko administrator z `profiles.role = admin` ma dostep
- reset hasla i usuwanie konta sa wykonywane przez `service role`
- funkcja blokuje usuniecie aktualnie zalogowanego administratora
- funkcja blokuje reset wlasnego hasla z tego narzedzia
