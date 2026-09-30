CREATE TABLE customers(id uuid PRIMARY KEY,tenant_id uuid NOT NULL DEFAULT nullif(current_setting('app.tenant_id',true),'')::uuid REFERENCES tenants(id),name text NOT NULL,email text NOT NULL DEFAULT '',phone text NOT NULL DEFAULT '',notes text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(tenant_id,id));
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;ALTER TABLE customers FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON customers USING(tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid) WITH CHECK(tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid);
CREATE INDEX customers_tenant_idx ON customers(tenant_id);
ALTER TABLE quotes ADD COLUMN customer_id uuid,ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE quotes ADD CONSTRAINT quotes_customer_tenant_fk FOREIGN KEY(tenant_id,customer_id) REFERENCES customers(tenant_id,id);
REVOKE ALL ON customers FROM PUBLIC;
DO $$ DECLARE role_name text; BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='moldae_app') THEN GRANT SELECT,INSERT,UPDATE,DELETE ON customers TO moldae_app; END IF; FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN EXECUTE format('REVOKE ALL ON customers FROM %I',role_name); END IF; END LOOP; END $$;
