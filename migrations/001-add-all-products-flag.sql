-- Add applies_to_all_products flag to product_product_owners
ALTER TABLE product_product_owners
ADD COLUMN applies_to_all_products boolean NOT NULL DEFAULT false;

-- (Optional) Create a partial index for fast lookup of global owners
CREATE INDEX IF NOT EXISTS idx_product_product_owners_applies_all ON product_product_owners (user_id) WHERE applies_to_all_products = true;
