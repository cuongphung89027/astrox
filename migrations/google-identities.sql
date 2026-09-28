-- Google OIDC identity support (plan Task 11).
-- Reuses the existing identity abstraction: zalo_identities already carries a
-- generic provider column with UNIQUE(provider, provider_subject), and
-- oauth_states already stores PKCE verifiers. Only the OIDC nonce column is
-- new. No VN data is renamed or rewritten; Zalo rows are untouched.

ALTER TABLE oauth_states ADD COLUMN nonce TEXT NOT NULL DEFAULT '';

-- Diagnostic trail mirrors login_diagnostics usage by the Zalo flow.
CREATE INDEX IF NOT EXISTS zalo_identities_provider_subject
  ON zalo_identities(provider, provider_subject);

-- Email is contact information, never an account key (plan §C/5, AUTH-02):
-- a Google account and a Zalo account may legitimately share an email without
-- being linked. The legacy partial unique index is replaced by a plain lookup
-- index so colliding emails coexist.
DROP INDEX IF EXISTS idx_app_users_email;
CREATE INDEX IF NOT EXISTS idx_app_users_email_lookup ON app_users(email) WHERE email IS NOT NULL;
