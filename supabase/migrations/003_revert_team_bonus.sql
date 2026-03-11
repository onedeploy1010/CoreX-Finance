-- Revert process_team_bonus: each level leader gets their FULL bonus rate
-- V1=8%, V2=13%, V3=18%, etc. (not differential)
-- Only the first leader at each new higher level gets bonus
-- Same-level leaders get equal-level bonus 10%

CREATE OR REPLACE FUNCTION process_team_bonus(p_order_id INTEGER, p_earning DECIMAL)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_current members%ROWTYPE;
  v_leader members%ROWTYPE;
  v_prev_level INTEGER := -1;
  v_bonus_rate INTEGER;
  v_team_reward DECIMAL;
  v_equal_bonus DECIMAL;
  v_level_configs INTEGER[] := ARRAY[0, 8, 13, 18, 22, 26, 30, 33]; -- bonus rates per level
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  SELECT * INTO v_current FROM members WHERE wallet_address = v_order.wallet_address;

  WHILE v_current.referrer_address IS NOT NULL LOOP
    SELECT * INTO v_leader FROM members WHERE wallet_address = v_current.referrer_address;
    IF NOT FOUND THEN
      EXIT;
    END IF;

    IF v_leader.level >= 1 THEN
      v_bonus_rate := v_level_configs[v_leader.level + 1];

      -- Only give bonus if this leader's level is HIGHER than any previously seen
      IF v_prev_level >= 0 AND v_prev_level >= v_leader.level THEN
        v_bonus_rate := 0;
      END IF;

      IF v_bonus_rate > 0 THEN
        v_team_reward := p_earning * v_bonus_rate / 100;
        IF v_team_reward > 0 THEN
          INSERT INTO rewards (wallet_address, type, amount, from_address, from_order_id, description)
          VALUES (v_leader.wallet_address, 'team_bonus', v_team_reward,
                  v_order.wallet_address, p_order_id,
                  'V' || v_leader.level || ' team bonus ' || v_bonus_rate || '%');
        END IF;
      END IF;

      -- Equal-level bonus (10%)
      IF v_prev_level >= 1 AND v_leader.level = v_prev_level THEN
        v_equal_bonus := p_earning * 10 / 100;
        IF v_equal_bonus > 0 THEN
          INSERT INTO rewards (wallet_address, type, amount, from_address, from_order_id, description)
          VALUES (v_leader.wallet_address, 'team_bonus', v_equal_bonus,
                  v_order.wallet_address, p_order_id,
                  'V' || v_leader.level || ' equal-level bonus 10%');
        END IF;
      END IF;

      IF v_leader.level > v_prev_level THEN
        v_prev_level := v_leader.level;
      END IF;
    END IF;

    v_current := v_leader;
  END LOOP;
END;
$$;
