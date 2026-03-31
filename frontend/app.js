const API_BASE = 'https://api.chaprola.org';
const API_KEY = 'REDACTED_OLD_INVENTORY_KEY';
const USER_ID = 'chaprola-inventory';
const PROJECT = 'inventory';

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

// API Helper
async function chaprolaAPI(endpoint, body) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify(body)
    });

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
            limit: 1000
        });

        itemsData = result.results || [];
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

// Run depreciation report
async function runDepreciationReport() {
    const output = document.getElementById('reportOutput');
    output.innerHTML = '<div class="loading">Running depreciation analysis...</div>';

    try {
        const result = await chaprolaAPI('/run', {
            userid: USER_ID,
            project: PROJECT,
            name: 'calc_depreciation',
            primary_file: 'items',
            record: 1
        });

        output.innerHTML = `<strong>Depreciation Analysis Results:</strong>\n\n${result.output}`;
    } catch (error) {
        output.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

// Run value report
async function runValueReport() {
    const output = document.getElementById('reportOutput');
    output.innerHTML = '<div class="loading">Calculating asset values...</div>';

    try {
        const result = await chaprolaAPI('/query', {
            userid: USER_ID,
            project: PROJECT,
            file: 'items',
            aggregate: [
                {field: 'current_value', func: 'sum'},
                {field: 'purchase_price', func: 'sum'},
                {field: 'asset_id', func: 'count'}
            ]
        });

        const totalValue = parseFloat(result.aggregates.current_value_sum).toLocaleString('en-US', {minimumFractionDigits: 2});
        const totalPurchase = parseFloat(result.aggregates.purchase_price_sum).toLocaleString('en-US', {minimumFractionDigits: 2});
        const count = result.aggregates.asset_id_count;

        output.innerHTML = `
            <strong>Asset Value Summary</strong>\n
            Total Items: ${count}
            Total Purchase Value: $${totalPurchase}
            Current Total Value: $${totalValue}
            Total Depreciation: $${(parseFloat(result.aggregates.purchase_price_sum) - parseFloat(result.aggregates.current_value_sum)).toLocaleString('en-US', {minimumFractionDigits: 2})}
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
            pivot: {
                row: 'location',
                column: '',
                value: 'asset_id',
                aggregate: 'count'
            }
        });

        let report = '<strong>Items by Location</strong>\n\n';
        for (const [location, count] of Object.entries(result.pivot.rows)) {
            report += `${location}: ${count} items\n`;
        }

        output.innerHTML = report;
    } catch (error) {
        output.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

// Run batch depreciation using /run-each
async function runBatchDepreciation() {
    const results = document.getElementById('batchResults');
    results.innerHTML = '<div class="loading">Running batch depreciation calculation on server...</div>';

    try {
        const result = await chaprolaAPI('/run-each', {
            userid: USER_ID,
            project: PROJECT,
            file: 'items',
            program: 'calc_depreciation'
        });

        results.innerHTML = `
            <div class="success">
                <strong>Batch Operation Complete!</strong><br>
                Processed ${result.records_processed} records in ${result.elapsed_ms}ms<br>
                Records modified: ${result.records_modified}<br>
                Errors: ${result.errors}
            </div>
        `;
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
            where: {field: 'status', op: 'eq', value: 'Low Stock'}
        });

        const lowStockItems = result.results || [];

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
            limit: 100
        });

        alertsData = result.results || [];
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
            <h4>${alert.alert_type}: ${alert.asset_id}</h4>
            <p>${alert.message}</p>
            <small>Created: ${alert.created_date} | Severity: ${alert.severity}</small>
        </div>
    `).join('');
}

// Initialize app
loadInventory();
