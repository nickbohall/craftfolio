alter table projects
  add column status text not null default 'completed'
    check (status in ('not_started', 'in_progress', 'completed', 'abandoned')),
  add column date_started date,
  add column hours_logged numeric;
