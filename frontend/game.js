// ================= CONFIGURATION =================
// ⚠️⚠️⚠️ AMAN BHAI: YAHAN APNE BACKEND KA RENDER URL DAAL (Bina https:// ke) ⚠️⚠️⚠️
// Iske bina Multiplayer connect nahi hoga aur 'Server Error' aayega!
const BACKEND_DOMAIN = "telegram-ludo-bot-backend.onrender.com"; // Example

// ================= CONSTANTS & MAPS =================
const COLORS = ["Red", "Green", "Yellow", "Blue"];
const START_TRACK_INDICES = { Red: 1, Green: 14, Yellow: 27, Blue: 40 };
const SAFE_CELLS = new Set([1, 9, 14, 22, 27, 35, 40, 48]);

const TRACK_COORDS = [
    [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
    [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
    [0, 7],
    [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
    [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
    [7, 14],
    [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
    [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
    [14, 7],
    [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
    [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
    [7, 0]
];

const HOME_CORRIDORS = {
    Red:    [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
    Green:  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
    Yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
    Blue:   [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]
};
const HOME_CENTERS = { Red: [7, 6], Green: [6, 7], Yellow: [7, 8], Blue: [8, 7] };
const BASE_POCKETS = {
    Red:    [[1, 1], [1, 4], [4, 1], [4, 4]],
    Green:  [[1, 10], [1, 13], [4, 10], [4, 13]],
    Yellow: [[10, 10], [10, 13], [13, 10], [13, 13]],
    Blue:   [[10, 1], [10, 4], [13, 1], [13, 4]]
};

// ================= PREMIUM AUDIO SYNTHESIZER =================
let audioCtx = null;
let soundMuted = false;

function initAudio() {
    if (soundMuted) return;
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch(e) {}
}

document.body.addEventListener('click', initAudio, { once: true });
document.body.addEventListener('touchstart', initAudio, { once: true });

function playSound(type) {
    if (soundMuted || !audioCtx) return;
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;

        if (type === 'roll') {
            // Clack-clack sound for dice
            for(let i=0; i<3; i++) {
                setTimeout(() => {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.connect(gain); gain.connect(audioCtx.destination);
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(400 + Math.random()*200, audioCtx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.05);
                    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
                    osc.start(); osc.stop(audioCtx.currentTime + 0.05);
                }, i * 100);
            }
        } else if (type === 'move') {
            // Wood tick / pop sound for hopping
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        } else if (type === 'capture') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, now); osc.frequency.linearRampToValueAtTime(50, now + 0.3);
            gain.gain.setValueAtTime(0.25, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35); osc.start(now); osc.stop(now + 0.35);
        } else if (type === 'home') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.type = 'sine'; osc.frequency.setValueAtTime(523.25, now); osc.frequency.setValueAtTime(659.25, now + 0.08); osc.frequency.setValueAtTime(1046.50, now + 0.24);
            gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4); osc.start(now); osc.stop(now + 0.45);
        } else if (type === 'win') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.type = 'square'; const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, idx) => osc.frequency.setValueAtTime(freq, now + idx * 0.07));
            gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65); osc.start(now); osc.stop(now + 0.7);
        }
    } catch (e) {}
}

// ================= STATE MANAGEMENT =================
let tg = null;
let gameMode = 'local';
let roomCode = "";
let chatId = "";
let userId = Math.floor(Math.random() * 1000000);
let userName = `Guest_${userId.toString().slice(-4)}`;
let userUsername = "";

let isHost = false;
let lobbyPlayers = [];
let socket = null;
let gameStarted = false;
let currentTurn = "Red";
let myColor = "Red";
let localPlayers = [];
let pawns = { Red: [0,0,0,0], Green: [0,0,0,0], Yellow: [0,0,0,0], Blue: [0,0,0,0] };
let diceValue = 0;
let diceRolled = false;
let validMoves = [];
let standings = [];
let consecutiveSixes = 0;

// FETCH TELEGRAM USER DETAILS
if (window.Telegram && window.Telegram.WebApp) {
    tg = window.Telegram.WebApp;
    tg.ready(); 
    tg.expand();
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const u = tg.initDataUnsafe.user;
        userId = u.id; 
        userName = u.first_name + (u.last_name ? " " + u.last_name : ""); 
        userUsername = u.username || "";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("profile-name").innerText = userName;
    document.getElementById("profile-status").innerText = userUsername ? `@${userUsername}` : "Telegram Player";
    
    document.getElementById("btn-create-room").addEventListener("click", createMultiplayerRoom);
    document.getElementById("btn-join-room-trigger").addEventListener("click", () => document.getElementById("join-modal").classList.remove("hidden"));
    document.getElementById("btn-cancel-join").addEventListener("click", () => document.getElementById("join-modal").classList.add("hidden"));
    document.getElementById("btn-confirm-join").addEventListener("click", joinMultiplayerRoom);
    document.getElementById("btn-local-play").addEventListener("click", startLocalGame);
    document.getElementById("btn-copy-code").addEventListener("click", copyRoomCode);
    document.getElementById("btn-invite-friends").addEventListener("click", inviteFriends);
    document.getElementById("btn-start-game").addEventListener("click", triggerStartGame);
    document.getElementById("btn-leave-lobby").addEventListener("click", leaveLobby);
    document.getElementById("btn-game-back").addEventListener("click", quitGameToHome);
    document.getElementById("btn-results-home").addEventListener("click", quitGameToHome);
    document.getElementById("btn-share-results").addEventListener("click", shareResultsToTelegram);
    
    document.getElementById("btn-mute-toggle").addEventListener("click", () => {
        soundMuted = !soundMuted;
        document.getElementById("btn-mute-toggle").innerText = soundMuted ? "🔇" : "🔊";
    });

    document.getElementById("dice-container").addEventListener("click", rollDiceAction);
    buildBoardGrid();
    checkQueryParams();
});

function checkQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get("room");
    const chatParam = params.get("chat_id");
    let startParam = (tg && tg.initDataUnsafe) ? tg.initDataUnsafe.start_param : null;
    const targetRoom = startParam || roomParam;
    
    if (chatParam) chatId = chatParam;
    if (targetRoom) connectWebSocket(targetRoom);
}

function buildBoardGrid() {
    const board = document.getElementById("ludo-board");
    board.innerHTML = "";
    createBaseElement(board, "Red", 1, 7, 1, 7);
    createBaseElement(board, "Green", 1, 7, 10, 16);
    createBaseElement(board, "Blue", 10, 16, 1, 7);
    createBaseElement(board, "Yellow", 10, 16, 10, 16);

    const centerHome = document.createElement("div");
    centerHome.className = "center-home";
    centerHome.innerHTML = `
        <svg viewBox="0 0 100 100" class="center-home-svg">
            <polygon points="0,0 50,50 0,100" fill="var(--color-red)" />
            <polygon points="0,0 50,50 100,0" fill="var(--color-green)" />
            <polygon points="100,0 50,50 100,100" fill="var(--color-yellow)" />
            <polygon points="0,100 50,50 100,100" fill="var(--color-blue)" />
        </svg>`;
    board.appendChild(centerHome);

    for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
            if ((r<6&&c<6) || (r<6&&c>=9) || (r>=9&&c<6) || (r>=9&&c>=9) || (r>=6&&r<9&&c>=6&&c<9)) continue;
            const cell = document.createElement("div");
            cell.className = "cell"; cell.style.gridColumn = `${c + 1}`; cell.style.gridRow = `${r + 1}`;
            cell.dataset.row = r; cell.dataset.col = c;
            
            if (r === 6 && c === 1) cell.classList.add("red-start");
            else if (r === 1 && c === 8) cell.classList.add("green-start");
            else if (r === 8 && c === 13) cell.classList.add("yellow-start");
            else if (r === 13 && c === 6) cell.classList.add("blue-start");
            
            const index = TRACK_COORDS.findIndex(coord => coord[0] === r && coord[1] === c);
            if (index !== -1 && SAFE_CELLS.has(index)) cell.classList.add("safe-star");

            COLORS.forEach(color => {
                if (HOME_CORRIDORS[color].some(coord => coord[0] === r && coord[1] === c)) cell.classList.add(`${color.toLowerCase()}-path`);
            });
            board.appendChild(cell);
        }
    }
}

function createBaseElement(board, color, rowStart, rowEnd, colStart, colEnd) {
    const base = document.createElement("div");
    base.className = `base base-${color.toLowerCase()}`;
    base.style.gridColumn = `${colStart} / ${colEnd}`; base.style.gridRow = `${rowStart} / ${rowEnd}`;

    const inner = document.createElement("div");
    inner.className = "base-inner";
    for (let i = 0; i < 4; i++) {
        const pocket = document.createElement("div");
        pocket.className = `base-pocket pocket-${color.toLowerCase()}`;
        const coords = BASE_POCKETS[color][i];
        pocket.dataset.row = coords[0]; pocket.dataset.col = coords[1]; pocket.id = `pocket-${color}-${i}`;
        inner.appendChild(pocket);
    }
    base.appendChild(inner); board.appendChild(base);
}

// ================= OFFLINE LOCAL LOGIC =================
function startLocalGame() {
    initAudio();
    gameMode = 'local'; myColor = "Red"; localPlayers = ["Red", "Green", "Yellow", "Blue"];
    lobbyPlayers = [
        { user_id: userId, name: userName, color: "Red", active: true, is_host: true },
        { user_id: 101, name: "AlphaBot 🤖", color: "Green", active: true },
        { user_id: 102, name: "BravoBot 🤖", color: "Yellow", active: true },
        { user_id: 103, name: "CharlieBot 🤖", color: "Blue", active: true }
    ];
    
    gameStarted = true; pawns = { Red: [0,0,0,0], Green: [0,0,0,0], Yellow: [0,0,0,0], Blue: [0,0,0,0] };
    currentTurn = "Red"; diceValue = 0; diceRolled = false; validMoves = []; standings = []; consecutiveSixes = 0;

    document.getElementById("lobby-view").classList.add("hidden");
    document.getElementById("game-view").classList.remove("hidden");
    renderPawns(); updateGameUI();
}

function localRollDice() {
    if (diceRolled) return;
    initAudio();
    const cube = document.getElementById("dice-cube");
    cube.className = "dice rolling";
    playSound('roll');
    
    setTimeout(() => {
        diceValue = Math.floor(Math.random() * 6) + 1;
        diceRolled = true;
        cube.className = `dice show-${diceValue}`;
        
        if (diceValue === 6) {
            consecutiveSixes++;
            if (consecutiveSixes === 3) {
                consecutiveSixes = 0; diceValue = 0; diceRolled = false;
                showToast("3 Consecutive Sixes! Turn forfeited.");
                localPassTurn(); return;
            }
        } else { consecutiveSixes = 0; }

        validMoves = getValidMovesForColor(currentTurn, diceValue);
        updateGameUI();
        
        if (validMoves.length === 0) {
            setTimeout(localPassTurn, 1500);
        } else {
            if (currentTurn === myColor) highlightValidPawns();
            else setTimeout(localAIMove, 1200);
        }
    }, 600);
}

function getValidMovesForColor(color, roll) {
    const list = [];
    pawns[color].forEach((steps, i) => {
        if (steps === 0 && roll === 6) list.push(i);
        else if (steps > 0 && steps + roll <= 57) list.push(i);
    });
    return list;
}

function highlightValidPawns() {
    validMoves.forEach(idx => {
        const pawnEl = document.getElementById(`pawn-${currentTurn}-${idx}`);
        if (pawnEl) {
            pawnEl.classList.add("valid-move");
            pawnEl.onclick = () => localMovePawnAction(idx);
        }
    });
}

function clearPawnHighlights() {
    COLORS.forEach(color => {
        for (let i = 0; i < 4; i++) {
            const pawnEl = document.getElementById(`pawn-${color}-${i}`);
            if (pawnEl) { pawnEl.classList.remove("valid-move"); pawnEl.onclick = null; }
        }
    });
}

async function localMovePawnAction(pawnIdx) {
    if (currentTurn !== myColor || !diceRolled || !validMoves.includes(pawnIdx)) return;
    clearPawnHighlights();
    
    const oldSteps = pawns[currentTurn][pawnIdx];
    const newSteps = oldSteps === 0 ? 1 : oldSteps + diceValue;
    
    await animatePawnMovement(currentTurn, pawnIdx, diceValue);
    
    let pawnFinished = (newSteps === 57);
    if (pawnFinished) {
        playSound('home');
        if (pawns[currentTurn].every(s => s === 57)) if (!standings.includes(currentTurn)) standings.push(currentTurn);
    }
    
    let captured = null;
    if (newSteps >= 1 && newSteps <= 51) {
        const targetCell = getTrackCell(currentTurn, newSteps);
        if (!SAFE_CELLS.has(targetCell)) {
            for (const oppColor of COLORS) {
                if (oppColor === currentTurn) continue;
                for (let i = 0; i < 4; i++) {
                    const oppSteps = pawns[oppColor][i];
                    if (oppSteps >= 1 && oppSteps <= 51 && getTrackCell(oppColor, oppSteps) === targetCell) {
                        pawns[oppColor][i] = 0; captured = { color: oppColor, idx: i };
                        playSound('capture'); showToast(`Captured ${oppColor}'s pawn!`); break;
                    }
                }
                if (captured) break;
            }
        }
    }
    
    const anotherTurn = (diceValue === 6 && consecutiveSixes < 3) || (captured !== null) || pawnFinished;
    diceValue = 0; diceRolled = false;
    
    if (standings.includes(currentTurn)) localPassTurn();
    else if (anotherTurn) { consecutiveSixes = 0; updateGameUI(); }
    else { consecutiveSixes = 0; localPassTurn(); }
}

function localPassTurn() {
    clearPawnHighlights();
    const playable = localPlayers.filter(c => !standings.includes(c));
    if (playable.length <= 1) {
        playable.forEach(c => standings.push(c));
        triggerGameOver(); return;
    }

    let idx = localPlayers.indexOf(currentTurn);
    do {
        idx = (idx + 1) % localPlayers.length;
        currentTurn = localPlayers[idx];
    } while (standings.includes(currentTurn));

    diceValue = 0; diceRolled = false; consecutiveSixes = 0; validMoves = [];
    updateGameUI();
    if (currentTurn !== myColor) setTimeout(localRollDice, 1200);
}

async function localAIMove() {
    if (currentTurn === myColor || !diceRolled || validMoves.length === 0) return;
    
    let chosenIdx = validMoves[0]; let bestScore = -100;
    
    for (const idx of validMoves) {
        const steps = pawns[currentTurn][idx]; let score = steps;
        if (steps === 0) score += 50;
        const potentialSteps = steps + diceValue;
        if (potentialSteps === 57) score += 100;
        
        if (potentialSteps >= 1 && potentialSteps <= 51) {
            const tCell = getTrackCell(currentTurn, potentialSteps);
            if (!SAFE_CELLS.has(tCell)) {
                COLORS.forEach(opp => {
                    if (opp !== currentTurn) {
                        pawns[opp].forEach(os => { if (os >= 1 && os <= 51 && getTrackCell(opp, os) === tCell) score += 200; });
                    }
                });
            }
        }
        if (score > bestScore) { bestScore = score; chosenIdx = idx; }
    }
    
    const oldSteps = pawns[currentTurn][chosenIdx];
    const newSteps = oldSteps === 0 ? 1 : oldSteps + diceValue;
    
    await animatePawnMovement(currentTurn, chosenIdx, diceValue);
    
    let pawnFinished = (newSteps === 57);
    if (pawnFinished) {
        playSound('home');
        if (pawns[currentTurn].every(s => s === 57)) if (!standings.includes(currentTurn)) standings.push(currentTurn);
    }
    
    let captured = null;
    if (newSteps >= 1 && newSteps <= 51) {
        const tCell = getTrackCell(currentTurn, newSteps);
        if (!SAFE_CELLS.has(tCell)) {
            for (const opp of COLORS) {
                if (opp === currentTurn) continue;
                for (let i = 0; i < 4; i++) {
                    if (pawns[opp][i] >= 1 && pawns[opp][i] <= 51 && getTrackCell(opp, pawns[opp][i]) === tCell) {
                        pawns[opp][i] = 0; captured = { color: opp, idx: i };
                        playSound('capture'); showToast(`${currentTurn} (Bot) captured ${opp}!`); break;
                    }
                }
                if (captured) break;
            }
        }
    }
    
    const anotherTurn = (diceValue === 6 && consecutiveSixes < 3) || (captured !== null) || pawnFinished;
    diceValue = 0; diceRolled = false;
    
    if (standings.includes(currentTurn)) localPassTurn();
    else if (anotherTurn) { consecutiveSixes = 0; updateGameUI(); setTimeout(localRollDice, 1200); }
    else { consecutiveSixes = 0; localPassTurn(); }
}

function getTrackCell(color, steps) { return (START_TRACK_INDICES[color] + steps - 1) % 52; }

// ================= MULTIPLAYER SOCKETS =================
function createMultiplayerRoom() {
    gameMode = 'multiplayer';
    // Use proper BACKEND_DOMAIN for fetch
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    fetch(`${protocol}//${BACKEND_DOMAIN}/api/room/create`, { method: "POST" })
        .then(res => res.json()).then(data => { roomCode = data.room_id; connectWebSocket(roomCode); })
        .catch(() => connectWebSocket("CREATE"));
}

function joinMultiplayerRoom() {
    const code = document.getElementById("room-code-input").value.trim();
    if (code.length !== 6) { showToast("Enter a valid 6-digit code."); return; }
    document.getElementById("join-modal").classList.add("hidden"); gameMode = 'multiplayer'; connectWebSocket(code);
}

function connectWebSocket(room) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // FIX: Using Explicit Backend Domain rather than frontend host!
    socket = new WebSocket(`${protocol}//${BACKEND_DOMAIN}/ws`);
    
    showToast("Connecting to Game Server...");
    socket.onopen = () => { socket.send(JSON.stringify({ type: "join_lobby", room_id: room, user_id: userId, name: userName, username: userUsername })); };
    socket.onmessage = (event) => handleServerMessage(JSON.parse(event.data));
    socket.onerror = () => showToast("Server connection error. Check backend!");
    socket.onclose = () => { if (gameStarted && !standings.includes(myColor)) setTimeout(() => connectWebSocket(roomCode), 3000); };
}

function handleServerMessage(data) {
    if (data.type === "error") { showToast(data.message); quitGameToHome(); return; }
    
    if (data.type === "lobby_update") {
        const room = data.room_state; roomCode = room.room_id; chatId = room.chat_id || chatId; lobbyPlayers = room.players;
        const me = lobbyPlayers.find(p => p.user_id === userId); if (me) { isHost = me.is_host; myColor = me.color; }

        document.getElementById("lobby-view").classList.remove("hidden");
        document.getElementById("menu-options").classList.add("hidden");
        document.getElementById("room-lobby").classList.remove("hidden");
        document.getElementById("lobby-code-val").innerText = roomCode;
        document.getElementById("player-count").innerText = lobbyPlayers.length;
        
        for (let i = 0; i < 4; i++) {
            const slot = document.getElementById(`slot-${i}`); slot.innerHTML = ""; slot.className = "player-slot empty";
            if (i < lobbyPlayers.length) {
                const p = lobbyPlayers[i]; slot.className = "player-slot occupied";
                slot.innerHTML = `<div class="player-slot-name"><span class="color-dot color-${p.color?p.color.toLowerCase():"gray"}"></span>
                <span>${p.name}${p.user_id===userId?" (You)":""}${p.is_host?' <span class="host-badge">HOST</span>':''}</span></div><span class="ready-dot"></span>`;
            } else slot.innerHTML = `<span class="slot-status">Waiting...</span>`;
        }
        document.getElementById("btn-start-game").disabled = !(isHost && lobbyPlayers.length >= 2);
    }
    else if (data.type === "game_start") {
        gameStarted = true; pawns = data.game_state.pawns; currentTurn = data.game_state.current_player;
        diceValue = data.game_state.dice_value; diceRolled = data.game_state.dice_rolled; standings = data.game_state.standings;
        const me = lobbyPlayers.find(p => p.user_id === userId); if (me) myColor = me.color;
        
        document.getElementById("lobby-view").classList.add("hidden"); document.getElementById("game-view").classList.remove("hidden");
        renderPawns(); updateGameUI(); showToast("Match Started!");
    }
    else if (data.type === "game_update") {
        pawns = data.game_state.pawns; currentTurn = data.game_state.current_player;
        diceValue = data.game_state.dice_value; diceRolled = data.game_state.dice_rolled;
        standings = data.game_state.standings; validMoves = data.valid_moves || [];
        
        if (data.event === "dice_rolled") {
            const cube = document.getElementById("dice-cube"); cube.className = "dice rolling"; playSound('roll');
            setTimeout(() => {
                cube.className = `dice show-${data.roll}`; updateGameUI();
                if (currentTurn === myColor && validMoves.length > 0) highlightValidPawns();
            }, 600);
        }
        else if (data.event === "pawn_moved") {
            clearPawnHighlights();
            pawns[data.player][data.pawn_idx] = data.old_steps; 
            animatePawnMovement(data.player, data.pawn_idx, data.roll).then(() => {
                pawns = data.game_state.pawns; 
                if (data.captured) { playSound('capture'); showToast(`${data.player} captured ${data.captured.color}!`); }
                if (data.pawn_finished) playSound('home');
                renderPawns(); updateGameUI();
            });
        }
        else if (data.event === "turn_passed") { clearPawnHighlights(); updateGameUI(); }
    }
    else if (data.type === "game_over") triggerGameOver(data.standings);
}

function triggerStartGame() { if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "start_game" })); }

function rollDiceAction() {
    if (!gameStarted || diceRolled) return;
    initAudio();
    if (gameMode === 'local' && currentTurn === myColor) localRollDice();
    else if (gameMode === 'multiplayer' && currentTurn === myColor && socket) socket.send(JSON.stringify({ type: "roll_dice" }));
}

function sendMultiplayerMove(idx) {
    if (gameMode === 'multiplayer' && socket) {
        clearPawnHighlights(); socket.send(JSON.stringify({ type: "move_pawn", pawn_idx: idx }));
    }
}

// ================= RENDER & ANIMATE =================
function renderPawns() {
    document.querySelectorAll(".pawn-container").forEach(el => el.remove());
    const coordsMap = {};
    
    COLORS.forEach(color => {
        for (let i = 0; i < 4; i++) {
            const steps = pawns[color][i]; let r = null, c = null;
            if (steps === 0) { const crd = BASE_POCKETS[color][i]; r = crd[0]; c = crd[1]; }
            else if (steps >= 1 && steps <= 51) { const crd = TRACK_COORDS[getTrackCell(color, steps)]; r = crd[0]; c = crd[1]; }
            else if (steps >= 52 && steps <= 56) { const crd = HOME_CORRIDORS[color][steps - 52]; r = crd[0]; c = crd[1]; }
            else if (steps === 57) { const crd = HOME_CENTERS[color]; r = crd[0]; c = crd[1]; }
            if (r !== null && c !== null) { const k = `${r}_${c}`; if (!coordsMap[k]) coordsMap[k] = []; coordsMap[k].push({ color, idx: i }); }
        }
    });

    Object.keys(coordsMap).forEach(key => {
        const [r, c] = key.split("_").map(Number); const list = coordsMap[key];
        let tCell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`) || document.querySelector(`.base-pocket[data-row="${r}"][data-col="${c}"]`) || document.querySelector(".center-home");
        if (tCell) {
            const cont = document.createElement("div"); cont.className = "pawn-container";
            if (list.length === 2) cont.classList.add("stack-2"); else if (list.length >= 3) cont.classList.add("stack-3");
            list.forEach(item => {
                const p = document.createElement("div"); p.className = `pawn pawn-${item.color.toLowerCase()}`;
                p.id = `pawn-${item.color}-${item.idx}`; cont.appendChild(p);
            });
            tCell.appendChild(cont);
        }
    });
}

// FIX: Hopping Animation for moving pawns
function animatePawnMovement(color, pawnIdx, stepsCount) {
    return new Promise(async (resolve) => {
        if (pawns[color][pawnIdx] === 0) { playSound('move'); pawns[color][pawnIdx] = 1; renderPawns(); resolve(); return; }
        
        for (let s = 1; s <= stepsCount; s++) {
            // Apply hopping class visually before moving
            const el = document.getElementById(`pawn-${color}-${pawnIdx}`);
            if (el) el.classList.add('hopping');
            playSound('move');
            
            await new Promise(r => setTimeout(r, 120)); // wait for jump peak
            
            pawns[color][pawnIdx]++; 
            renderPawns(); // re-renders at new spot
            
            await new Promise(r => setTimeout(r, 100)); // wait to settle
        }
        resolve();
    });
}

function updateGameUI() {
    document.getElementById("turn-color-indicator").className = `color-dot color-${currentTurn.toLowerCase()}`;
    const name = lobbyPlayers.find(p => p.color === currentTurn)?.name || currentTurn;
    document.getElementById("turn-text-val").innerText = (currentTurn === myColor) ? "Your Turn!" : `${name}'s Turn`;

    const dCont = document.getElementById("dice-container"), inst = document.getElementById("dice-instructions");
    if (currentTurn === myColor && !diceRolled) { dCont.classList.remove("disabled"); inst.innerText = "Tap Dice to Roll!"; inst.style.color = "var(--color-yellow)"; }
    else { dCont.classList.add("disabled"); inst.innerText = diceRolled ? `Rolled a ${diceValue}!` : `Waiting...`; inst.style.color = "var(--text-secondary)"; }

    const sCont = document.getElementById("game-players-list"); sCont.innerHTML = "";
    lobbyPlayers.forEach(p => {
        if (!p.color) return;
        const pPositions = pawns[p.color] || [0,0,0,0];
        const bCount = pPositions.filter(s => s === 0).length, fCount = pPositions.filter(s => s === 57).length;
        sCont.innerHTML += `<div class="turn-stat-row ${p.color === currentTurn ? "active-glow" : ""}">
            <div style="display:flex; align-items:center; gap:8px;"><span class="color-dot color-${p.color.toLowerCase()}"></span><span style="font-weight:${p.color===currentTurn?'800':'400'}">${p.name}</span></div>
            <div class="stat-pawn-count">🏠<span>${bCount}</span> | 🏁<span>${fCount}</span></div></div>`;
    });

    if (gameMode === 'multiplayer' && currentTurn === myColor && diceRolled) {
        validMoves.forEach(idx => { const el = document.getElementById(`pawn-${myColor}-${idx}`); if (el) { el.classList.add("valid-move"); el.onclick = () => sendMultiplayerMove(idx); } });
    }
}

// ================= RESULTS CERTIFICATE & SHARE =================
function triggerGameOver(remoteStandings = null) {
    gameStarted = false; 
    document.getElementById("game-view").classList.add("hidden"); 
    document.getElementById("game-over-view").classList.remove("hidden"); 
    playSound('win');
    
    const cont = document.getElementById("standings-container"); 
    cont.innerHTML = "";
    
    let stList = remoteStandings || standings.map(color => lobbyPlayers.find(pl => pl.color === color)).filter(Boolean);
    const medals = ["🥇 1st Place", "🥈 2nd Place", "🥉 3rd Place", "🎖️ 4th Place"];
    
    stList.forEach((p, idx) => {
        cont.innerHTML += `<div class="standing-row rank-${idx + 1}">
            <div class="player-info">
                <span class="color-dot color-${p.color.toLowerCase()}"></span>
                <span>${p.name}</span>
            </div>
            <span class="standing-medal">${medals[idx]||"🎖️ Finished"}</span>
        </div>`;
    });

    generateResultsCertificate(stList);
}

function generateResultsCertificate(standingsList) {
    const canvas = document.getElementById("results-canvas");
    const ctx = canvas.getContext("2d");
    document.getElementById("result-canvas-container").classList.remove("hidden");

    // 1. Draw rich background gradient
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, "#0f0f23");
    grad.addColorStop(1, "#17173a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Draw border lines
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#ffb900"; 
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

    // 3. Draw heading
    ctx.font = "bold 26px 'Outfit', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText("LUDO ROYALE CHAMPIONS", canvas.width / 2, 50);

    ctx.font = "14px 'Outfit', sans-serif";
    ctx.fillStyle = "#ffb900";
    ctx.fillText("OFFICIAL MATCH STANDINGS REPORT", canvas.width / 2, 75);

    // 4. Draw Divider Line
    ctx.beginPath();
    ctx.moveTo(100, 95);
    ctx.lineTo(canvas.width - 100, 95);
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.stroke();

    // 5. Draw Standings
    const medals = ["🥇 1ST", "🥈 2ND", "🥉 3RD", "🎖️ 4TH"];
    const colorsGradients = {
        Red:    ["#ff4d6d", "#ff2a4b"],
        Green:  ["#2ec4b6", "#209f8f"],
        Yellow: ["#ffb703", "#e89600"],
        Blue:   ["#0077b6", "#005f9e"]
    };

    standingsList.forEach((player, idx) => {
        const yOffset = 130 + idx * 60;
        
        ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
        ctx.fillRect(40, yOffset - 25, canvas.width - 80, 46);
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.strokeRect(40, yOffset - 25, canvas.width - 80, 46);

        ctx.font = "bold 16px 'Outfit', sans-serif";
        ctx.fillStyle = idx === 0 ? "#ffb900" : "#ffffff";
        ctx.textAlign = "left";
        ctx.fillText(medals[idx] || "FINISH", 60, yOffset + 4);

        const circleGrad = ctx.createRadialGradient(200, yOffset, 2, 200, yOffset, 8);
        const colGrad = colorsGradients[player.color] || ["#ffffff", "#cccccc"];
        circleGrad.addColorStop(0, colGrad[0]);
        circleGrad.addColorStop(1, colGrad[1]);
        ctx.beginPath();
        ctx.arc(200, yOffset, 8, 0, Math.PI * 2);
        ctx.fillStyle = circleGrad;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();

        ctx.font = "bold 16px 'Outfit', sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(player.name.substring(0, 20), 225, yOffset + 4);

        ctx.font = "italic 13px 'Outfit', sans-serif";
        ctx.fillStyle = colGrad[0];
        ctx.textAlign = "right";
        ctx.fillText(player.color, canvas.width - 60, yOffset + 4);
    });

    // 6. Draw Footer
    ctx.font = "10px 'Outfit', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.textAlign = "center";
    ctx.fillText("Generated in Telegram Mini App. Room Ref: " + roomCode, canvas.width / 2, canvas.height - 30);
}

function shareResultsToTelegram() { 
    showToast("Sending results to Telegram group..."); 
    
    if (chatId) {
        const canvas = document.getElementById("results-canvas");
        const base64Img = canvas.toDataURL("image/png");
        
        const mappedStandings = [];
        const resultsRows = document.querySelectorAll(".standing-row");
        resultsRows.forEach((row) => {
            const name = row.querySelector(".player-info span:nth-child(2)").innerText;
            const colorDot = row.querySelector(".player-info span:nth-child(1)");
            let color = "Red";
            if (colorDot.classList.contains("color-green")) color = "Green";
            else if (colorDot.classList.contains("color-yellow")) color = "Yellow";
            else if (colorDot.classList.contains("color-blue")) color = "Blue";
            
            mappedStandings.push({ user_id: 9999, name: name, username: "", color: color });
        });

        // Send back to Render Backend URL properly
        const protocol = window.location.protocol === "https:" ? "https:" : "http:";
        const payload = { chat_id: chatId, room_id: roomCode, image_base64: base64Img, standings: mappedStandings };

        fetch(`${protocol}//${BACKEND_DOMAIN}/api/share-results`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
        }).then(res => res.json()).then(data => {
            if (tg) setTimeout(() => tg.close(), 1500);
        }).catch(err => showToast("Failed to share."));
    } else {
        setTimeout(()=> { if (tg) tg.close(); }, 1500);
    }
}

function copyRoomCode() { if (roomCode) navigator.clipboard.writeText(roomCode).then(() => showToast("Copied!")); }
function inviteFriends() { if (tg) tg.openTelegramLink(`https://t.me/share/url?url=https://t.me/ludo_game_bot/app?startapp=${roomCode}&text=Join%20My%20Room`); }
function leaveLobby() { quitGameToHome(); }

function quitGameToHome() {
    if (socket) { socket.close(); socket = null; }
    gameStarted = false; roomCode = ""; isHost = false; lobbyPlayers = []; standings = []; clearPawnHighlights();
    document.getElementById("room-lobby").classList.add("hidden"); document.getElementById("menu-options").classList.remove("hidden");
    document.getElementById("game-view").classList.add("hidden"); document.getElementById("game-over-view").classList.add("hidden"); document.getElementById("lobby-view").classList.remove("hidden");
}

function showToast(msg) {
    if (tg && tg.showNotification) { try { tg.showNotification(msg); return; } catch(e){} }
    let toast = document.getElementById("t-toast") || document.createElement("div");
    toast.id = "t-toast"; toast.style = "position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;padding:12px 24px;border-radius:20px;font-size:0.95rem;z-index:9999;font-weight:600;box-shadow:0 10px 20px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.2);";
    toast.innerText = msg; document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}
