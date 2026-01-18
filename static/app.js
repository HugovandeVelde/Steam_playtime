// Helper functions
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    event?.target?.classList.add('active');
}

function showSettings() {
    showSection('settings');
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
    const cards = document.querySelectorAll('.account-card');
    cards.forEach((card, idx) => {
        const accountId = idx + 1;
        fetchProfileAsync(accountId, card);
    });
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
        console.log('Profile loading skipped for account', accountId);
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

// Settings
async function loadSettings() {
    try {
        const res = await fetch('/api/settings');
        const data = await res.json();

        document.getElementById('api-key').value = data.api_key;

        // Dynamisch accounts render
        const accountsList = document.getElementById('accounts-list');
        accountsList.innerHTML = '';

        if (data.accounts && data.accounts.length > 0) {
            data.accounts.forEach((steamId, index) => {
                const accountNum = index + 1;
                const html = `
                    <div class="form-group">
                        <label for="steam-id-${accountNum}">Account ${accountNum} Steam ID:</label>
                        <div style="display: flex; gap: 10px;">
                            <input type="text" id="steam-id-${accountNum}" value="${steamId}" placeholder="76561198..." style="flex: 1;">
                            <button type="button" class="btn btn-secondary" onclick="removeAccount(${accountNum})" style="padding: 8px 12px;">🗑️ Verwijderen</button>
                        </div>
                    </div>
                `;
                accountsList.innerHTML += html;
            });
        } else {
            accountsList.innerHTML = '<p style="color: #8b949e;">Geen accounts ingesteld. Voeg er een toe!</p>';
        }
    } catch (e) {
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
            setTimeout(() => location.reload(), 1500);
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
    document.getElementById('current-account').textContent = accountId;
    showSection('games-section');
    loadGames(accountId);
}

async function loadGames(accountId) {
    if (!accountId) {
        // Haal account ID uit de pagina
        accountId = document.getElementById('current-account').textContent;
    }

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
    params.append('limit', 200);

    try {
        const res = await fetch(`/api/games/${accountId}?${params}`);
        const data = await res.json();

        if (!res.ok) {
            container.innerHTML = `<p>❌ ${data.error}</p>`;
            return;
        }

        // Build table
        let html = `
            <p style="padding: 10px 16px; color: #8b949e;">
                Totaal: ${data.total} games (top 200 weergegeven)
            </p>
            <table>
                <thead>
                    <tr>
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

            let freeStatus = '<span class="text-muted">?</span>';
            if (game.is_free === true) {
                freeStatus = '<span class="status status-free">Gratis</span>';
            } else if (game.is_free === false) {
                freeStatus = '<span class="status status-paid">Betaald</span>';
            }

            html += `
                <tr>
                    <td>${game.appid}</td>
                    <td>${game.name}</td>
                    <td style="text-align: right;">${game.minutes}</td>
                    <td style="text-align: right;">${hours}h</td>
                    <td>${freeStatus}</td>
                </tr>
            `;
        }

        html += `</tbody></table>`;
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
            // Het proces loopt op de achtergrond, dus we kunnen direct feedback geven
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