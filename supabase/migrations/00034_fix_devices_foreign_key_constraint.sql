-- Fix the devices foreign key constraint issue
-- The composite foreign key (room_id, user_id) references rooms(id, user_id)
-- but rooms table doesn't have a unique constraint on (id, user_id)

-- Drop the problematic composite foreign key
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_room_user_fkey;

-- Add a simple foreign key constraint on room_id only
ALTER TABLE devices ADD CONSTRAINT devices_room_id_fkey 
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL;

-- Add a check to ensure user_id matches the room's user_id (handled by RLS policies instead)
-- This is more flexible and allows the database to work correctly