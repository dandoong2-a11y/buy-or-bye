# 기기 동기화 설정 (선택)

PC와 폰에서 같은 기록을 보고 싶을 때만 하면 돼요. 한 번만 하면 되고, 무료예요.

## 1. Supabase 프로젝트 만들기
1. <https://supabase.com> 에 가입하고 **New project** 를 만들어요. (이름과 DB 비밀번호는 아무거나)
2. 만들어지면 **Project Settings > API** 에서 두 가지를 복사해 둬요.
   - `Project URL` (https://xxxx.supabase.co)
   - `anon public` 키

## 2. 저장 공간 만들기
왼쪽 메뉴 **SQL Editor** > New query 에 아래를 통째로 붙여넣고 **Run** 을 눌러요.

```sql
create table if not exists bob_data (
  code text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
-- 정책이 없으므로 표를 직접 읽거나 쓸 수 없고, 아래 함수로만 접근해요.
alter table bob_data enable row level security;

create or replace function bob_get(p_code text) returns jsonb
language sql security definer set search_path = public as $$
  select data from bob_data where code = p_code and length(p_code) >= 16
$$;

create or replace function bob_set(p_code text, p_data jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if length(p_code) < 16 then raise exception 'code too short'; end if;
  insert into bob_data(code, data) values (p_code, p_data)
  on conflict (code) do update set data = excluded.data, updated_at = now();
end $$;

grant execute on function bob_get(text), bob_set(text, jsonb) to anon;
```

## 3. 사이트에서 연결
1. `buy-or-bye.html` > 설정 > **기기 동기화** 에 주소, anon 키를 붙여넣어요.
2. 동기화 코드는 **만들기** 를 눌러요. (이 코드가 비밀번호 역할이라 남에게 알려주지 마세요.)
3. **연결하기** 를 눌러요.
4. 다른 기기에서도 같은 주소, 키, 코드를 입력하면 같은 기록이 보여요.

## 알아두기
- 로그인 없이 코드로만 구분하는 방식이라, 코드를 아는 사람은 기록을 볼 수 있어요. 개인 소비 기록용으로 만든 가벼운 방식이에요.
- 두 기기를 동시에 수정하면 나중에 저장한 쪽이 이겨요. (20초마다, 또는 앱을 다시 열 때 서버 기록을 확인해요.)
- 인터넷이 끊겨도 이 기기에는 저장되고, 다시 연결되면 서버에 올라가요.
