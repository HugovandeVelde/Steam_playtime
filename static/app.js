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
        document.getElementById('steam-id-1').value = data.steam_id_1;
        document.getElementById('steam-id-2').value = data.steam_id_2;
        document.getElementById('steam-id-3').value = data.steam_id_3;
    } catch (e) {
        showNotification('Kon instellingen niet laden: ' + e, 'error');
    }
}

async function saveSettings() {
    const data = {
        api_key: document.getElementById('api-key').value,
        steam_id_1: document.getElementById('steam-id-1').value,
        steam_id_2: document.getElementById('steam-id-2').value,
        steam_id_3: document.getElementById('steam-id-3').value,
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
