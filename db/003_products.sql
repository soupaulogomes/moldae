CREATE TABLE IF NOT EXISTS products(id uuid PRIMARY KEY,tenant_id uuid NOT NULL DEFAULT nullif(current_setting('app.tenant_id',true),'')::uuid REFERENCES tenants(id),name text NOT NULL,description text NOT NULL DEFAULT '',input jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE products ENABLE ROW LEVEL SECURITY; ALTER TABLE products FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON products USING(tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid) WITH CHECK(tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid);
CREATE INDEX products_tenant_idx ON products(tenant_id);
REVOKE ALL ON products FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='moldae_app') THEN GRANT SELECT,INSERT,UPDATE,DELETE ON products TO moldae_app; END IF; END $$;

DO $$ DECLARE role_name text; BEGIN FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN EXECUTE format('REVOKE ALL ON products FROM %I',role_name); END IF; END LOOP; END $$;
