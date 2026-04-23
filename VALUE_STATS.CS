// VALUE_STATS — Asset inventory value summary for the caller
// Primary: items (expected column: user_id varchar 40, added via /alter)
// Multi-user: scoped by PARAM.user_id (from chp_user_ token or
// passed explicitly by anonymous /report callers as 'demo-user').
// Output: pipe-delimited key|value pairs for app.js to parse.

OPEN PRIMARY "items"

QUERY items INTO mine WHERE user_id EQ PARAM.user_id

LET total_items = 0
LET total_purchase = 0
LET total_current = 0
LET total_depr = 0
LET purchase = 0
LET current = 0
LET rec = 1

100 READ mine rec
    IF EOF GOTO 200 ;
    GET purchase FROM mine.purchase_price
    GET current FROM mine.current_value
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
