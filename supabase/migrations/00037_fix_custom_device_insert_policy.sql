-- Add policy to allow inserting devices with NULL room_id (unassigned devices)
DROP POLICY IF EXISTS "Users can insert unassigned devices" ON devices;

CREATE POLICY "Users can insert unassigned devices"
ON devices
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND room_id IS NULL
);

-- Also ensure the existing policy for own devices works correctly
DROP POLICY IF EXISTS "Users can create own devices" ON devices;

CREATE POLICY "Users can create own devices"
ON devices
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    room_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM rooms 
      WHERE rooms.id = devices.room_id 
      AND rooms.user_id = auth.uid()
    )
  )
);