ALTER TABLE registrations ADD COLUMN receipt_status TEXT NOT NULL DEFAULT 'not_sent' CHECK (receipt_status IN ('not_sent', 'pending', 'accepted', 'failed'));
