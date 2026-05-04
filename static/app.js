const PAGE_SIZE = 500;
const LANGUAGE_STORAGE_KEY = 'steamspul-language';
const DEFAULT_LANGUAGE = 'nl';

const TRANSLATIONS = {
    nl: {
        documentTitle: 'Steam Playtime - Dashboard',
        siteTitle: 'Steam Playtime Manager',
        navDashboard: 'Dashboard',
        navUntested: 'Untested',
        navSettings: '\u2699\uFE0F Instellingen',
        languageLabel: 'Taal',
        accountsHeading: 'Je Accounts',
        steamIdLabel: 'ID: {steamId}',
        accountSummary: '{count} games | {hours} uur gespeeld',
        accountNoData: 'Geen data',
        unknownUser: 'Onbekend',
        buttonFetch: 'Ophalen',
        buttonFetchBusy: 'Bezig...',
        buttonFetchAll: 'Alles Ophalen',
        buttonFetchAllBusy: 'Alles Bezig...',
        buttonView: 'Bekijken',
        buttonFreeCheck: 'Gratis Checken',
        buttonFreeCheckBusy: 'Bezig...',
        buttonCsv: 'CSV',
        apiKeyWarning: '\u26A0\uFE0F API key is niet ingesteld. Ga naar Instellingen om deze in te voeren.',
        gamesAccountTitle: 'Games - Account',
        minMinutesPlaceholder: 'Min minuten',
        maxMinutesPlaceholder: 'Max minuten',
        filterOnlyZero: 'Alleen 0 minuten',
        filterExcludeZero: 'Zonder 0 minuten',
        filterPaidOnly: 'Alleen betaald',
        filterFreeOnly: 'Alleen gratis',
        filterSortAsc: 'Oplopend sorteren',
        buttonFilter: 'Filteren',
        buttonBack: '\u2190 Terug',
        loading: 'Laden...',
        loadingGames: 'Games laden...',
        loadingUntested: 'Untested games laden...',
        settingsHeading: '\u2699\uFE0F Instellingen',
        apiKeyLabel: 'Steam Web API Key:',
        apiKeyPlaceholder: 'Krijg je op https://steamcommunity.com/dev/apikey',
        apiKeyLinkText: 'Haal je API key op bij Steam',
        apiKeyNote: 'Je sleutels worden alleen lokaal opgeslagen en nooit gedeeld.',
        settingsAccountsHeading: 'Je Accounts',
        accountLabel: 'Account {number}',
        noAccountsConfigured: 'Geen accounts ingesteld. Voeg er een toe!',
        buttonDelete: 'Verwijderen',
        buttonSave: 'Opslaan',
        newAccountHeading: 'Nieuw Account Toevoegen',
        newSteamIdLabel: 'Steam ID64:',
        newSteamIdHint: '17-cijferig getal van je Steam64 ID',
        buttonAddAccount: 'Account Toevoegen',
        untestedHeading: 'Untested Games',
        untestedDescription: 'Games waarvan we de gratis/betaald status nog niet hebben kunnen bepalen. Je kunt ze hier handmatig aanpassen met een klik per game.',
        buttonLoadUntested: 'Laad Untested Games',
        buttonRetryAll: 'Alle Opnieuw Scannen',
        buttonRetryAllBusy: 'Scannen...',
        untestedPlaceholder: 'Klik bovenstaande knop om untested games te laden',
        statusFree: 'Gratis',
        statusPaid: 'Betaald',
        statusUntested: 'Untested',
        notificationEnrichmentDone: 'Verrijking voltooid! Gegevens bijgewerkt.',
        notificationCopyAppId: 'AppID {appid} gekopieerd naar klembord',
        notificationNoGamesSelected: 'Geen games geselecteerd',
        notificationCopySelected: '{count} AppIDs gekopieerd: {ids}',
        copySelectedButton: 'Kopieer {count} geselecteerde',
        gamesSummary: 'Totaal: {total} games (alle speeltijd opgeteld: {hours} uur)',
        gamesShown: 'Getoond: {start}-{end} (pagina-grootte {limit})',
        tableAppId: 'AppID',
        tableName: 'Naam',
        tableMinutes: 'Minuten',
        tableHours: 'Uren',
        tableType: 'Type',
        tableClassify: 'Classificeer',
        paginationPrev: '\u2190 Vorige {limit}',
        paginationNext: 'Volgende {limit} \u2192',
        paginationPage: 'Pagina {current} / {total}',
        untestedSummary: 'Totaal: {count} untested games (gesorteerd op App ID)',
        minutesHours: '{minutes}m ({hours}h)',
        buttonClassifyFree: 'Gratis',
        buttonClassifyPaid: 'Betaald',
        noUntestedGames: 'Geen untested games! Alle games zijn geclassificeerd.',
        noUntestedGamesRemaining: 'Geen untested games meer! Alle games zijn geclassificeerd.',
        notificationSettingsSaved: 'Instellingen opgeslagen',
        notificationFetchAllStarted: 'Batch update gestart voor {total} accounts',
        notificationFetchAllDone: 'Batch voltooid. {completed} accounts verwerkt, {errors} fouten.',
        errorLoadSettings: 'Kon instellingen niet laden: {error}',
        errorNeedOneAccount: 'Voeg minstens 1 account in',
        notificationAccountRemovedPending: 'Account verwijderd. Klik Opslaan om te bevestigen.',
        confirmDeleteAccount: 'Account {steamId} verwijderen?',
        notificationAccountRemoved: 'Account verwijderd',
        errorDeleteAccount: 'Fout bij verwijderen van account',
        errorEnterSteamId: 'Voer een Steam ID in',
        errorSteamIdLength: 'Steam ID moet uit 17 cijfers bestaan',
        notificationAccountAdded: 'Account toegevoegd!',
        errorAddAccount: 'Fout bij toevoegen: {error}',
        errorSaveSettings: 'Fout bij opslaan: {error}',
        errorFetchAccount: 'Fout bij ophalen: {error}',
        errorFetchAllStart: 'Kon batch update niet starten: {error}',
        errorStartEnrichment: 'Fout bij starten',
        errorGeneric: 'Fout: {error}',
        notificationGameClassified: '{label} - Game geclassificeerd',
        errorUpdateGame: 'Fout bij update',
        fetchAllTitle: 'Batch Update',
        fetchAllPhaseLabel: 'Fase',
        fetchAllCurrentLabel: 'Huidig',
        fetchAllCompletedLabel: 'Verwerkt',
        fetchAllErrorsLabel: 'Fouten',
        fetchAllUnknownLabel: 'Nieuwe AppIDs',
        fetchAllPhaseFetching: 'Accounts ophalen',
        fetchAllPhaseEnriching: 'Gezamenlijk verrijken',
        fetchAllPhaseFinalizing: 'Afronden',
        fetchAllMessageFetching: 'Account {current} van {total} wordt opgehaald.',
        fetchAllMessageEnriching: '{count} nieuwe AppIDs worden gecontroleerd.',
        fetchAllMessageFinalizing: 'Resultaten worden toegepast op alle accounts.',
        fetchAllMessageDone: 'Batch voltooid. {completed} accounts verwerkt, {errors} fouten.',
        fetchAllMessageError: 'Batch gestopt: {message}',
        fetchAllNoCurrentAccount: '-',
        apiMessageSettingsSaved: 'Instellingen opgeslagen',
        apiMessageAccountExists: 'Account bestaat al',
        apiMessageAccountNotConfigured: 'Account niet geconfigureerd',
        apiMessageNoAccountsConfigured: 'Geen accounts ingesteld',
        apiMessageFetchAllRunning: 'Batch update is al bezig',
        apiMessageFetchRequired: 'Haal eerst data op',
        apiMessageApiKeyNotSet: 'API key niet ingesteld',
        apiMessageInvalidSteamId: 'Ongeldig Steam ID. Moet 17 cijfers zijn.',
        apiMessageDataNotFound: 'Data niet gevonden',
        apiMessageUnknownExportFormat: 'Onbekend export format',
        apiMessageFreeInfoRunning: 'Free-to-play info wordt ingezameld. Dit kan enkele minuten duren...',
        apiMessageNoUntestedToRetry: 'Geen untested games om opnieuw te proberen',
        apiMessageRetryDone: 'Retry voltooid',
        apiMessageEnrichmentDone: 'Enrichment voltooid',
        apiMessageGamesFetchedKnown: '{count} games opgehaald. Alle games zijn bekend!',
        apiMessageGamesFetchedUnknown: '{count} games opgehaald. {unknown} onbekende games worden op de achtergrond ingezameld...',
        apiMessageGameStatusUpdated: 'Game status geupdate ({count} account(s))',
        apiMessageAccountAddedTotal: 'Account toegevoegd (totaal: {count})',
        apiMessageRetryUntested: '{count} untested games worden opnieuw gecontroleerd...',
        apiMessageRetryAllUntested: '{count} untested games worden opnieuw gescanned. Dit kan enkele minuten duren...',
        notificationRateLimited: 'Steam-storefront tijdelijk geblokkeerd. Verrijking is onvolledig — probeer over een paar minuten opnieuw.',
        fetchAllMessageRateLimited: 'Batch gestopt: Steam-storefront throttlede ons. Probeer over een paar minuten opnieuw.'
    },
    en: {
        documentTitle: 'Steam Playtime - Dashboard',
        siteTitle: 'Steam Playtime Manager',
        navDashboard: 'Dashboard',
        navUntested: 'Untested',
        navSettings: '\u2699\uFE0F Settings',
        languageLabel: 'Language',
        accountsHeading: 'Your Accounts',
        steamIdLabel: 'ID: {steamId}',
        accountSummary: '{count} games | {hours} hours played',
        accountNoData: 'No data',
        unknownUser: 'Unknown',
        buttonFetch: 'Fetch',
        buttonFetchBusy: 'Working...',
        buttonFetchAll: 'Fetch All',
        buttonFetchAllBusy: 'Fetching All...',
        buttonView: 'View',
        buttonFreeCheck: 'Check Free',
        buttonFreeCheckBusy: 'Working...',
        buttonCsv: 'CSV',
        apiKeyWarning: '\u26A0\uFE0F API key is not set. Go to Settings to enter it.',
        gamesAccountTitle: 'Games - Account',
        minMinutesPlaceholder: 'Min minutes',
        maxMinutesPlaceholder: 'Max minutes',
        filterOnlyZero: 'Only 0 minutes',
        filterExcludeZero: 'Exclude 0 minutes',
        filterPaidOnly: 'Paid only',
        filterFreeOnly: 'Free only',
        filterSortAsc: 'Sort ascending',
        buttonFilter: 'Filter',
        buttonBack: '\u2190 Back',
        loading: 'Loading...',
        loadingGames: 'Loading games...',
        loadingUntested: 'Loading untested games...',
        settingsHeading: '\u2699\uFE0F Settings',
        apiKeyLabel: 'Steam Web API Key:',
        apiKeyPlaceholder: 'Get it from https://steamcommunity.com/dev/apikey',
        apiKeyLinkText: 'Get your API key from Steam',
        apiKeyNote: 'Your keys are stored locally only and are never shared.',
        settingsAccountsHeading: 'Your Accounts',
        accountLabel: 'Account {number}',
        noAccountsConfigured: 'No accounts configured yet. Add one!',
        buttonDelete: 'Delete',
        buttonSave: 'Save',
        newAccountHeading: 'Add New Account',
        newSteamIdLabel: 'Steam ID64:',
        newSteamIdHint: '17-digit number from your Steam64 ID',
        buttonAddAccount: 'Add Account',
        untestedHeading: 'Untested Games',
        untestedDescription: 'Games for which we could not determine the free/paid status yet. You can classify them here with one click per game.',
        buttonLoadUntested: 'Load Untested Games',
        buttonRetryAll: 'Retry All',
        buttonRetryAllBusy: 'Scanning...',
        untestedPlaceholder: 'Click the button above to load untested games',
        statusFree: 'Free',
        statusPaid: 'Paid',
        statusUntested: 'Untested',
        notificationEnrichmentDone: 'Enrichment complete! Data refreshed.',
        notificationCopyAppId: 'AppID {appid} copied to clipboard',
        notificationNoGamesSelected: 'No games selected',
        notificationCopySelected: '{count} AppIDs copied: {ids}',
        copySelectedButton: 'Copy {count} selected',
        gamesSummary: 'Total: {total} games (combined playtime: {hours} hours)',
        gamesShown: 'Showing: {start}-{end} (page size {limit})',
        tableAppId: 'AppID',
        tableName: 'Name',
        tableMinutes: 'Minutes',
        tableHours: 'Hours',
        tableType: 'Type',
        tableClassify: 'Classify',
        paginationPrev: '\u2190 Previous {limit}',
        paginationNext: 'Next {limit} \u2192',
        paginationPage: 'Page {current} / {total}',
        untestedSummary: 'Total: {count} untested games (sorted by App ID)',
        minutesHours: '{minutes}m ({hours}h)',
        buttonClassifyFree: 'Free',
        buttonClassifyPaid: 'Paid',
        noUntestedGames: 'No untested games! Everything is classified.',
        noUntestedGamesRemaining: 'No untested games left! Everything is classified.',
        notificationSettingsSaved: 'Settings saved',
        notificationFetchAllStarted: 'Batch update started for {total} accounts',
        notificationFetchAllDone: 'Batch complete. {completed} accounts processed, {errors} errors.',
        errorLoadSettings: 'Could not load settings: {error}',
        errorNeedOneAccount: 'Add at least 1 account',
        notificationAccountRemovedPending: 'Account removed. Click Save to confirm.',
        confirmDeleteAccount: 'Delete account {steamId}?',
        notificationAccountRemoved: 'Account removed',
        errorDeleteAccount: 'Error removing account',
        errorEnterSteamId: 'Enter a Steam ID',
        errorSteamIdLength: 'Steam ID must contain 17 digits',
        notificationAccountAdded: 'Account added!',
        errorAddAccount: 'Error adding account: {error}',
        errorSaveSettings: 'Error saving: {error}',
        errorFetchAccount: 'Error fetching: {error}',
        errorFetchAllStart: 'Could not start batch update: {error}',
        errorStartEnrichment: 'Error starting enrichment',
        errorGeneric: 'Error: {error}',
        notificationGameClassified: '{label} - Game classified',
        errorUpdateGame: 'Error updating game',
        fetchAllTitle: 'Batch Update',
        fetchAllPhaseLabel: 'Phase',
        fetchAllCurrentLabel: 'Current',
        fetchAllCompletedLabel: 'Processed',
        fetchAllErrorsLabel: 'Errors',
        fetchAllUnknownLabel: 'New AppIDs',
        fetchAllPhaseFetching: 'Fetching accounts',
        fetchAllPhaseEnriching: 'Shared enrichment',
        fetchAllPhaseFinalizing: 'Finalizing',
        fetchAllMessageFetching: 'Fetching account {current} of {total}.',
        fetchAllMessageEnriching: 'Checking {count} new AppIDs.',
        fetchAllMessageFinalizing: 'Applying results to all accounts.',
        fetchAllMessageDone: 'Batch complete. {completed} accounts processed, {errors} errors.',
        fetchAllMessageError: 'Batch stopped: {message}',
        fetchAllNoCurrentAccount: '-',
        apiMessageSettingsSaved: 'Settings saved',
        apiMessageAccountExists: 'Account already exists',
        apiMessageAccountNotConfigured: 'Account not configured',
        apiMessageNoAccountsConfigured: 'No accounts configured',
        apiMessageFetchAllRunning: 'Batch update is already running',
        apiMessageFetchRequired: 'Fetch data first',
        apiMessageApiKeyNotSet: 'API key is not set',
        apiMessageInvalidSteamId: 'Invalid Steam ID. Must be 17 digits.',
        apiMessageDataNotFound: 'Data not found',
        apiMessageUnknownExportFormat: 'Unknown export format',
        apiMessageFreeInfoRunning: 'Collecting free-to-play info. This may take a few minutes...',
        apiMessageNoUntestedToRetry: 'No untested games to retry',
        apiMessageRetryDone: 'Retry completed',
        apiMessageEnrichmentDone: 'Enrichment completed',
        apiMessageGamesFetchedKnown: 'Fetched {count} games. All games are known!',
        apiMessageGamesFetchedUnknown: 'Fetched {count} games. {unknown} unknown games are being collected in the background...',
        apiMessageGameStatusUpdated: 'Game status updated ({count} account(s))',
        apiMessageAccountAddedTotal: 'Account added (total: {count})',
        apiMessageRetryUntested: 'Retrying {count} untested games...',
        apiMessageRetryAllUntested: 'Retrying {count} untested games. This may take a few minutes...',
        notificationRateLimited: 'Steam storefront temporarily blocked. Enrichment is partial — try again in a few minutes.',
        fetchAllMessageRateLimited: 'Batch stopped: Steam storefront throttled us. Try again in a few minutes.'
    }
};

let currentOffset = 0;
let currentAccountId = null;
let enrichmentPollInterval = null;
let enrichmentPollTimeout = null;
let fetchAllPollInterval = null;
let fetchAllPollTimeout = null;
let fetchAllStatusSnapshot = null;
let fetchAllCompletionHandled = false;
let progressBannerCloseAbort = null;
let currentLanguage = DEFAULT_LANGUAGE;
let currentSettingsAccounts = [];

let selectedAppIds = new Set();
let selectedUntestedAppIds = new Set();

function getLocale() {
    return currentLanguage === 'en' ? 'en-US' : 'nl-NL';
}

function formatNumber(value, options = {}) {
    return new Intl.NumberFormat(getLocale(), options).format(Number(value));
}

function t(key, params = {}) {
    const template = TRANSLATIONS[currentLanguage]?.[key] ?? TRANSLATIONS[DEFAULT_LANGUAGE][key] ?? key;
    return template.replaceAll(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''));
}

function stripLeadingEmoji(message) {
    return message.replace(/^[^A-Za-z0-9]+/, '').trim();
}

function translateApiMessage(message) {
    if (!message) {
        return message;
    }

    const cleaned = stripLeadingEmoji(String(message).trim());
    const exactMap = {
        'Instellingen opgeslagen': t('apiMessageSettingsSaved'),
        'Account bestaat al': t('apiMessageAccountExists'),
        'Account niet geconfigureerd': t('apiMessageAccountNotConfigured'),
        'Geen accounts ingesteld': t('apiMessageNoAccountsConfigured'),
        'Batch update is al bezig': t('apiMessageFetchAllRunning'),
        'Haal eerst data op': t('apiMessageFetchRequired'),
        'API key niet ingesteld': t('apiMessageApiKeyNotSet'),
        'Ongeldig Steam ID. Moet 17 cijfers zijn.': t('apiMessageInvalidSteamId'),
        'Data niet gevonden': t('apiMessageDataNotFound'),
        'Onbekend export format': t('apiMessageUnknownExportFormat'),
        'Free-to-play info wordt ingezameld. Dit kan enkele minuten duren...': t('apiMessageFreeInfoRunning'),
        'Geen untested games om opnieuw te proberen': t('apiMessageNoUntestedToRetry'),
        'Retry voltooid': t('apiMessageRetryDone'),
        'Enrichment voltooid': t('apiMessageEnrichmentDone')
    };

    if (exactMap[cleaned]) {
        return exactMap[cleaned];
    }

    let match = cleaned.match(/^Account toegevoegd \(totaal: (\d+)\)$/);
    if (match) {
        return t('apiMessageAccountAddedTotal', { count: match[1] });
    }

    match = cleaned.match(/^(\d+) games opgehaald\. (\d+) onbekende games worden op de achtergrond ingezameld\.\.\.$/);
    if (match) {
        return t('apiMessageGamesFetchedUnknown', { count: match[1], unknown: match[2] });
    }

    match = cleaned.match(/^(\d+) games opgehaald\. Alle games zijn bekend!$/);
    if (match) {
        return t('apiMessageGamesFetchedKnown', { count: match[1] });
    }

    match = cleaned.match(/^Game status geupdate \((\d+) account\(s\)\)$/);
    if (match) {
        return t('apiMessageGameStatusUpdated', { count: match[1] });
    }

    match = cleaned.match(/^(\d+) untested games worden opnieuw gecontroleerd\.\.\.$/);
    if (match) {
        return t('apiMessageRetryUntested', { count: match[1] });
    }

    match = cleaned.match(/^(\d+) untested games worden opnieuw gescanned\. Dit kan enkele minuten duren\.\.\.$/);
    if (match) {
        return t('apiMessageRetryAllUntested', { count: match[1] });
    }

    return message;
}

function setActiveNav(activeId) {
    document.querySelectorAll('.nav-link').forEach((link) => link.classList.remove('active'));
    if (activeId) {
        document.getElementById(activeId)?.classList.add('active');
    }
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach((section) => {
        section.style.display = 'none';
    });
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'block';
    }
    setActiveNav(null);
}

function showUntestedTab() {
    showSection('untested-section');
    setActiveNav('nav-untested');
}

function showSettings() {
    showSection('settings');
    setActiveNav('nav-settings');
    loadSettings();
}

function backToDashboard() {
    showSection('dashboard');
    setActiveNav('nav-dashboard');
    loadProfilesAsync();
}

function viewGames(accountId) {
    currentAccountId = accountId;
    currentOffset = 0;
    document.getElementById('current-account').textContent = accountId;
    showSection('games-section');
    loadGames(accountId, currentOffset);
}

function initializeLanguage() {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    currentLanguage = TRANSLATIONS[saved] ? saved : DEFAULT_LANGUAGE;
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        languageSelect.value = currentLanguage;
    }
}

function updateDashboardAccountCopy() {
    document.querySelectorAll('[data-role="steam-id"]').forEach((element) => {
        element.textContent = t('steamIdLabel', { steamId: element.dataset.steamId });
    });

    document.querySelectorAll('[data-role="game-count"]').forEach((element) => {
        if (element.dataset.exists === 'true') {
            element.textContent = t('accountSummary', {
                count: formatNumber(element.dataset.gameCount),
                hours: formatNumber(element.dataset.totalHours)
            });
        } else {
            element.textContent = t('accountNoData');
        }
    });
}

function updateSettingsAccountLabels() {
    document.querySelectorAll('#accounts-list .account-settings-item strong').forEach((element, index) => {
        element.textContent = t('accountLabel', { number: index + 1 });
    });
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function getFetchAllPhaseLabel(phase) {
    if (phase === 'enriching') {
        return t('fetchAllPhaseEnriching');
    }
    if (phase === 'finalizing') {
        return t('fetchAllPhaseFinalizing');
    }
    return t('fetchAllPhaseFetching');
}

function getFetchAllMessage(status) {
    if (!status) {
        return '';
    }

    if (status.status === 'error') {
        return t('fetchAllMessageError', {
            message: translateApiMessage(status.message || '')
        });
    }

    if (status.status === 'rate_limited') {
        return t('fetchAllMessageRateLimited');
    }

    if (status.status === 'done') {
        return t('fetchAllMessageDone', {
            completed: formatNumber(status.completed_accounts ?? 0),
            errors: formatNumber(status.error_count ?? 0)
        });
    }

    if (status.phase === 'enriching') {
        return t('fetchAllMessageEnriching', {
            count: formatNumber(status.unknown_appids_total ?? 0)
        });
    }

    if (status.phase === 'finalizing') {
        return t('fetchAllMessageFinalizing');
    }

    return t('fetchAllMessageFetching', {
        current: formatNumber(status.current_account_index ?? 0),
        total: formatNumber(status.total_accounts ?? 0)
    });
}

function setAccountFetchButtonsDisabled(disabled) {
    document.querySelectorAll('[data-account-fetch="true"]').forEach((button) => {
        button.disabled = disabled;
        if (!disabled) {
            button.textContent = t('buttonFetch');
        }
    });
}

function setFetchAllRunningState(isRunning) {
    const button = document.getElementById('fetch-all-btn');
    if (button) {
        button.disabled = isRunning;
        button.textContent = isRunning ? t('buttonFetchAllBusy') : t('buttonFetchAll');
    }
    setAccountFetchButtonsDisabled(isRunning);
}

function renderFetchAllProgress(status, options = {}) {
    const initial = options.initial ?? false;
    const container = document.getElementById('fetch-all-progress');
    if (!container) {
        return;
    }

    const shouldHide = !status || status.status === 'idle' || (initial && status.status !== 'running');
    const isCurrentlyVisible = container.style.display !== 'none' && container.innerHTML.trim() !== '';

    if (shouldHide) {
        if (!isCurrentlyVisible) {
            container.style.display = 'none';
            container.innerHTML = '';
            container.classList.remove('is-opening', 'is-closing');
            return;
        }
        if (progressBannerCloseAbort) {
            progressBannerCloseAbort.abort();
        }
        progressBannerCloseAbort = new AbortController();
        container.classList.remove('is-opening');
        container.classList.add('is-closing');
        container.addEventListener('animationend', () => {
            container.classList.remove('is-closing');
            container.style.display = 'none';
            container.innerHTML = '';
            progressBannerCloseAbort = null;
        }, { once: true, signal: progressBannerCloseAbort.signal });
        return;
    }

    if (progressBannerCloseAbort) {
        progressBannerCloseAbort.abort();
        progressBannerCloseAbort = null;
    }

    const wasHidden = !isCurrentlyVisible;
    const currentSteamId = status.current_steam_id || t('fetchAllNoCurrentAccount');
    const errorItems = (Array.isArray(status.errors) ? status.errors : [])
        .map((error) => '<li>#' + escapeHtml(error.account_index) + ' (' + escapeHtml(error.steam_id) + '): ' + escapeHtml(error.message) + '</li>')
        .join('');
    const errorsHtml = errorItems ? `<ul class="progress-banner-errors">${errorItems}</ul>` : '';

    container.classList.remove('is-closing');
    container.style.display = 'block';
    container.innerHTML = `
        <div class="progress-banner-header">
            <span class="progress-banner-title">${t('fetchAllTitle')}</span>
            <span class="progress-banner-phase">${getFetchAllPhaseLabel(status.phase)}</span>
        </div>
        <div class="progress-banner-stats">
            <div class="progress-stat">
                <span class="progress-stat-label">${t('fetchAllPhaseLabel')}</span>
                <span class="progress-stat-value">${getFetchAllPhaseLabel(status.phase)}</span>
            </div>
            <div class="progress-stat">
                <span class="progress-stat-label">${t('fetchAllCurrentLabel')}</span>
                <span class="progress-stat-value">${escapeHtml(currentSteamId)}</span>
            </div>
            <div class="progress-stat">
                <span class="progress-stat-label">${t('fetchAllCompletedLabel')}</span>
                <span class="progress-stat-value">${formatNumber(status.completed_accounts ?? 0)} / ${formatNumber(status.total_accounts ?? 0)}</span>
            </div>
            <div class="progress-stat">
                <span class="progress-stat-label">${t('fetchAllErrorsLabel')}</span>
                <span class="progress-stat-value">${formatNumber(status.error_count ?? 0)}</span>
            </div>
            <div class="progress-stat">
                <span class="progress-stat-label">${t('fetchAllUnknownLabel')}</span>
                <span class="progress-stat-value">${formatNumber(status.unknown_appids_total ?? 0)}</span>
            </div>
        </div>
        <div class="progress-banner-message">${escapeHtml(getFetchAllMessage(status))}</div>
        ${errorsHtml}
    `;

    if (wasHidden) {
        container.classList.remove('is-opening');
        void container.offsetWidth;
        container.classList.add('is-opening');
    }
}

function clearFetchAllPolling() {
    if (fetchAllPollInterval) {
        clearInterval(fetchAllPollInterval);
        fetchAllPollInterval = null;
    }
    if (fetchAllPollTimeout) {
        clearTimeout(fetchAllPollTimeout);
        fetchAllPollTimeout = null;
    }
}

function startFetchAllPolling() {
    if (fetchAllPollInterval) {
        return;
    }

    fetchAllPollInterval = setInterval(() => {
        pollFetchAllStatus();
    }, 2000);

    fetchAllPollTimeout = setTimeout(() => {
        clearFetchAllPolling();
        setFetchAllRunningState(false);
    }, 1800000);
}

async function pollFetchAllStatus(options = {}) {
    const initial = options.initial ?? false;

    try {
        const response = await fetch('/api/fetch-all-status');
        const status = await response.json();

        if (initial && status.status !== 'running') {
            fetchAllStatusSnapshot = null;
            renderFetchAllProgress(null, { initial: true });
            setFetchAllRunningState(false);
            return;
        }

        fetchAllStatusSnapshot = status;
        renderFetchAllProgress(status);

        if (status.status === 'running') {
            fetchAllCompletionHandled = false;
            setFetchAllRunningState(true);
            startFetchAllPolling();
            return;
        }

        clearFetchAllPolling();
        setFetchAllRunningState(false);

        if (!fetchAllCompletionHandled
            && (status.status === 'done'
                || status.status === 'error'
                || status.status === 'rate_limited')) {
            fetchAllCompletionHandled = true;
            if (status.status === 'done') {
                showNotification(t('notificationFetchAllDone', {
                    completed: formatNumber(status.completed_accounts ?? 0),
                    errors: formatNumber(status.error_count ?? 0)
                }), status.error_count > 0 ? 'error' : 'success');
            } else if (status.status === 'rate_limited') {
                showNotification(t('notificationRateLimited'), 'error');
            } else {
                showNotification(t('fetchAllMessageError', {
                    message: translateApiMessage(status.message || '')
                }), 'error');
            }

            setTimeout(() => { refreshAccountCards(); }, 500);
            setTimeout(() => {
                fetchAllStatusSnapshot = null;
                renderFetchAllProgress(null, { initial: true });
            }, 4000);
        }
    } catch (error) {
        if (!initial) {
            console.warn('Fetch-all poll error:', error);
        }
    }
}

async function fetchAllAccounts() {
    const button = document.getElementById('fetch-all-btn');
    if (button) {
        button.disabled = true;
        button.textContent = t('buttonFetchAllBusy');
    }
    setAccountFetchButtonsDisabled(true);

    fetchAllCompletionHandled = false;
    fetchAllStatusSnapshot = {
        status: 'running',
        phase: 'fetching',
        current_account_index: 0,
        total_accounts: 0,
        current_steam_id: null,
        completed_accounts: 0,
        error_count: 0,
        errors: [],
        unknown_appids_total: 0,
        message: ''
    };
    renderFetchAllProgress(fetchAllStatusSnapshot);

    try {
        const response = await fetch('/api/fetch-all', { method: 'POST' });
        const data = await response.json();

        if (!response.ok) {
            fetchAllStatusSnapshot = null;
            renderFetchAllProgress(null, { initial: true });
            setFetchAllRunningState(false);
            showNotification(translateApiMessage(data.error || data.message), 'error');
            return;
        }

        fetchAllStatusSnapshot.total_accounts = data.total_accounts ?? 0;
        renderFetchAllProgress(fetchAllStatusSnapshot);
        showNotification(t('notificationFetchAllStarted', {
            total: formatNumber(data.total_accounts ?? 0)
        }));
        startFetchAllPolling();
        await pollFetchAllStatus();
    } catch (error) {
        fetchAllStatusSnapshot = null;
        renderFetchAllProgress(null, { initial: true });
        setFetchAllRunningState(false);
        showNotification(t('errorFetchAllStart', { error }), 'error');
    }
}

function updateSelectionUI() {
    const button = document.getElementById('copy-selected-btn');
    if (!button) {
        return;
    }

    if (selectedAppIds.size > 0) {
        button.style.display = 'inline-block';
        button.textContent = t('copySelectedButton', { count: selectedAppIds.size });
    } else {
        button.style.display = 'none';
    }
}

function updateUntestedSelectionUI() {
    const button = document.getElementById('copy-selected-untested-btn');
    if (!button) {
        return;
    }

    if (selectedUntestedAppIds.size > 0) {
        button.style.display = 'inline-block';
        button.textContent = t('copySelectedButton', { count: selectedUntestedAppIds.size });
    } else {
        button.style.display = 'none';
    }
}

function applyTranslations() {
    document.documentElement.lang = currentLanguage;
    document.title = t('documentTitle');

    document.querySelectorAll('[data-i18n]').forEach((element) => {
        element.textContent = t(element.dataset.i18n);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
        element.placeholder = t(element.dataset.i18nPlaceholder);
    });

    updateDashboardAccountCopy();
    updateSettingsAccountLabels();
    updateSelectionUI();
    updateUntestedSelectionUI();
    renderFetchAllProgress(fetchAllStatusSnapshot);
    setFetchAllRunningState(fetchAllStatusSnapshot?.status === 'running');
}

function refreshLanguageSensitiveContent() {
    const gamesSection = document.getElementById('games-section');
    const settingsSection = document.getElementById('settings');
    const untestedSection = document.getElementById('untested-section');

    if (settingsSection?.style.display !== 'none') {
        loadSettings();
    }

    if (gamesSection?.style.display !== 'none' && currentAccountId) {
        loadGames(currentAccountId, currentOffset);
    }

    if (untestedSection?.style.display !== 'none' && document.querySelector('.untested-table')) {
        loadAllUntestedGames();
    }
}

function setLanguage(language, options = {}) {
    const persist = options.persist ?? true;
    const refreshDynamic = options.refreshDynamic ?? true;

    currentLanguage = TRANSLATIONS[language] ? language : DEFAULT_LANGUAGE;

    if (persist) {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
    }

    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        languageSelect.value = currentLanguage;
    }

    applyTranslations();

    if (refreshDynamic) {
        refreshLanguageSensitiveContent();
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = type === 'success' ? 'notification' : 'notification notification--error';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 3000);
}

function copyAppId(appid) {
    navigator.clipboard.writeText(appid).then(() => {
        showNotification(t('notificationCopyAppId', { appid }));
    }).catch((error) => {
        console.error('Copy error:', error);
        showNotification(t('errorGeneric', { error }), 'error');
    });
}

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
    checkboxes.forEach((checkbox) => {
        checkbox.checked = selectAllCheckbox.checked;
        const appid = Number.parseInt(checkbox.dataset.appid, 10);
        if (selectAllCheckbox.checked) {
            selectedAppIds.add(appid);
        } else {
            selectedAppIds.delete(appid);
        }
    });
    updateSelectionUI();
}

function copySelectedAppIds() {
    if (selectedAppIds.size === 0) {
        showNotification(t('notificationNoGamesSelected'), 'error');
        return;
    }

    const ids = Array.from(selectedAppIds).sort((a, b) => a - b).join(', ');
    navigator.clipboard.writeText(ids).then(() => {
        showNotification(t('notificationCopySelected', { count: selectedAppIds.size, ids }));
        selectedAppIds.clear();
        updateSelectionUI();
        document.querySelectorAll('input[data-appid-checkbox]').forEach((checkbox) => {
            checkbox.checked = false;
        });
        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
        }
    }).catch((error) => {
        console.error('Copy error:', error);
        showNotification(t('errorGeneric', { error }), 'error');
    });
}

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
    checkboxes.forEach((checkbox) => {
        checkbox.checked = selectAllCheckbox.checked;
        const appid = Number.parseInt(checkbox.dataset.appid, 10);
        if (selectAllCheckbox.checked) {
            selectedUntestedAppIds.add(appid);
        } else {
            selectedUntestedAppIds.delete(appid);
        }
    });
    updateUntestedSelectionUI();
}

function copySelectedUntestedAppIds() {
    if (selectedUntestedAppIds.size === 0) {
        showNotification(t('notificationNoGamesSelected'), 'error');
        return;
    }

    const ids = Array.from(selectedUntestedAppIds).sort((a, b) => a - b).join(', ');
    navigator.clipboard.writeText(ids).then(() => {
        showNotification(t('notificationCopySelected', { count: selectedUntestedAppIds.size, ids }));
        selectedUntestedAppIds.clear();
        updateUntestedSelectionUI();
        document.querySelectorAll('input[data-untested-appid-checkbox]').forEach((checkbox) => {
            checkbox.checked = false;
        });
        const selectAllCheckbox = document.getElementById('select-all-untested-checkbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
        }
    }).catch((error) => {
        console.error('Copy error:', error);
        showNotification(t('errorGeneric', { error }), 'error');
    });
}

async function refreshAccountCards() {
    try {
        const response = await fetch('/api/accounts-summary');
        if (!response.ok) {
            return;
        }
        const summary = await response.json();

        document.querySelectorAll('.account-card').forEach((card, index) => {
            const entry = summary[String(index + 1)];
            if (!entry) {
                return;
            }

            const nameEl = card.querySelector('h3');
            if (nameEl) {
                nameEl.textContent = entry.persona_name || t('unknownUser');
            }

            const img = card.querySelector('.account-avatar img');
            if (img && entry.avatar_url) {
                img.src = entry.avatar_url;
                img.alt = entry.persona_name || '';
                img.style.display = 'block';
            }

            const countEl = card.querySelector('[data-role="game-count"]');
            if (countEl) {
                countEl.dataset.exists = entry.exists ? 'true' : 'false';
                countEl.dataset.gameCount = entry.game_count ?? 0;
                countEl.dataset.totalHours = entry.total_hours ?? 0;
            }

            card.dataset.exists = entry.exists ? 'true' : 'false';
            card.querySelectorAll('[data-requires-data="true"]').forEach((btn) => {
                btn.hidden = !entry.exists;
            });
        });

        updateDashboardAccountCopy();
    } catch (error) {
        console.warn('Account summary refresh failed:', error);
    }
}

async function loadProfilesAsync() {
    try {
        const response = await fetch('/api/profiles-all');
        const data = await response.json();

        document.querySelectorAll('.account-card').forEach((card, index) => {
            const accountId = index + 1;
            const profileData = data[accountId];

            if (profileData && !profileData.error) {
                const nameElement = card.querySelector('h3');
                const avatarContainer = card.querySelector('.account-avatar');

                if (nameElement) {
                    nameElement.textContent = profileData.persona_name || t('unknownUser');
                }

                if (avatarContainer && profileData.avatar_url) {
                    const image = avatarContainer.querySelector('img');
                    if (image) {
                        image.src = profileData.avatar_url;
                        image.style.display = 'block';
                    }
                }
            }
        });
    } catch (error) {
        console.warn('Error loading all profiles:', error);
    }
}

async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        const data = await response.json();

        currentSettingsAccounts = Array.isArray(data.accounts) ? [...data.accounts] : [];
        document.getElementById('api-key').value = data.api_key ?? '';

        const accountsList = document.getElementById('accounts-list');
        accountsList.innerHTML = '';

        if (currentSettingsAccounts.length > 0) {
            currentSettingsAccounts.forEach((steamId, index) => {
                accountsList.innerHTML += `
                    <div class="account-settings-item">
                        <div class="account-settings-item__info">
                            <strong class="account-settings-item__label">${t('accountLabel', { number: index + 1 })}</strong>
                            <div class="account-settings-item__id">${steamId}</div>
                        </div>
                        <button type="button" class="btn btn-danger" onclick="removeAccountImmediate('${steamId}')">${t('buttonDelete')}</button>
                    </div>
                `;
            });
        } else {
            accountsList.innerHTML = `<p class="text-muted">${t('noAccountsConfigured')}</p>`;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        showNotification(t('errorLoadSettings', { error }), 'error');
    }
}

async function saveSettings() {
    const apiKey = document.getElementById('api-key').value;
    const accounts = [...currentSettingsAccounts];

    if (accounts.length === 0) {
        showNotification(t('errorNeedOneAccount'), 'error');
        return;
    }

    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey,
                accounts
            })
        });

        if (response.ok) {
            showNotification(t('notificationSettingsSaved'));
            setTimeout(() => location.reload(), 1500);
            return;
        }

        const errorData = await response.json();
        showNotification(translateApiMessage(errorData.message || errorData.error), 'error');
    } catch (error) {
        showNotification(t('errorSaveSettings', { error }), 'error');
    }
}

function removeAccount(accountNum) {
    const input = document.getElementById(`steam-id-${accountNum}`);
    if (input) {
        input.parentElement.parentElement.remove();
        showNotification(t('notificationAccountRemovedPending'));
    }
}

async function removeAccountImmediate(steamId) {
    if (!confirm(t('confirmDeleteAccount', { steamId }))) {
        return;
    }

    try {
        const response = await fetch('/api/settings');
        const data = await response.json();
        const updatedAccounts = data.accounts.filter((id) => id !== steamId);

        const saveResponse = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: data.api_key,
                accounts: updatedAccounts
            })
        });

        if (saveResponse.ok) {
            currentSettingsAccounts = updatedAccounts;
            showNotification(t('notificationAccountRemoved'));
            setTimeout(() => loadSettings(), 500);
        } else {
            showNotification(t('errorDeleteAccount'), 'error');
        }
    } catch (error) {
        showNotification(t('errorGeneric', { error }), 'error');
    }
}

async function addNewAccount() {
    const steamId = document.getElementById('new-steam-id').value.trim();

    if (!steamId) {
        showNotification(t('errorEnterSteamId'), 'error');
        return;
    }

    if (!/^\d{17}$/.test(steamId)) {
        showNotification(t('errorSteamIdLength'), 'error');
        return;
    }

    try {
        const response = await fetch('/api/add-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ steam_id: steamId })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification(translateApiMessage(data.message) || t('notificationAccountAdded'));
            document.getElementById('new-steam-id').value = '';
            setTimeout(() => location.reload(), 1500);
        } else {
            showNotification(translateApiMessage(data.message || data.error), 'error');
        }
    } catch (error) {
        showNotification(t('errorAddAccount', { error }), 'error');
    }
}

function buildGamesFilterParams(offset) {
    const params = new URLSearchParams();
    const fieldMap = {
        'min-minutes': 'min_minutes',
        'max-minutes': 'max_minutes'
    };

    for (const [id, key] of Object.entries(fieldMap)) {
        const value = document.getElementById(id).value;
        if (value) {
            params.append(key, value);
        }
    }

    const checkboxMap = {
        'only-zero': 'only_zero',
        'exclude-zero': 'exclude_zero',
        'paid-only': 'paid_only',
        'free-only': 'free_only',
        'sort-asc': 'sort_asc'
    };

    for (const [id, key] of Object.entries(checkboxMap)) {
        if (document.getElementById(id).checked) {
            params.append(key, 'true');
        }
    }

    params.append('limit', PAGE_SIZE);
    params.append('offset', offset);
    return params;
}

function renderFreeStatus(isFree) {
    if (isFree === true) {
        return `<span class="status status-free">${t('statusFree')}</span>`;
    }
    if (isFree === false) {
        return `<span class="status status-paid">${t('statusPaid')}</span>`;
    }
    return `<span class="status status-untested">${t('statusUntested')}</span>`;
}

function renderGamesTable(data, accountId) {
    const totalHours = Number(data.total_hours ?? 0);
    const rangeStart = data.offset + 1;
    const rangeEnd = data.offset + data.games.length;
    const hasPrev = data.offset > 0;
    const hasNext = data.has_more;

    const rows = data.games.map((game) => {
        const hours = Number(game.minutes) / 60;
        const storeUrl = `https://store.steampowered.com/app/${game.appid}`;
        return `
            <tr>
                <td class="align-center"><input type="checkbox" data-appid-checkbox data-appid="${game.appid}" onchange="toggleAppIdSelection(${game.appid}, this)"></td>
                <td><button type="button" class="appid-link" onclick="copyAppId(${game.appid})">${game.appid}</button></td>
                <td><a href="${storeUrl}" target="_blank" class="store-link">${game.name}</a></td>
                <td class="align-right num-cell">${formatNumber(game.minutes)}</td>
                <td class="align-right num-cell">${formatNumber(hours, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}h</td>
                <td>${renderFreeStatus(game.is_free)}</td>
            </tr>
        `;
    }).join('');

    return `
        <p class="table-summary">
            ${t('gamesSummary', {
        total: formatNumber(data.total),
        hours: formatNumber(totalHours, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    })}
            <br>
            ${t('gamesShown', {
        start: formatNumber(rangeStart),
        end: formatNumber(rangeEnd),
        limit: formatNumber(data.limit)
    })}
        </p>
        <button id="copy-selected-btn" class="btn btn-secondary copy-selected-btn" onclick="copySelectedAppIds()" style="display: none;"></button>
        <table>
            <thead>
                <tr>
                    <th style="width: 40px;"><input type="checkbox" id="select-all-checkbox" onchange="toggleSelectAll(this)"></th>
                    <th>${t('tableAppId')}</th>
                    <th>${t('tableName')}</th>
                    <th class="align-right">${t('tableMinutes')}</th>
                    <th class="align-right">${t('tableHours')}</th>
                    <th>${t('tableType')}</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
        <div class="pagination">
            <button class="btn btn-secondary" ${hasPrev ? '' : 'disabled'} onclick="loadGames('${accountId}', ${Math.max(data.offset - data.limit, 0)})">${t('paginationPrev', { limit: data.limit })}</button>
            <span class="pagination-page">${t('paginationPage', {
        current: Math.floor(data.offset / data.limit) + 1,
        total: Math.max(Math.ceil(data.total / data.limit), 1)
    })}</span>
            <button class="btn btn-secondary" ${hasNext ? '' : 'disabled'} onclick="loadGames('${accountId}', ${data.offset + data.limit})">${t('paginationNext', { limit: data.limit })}</button>
        </div>
    `;
}

async function loadGames(accountId, offset = 0) {
    if (!accountId) {
        accountId = document.getElementById('current-account').textContent;
    }

    currentAccountId = accountId;
    currentOffset = offset;
    selectedAppIds.clear();

    const container = document.getElementById('games-container');
    container.innerHTML = `<p>${t('loadingGames')}</p>`;

    const params = buildGamesFilterParams(offset);

    try {
        const response = await fetch(`/api/games/${accountId}?${params}`);
        const data = await response.json();

        if (!response.ok) {
            container.innerHTML = `<p>${translateApiMessage(data.error)}</p>`;
            return;
        }

        container.innerHTML = renderGamesTable(data, accountId);
        updateSelectionUI();
    } catch (error) {
        container.innerHTML = `<p>${t('errorGeneric', { error })}</p>`;
    }
}

function exportData(accountId, format) {
    globalThis.location.href = `/api/export/${accountId}/${format}`;
}

function pollEnrichmentStatus(steamId) {
    if (enrichmentPollInterval) {
        clearInterval(enrichmentPollInterval);
    }
    if (enrichmentPollTimeout) {
        clearTimeout(enrichmentPollTimeout);
    }

    enrichmentPollInterval = setInterval(async () => {
        try {
            const response = await fetch(`/api/enrich-status/${steamId}`);
            const data = await response.json();

            if (data.status === 'done' || data.status === 'rate_limited') {
                clearInterval(enrichmentPollInterval);
                clearTimeout(enrichmentPollTimeout);
                enrichmentPollInterval = null;
                enrichmentPollTimeout = null;
                if (data.status === 'rate_limited') {
                    showNotification(t('notificationRateLimited'), 'error');
                } else {
                    showNotification(t('notificationEnrichmentDone'));
                }

                const untestedSection = document.getElementById('untested-section');
                if (untestedSection && untestedSection.style.display !== 'none') {
                    loadAllUntestedGames();
                } else {
                    const gamesSection = document.getElementById('games-section');
                    if (gamesSection && gamesSection.style.display !== 'none' && currentAccountId) {
                        loadGames(currentAccountId, currentOffset);
                    } else {
                        setTimeout(() => location.reload(), 500);
                    }
                }
            } else if (data.status === 'error') {
                clearInterval(enrichmentPollInterval);
                clearTimeout(enrichmentPollTimeout);
                enrichmentPollInterval = null;
                enrichmentPollTimeout = null;
                showNotification(`${t('errorGeneric', { error: translateApiMessage(data.message) })}`, 'error');
            }
        } catch (error) {
            console.warn('Poll error:', error);
        }
    }, 3000);

    enrichmentPollTimeout = setTimeout(() => {
        if (enrichmentPollInterval) {
            clearInterval(enrichmentPollInterval);
            enrichmentPollInterval = null;
        }
    }, 600000);
}

async function fetchAccount(event, accountId) {
    const button = event.target;
    button.disabled = true;
    button.textContent = t('buttonFetchBusy');

    try {
        const response = await fetch(`/api/fetch/${accountId}`, { method: 'POST' });
        const data = await response.json();

        if (response.ok) {
            showNotification(translateApiMessage(data.message));
            if (data.unknown_count > 0 && data.steam_id) {
                pollEnrichmentStatus(data.steam_id);
            } else {
                setTimeout(() => location.reload(), 1000);
            }
        } else {
            showNotification(translateApiMessage(data.message || data.error), 'error');
        }
    } catch (error) {
        showNotification(t('errorFetchAccount', { error }), 'error');
    } finally {
        button.disabled = false;
        button.textContent = t('buttonFetch');
    }
}

async function enrichFreeInfo(event, accountId) {
    const button = event.target;
    button.disabled = true;
    button.textContent = t('buttonFreeCheckBusy');

    try {
        const response = await fetch(`/api/enrich/${accountId}`, { method: 'POST' });
        const data = await response.json();

        if (response.ok) {
            showNotification(translateApiMessage(data.message));
            if (data.steam_id) {
                pollEnrichmentStatus(data.steam_id);
            }
        } else {
            showNotification(translateApiMessage(data.error) || t('errorStartEnrichment'), 'error');
        }
    } catch (error) {
        showNotification(t('errorGeneric', { error }), 'error');
    } finally {
        button.disabled = false;
        button.textContent = t('buttonFreeCheck');
    }
}

async function loadAllUntestedGames() {
    selectedUntestedAppIds.clear();
    const container = document.getElementById('untested-container');
    container.innerHTML = `<p>${t('loadingUntested')}</p>`;

    try {
        const response = await fetch('/api/untested-games-all');
        const data = await response.json();

        if (!response.ok) {
            container.innerHTML = `<p>${translateApiMessage(data.error)}</p>`;
            return;
        }

        if (data.count === 0) {
            container.innerHTML = `<p class="table-summary" style="color: var(--accent);">${t('noUntestedGames')}</p>`;
            return;
        }

        let html = `
            <p class="table-summary">
                ${t('untestedSummary', { count: formatNumber(data.count) })}
            </p>
            <button id="copy-selected-untested-btn" class="btn btn-secondary copy-selected-btn" onclick="copySelectedUntestedAppIds()" style="display: none;"></button>
            <table class="untested-table">
                <thead>
                    <tr>
                        <th style="width: 40px;"><input type="checkbox" id="select-all-untested-checkbox" onchange="toggleSelectAllUntested(this)"></th>
                        <th class="align-right">${t('tableAppId')}</th>
                        <th>${t('tableName')}</th>
                        <th class="align-right">${t('tableMinutes')}</th>
                        <th class="align-center">${t('tableClassify')}</th>
                    </tr>
                </thead>
                <tbody>
        `;

        for (const game of data.games) {
            const hours = Number(game.minutes) / 60;
            const storeUrl = `https://store.steampowered.com/app/${game.appid}`;

            html += `
                <tr>
                    <td class="align-center"><input type="checkbox" data-untested-appid-checkbox data-appid="${game.appid}" onchange="toggleUntestedAppIdSelection(${game.appid}, this)"></td>
                    <td class="align-right"><button type="button" class="appid-link" onclick="copyAppId(${game.appid})">${game.appid}</button></td>
                    <td><a href="${storeUrl}" target="_blank" class="store-link">${game.name}</a></td>
                    <td class="align-right num-cell">${t('minutesHours', {
                minutes: formatNumber(game.minutes),
                hours: formatNumber(hours, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            })}</td>
                    <td class="align-center">
                        <button class="btn-status-free" onclick="setGameFree(event, ${game.account_id}, ${game.appid})">${t('buttonClassifyFree')}</button>
                        <button class="btn-status-paid" onclick="setGamePaid(event, ${game.account_id}, ${game.appid})">${t('buttonClassifyPaid')}</button>
                    </td>
                </tr>
            `;
        }

        html += '</tbody></table>';
        container.innerHTML = html;
        updateUntestedSelectionUI();
    } catch (error) {
        container.innerHTML = `<p>${t('errorGeneric', { error })}</p>`;
    }
}

async function setGameFree(event, accountId, appid) {
    event.preventDefault();
    await updateGameStatus(event, accountId, appid, true, t('buttonClassifyFree'));
}

async function setGamePaid(event, accountId, appid) {
    event.preventDefault();
    await updateGameStatus(event, accountId, appid, false, t('buttonClassifyPaid'));
}

async function updateGameStatus(event, accountId, appid, isFree, label) {
    try {
        const response = await fetch(`/api/update-game-status/${accountId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appid, is_free: isFree })
        });

        if (response.ok) {
            showNotification(t('notificationGameClassified', { label }));
            const row = event.target.closest('tr');
            if (row) {
                row.style.opacity = '0.5';
                setTimeout(() => {
                    row.remove();
                    const tbody = document.querySelector('.untested-table tbody');
                    if (!tbody || tbody.children.length === 0) {
                        const container = document.getElementById('untested-container');
                        container.innerHTML = `<p class="table-summary" style="color: var(--accent);">${t('noUntestedGamesRemaining')}</p>`;
                    }
                }, 300);
            }
        } else {
            const data = await response.json();
            showNotification(translateApiMessage(data.error) || t('errorUpdateGame'), 'error');
        }
    } catch (error) {
        showNotification(t('errorGeneric', { error }), 'error');
    }
}

async function retryAllUntestedGames(event) {
    const button = event.target;
    button.disabled = true;
    button.textContent = t('buttonRetryAllBusy');

    try {
        const response = await fetch('/api/retry-all-untested', { method: 'POST' });
        const data = await response.json();

        if (response.ok) {
            showNotification(translateApiMessage(data.message));
            pollEnrichmentStatus('__all__');
        } else {
            showNotification(translateApiMessage(data.error), 'error');
        }
    } catch (error) {
        showNotification(t('errorGeneric', { error }), 'error');
    } finally {
        button.disabled = false;
        button.textContent = t('buttonRetryAll');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeLanguage();
    setLanguage(currentLanguage, { persist: false, refreshDynamic: false });
    setActiveNav('nav-dashboard');
    loadProfilesAsync();
    pollFetchAllStatus({ initial: true });
});
