// Helper functions
const PAGE_SIZE = 500;
let currentOffset = 0;
let currentAccountId = null;
let enrichmentPollInterval = null;
let enrichmentPollTimeout = null;

function pollEnrichmentStatus(steamId) {
    if (enrichmentPollInterval) clearInterval(enrichmentPollInterval);
    if (enrichmentPollTimeout) clearTimeout(enrichmentPollTimeout);

    enrichmentPollInterval = setInterval(async () => {
        try {
            const res = await fetch(`/api/enrich-status/${steamId}`);
            const data = await res.json();

            if (data.status === 'done') {
                clearInterval(enrichmentPollInterval);
                clearTimeout(enrichmentPollTimeout);
                enrichmentPollInterval = null;
                enrichmentPollTimeout = null;
                showNotification('✅ Verrijking voltooid! Gegevens bijgewerkt.');

                // If viewing untested section, reload untested games
                const untestedSection = document.getElementById('untested-section');
                if (untestedSection && untestedSection.style.display !== 'none') {
                    loadAllUntestedGames();
                }
                // If viewing games, refresh the list
                else {
                    const gamesSection = document.getElementById('games-section');
                    if (gamesSection && gamesSection.style.display !== 'none' && currentAccountId) {
                        loadGames(currentAccountId, currentOffset);
                    } else {
                        // On dashboard, reload to update counts
                        setTimeout(() => location.reload(), 500);
                    }
                }
            } else if (data.status === 'error') {
                clearInterval(enrichmentPollInterval);
                clearTimeout(enrichmentPollTimeout);
                enrichmentPollInterval = null;
                enrichmentPollTimeout = null;
                showNotification('Fout bij verrijking: ' + data.message, 'error');
            }
        } catch (e) {
            console.warn('Poll error:', e);
        }
    }, 3000);

    // Safety timeout: stop polling after 10 minutes
    enrichmentPollTimeout = setTimeout(() => {
        if (enrichmentPollInterval) {
            clearInterval(enrichmentPollInterval);
            enrichmentPollInterval = null;
        }
    }, 600000);
}
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    event?.target?.classList.add('active');
}

function showGamesTab() {
    showSection('games-section');
    document.querySelector('.nav-link:nth-child(2)').classList.add('active');
}

function showUntestedTab() {
    showSection('untested-section');
    document.querySelector('.nav-link:nth-child(3)').classList.add('active');
}

function showSettings() {
    showSection('settings');
    document.querySelector('.nav-link:nth-child(4)').classList.add('active');
    loadSettings();
}

function backToDashboard() {
    showSection('dashboard');
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector('.nav-link').classList.add('active');
    // Laad profiel info asynchroon
    loadProfilesAsync();
}

// Laad profiel info asynchroon na pagina load
async function loadProfilesAsync() {
    try {
        const res = await fetch('/api/profiles-all');
        const data = await res.json();

        // Update each account card met profiel info
        document.querySelectorAll('.account-card').forEach((card, idx) => {
            const accountId = idx + 1;
            const profileData = data[accountId];

            if (profileData && !profileData.error) {
                const nameEl = card.querySelector('h3');
                const avatarContainer = card.querySelector('.account-avatar');

                if (nameEl) {
                    nameEl.textContent = profileData.persona_name || 'Unknown';
                }

                if (avatarContainer && profileData.avatar_url) {
                    const img = avatarContainer.querySelector('img');
                    if (img) {
                        img.src = profileData.avatar_url;
                        img.style.display = 'block';
                    }
                }
            }
        });
    } catch (e) {
        console.warn('Error loading all profiles:', e);
    }
}

async function fetchProfileAsync(accountId, cardElement) {
    try {
        const res = await fetch(`/api/profile/${accountId}`);
        const data = await res.json();

        if (!data.error) {
            // Update card met profiel info
            const nameEl = cardElement.querySelector('h3');
            const avatarContainer = cardElement.querySelector('.account-avatar');

            if (nameEl) {
                nameEl.textContent = data.persona_name || 'Unknown';
            }

            if (avatarContainer && data.avatar_url) {
                const img = avatarContainer.querySelector('img');
                if (img) {
                    img.src = data.avatar_url;
                    img.style.display = 'block';
                }
            }
        }
    } catch (e) {
        console.warn('Profile loading skipped for account', accountId, 'Error:', e);
    }
}

function showNotification(message, type = 'success') {
    // Maak notification element
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#3fb950' : '#f85149'};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 1000;
    `;
    notif.textContent = message;
    document.body.appendChild(notif);

    setTimeout(() => notif.remove(), 3000);
}

function copyAppId(appid) {
    navigator.clipboard.writeText(appid).then(() => {
        showNotification(`📋 AppID ${appid} gekopieerd naar klembord`);
    }).catch(err => {
        console.error('Fout bij kopiëren:', err);
        showNotification('Fout bij kopiëren naar klembord', 'error');
    });
}

// Multi-select tracking
let selectedAppIds = new Set();

function toggleAppIdSelection(appid, checkbox) {
    if (checkbox.checked) {
        selectedAppIds.add(appid);
    } else {
        selectedAppIds.delete(appid);
    }
    updateSelectionUI();
}

function toggleSelectAll(selectAllCheckbox) {
    const checkboxes = document.querySelectorAll('input[data-appid-checkbox]');
    checkboxes.forEach(cb => {
        cb.checked = selectAllCheckbox.checked;
        const appid = cb.getAttribute('data-appid');
        if (selectAllCheckbox.checked) {
            selectedAppIds.add(parseInt(appid));
        } else {
            selectedAppIds.delete(parseInt(appid));
        }
    });
    updateSelectionUI();
}

function updateSelectionUI() {
    const btn = document.getElementById('copy-selected-btn');
    if (btn) {
        if (selectedAppIds.size > 0) {
            btn.style.display = 'inline-block';
            btn.textContent = `📋 Kopieer ${selectedAppIds.size} geselecteerde`;
        } else {
            btn.style.display = 'none';
        }
    }
}

function copySelectedAppIds() {
    if (selectedAppIds.size === 0) {
        showNotification('Geen games geselecteerd', 'error');
        return;
    }

    const ids = Array.from(selectedAppIds).sort((a, b) => a - b).join(', ');
    navigator.clipboard.writeText(ids).then(() => {
        showNotification(`📋 ${selectedAppIds.size} AppIDs gekopieerd: ${ids}`);
        selectedAppIds.clear();
        updateSelectionUI();
        // Uncheck all checkboxes
        document.querySelectorAll('input[data-appid-checkbox]').forEach(cb => cb.checked = false);
        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
    }).catch(err => {
        console.error('Fout bij kopiëren:', err);
        showNotification('Fout bij kopiëren naar klembord', 'error');
    });
}

// Settings
async function loadSettings() {
    try {
        const res = await fetch('/api/settings');
        const data = await res.json();

        console.log('Settings loaded:', data);

        document.getElementById('api-key').value = data.api_key;

        // Dynamisch accounts render
        const accountsList = document.getElementById('accounts-list');
        accountsList.innerHTML = '';

        if (data.accounts && data.accounts.length > 0) {
            console.log('Rendering', data.accounts.length, 'accounts');
            data.accounts.forEach((steamId, index) => {
                const accountNum = index + 1;
                const html = `
                    <div class="account-settings-item" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--secondary); border-radius: 6px; margin-bottom: 10px;">
                        <div style="flex: 1;">
                            <strong>Account ${accountNum}</strong>
                            <div style="font-family: monospace; color: #8b949e; font-size: 0.9em; margin-top: 4px;">${steamId}</div>
                        </div>
                        <button type="button" class="btn btn-danger" onclick="removeAccountImmediate('${steamId}')" style="padding: 8px 12px; white-space: nowrap;">🗑️ Verwijderen</button>
                    </div>
                `;
                accountsList.innerHTML += html;
            });
        } else {
            console.log('No accounts found');
            accountsList.innerHTML = '<p style="color: #8b949e;">Geen accounts ingesteld. Voeg er een toe!</p>';
        }
    } catch (e) {
        console.error('Error loading settings:', e);
        showNotification('Kon instellingen niet laden: ' + e, 'error');
    }
}

async function saveSettings() {
    // Verzamel API key
    const apiKey = document.getElementById('api-key').value;

    // Verzamel alle accounts
    const accounts = [];
    document.querySelectorAll('input[id^="steam-id-"]').forEach(input => {
        const value = input.value.trim();
        if (value && /^\d{17}$/.test(value)) {
            if (!accounts.includes(value)) {
                accounts.push(value);
            }
        }
    });

    if (accounts.length === 0) {
        showNotification('Voeg minstens 1 account in', 'error');
        return;
    }

    const data = {
        api_key: apiKey,
        accounts: accounts
    };

    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            showNotification('✅ Instellingen opgeslagen');
            setTimeout(() => location.reload(), 1500);
        } else {
            const err = await res.json();
            showNotification(err.message, 'error');
        }
    } catch (e) {
        showNotification('Fout bij opslaan: ' + e, 'error');
    }
}

function removeAccount(accountNum) {
    // Vind en verwijder het account veld
    const input = document.getElementById(`steam-id-${accountNum}`);
    if (input) {
        input.parentElement.parentElement.remove();
        showNotification('Account verwijderd. Klik Opslaan om te bevestigen.');
    }
}

async function removeAccountImmediate(steamId) {
    // Confirm deletion
    if (!confirm(`Account ${steamId} verwijderen?`)) {
        return;
    }

    try {
        const res = await fetch('/api/settings');
        const data = await res.json();

        // Filter out the account to delete
        const updatedAccounts = data.accounts.filter(id => id !== steamId);

        // Save immediately
        const saveRes = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: data.api_key,
                accounts: updatedAccounts
            })
        });

        if (saveRes.ok) {
            showNotification('✅ Account verwijderd');
            // Reload settings to refresh the list
            setTimeout(() => loadSettings(), 500);
        } else {
            showNotification('Fout bij verwijderen van account', 'error');
        }
    } catch (e) {
        showNotification('Fout: ' + e, 'error');
    }
}

async function addNewAccount() {
    const steamId = document.getElementById('new-steam-id').value.trim();

    if (!steamId) {
        showNotification('Voer een Steam ID in', 'error');
        return;
    }

    if (!/^\d{17}$/.test(steamId)) {
        showNotification('Steam ID moet uit 17 cijfers bestaan', 'error');
        return;
    }

    try {
        const res = await fetch('/api/add-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ steam_id: steamId })
        });

        const data = await res.json();

        if (res.ok) {
            showNotification('✅ Account toegevoegd!');
            document.getElementById('new-steam-id').value = '';
            setTimeout(() => location.reload(), 1500);
        } else {
            showNotification(data.message || data.error, 'error');
        }
    } catch (e) {
        showNotification('Fout bij toevoegen: ' + e, 'error');
    }
}

// Account actions
async function fetchAccount(accountId) {
    const btn = event.target;
    btn.disabled = true;
    btn.textContent = '⏳ Bezig...';

    try {
        const res = await fetch(`/api/fetch/${accountId}`, { method: 'POST' });
        const data = await res.json();

        if (res.ok) {
            showNotification(data.message);
            if (data.unknown_count > 0 && data.steam_id) {
                // Start polling for enrichment completion
                pollEnrichmentStatus(data.steam_id);
            } else {
                setTimeout(() => location.reload(), 1000);
            }
        } else {
            showNotification(data.message, 'error');
        }
    } catch (e) {
        showNotification('Fout bij ophalen: ' + e, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '⬇️ Ophalen';
    }
}

function viewGames(accountId) {
    currentAccountId = accountId;
    currentOffset = 0;
    document.getElementById('current-account').textContent = accountId;
    showSection('games-section');
    loadGames(accountId, currentOffset);
}

async function loadGames(accountId, offset = 0) {
    if (!accountId) {
        // Haal account ID uit de pagina
        accountId = document.getElementById('current-account').textContent;
    }

    currentAccountId = accountId;
    currentOffset = offset;

    const container = document.getElementById('games-container');
    container.innerHTML = '<p>⏳ Games laden...</p>';

    // Verzamel filter parameters
    const params = new URLSearchParams();
    const minMin = document.getElementById('min-minutes').value;
    const maxMin = document.getElementById('max-minutes').value;

    if (minMin) params.append('min_minutes', minMin);
    if (maxMin) params.append('max_minutes', maxMin);
    if (document.getElementById('only-zero').checked) params.append('only_zero', 'true');
    if (document.getElementById('exclude-zero').checked) params.append('exclude_zero', 'true');
    if (document.getElementById('paid-only').checked) params.append('paid_only', 'true');
    if (document.getElementById('free-only').checked) params.append('free_only', 'true');
    if (document.getElementById('sort-asc').checked) params.append('sort_asc', 'true');
    params.append('limit', PAGE_SIZE);
    params.append('offset', offset);

    try {
        const res = await fetch(`/api/games/${accountId}?${params}`);
        const data = await res.json();

        if (!res.ok) {
            container.innerHTML = `<p>❌ ${data.error}</p>`;
            return;
        }

        // Build table
        const totalHours = Number(data.total_hours ?? 0).toFixed(2);
        const rangeStart = data.offset + 1;
        const rangeEnd = data.offset + data.games.length;
        const hasPrev = data.offset > 0;
        const hasNext = data.has_more;

        let html = `
            <p style="padding: 10px 16px; color: #8b949e;">
                Totaal: ${Number(data.total).toLocaleString()} games (alle speeltijd opgeteld: ${Number(totalHours).toLocaleString()} uur)
                <br>
                Getoond: ${Number(rangeStart).toLocaleString()}-${Number(rangeEnd).toLocaleString()} (pagina-grootte ${Number(data.limit).toLocaleString()})
            </p>
            <button id="copy-selected-btn" class="btn btn-secondary" onclick="copySelectedAppIds()" style="display: none; margin-bottom: 12px;">📋 Kopieer geselecteerde</button>
            <table>
                <thead>
                    <tr>
                        <th style="width: 40px;"><input type="checkbox" id="select-all-checkbox" onchange="toggleSelectAll(this)"></th>
                        <th>AppID</th>
                        <th>Naam</th>
                        <th style="text-align: right;">Minuten</th>
                        <th style="text-align: right;">Uren</th>
                        <th>Type</th>
                    </tr>
                </thead>
                <tbody>
        `;

        for (const game of data.games) {
            const hours = (game.minutes / 60).toFixed(2);
            const storeUrl = `https://store.steampowered.com/app/${game.appid}`;

            let freeStatus = '<span class="status status-untested">❓ Untested</span>';
            if (game.is_free === true) {
                freeStatus = '<span class="status status-free">✅ Gratis</span>';
            } else if (game.is_free === false) {
                freeStatus = '<span class="status status-paid">💰 Betaald</span>';
            }

            html += `
                <tr>
                    <td style="text-align: center;"><input type="checkbox" data-appid-checkbox data-appid="${game.appid}" onchange="toggleAppIdSelection(${game.appid}, this)"></td>
                    <td><span style="color: #1f6feb; text-decoration: underline; cursor: pointer;" onclick="copyAppId(${game.appid})">${game.appid}</span></td>
                    <td><a href="${storeUrl}" target="_blank" style="color: #1f6feb; text-decoration: none; cursor: pointer;">${game.name}</a></td>
                    <td style="text-align: right;">${Number(game.minutes).toLocaleString()}</td>
                    <td style="text-align: right;">${Number(hours).toLocaleString()}h</td>
                    <td>${freeStatus}</td>
                </tr>
            `;
        }

        html += `</tbody></table>`;

        // Pagination controls
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
                <button class="btn btn-secondary" ${hasPrev ? '' : 'disabled'} onclick="loadGames('${accountId}', ${Math.max(data.offset - data.limit, 0)})">← Vorige ${data.limit}</button>
                <span style="color: #8b949e;">Pagina ${Math.floor(data.offset / data.limit) + 1} / ${Math.max(Math.ceil(data.total / data.limit), 1)}</span>
                <button class="btn btn-secondary" ${hasNext ? '' : 'disabled'} onclick="loadGames('${accountId}', ${data.offset + data.limit})">Volgende ${data.limit} →</button>
            </div>
        `;
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = `<p>❌ Fout: ${e}</p>`;
    }
}

function exportData(accountId, format) {
    globalThis.location.href = `/api/export/${accountId}/${format}`;
}

async function enrichFreeInfo(accountId) {
    const btn = event.target;
    btn.disabled = true;
    btn.textContent = '🔄 Bezig...';

    try {
        const res = await fetch(`/api/enrich/${accountId}`, { method: 'POST' });
        const data = await res.json();

        if (res.ok) {
            showNotification(data.message);
            if (data.steam_id) {
                pollEnrichmentStatus(data.steam_id);
            }
        } else {
            showNotification(data.error || 'Fout bij starten', 'error');
        }
    } catch (e) {
        showNotification('Fout: ' + e, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '🔄 Gratis Checken';
    }
}

// Untested games functions
async function loadAllUntestedGames() {
    const container = document.getElementById('untested-container');
    container.innerHTML = '<p>⏳ Untested games laden...</p>';

    try {
        const res = await fetch('/api/untested-games-all');
        const data = await res.json();

        if (!res.ok) {
            container.innerHTML = `<p>❌ ${data.error}</p>`;
            return;
        }

        if (data.count === 0) {
            container.innerHTML = '<p style="color: #3fb950;">✅ Geen untested games! Alle games zijn geclassificeerd.</p>';
            return;
        }

        // Build table
        let html = `
            <p style="padding: 10px 16px; color: #8b949e;">
                Totaal: ${data.count} untested games (gesorteerd op App ID)
            </p>
            <button id="copy-selected-untested-btn" class="btn btn-secondary" onclick="copySelectedUntestedAppIds()" style="display: none; margin-bottom: 12px;">📋 Kopieer geselecteerde</button>
            <table class="untested-table">
                <thead>
                    <tr>
                        <th style="width: 40px;"><input type="checkbox" id="select-all-untested-checkbox" onchange="toggleSelectAllUntested(this)"></th>
                        <th style="text-align: right;">AppID</th>
                        <th>Naam</th>
                        <th style="text-align: right;">Minuten</th>
                        <th style="text-align: center;">Classificeer</th>
                    </tr>
                </thead>
                <tbody>
        `;

        for (const game of data.games) {
            const hours = (game.minutes / 60).toFixed(2);
            const storeUrl = `https://store.steampowered.com/app/${game.appid}`;

            html += `
                <tr>
                    <td style="text-align: center;"><input type="checkbox" data-untested-appid-checkbox data-appid="${game.appid}" onchange="toggleUntestedAppIdSelection(${game.appid}, this)"></td>
                    <td style="text-align: right;"><span style="color: #1f6feb; text-decoration: underline; cursor: pointer;" onclick="copyAppId(${game.appid})">${game.appid}</span></td>
                    <td><a href="${storeUrl}" target="_blank" style="color: #1f6feb;">${game.name}</a></td>
                    <td style="text-align: right;">${Number(game.minutes).toLocaleString()}m (${Number(hours).toLocaleString()}h)</td>
                    <td style="text-align: center;">
                        <button class="btn btn-status-free" onclick="setGameFree(event, ${game.account_id}, ${game.appid})">✅ Gratis</button>
                        <button class="btn btn-status-paid" onclick="setGamePaid(event, ${game.account_id}, ${game.appid})">💰 Betaald</button>
                    </td>
                </tr>
            `;
        }

        html += `</tbody></table>`;
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = `<p>❌ Fout: ${e}</p>`;
    }
}

async function setGameFree(e, accountId, appid) {
    e.preventDefault();
    await updateGameStatus(e, accountId, appid, true, '✅ Gratis');
}

async function setGamePaid(e, accountId, appid) {
    e.preventDefault();
    await updateGameStatus(e, accountId, appid, false, '💰 Betaald');
}

async function updateGameStatus(e, accountId, appid, isFree, label) {
    try {
        const res = await fetch(`/api/update-game-status/${accountId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appid: appid, is_free: isFree })
        });

        if (res.ok) {
            showNotification(`${label} - Game geclassificeerd`);
            // Remove row from table
            const row = e.target.closest('tr');
            if (row) {
                row.style.opacity = '0.5';
                setTimeout(() => {
                    row.remove();
                    // Check if table is empty
                    const tbody = document.querySelector('.untested-table tbody');
                    if (!tbody || tbody.children.length === 0) {
                        const container = document.getElementById('untested-container');
                        container.innerHTML = '<p style="color: #3fb950;">✅ Geen untested games meer! Alle games zijn geclassificeerd.</p>';
                    }
                }, 300);
            }
        } else {
            const data = await res.json();
            showNotification(data.error || 'Fout bij update', 'error');
        }
    } catch (err) {
        showNotification('Fout: ' + err, 'error');
    }
}

async function retryAllUntestedGames(e) {
    const btn = e.target;
    btn.disabled = true;
    btn.textContent = '⏳ Scanning...';

    try {
        const res = await fetch('/api/retry-all-untested', { method: 'POST' });
        const data = await res.json();

        if (res.ok) {
            showNotification(data.message);
            // Poll using special __all__ key
            pollEnrichmentStatus('__all__');
        } else {
            showNotification(data.error || 'Fout bij retry', 'error');
        }
    } catch (e) {
        showNotification('Fout: ' + e, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '🔁 Alle Opnieuw Scannen';
    }
}

// Untested games multi-select tracking
let selectedUntestedAppIds = new Set();

function toggleUntestedAppIdSelection(appid, checkbox) {
    if (checkbox.checked) {
        selectedUntestedAppIds.add(appid);
    } else {
        selectedUntestedAppIds.delete(appid);
    }
    updateUntestedSelectionUI();
}

function toggleSelectAllUntested(selectAllCheckbox) {
    const checkboxes = document.querySelectorAll('input[data-untested-appid-checkbox]');
    checkboxes.forEach(cb => {
        cb.checked = selectAllCheckbox.checked;
        const appid = cb.getAttribute('data-appid');
        if (selectAllCheckbox.checked) {
            selectedUntestedAppIds.add(parseInt(appid));
        } else {
            selectedUntestedAppIds.delete(parseInt(appid));
        }
    });
    updateUntestedSelectionUI();
}

function updateUntestedSelectionUI() {
    const btn = document.getElementById('copy-selected-untested-btn');
    if (btn) {
        if (selectedUntestedAppIds.size > 0) {
            btn.style.display = 'inline-block';
            btn.textContent = `📋 Kopieer ${selectedUntestedAppIds.size} geselecteerde`;
        } else {
            btn.style.display = 'none';
        }
    }
}

function copySelectedUntestedAppIds() {
    if (selectedUntestedAppIds.size === 0) {
        showNotification('Geen games geselecteerd', 'error');
        return;
    }

    const ids = Array.from(selectedUntestedAppIds).sort((a, b) => a - b).join(', ');
    navigator.clipboard.writeText(ids).then(() => {
        showNotification(`📋 ${selectedUntestedAppIds.size} AppIDs gekopieerd: ${ids}`);
        selectedUntestedAppIds.clear();
        updateUntestedSelectionUI();
        // Uncheck all checkboxes
        document.querySelectorAll('input[data-untested-appid-checkbox]').forEach(cb => cb.checked = false);
        const selectAllCheckbox = document.getElementById('select-all-untested-checkbox');
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
    }).catch(err => {
        console.error('Fout bij kopiëren:', err);
        showNotification('Fout bij kopiëren naar klembord', 'error');
    });
}