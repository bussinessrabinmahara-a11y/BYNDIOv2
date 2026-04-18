-- M-11: Enforce Seller Approval via RLS
-- Sellers must have approval_status = 'approved' to list products

-- 1. Ensure the column exists and has proper constraints
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' 
CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- 2. Update existing verified sellers to 'approved' for consistency
UPDATE sellers SET approval_status = 'approved' WHERE is_verified = true;

-- 3. RLS Policy: Block product insertion for unapproved sellers
DROP POLICY IF EXISTS "Sellers can only insert if approved" ON products;
CREATE POLICY "Sellers can only insert if approved" ON products
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sellers
    WHERE sellers.id = auth.uid()
    AND sellers.approval_status = 'approved'
  )
);

-- 4. RLS Policy: Block product updates for unapproved sellers (Safety)
DROP POLICY IF EXISTS "Sellers can only update if approved" ON products;
CREATE POLICY "Sellers can only update if approved" ON products
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM sellers
    WHERE sellers.id = auth.uid()
    AND sellers.approval_status = 'approved'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sellers
    WHERE sellers.id = auth.uid()
    AND sellers.approval_status = 'approved'
  )
);
