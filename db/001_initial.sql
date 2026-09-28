CREATE TABLE IF NOT EXISTS materials (
 id uuid PRIMARY KEY, name text NOT NULL, unit text NOT NULL CHECK(unit IN ('g','un')), quantity numeric(16,4) NOT NULL DEFAULT 0 CHECK(quantity>=0), unit_cost numeric(16,6) NOT NULL DEFAULT 0 CHECK(unit_cost>=0), minimum numeric(16,4) NOT NULL DEFAULT 0 CHECK(minimum>=0), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS equipment (id uuid PRIMARY KEY,name text NOT NULL,kind text NOT NULL CHECK(kind IN ('impressora','ferramenta')),purchase_value numeric(16,2) NOT NULL CHECK(purchase_value>=0),watts numeric NOT NULL DEFAULT 0 CHECK(watts>=0),life_hours numeric NOT NULL DEFAULT 10000 CHECK(life_hours>0),used_hours numeric NOT NULL DEFAULT 0 CHECK(used_hours>=0),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS quotes (id uuid PRIMARY KEY,name text NOT NULL,customer text NOT NULL DEFAULT '',input jsonb NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS jobs (id uuid PRIMARY KEY,quote_id uuid NOT NULL REFERENCES quotes(id),material_id uuid NOT NULL REFERENCES materials(id),equipment_id uuid REFERENCES equipment(id),status text NOT NULL DEFAULT 'fila' CHECK(status IN ('fila','concluido','falha')),actual_grams numeric NOT NULL DEFAULT 0,actual_hours numeric NOT NULL DEFAULT 0,actual_cost numeric(16,2) NOT NULL DEFAULT 0,finished_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS sales (id uuid PRIMARY KEY,job_id uuid UNIQUE NOT NULL REFERENCES jobs(id),amount numeric(16,2) NOT NULL CHECK(amount>0),fees numeric(16,2) NOT NULL DEFAULT 0 CHECK(fees>=0 AND fees<=amount),cost numeric(16,2) NOT NULL CHECK(cost>=0),sold_on date NOT NULL,paid_on date,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS entries (id uuid PRIMARY KEY,kind text NOT NULL CHECK(kind IN ('receita','despesa','investimento','aporte','retirada','estoque')),description text NOT NULL,amount numeric(16,2) NOT NULL CHECK(amount>0),occurred_on date NOT NULL,source_id uuid,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS movements (id uuid PRIMARY KEY,material_id uuid NOT NULL REFERENCES materials(id),quantity numeric(16,4) NOT NULL CHECK(quantity<>0),unit_cost numeric(16,6) NOT NULL CHECK(unit_cost>=0),reason text NOT NULL,source_id uuid,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS entries_date_idx ON entries(occurred_on);
CREATE INDEX IF NOT EXISTS sales_date_idx ON sales(sold_on);

ALTER TABLE entries ADD COLUMN IF NOT EXISTS affects_result boolean NOT NULL DEFAULT false;

ALTER TABLE materials ADD COLUMN IF NOT EXISTS brand text NOT NULL DEFAULT '';
ALTER TABLE materials ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '';
ALTER TABLE materials ADD COLUMN IF NOT EXISTS color_hex text NOT NULL DEFAULT '#808080';
ALTER TABLE materials ADD COLUMN IF NOT EXISTS material_type text NOT NULL DEFAULT 'PLA';
ALTER TABLE materials ADD COLUMN IF NOT EXISTS image_url text NOT NULL DEFAULT '';
ALTER TABLE materials ADD COLUMN IF NOT EXISTS sku text NOT NULL DEFAULT '';
ALTER TABLE materials ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT '';
ALTER TABLE materials ADD COLUMN IF NOT EXISTS supplier text NOT NULL DEFAULT '';
ALTER TABLE materials ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS material_sku_unique ON materials(lower(sku)) WHERE sku<>'';

-- Manutenção e horas anteriores ao cadastro (sem alterar os registros existentes).
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS prior_hours numeric NOT NULL DEFAULT 0 CHECK(prior_hours>=0);
CREATE TABLE IF NOT EXISTS maintenance_plans (
 id uuid PRIMARY KEY,equipment_id uuid NOT NULL REFERENCES equipment(id),title text NOT NULL,
 interval_hours numeric CHECK(interval_hours>0),interval_days integer CHECK(interval_days>0),
 warn_hours numeric NOT NULL DEFAULT 0 CHECK(warn_hours>=0),warn_days integer NOT NULL DEFAULT 0 CHECK(warn_days>=0),
 baseline_hours numeric NOT NULL CHECK(baseline_hours>=0),baseline_on date NOT NULL,
 notes text NOT NULL DEFAULT '',active boolean NOT NULL DEFAULT true,version integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),CHECK(interval_hours IS NOT NULL OR interval_days IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS maintenance_logs (
 id uuid PRIMARY KEY,plan_id uuid NOT NULL REFERENCES maintenance_plans(id),equipment_id uuid NOT NULL REFERENCES equipment(id),
 title text NOT NULL,performed_on date NOT NULL,meter_hours numeric NOT NULL CHECK(meter_hours>=0),
 cost numeric(16,2) NOT NULL DEFAULT 0 CHECK(cost>=0),expense_recorded boolean NOT NULL DEFAULT false,
 notes text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS equipment_hour_logs (
 id uuid PRIMARY KEY,equipment_id uuid NOT NULL REFERENCES equipment(id),added_hours numeric NOT NULL CHECK(added_hours>0),
 reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS maintenance_equipment_idx ON maintenance_plans(equipment_id);
CREATE INDEX IF NOT EXISTS maintenance_history_idx ON maintenance_logs(equipment_id,performed_on);

ALTER TABLE materials ADD COLUMN IF NOT EXISTS cost_pending boolean NOT NULL DEFAULT false;
