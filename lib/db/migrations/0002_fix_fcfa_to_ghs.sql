-- Fix any existing records that have FCFA currency to use GHS instead.
-- FCFA was a leftover from the West Africa template; VOOM targets Ghana (GHS).
-- Daily rates stored in FCFA are converted: 1 GHS ≈ 37.5 FCFA, so divide by 38.
UPDATE cars
  SET currency = 'GHS',
      daily_rate = GREATEST(50, ROUND(daily_rate / 38.0)::int)
  WHERE currency = 'FCFA';

UPDATE bookings
  SET currency = 'GHS',
      total_amount = GREATEST(50, ROUND(total_amount / 38.0)::int)
  WHERE currency = 'FCFA';

UPDATE payments
  SET currency = 'GHS',
      amount = GREATEST(50, ROUND(amount / 38.0)::int)
  WHERE currency = 'FCFA';
