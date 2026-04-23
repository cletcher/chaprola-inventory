// calc_depreciation — per-asset depreciation line (for /run-each)
// The /run-each endpoint invokes this program once per matching item
// (filtered by user_id in the /run-each where clause). On each call,
// the current record is in the P buffer. Computes current_value =
// purchase_price - purchase_price * rate * years. Emits one
// pipe-delimited line per asset. The persistence write-back is done
// by the frontend's /update-record loop in the same batch operation.

OPEN PRIMARY "items"

LET purchase = 0
LET rate = 0
LET years = 2
LET depr = 0
LET current = 0

GET purchase FROM P.purchase_price
GET rate FROM P.depreciation_rate
LET rate = rate / 100
LET depr = purchase * rate
LET depr = depr * years
LET current = purchase - depr
IF current LT 0 LET current = 0 ;

PRINT P.asset_id + "|" + P.title + "|" + P.purchase_price + "|" + depr + "|" + current
