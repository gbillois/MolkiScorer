(function () {
    'use strict';

    // ==================== STATE ====================
    const state = {
        mode: 'normal',        // 'normal' | 'kids'
        players: [],           // { name, score, misses, eliminated }
        currentIndex: 0,
        selectedPins: new Set(),
        gameStarted: false
    };

    const TARGET_SCORE = 50;
    const PENALTY_SCORE = 25;
    const MAX_MISSES = 3;

    // ==================== DOM REFS ====================
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const screens = {
        home: $('#screen-home'),
        game: $('#screen-game'),
        end: $('#screen-end')
    };

    const dom = {
        btnModeNormal: $('#btn-mode-normal'),
        btnModeKids: $('#btn-mode-kids'),
        modeDesc: $('#mode-description'),
        playerList: $('#player-list'),
        inputPlayer: $('#input-player-name'),
        btnAddPlayer: $('#btn-add-player'),
        btnStart: $('#btn-start'),
        currentName: $('#current-player-name'),
        currentScore: $('#current-player-score'),
        missIndicators: $('#miss-indicators'),
        modeBadge: $('#game-mode-badge'),
        scoreboardMini: $('#scoreboard-mini'),
        pinsGrid: $('#pins-grid'),
        btnMiss: $('#btn-miss'),
        btnValidate: $('#btn-validate'),
        winnerTitle: $('#winner-title'),
        winnerName: $('#winner-name'),
        finalScores: $('#final-scores'),
        btnNewGame: $('#btn-new-game'),
        btnClear: $('#btn-clear'),
        scorePreview: $('#score-preview')
    };

    // ==================== SCREENS ====================
    function showScreen(name) {
        Object.values(screens).forEach(s => s.classList.remove('active'));
        screens[name].classList.add('active');
    }

    // ==================== TOAST ====================
    function showToast(msg, type) {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast' + (type ? ' ' + type : '');
        toast.textContent = msg;
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => toast.classList.add('show'));
        });

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 2200);
    }

    // ==================== HOME SCREEN ====================
    function updateModeDescription() {
        if (state.mode === 'normal') {
            dom.modeDesc.textContent = 'Premier à 50 points pile. Dépassement = retour à 25.';
        } else {
            dom.modeDesc.textContent = 'Premier à 50 points ou plus. Pas de pénalité de dépassement !';
        }
    }

    function renderPlayerList() {
        dom.playerList.innerHTML = '';
        state.players.forEach((p, i) => {
            const item = document.createElement('div');
            item.className = 'player-item';
            item.innerHTML = `
                <span class="name">${escapeHtml(p.name)}</span>
                <button class="btn-remove" data-index="${i}">&times;</button>
            `;
            dom.playerList.appendChild(item);
        });
        dom.btnStart.disabled = state.players.length < 2;
    }

    function addPlayer() {
        const name = dom.inputPlayer.value.trim();
        if (!name) return;
        if (state.players.length >= 8) {
            showToast('Maximum 8 joueurs');
            return;
        }
        if (state.players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
            showToast('Ce nom existe déjà');
            return;
        }
        state.players.push({ name, score: 0, misses: 0, eliminated: false });
        dom.inputPlayer.value = '';
        dom.inputPlayer.focus();
        renderPlayerList();
    }

    function removePlayer(index) {
        state.players.splice(index, 1);
        renderPlayerList();
    }

    // ==================== GAME SCREEN ====================
    function initGame() {
        state.currentIndex = 0;
        state.selectedPins.clear();
        state.gameStarted = true;
        state.players.forEach(p => {
            p.score = 0;
            p.misses = 0;
            p.eliminated = false;
        });
        buildPinsGrid();
        updateGameUI();
        showScreen('game');
    }

    function buildPinsGrid() {
        dom.pinsGrid.innerHTML = '';
        // Disposition en losange comme le vrai Mölkky
        const rows = [
            [1, 2],
            [3, 4, 5],
            [6, 7, 8, 9],
            [10, 11, 12]
        ];
        rows.forEach(pins => {
            const row = document.createElement('div');
            row.className = 'pins-row';
            pins.forEach(num => {
                const btn = document.createElement('button');
                btn.className = 'pin-btn';
                btn.textContent = num;
                btn.dataset.pin = num;
                btn.addEventListener('click', () => togglePin(num));
                row.appendChild(btn);
            });
            dom.pinsGrid.appendChild(row);
        });
    }

    function togglePin(num) {
        if (state.selectedPins.has(num)) {
            state.selectedPins.delete(num);
        } else {
            state.selectedPins.add(num);
        }
        updatePinsUI();
        updateValidateButton();
    }

    function updatePinsUI() {
        dom.pinsGrid.querySelectorAll('.pin-btn').forEach(btn => {
            const pin = parseInt(btn.dataset.pin);
            btn.classList.toggle('selected', state.selectedPins.has(pin));
        });
    }

    function updateValidateButton() {
        const hasPins = state.selectedPins.size > 0;
        dom.btnValidate.disabled = !hasPins;
        dom.btnClear.style.display = hasPins ? '' : 'none';

        if (!hasPins) {
            dom.btnValidate.textContent = 'Valider';
            dom.scorePreview.textContent = '';
        } else {
            const pts = calculatePoints();
            const player = getCurrentPlayer();
            const newTotal = player.score + pts;
            dom.btnValidate.textContent = `Valider (+${pts})`;

            if (state.mode === 'normal' && newTotal > TARGET_SCORE) {
                dom.scorePreview.textContent = `${player.score} + ${pts} = ${newTotal} > 50 → retour à 25 !`;
                dom.scorePreview.className = 'score-preview warning';
            } else {
                dom.scorePreview.textContent = `${player.score} + ${pts} = ${newTotal}`;
                dom.scorePreview.className = 'score-preview';
            }
        }
    }

    function calculatePoints() {
        const count = state.selectedPins.size;
        if (count === 0) return 0;
        if (count === 1) {
            return [...state.selectedPins][0];
        }
        return count;
    }

    function getCurrentPlayer() {
        return state.players[state.currentIndex];
    }

    function getActivePlayers() {
        return state.players.filter(p => !p.eliminated);
    }

    function updateGameUI() {
        const player = getCurrentPlayer();

        // Current player info
        dom.currentName.textContent = player.name;
        dom.currentScore.textContent = player.score + ' / ' + TARGET_SCORE + ' pts';

        // Miss indicators
        dom.missIndicators.innerHTML = '';
        for (let i = 0; i < MAX_MISSES; i++) {
            const dot = document.createElement('div');
            dot.className = 'miss-dot' + (i < player.misses ? ' filled' : '');
            dom.missIndicators.appendChild(dot);
        }

        // Mode badge
        dom.modeBadge.textContent = state.mode === 'normal' ? 'Normal' : 'Enfant';
        dom.modeBadge.className = 'mode-badge ' + (state.mode === 'normal' ? 'normal' : 'kids');

        // Mini scoreboard
        renderScoreboard();

        // Reset pins
        state.selectedPins.clear();
        updatePinsUI();
        updateValidateButton();
    }

    function renderScoreboard() {
        dom.scoreboardMini.innerHTML = '';
        state.players.forEach((p, i) => {
            const div = document.createElement('div');
            div.className = 'sb-player';
            if (i === state.currentIndex) div.classList.add('current');
            if (p.eliminated) div.classList.add('eliminated');
            div.innerHTML = `
                <span class="sb-name">${escapeHtml(p.name)}</span>
                <span class="sb-score">${p.score}</span>
            `;
            dom.scoreboardMini.appendChild(div);
        });

        // Scroll current player into view
        const currentEl = dom.scoreboardMini.querySelector('.current');
        if (currentEl) {
            currentEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }

    function handleValidate() {
        const player = getCurrentPlayer();
        const points = calculatePoints();

        if (points === 0) return;

        player.misses = 0;
        const newScore = player.score + points;

        if (state.mode === 'normal') {
            if (newScore === TARGET_SCORE) {
                player.score = newScore;
                showToast(`${player.name} atteint 50 !`, 'success');
                endGame(player);
                return;
            } else if (newScore > TARGET_SCORE) {
                player.score = PENALTY_SCORE;
                showToast(`Dépassement ! ${player.name} retombe à 25`, '');
            } else {
                player.score = newScore;
            }
        } else {
            // Kids mode
            player.score = newScore;
            if (newScore >= TARGET_SCORE) {
                showToast(`${player.name} gagne avec ${newScore} pts !`, 'success');
                endGame(player);
                return;
            }
        }

        nextTurn();
    }

    function handleMiss() {
        const player = getCurrentPlayer();
        player.misses++;

        if (player.misses >= MAX_MISSES) {
            if (state.mode === 'kids') {
                // Mode enfant : on passe juste son tour, pas d'élimination
                player.misses = 0;
                showToast(`${player.name} passe son tour ! (3 ratés)`, '');
            } else {
                // Mode normal : élimination
                player.eliminated = true;
                showToast(`${player.name} est éliminé ! (3 ratés)`, '');

                const active = getActivePlayers();
                if (active.length === 1) {
                    endGame(active[0]);
                    return;
                }
                if (active.length === 0) {
                    endGame(null);
                    return;
                }
            }
        }

        nextTurn();
    }

    function nextTurn() {
        const active = getActivePlayers();
        if (active.length === 0) {
            endGame(null);
            return;
        }

        // Find next active player
        let next = (state.currentIndex + 1) % state.players.length;
        let safety = 0;
        while (state.players[next].eliminated && safety < state.players.length) {
            next = (next + 1) % state.players.length;
            safety++;
        }
        state.currentIndex = next;
        updateGameUI();
    }

    // ==================== END SCREEN ====================
    function endGame(winner) {
        state.gameStarted = false;

        if (winner) {
            dom.winnerTitle.textContent = 'Victoire !';
            dom.winnerName.textContent = winner.name;
        } else {
            dom.winnerTitle.textContent = 'Partie terminée';
            dom.winnerName.textContent = 'Aucun gagnant';
        }

        // Sort players: winner first, then by score desc, eliminated last
        const sorted = [...state.players].sort((a, b) => {
            if (a === winner) return -1;
            if (b === winner) return 1;
            if (a.eliminated && !b.eliminated) return 1;
            if (!a.eliminated && b.eliminated) return -1;
            return b.score - a.score;
        });

        dom.finalScores.innerHTML = '';
        sorted.forEach((p, i) => {
            const row = document.createElement('div');
            row.className = 'final-row';
            if (p === winner) row.classList.add('winner');
            if (p.eliminated) row.classList.add('eliminated');
            row.innerHTML = `
                <span class="rank">${p === winner ? '&#9733;' : (i + 1)}</span>
                <span class="fname">${escapeHtml(p.name)}</span>
                <span class="fscore">${p.score} pts</span>
            `;
            dom.finalScores.appendChild(row);
        });

        showScreen('end');
    }

    // ==================== UTILS ====================
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ==================== EVENT LISTENERS ====================
    // Mode toggle
    dom.btnModeNormal.addEventListener('click', () => {
        state.mode = 'normal';
        dom.btnModeNormal.classList.add('active');
        dom.btnModeKids.classList.remove('active');
        updateModeDescription();
    });

    dom.btnModeKids.addEventListener('click', () => {
        state.mode = 'kids';
        dom.btnModeKids.classList.add('active');
        dom.btnModeNormal.classList.remove('active');
        updateModeDescription();
    });

    // Add player
    dom.btnAddPlayer.addEventListener('click', addPlayer);
    dom.inputPlayer.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addPlayer();
    });

    // Remove player
    dom.playerList.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-remove');
        if (btn) removePlayer(parseInt(btn.dataset.index));
    });

    // Start game
    dom.btnStart.addEventListener('click', initGame);

    // Game actions
    dom.btnValidate.addEventListener('click', handleValidate);
    dom.btnMiss.addEventListener('click', handleMiss);
    dom.btnClear.addEventListener('click', () => {
        state.selectedPins.clear();
        updatePinsUI();
        updateValidateButton();
    });

    // New game
    dom.btnNewGame.addEventListener('click', () => {
        state.players.forEach(p => {
            p.score = 0;
            p.misses = 0;
            p.eliminated = false;
        });
        showScreen('home');
        renderPlayerList();
    });
})();
