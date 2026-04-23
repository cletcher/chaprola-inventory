// list_items — asset listing for one user
// Multi-user: scoped by PARAM.user_id matching items.user_id. Frontend
// supplies current user's sub (or "demo-user" anonymous).

OPEN PRIMARY "items"

QUERY items INTO mine WHERE user_id EQ PARAM.user_id ORDER BY asset_id

LET rec = 1

PRINT "asset_id|title|category|status|quantity"

100 READ mine rec
    IF EOF END
    PRINT mine.asset_id + "|" + mine.title + "|" + mine.category + "|" + mine.status + "|" + mine.quantity
    LET rec = rec + 1
    GOTO 100
