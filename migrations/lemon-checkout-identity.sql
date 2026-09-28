-- Checkout ids are UUIDs; paid order ids are numeric and have a separate lifecycle.
ALTER TABLE lemon_orders ADD COLUMN lemon_checkout_id TEXT;
UPDATE lemon_orders SET lemon_checkout_id=lemon_order_id,lemon_order_id=NULL
WHERE status='pending' AND checkout_url IS NOT NULL AND lemon_order_id GLOB '*[^0-9]*';
