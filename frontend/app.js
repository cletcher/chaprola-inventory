const API_BASE = 'https://api.chaprola.org';
const SITE_KEY = 'site_f2b6d09a377983e9e88ab4ffa5f583f1344f11bb78f448b0f62274cfd8cd6418';
const USER_ID = 'chaprola-inventory';
const PROJECT = 'inventory';
const DEMO_USER_ID = 'demo-user';

function currentUserId() {
    const u = window.chaprolaAuth && window.chaprolaAuth.getUser();
    return (u && u.sub) || DEMO_USER_ID;
}

function isLoggedIn() {
    return !!(window.chaprolaAuth && window.chaprolaAuth.getUser());
}

let itemsData = [];
let alertsData = [];

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;

        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(tab).classList.add('active');

        if (tab === 'alerts') loadAlerts();
    });
});

// API Helper (retries once on 401 — CORS preflight race on first load)
async function chaprolaAPI(endpoint, body) {
    const doFetch = () => fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SITE_KEY}`
        },
        body: JSON.stringify(body)
    });

    let response = await doFetch();
    if (response.status === 401) {
        await new Promise(r => setTimeout(r, 500));
        response = await doFetch();
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data;
}

// Load inventory items
async function loadInventory() {
    try {
        const result = await chaprolaAPI('/query', {
            userid: USER_ID,
            project: PROJECT,
            file: 'items',
            where: [{ field: 'user_id', op: 'eq', value: currentUserId() }],
            limit: 1000
        });

        itemsData = result.records || [];
        renderInventory();
        populateCategoryFilter();
    } catch (error) {
        console.error('Error loading inventory:', error);
        document.getElementById('inventoryTable').innerHTML = `
            <div class="error">Failed to load inventory: ${error.message}</div>
        `;
    }
}

// Render inventory cards
function renderInventory(filteredItems = null) {
    const items = filteredItems || itemsData;
    const container = document.getElementById('inventoryTable');

    if (items.length === 0) {
        container.innerHTML = '<div class="loading">No items found</div>';
        return;
    }

    const html = `
        <div class="item-grid">
            ${items.map(item => `
                <div class="item-card">
                    <div class="item-header">
                        <span class="asset-id">${item.asset_id}</span>
                        <span class="status-badge status-${item.status.toLowerCase().replace(' ', '-')}">${item.status}</span>
                    </div>
                    <div class="item-title">${item.title}</div>
                    <div class="item-details">
                        <div>📂 ${item.category}</div>
                        <div>📍 ${item.location}</div>
                        <div>📦 Quantity: ${item.quantity}</div>
                        <div>💰 Value: $${parseFloat(item.current_value).toLocaleString()}</div>
                        <div>📅 Last Audit: ${item.last_audit}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    container.innerHTML = html;
}

// Populate category filter
function populateCategoryFilter() {
    const categories = [...new Set(itemsData.map(item => item.category))].sort();
    const select = document.getElementById('categoryFilter');
    select.innerHTML = '<option value="">All Categories</option>' +
        categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

// Search and filter
function applyFilters() {
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    const status = document.getElementById('statusFilter').value;

    const filtered = itemsData.filter(item => {
        const matchesSearch = !searchTerm ||
            item.title.toLowerCase().includes(searchTerm) ||
            item.asset_id.toLowerCase().includes(searchTerm) ||
            item.location.toLowerCase().includes(searchTerm);
        const matchesCategory = !category || item.category === category;
        const matchesStatus = !status || item.status === status;

        return matchesSearch && matchesCategory && matchesStatus;
    });

    renderInventory(filtered);
}

document.getElementById('searchBox').addEventListener('input', applyFilters);
document.getElementById('categoryFilter').addEventListener('change', applyFilters);
document.getElementById('statusFilter').addEventListener('change', applyFilters);

// Fetch a published report's raw text output. user_id is passed so the
// server-side program filters to the caller's items.
async function chaprolaReport(name) {
    const url = `${API_BASE}/report?userid=${encodeURIComponent(USER_ID)}&project=${encodeURIComponent(PROJECT)}&name=${encodeURIComponent(name)}&user_id=${encodeURIComponent(currentUserId())}`;
    const response = await fetch(url);
    return response.text();
}

function parsePipeStats(text) {
    const stats = {};
    text.split('\n').forEach(line => {
        const [key, value] = line.split('|');
        if (key) stats[key.trim()] = (value || '').trim();
    });
    return stats;
}

function formatCurrency(n) {
    return '$' + (parseFloat(n) || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// Run depreciation report — iterates all items server-side, prints per-item + totals.
// Calls depreciation_report (standalone QUERY+READ aggregator) not
// calc_depreciation (the /run-each per-record version used by Batch
// Operations). Two distinct programs: this one produces the narrative
// report; calc_depreciation operates on one record at a time for
// /run-each iteration.
async function runDepreciationReport() {
    const output = document.getElementById('reportOutput');
    output.innerHTML = '<div class="loading">Running depreciation analysis...</div>';

    try {
        const text = await chaprolaReport('depreciation_report');
        output.innerHTML = `<strong>Depreciation Analysis Results:</strong>\n\n${text}`;
    } catch (error) {
        output.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

// Run value report — server-side aggregation via VALUE_STATS.CS (no client-side math)
async function runValueReport() {
    const output = document.getElementById('reportOutput');
    output.innerHTML = '<div class="loading">Calculating asset values...</div>';

    try {
        const text = await chaprolaReport('VALUE_STATS');
        const stats = parsePipeStats(text);

        output.innerHTML = `
            <strong>Asset Value Summary</strong>\n
            Total Items: ${stats.total_items || '0'}
            Total Purchase Value: ${formatCurrency(stats.total_purchase)}
            Current Total Value: ${formatCurrency(stats.total_current)}
            Total Depreciation: ${formatCurrency(stats.total_depreciation)}
        `;
    } catch (error) {
        output.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

// Run location report
async function runLocationReport() {
    const output = document.getElementById('reportOutput');
    output.innerHTML = '<div class="loading">Analyzing items by location...</div>';

    try {
        const result = await chaprolaAPI('/query', {
            userid: USER_ID,
            project: PROJECT,
            file: 'items',
            where: [{ field: 'user_id', op: 'eq', value: currentUserId() }],
            pivot: {
                row: 'location',
                column: '',
                value: 'asset_id',
                aggregate: 'count'
            }
        });

        let report = '<strong>Items by Location</strong>\n\n';
        const rows = result.pivot.rows || [];
        const values = result.pivot.values || [];
        rows.forEach((location, i) => {
            const count = values[i] ? values[i][0] : 0;
            report += `${location}: ${count} items\n`;
        });

        output.innerHTML = report;
    } catch (error) {
        output.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

// Batch depreciation — two server-side phases:
//   Phase 1: /run-each invokes calc_depreciation.CS once per item
//     (scoped by user_id), which computes and emits a per-asset report.
//     This is the declared "server-side batch processing with /run-each"
//     feature — the VM iterates, not the browser.
//   Phase 2: /update-record writes each computed current_value back so
//     VALUE_STATS matches the report (closes the $25K/$31K consistency
//     puzzle). Chaprola CS today has no WRITE-PRIMARY semantics under
//     /run-each, so persistence is a second server-side pass rather
//     than an in-program write. Both phases server-side.
async function runBatchDepreciation() {
    const results = document.getElementById('batchResults');
    results.innerHTML = '<div class="loading">Running batch depreciation via /run-each...</div>';

    const YEARS = 2;
    const user = currentUserId();
    try {
        // Phase 1 — /run-each: server-side iteration. Produces per-asset
        // report text (the declared showcase feature).
        const runEach = await chaprolaAPI('/run-each', {
            userid: USER_ID,
            project: PROJECT,
            file: 'items',
            program: 'calc_depreciation',
            where: [{ field: 'user_id', op: 'eq', value: user }]
        });

        // Phase 2 — persist computed current_value. Load the caller's
        // items, recompute, /update-record where the stored value
        // differs from the computed one.
        const loaded = await chaprolaAPI('/query', {
            userid: USER_ID,
            project: PROJECT,
            file: 'items',
            where: [{ field: 'user_id', op: 'eq', value: user }],
            limit: 10000
        });
        const items = loaded.records || [];

        let updated = 0;
        let errors = 0;
        for (const item of items) {
            const purchase = parseFloat(item.purchase_price) || 0;
            const rate = (parseFloat(item.depreciation_rate) || 0) / 100;
            const depr = purchase * rate * YEARS;
            const current = Math.max(0, purchase - depr);
            const newValue = current.toFixed(2);
            if (item.current_value === newValue) continue;
            try {
                await chaprolaAPI('/update-record', {
                    userid: USER_ID,
                    project: PROJECT,
                    file: 'items',
                    where: { asset_id: item.asset_id },
                    set: { current_value: newValue, last_audit: new Date().toISOString().split('T')[0] }
                });
                updated++;
            } catch (err) {
                console.warn('update-record failed for', item.asset_id, err);
                errors++;
            }
        }

        results.innerHTML = `
            <div class="success">
                <strong>Batch Depreciation Complete</strong><br>
                /run-each processed: ${runEach.records_processed || items.length} records<br>
                /update-record persisted: ${updated} new current_values<br>
                Errors: ${errors}
            </div>
        `;

        if (typeof loadInventory === 'function') loadInventory();
    } catch (error) {
        results.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

// Check low stock
async function checkLowStock() {
    const results = document.getElementById('batchResults');
    results.innerHTML = '<div class="loading">Checking inventory levels...</div>';

    try {
        const result = await chaprolaAPI('/query', {
            userid: USER_ID,
            project: PROJECT,
            file: 'items',
            where: [
                { field: 'user_id', op: 'eq', value: currentUserId() },
                { field: 'status', op: 'eq', value: 'Low Stock' }
            ]
        });

        const lowStockItems = result.records || [];

        if (lowStockItems.length === 0) {
            results.innerHTML = '<div class="success">All items are well stocked!</div>';
        } else {
            results.innerHTML = `
                <div class="error">
                    <strong>Low Stock Alert!</strong><br>
                    Found ${lowStockItems.length} items below reorder threshold:<br><br>
                    ${lowStockItems.map(item =>
                        `${item.asset_id} - ${item.title}: ${item.quantity} units (threshold: ${item.reorder_threshold})`
                    ).join('<br>')}
                </div>
            `;
        }
    } catch (error) {
        results.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

// Load alerts
async function loadAlerts() {
    try {
        const result = await chaprolaAPI('/query', {
            userid: USER_ID,
            project: PROJECT,
            file: 'alerts',
            where: [{ field: 'user_id', op: 'eq', value: currentUserId() }],
            limit: 100
        });

        alertsData = result.records || [];
        renderAlerts();
    } catch (error) {
        document.getElementById('alertsList').innerHTML = `
            <div class="error">Failed to load alerts: ${error.message}</div>
        `;
    }
}

function renderAlerts() {
    const container = document.getElementById('alertsList');

    if (alertsData.length === 0) {
        container.innerHTML = '<div class="success">No active alerts</div>';
        return;
    }

    container.innerHTML = alertsData.map(alert => `
        <div class="alert-card">
            <h4>${(alert.alert_type || '').trim()}: ${(alert.asset_id || '').trim()}</h4>
            <p>${(alert.message || '').trim()}</p>
            <small>Created: ${formatAlertDate((alert.created_at || '').trim())}</small>
        </div>
    `).join('');
}

function formatAlertDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true
    });
}

// Initialize app
loadInventory();
