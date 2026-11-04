-- Rider ticked "I already signed a {season} waiver" (e.g. handed in paper earlier). Self-reported, never verified.
ALTER TABLE registrations ADD COLUMN waiver_claimed INTEGER NOT NULL DEFAULT 0 CHECK (waiver_claimed IN (0, 1));
