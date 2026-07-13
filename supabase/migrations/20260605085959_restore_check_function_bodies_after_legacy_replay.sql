begin;

alter database postgres reset check_function_bodies;
set check_function_bodies = on;

commit;
