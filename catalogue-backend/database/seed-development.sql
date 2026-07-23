-- Brackets are [min_weight, max_weight); the final null maximum is unbounded.
INSERT INTO shipping_rates (min_weight, max_weight, charge) VALUES
  (0.0000, 5.0000, 7.95),
  (5.0000, 20.0000, 12.95),
  (20.0000, 50.0000, 19.95),
  (50.0000, NULL, 34.95)
ON CONFLICT (min_weight) DO UPDATE SET
  max_weight = EXCLUDED.max_weight,
  charge = EXCLUDED.charge;

-- Development stock matching the part numbers visible in the assignment catalog.
INSERT INTO inventory (part_number, quantity_on_hand)
SELECT part_number, 25
FROM generate_series(1, 25) AS series(part_number)
ON CONFLICT (part_number) DO UPDATE SET
  quantity_on_hand = EXCLUDED.quantity_on_hand,
  updated_at = CURRENT_TIMESTAMP;
