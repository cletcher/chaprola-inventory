// VALUE_STATS — Asset inventory value summary (server-side aggregation)
// Primary: items
// Output: pipe-delimited key|value pairs for app.js to parse

OPEN PRIMARY "items"

LET total_items = 0
LET total_purchase = 0
LET total_current = 0
LET total_depr = 0
LET purchase = 0
LET current = 0
LET rec = 1

100 SEEK rec
    IF EOF GOTO 200 ;
    GET purchase FROM P.purchase_price
    GET current FROM P.current_value
    LET total_items = total_items + 1
    LET total_purchase = total_purchase + purchase
    LET total_current = total_current + current
    LET rec = rec + 1
    GOTO 100

200 LET total_depr = total_purchase - total_current
    PRINT "total_items|" + total_items
    PRINT "total_purchase|" + total_purchase
    PRINT "total_current|" + total_current
    PRINT "total_depreciation|" + total_depr
