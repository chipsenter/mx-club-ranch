-- Optional signed waiver uploaded with a signup. The file itself is only emailed to staff, never stored.
ALTER TABLE registrations ADD COLUMN waiver_status TEXT NOT NULL DEFAULT 'none' CHECK (waiver_status IN ('none', 'pending', 'emailed', 'failed'));
