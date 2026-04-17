// calc_depreciation — Per-asset depreciation report over 2-year straight-line
// Primary: items
// Columns: asset_id, title, purchase, depr (2yr), current_value
// Followed by summary totals.

OPEN PRIMARY "items"

LET purchase = 0
LET rate = 0
LET years = 2
LET depr = 0
LET current = 0
LET total_purchase = 0
LET total_depr = 0
LET total_current = 0
LET count = 0
LET rec = 1

// Header row
MOVE BLANKS U.1 90
MOVE "Asset ID" U.1 8
MOVE "Title" U.15 5
MOVE "Purchase" U.50 8
MOVE "Depr (2yr)" U.62 10
MOVE "Current" U.76 7
PRINT 0

MOVE BLANKS U.1 90
MOVE "--------" U.1 8
MOVE "-----" U.15 5
MOVE "----------" U.50 10
MOVE "----------" U.62 10
MOVE "----------" U.76 10
PRINT 0

100 SEEK rec
    IF EOF GOTO 200 ;
    GET purchase FROM P.purchase_price
    GET rate FROM P.depreciation_rate
    LET rate = rate / 100
    LET depr = purchase * rate
    LET depr = depr * years
    LET current = purchase - depr
    LET count = count + 1
    LET total_purchase = total_purchase + purchase
    LET total_depr = total_depr + depr
    LET total_current = total_current + current
    MOVE BLANKS U.1 90
    MOVE P.asset_id U.1 12
    MOVE P.title U.15 28
    PUT purchase INTO U.46 14 D 2
    PUT depr INTO U.60 14 D 2
    PUT current INTO U.74 14 D 2
    PRINT 0
    LET rec = rec + 1
    GOTO 100

200 MOVE BLANKS U.1 90
    PRINT 0
    MOVE BLANKS U.1 90
    MOVE "TOTALS" U.1 6
    PUT count INTO U.8 3 I 0
    MOVE "items" U.13 5
    PUT total_purchase INTO U.46 14 D 2
    PUT total_depr INTO U.60 14 D 2
    PUT total_current INTO U.74 14 D 2
    PRINT 0
