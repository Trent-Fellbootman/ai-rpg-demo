# README

This manual migration MUST be run between prisma migrations
[20240929044801_add_first_scene_fields_to_game_template](../../prisma/migrations/20240929044801_add_first_scene_fields_to_game_template)
and
[20240929045123_remove_default_values_for_first_scene_fields_in_game_template](../../prisma/migrations/20240929045123_remove_default_values_for_first_scene_fields_in_game_template).

The former prisma migration adds placeholder values for first scene fields
(image descriptions, proposed actions, etc.);
this migration script looks at each game template,
finds an arbitrary child game session
and copies the first scene data into the corresponding fields in the game template
(images are copied in storage instead of reused);
the latter prisma migration removes the default values for the first scene fields.

Since this script only populates fields in existing game templates,
it is theoretically fine to ignore it when creating a new database from scratch.
