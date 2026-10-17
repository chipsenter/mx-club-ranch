CREATE TABLE contacts (
  email TEXT PRIMARY KEY COLLATE NOCASE,
  marketing_status TEXT NOT NULL DEFAULT 'not_subscribed'
    CHECK (marketing_status IN ('not_subscribed', 'opted_in', 'unsubscribed')),
  consent_at TEXT,
  consent_version TEXT,
  unsubscribed_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE registrations (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL REFERENCES contacts(email),
  event_id TEXT NOT NULL,
  rider_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  experience TEXT NOT NULL,
  bike TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  marketing_opt_in INTEGER NOT NULL CHECK (marketing_opt_in IN (0, 1)),
  consent_version TEXT,
  created_at TEXT NOT NULL,
  notification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (notification_status IN ('pending', 'accepted', 'failed'))
);
CREATE INDEX registrations_email ON registrations(email);
CREATE INDEX registrations_event ON registrations(event_id, created_at);
CREATE INDEX contacts_marketing ON contacts(marketing_status);
-- One contact per address, even if a parent registers multiple riders.
-- Honor campaign-provider unsubscribes here before any later export/send.
CREATE VIEW event_email_audience AS
SELECT email, consent_at, consent_version FROM contacts
WHERE marketing_status = 'opted_in' AND unsubscribed_at IS NULL;
