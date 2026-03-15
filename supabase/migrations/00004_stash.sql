alter table materials
  add column stash_unit text check (
    stash_unit in ('skeins', 'cards', 'yards', 'pieces')
  ),
  add column stash_status text not null default 'in_stash' check (
    stash_status in ('in_stash', 'used_up', 'reserved')
  );
