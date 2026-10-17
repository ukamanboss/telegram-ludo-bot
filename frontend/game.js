/**
 * Miku Game Hub — Home Screen (Play with Miku / Play with Friends, Ludo & Chess),
 * Top-Right Telegram User Profile (Name + ID), Real-Time WebSocket Sync,
 * and Web Audio API Sound Effects.
 */

const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
if (tg) {
  tg.ready();
  tg.expand();
}

// ---------------------------------------------------------------------------
// 1. Web Audio API Synthesized Sound Effects Engine
// ---------------------------------------------------------------------------
class SoundEngine {
  constructor() {
    this.enabled = true;
    this.ctx = null;
  }

  _init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  haptic(type = "light") {
    try {
      if (tg && tg.HapticFeedback) {
        if (["error", "success", "warning"].includes(type)) {
          tg.HapticFeedback.notificationOccurred(type);
        } else {
          tg.HapticFeedback.impactOccurred(type);
        }
      }
    } catch (_) {}
  }

  tone(freq, duration, type = "sine", vol = 0.18, delay = 0, slideTo = null) {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playRoll() {
    this.haptic("light");
    [0, 0.055, 0.11, 0.165, 0.22].forEach((d, idx) => {
      this.tone(240 + idx * 55, 0.045, "triangle", 0.16, d, 120);
    });
  }

  playSix() {
    this.haptic("medium");
    this.tone(523.25, 0.11, "triangle", 0.22, 0);
    this.tone(659.25, 0.11, "triangle", 0.22, 0.09);
    this.tone(783.99, 0.14, "triangle", 0.24, 0.18);
    this.tone(1046.5, 0.28, "sine", 0.26, 0.27);
  }

  playStep() {
    this.haptic("light");
    this.tone(380, 0.065, "sine", 0.2, 0, 620);
  }

  playOpen() {
    this.haptic("medium");
    this.tone(440, 0.1, "sine", 0.2, 0);
    this.tone(587.33, 0.12, "sine", 0.22, 0.08);
    this.tone(880, 0.24, "triangle", 0.25, 0.16);
  }

  playCapture() {
    this.haptic("heavy");
    this.tone(720, 0.18, "sawtooth", 0.24, 0, 110);
    this.tone(140, 0.32, "square", 0.28, 0.12, 48);
  }

  playSafe() {
    this.haptic("light");
    this.tone(660, 0.1, "sine", 0.18, 0);
    this.tone(880, 0.18, "sine", 0.2, 0.08);
  }

  playHome() {
    this.haptic("success");
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      this.tone(f, 0.2, "triangle", 0.24, i * 0.07);
    });
  }

  playTurn() {
    this.tone(587.33, 0.09, "sine", 0.12, 0);
  }

  playWin() {
    this.haptic("success");
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    const delays = [0, 0.12, 0.24, 0.36, 0.54, 0.68];
    notes.forEach((f, i) => {
      this.tone(f, i === 5 ? 0.55 : 0.16, "triangle", 0.28, delays[i]);
    });
  }
}

const sfx = new SoundEngine();

// ---------------------------------------------------------------------------
// 2. Player Telegram Identity & Top-Right Profile Display
// ---------------------------------------------------------------------------
const urlParams = new URLSearchParams(window.location.search);
const tgUser = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user : null;

const MY_USER_ID = Number(
  urlParams.get("user_id") ||
  urlParams.get("userId") ||
  (tgUser && tgUser.id) ||
  Math.floor(100000 + Math.random() * 899999)
);
const MY_NAME =
  urlParams.get("name") ||
  (tgUser ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ") : "Player");
const MY_USERNAME = urlParams.get("username") || (tgUser && tgUser.username) || "";

let ROOM_ID = (urlParams.get("room") || `MK${MY_USER_ID % 10000}`).toUpperCase();
const BACKEND_PARAM = (urlParams.get("backend") || localStorage.getItem("miku_ludo_backend") || "").replace(/\/$/, "");
if (BACKEND_PARAM) {
  localStorage.setItem("miku_ludo_backend", BACKEND_PARAM);
}
const CHESS_FRONTEND_URL = (urlParams.get("chess_url") || "https://tg-chess-bot-frontend.onrender.com").replace(/\/$/, "");

// Populate Top-Right Player Telegram Name & ID
document.getElementById("tgUserName").textContent = MY_NAME;
document.getElementById("tgUserId").textContent = `ID: ${MY_USER_ID}`;
document.getElementById("tgUserInitial").textContent = (MY_NAME.trim()[0] || "M").toUpperCase();
document.getElementById("homeRoomBadge").textContent = ROOM_ID;
document.getElementById("roomCodeLabel").textContent = ROOM_ID;

let selectedAiBotCount = 1;

// ---------------------------------------------------------------------------
// 3. Home Screen Navigation & Game Launchers
// ---------------------------------------------------------------------------
const homeScreenEl = document.getElementById("homeScreen");
const gameScreenEl = document.getElementById("gameScreen");
const backHomeBtn = document.getElementById("backHomeBtn");

function showHomeScreen() {
  sfx.playStep();
  homeScreenEl.classList.remove("hidden");
  gameScreenEl.classList.add("hidden");
  backHomeBtn.classList.add("hidden");
}

function showGameScreen() {
  sfx.playOpen();
  homeScreenEl.classList.add("hidden");
  gameScreenEl.classList.remove("hidden");
  backHomeBtn.classList.remove("hidden");
  syncUI();
}

backHomeBtn.addEventListener("click", showHomeScreen);
document.getElementById("homeFromModalBtn").addEventListener("click", () => {
  document.getElementById("winnerModal").classList.add("hidden");
  showHomeScreen();
});

// AI Bot Count Selector Pills (1v1 Miku vs 4-Player AI)
document.querySelectorAll(".ai-pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll(".ai-pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    selectedAiBotCount = Number(pill.getAttribute("data-bots") || 1);
    sfx.playStep();
  });
});

// Apply Custom Room Code on Home Screen
document.getElementById("applyRoomBtn").addEventListener("click", () => {
  const inputVal = document.getElementById("customRoomInput").value.trim().toUpperCase();
  if (!inputVal) return;
  ROOM_ID = inputVal.replace(/[^A-Z0-9_-]/g, "").slice(0, 12) || ROOM_ID;
  document.getElementById("homeRoomBadge").textContent = ROOM_ID;
  document.getElementById("roomCodeLabel").textContent = ROOM_ID;
  sfx.playOpen();
  connectWebSocket();
});

// Button 1: Play Ludo with Miku (AI Mode)
document.getElementById("btnLudoMiku").addEventListener("click", () => {
  showGameScreen();
  startPlayWithMikuMatch(selectedAiBotCount);
});

// Button 2: Play Ludo with Friends (Multiplayer Room)
document.getElementById("btnLudoFriends").addEventListener("click", () => {
  const customInput = document.getElementById("customRoomInput").value.trim().toUpperCase();
  if (customInput) {
    ROOM_ID = customInput.replace(/[^A-Z0-9_-]/g, "").slice(0, 12) || ROOM_ID;
    document.getElementById("homeRoomBadge").textContent = ROOM_ID;
    document.getElementById("roomCodeLabel").textContent = ROOM_ID;
  }
  showGameScreen();
  connectWebSocket();
});

// Button 3 & 4: Launch Chess Royale (with Miku AI or with Friends)
function launchChessFrontend(mode) {
  sfx.playOpen();
  const params = new URLSearchParams({
    room: ROOM_ID,
    user_id: String(MY_USER_ID),
    name: MY_NAME,
    username: MY_USERNAME,
    mode: mode,
  });
  if (BACKEND_PARAM) {
    params.set("backend", BACKEND_PARAM);
  }
  window.location.href = `${CHESS_FRONTEND_URL}/?${params.toString()}`;
}

document.getElementById("btnChessMiku").addEventListener("click", () => launchChessFrontend("ai"));
document.getElementById("btnChessFriends").addEventListener("click", () => launchChessFrontend("friends"));

// ---------------------------------------------------------------------------
// 4. 15x15 Ludo Board Coordinate Geometry
// ---------------------------------------------------------------------------
const COLORS = ["red", "green", "yellow", "blue"];
const COLOR_HEX = {
  red: "#ff3b5c",
  green: "#00d68f",
  yellow: "#ffbe0b",
  blue: "#0096ff",
};
const COLOR_LIGHT = {
  red: "#ffe3e8",
  green: "#dcfff3",
  yellow: "#fff6d6",
  blue: "#dcf0ff",
};

const MAIN_TRACK_COORDS = [
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
  [7, 0], [8, 0],
  [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
  [14, 7], [14, 8],
  [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
  [7, 14], [6, 14],
  [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  [0, 7], [0, 6],
];

const START_OFFSETS = { red: 0, green: 13, yellow: 26, blue: 39 };
const SAFE_GLOBAL_SET = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

const HOME_PATHS = {
  red:    [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6.2, 7]],
  green:  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6.2]],
  yellow: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [7.8, 7]],
  blue:   [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 7.8]],
};

const YARD_SPOTS = {
  red:    [[1.8, 1.8], [4.2, 1.8], [1.8, 4.2], [4.2, 4.2]],
  green:  [[10.8, 1.8], [13.2, 1.8], [10.8, 4.2], [13.2, 4.2]],
  yellow: [[10.8, 10.8], [13.2, 10.8], [10.8, 13.2], [13.2, 13.2]],
  blue:   [[1.8, 10.8], [4.2, 10.8], [1.8, 13.2], [4.2, 13.2]],
};

function getStepGridCoord(color, step, tokenIdx) {
  if (step === -1) return YARD_SPOTS[color][tokenIdx];
  if (step >= 0 && step <= 50) {
    const globalIdx = (START_OFFSETS[color] + step) % 52;
    const [c, r] = MAIN_TRACK_COORDS[globalIdx];
    return [c + 0.5, r + 0.5];
  }
  if (step >= 51 && step <= 56) {
    const homeIdx = step - 51;
    const [c, r] = HOME_PATHS[color][homeIdx];
    return [c + 0.5, r + 0.5];
  }
  return [7.5, 7.5];
}

// ---------------------------------------------------------------------------
// 5. Game State, WebSocket & "Play with Miku" Launcher
// ---------------------------------------------------------------------------
const visualTokens = {
  red: [-1, -1, -1, -1],
  green: [-1, -1, -1, -1],
  yellow: [-1, -1, -1, -1],
  blue: [-1, -1, -1, -1],
};
let isAnimatingMove = false;
let pulsePhase = 0;

let gameState = {
  room_id: ROOM_ID,
  status: "waiting",
  players: [
    { user_id: MY_USER_ID, name: MY_NAME, color: "red", is_ai: false },
  ],
  tokens: {
    red: [-1, -1, -1, -1],
    green: [-1, -1, -1, -1],
    yellow: [-1, -1, -1, -1],
    blue: [-1, -1, -1, -1],
  },
  turn_index: 0,
  current_color: "red",
  current_user_id: MY_USER_ID,
  dice_value: null,
  dice_rolled: false,
  valid_moves: [],
  winner_order: [],
  last_event: { text: "Room ready! Tap '▶ Start Match' or '+ 🤖 Miku Bot'!" },
};

let ws = null;
let isOnlineMode = false;

function resolveWsUrl() {
  if (BACKEND_PARAM) {
    const wsProto = BACKEND_PARAM.startsWith("https") ? "wss://" : "ws://";
    const hostOnly = BACKEND_PARAM.replace(/^https?:\/\//, "");
    return `${wsProto}${hostOnly}/ws/ludo/${ROOM_ID}`;
  }
  const proto = window.location.protocol === "https:" ? "wss://" : "ws://";
  return `${proto}${window.location.host}/ws/ludo/${ROOM_ID}`;
}

function connectWebSocket() {
  if (ws) {
    try { ws.close(); } catch (_) {}
  }
  try {
    ws = new WebSocket(resolveWsUrl());
  } catch (e) {
    setConnectionBadge(false);
    return;
  }

  ws.onopen = () => {
    isOnlineMode = true;
    setConnectionBadge(true);
    wsSend({
      action: "join",
      user_id: MY_USER_ID,
      name: MY_NAME,
      username: MY_USERNAME,
    });
  };

  ws.onmessage = async (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.emoji_Floating) {
        spawnFloatingEmoji(msg.emoji_Floating.emoji);
        sfx.playStep();
      }
      if (msg.rolled_dice) {
        animateDiceCube(msg.rolled_dice);
      }
      if (msg.sound && msg.sound !== "move" && msg.sound !== "open") {
        triggerSoundByName(msg.sound);
      }
      if (msg.state) {
        await applyIncomingState(msg.state, msg.move_anim || null);
      }
    } catch (err) {
      console.error("WS message parse error:", err);
    }
  };

  ws.onclose = () => {
    isOnlineMode = false;
    setConnectionBadge(false);
  };

  ws.onerror = () => {
    setConnectionBadge(false);
  };
}

function setConnectionBadge(online) {
  const dot = document.getElementById("connDot");
  const txt = document.getElementById("connText");
  if (online) {
    dot.className = "conn-dot online";
    txt.textContent = "Live Server";
  } else {
    dot.className = "conn-dot offline";
    txt.textContent = "AI / Local";
  }
}

function wsSend(payload) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ ...payload, user_id: MY_USER_ID, name: MY_NAME }));
    return true;
  }
  return false;
}

function startPlayWithMikuMatch(botCount = 1) {
  // If connected to live server, reset room, add Miku bots, and start match
  if (ws && ws.readyState === WebSocket.OPEN) {
    wsSend({ action: "reset" });
    setTimeout(() => {
      for (let i = 0; i < botCount; i++) {
        wsSend({ action: "add_bot" });
      }
      setTimeout(() => wsSend({ action: "start_game" }), 200);
    }, 150);
    return;
  }

  // Instant Local Miku AI Match
  COLORS.forEach((c) => {
    gameState.tokens[c] = [-1, -1, -1, -1];
    visualTokens[c] = [-1, -1, -1, -1];
  });
  const mikuNames = ["Miku AI 💙", "Nino Bot 🦋", "Yotsuba Bot 🍀"];
  gameState.players = [
    { user_id: MY_USER_ID, name: MY_NAME, color: "red", is_ai: false },
  ];
  for (let i = 0; i < botCount && gameState.players.length < 4; i++) {
    gameState.players.push({
      user_id: 900001 + i,
      name: mikuNames[i] || `Miku Bot #${i + 1}`,
      color: COLORS[gameState.players.length],
      is_ai: true,
    });
  }
  gameState.status = "playing";
  gameState.turn_index = 0;
  gameState.current_color = "red";
  gameState.current_user_id = MY_USER_ID;
  gameState.dice_value = null;
  gameState.dice_rolled = false;
  gameState.valid_moves = [];
  gameState.winner_order = [];
  gameState.last_event = { text: "🎧 Miku: Chalo dekhte hain kaun jeet-ta hai! Roll the dice!" };
  syncUI();
}

function triggerSoundByName(name) {
  switch (name) {
    case "roll": sfx.playRoll(); break;
    case "six": sfx.playSix(); break;
    case "open": sfx.playOpen(); break;
    case "move": sfx.playStep(); break;
    case "capture": sfx.playCapture(); break;
    case "safe": sfx.playSafe(); break;
    case "home": sfx.playHome(); break;
    case "win": sfx.playWin(); break;
    case "turn": sfx.playTurn(); break;
  }
}

async function applyIncomingState(newState, moveAnim) {
  if (moveAnim) {
    isAnimatingMove = true;
    const { color, token_index, from_step, to_step } = moveAnim;
    if (from_step === -1 && to_step === 0) {
      visualTokens[color][token_index] = 0;
      sfx.playOpen();
      await new Promise((r) => setTimeout(r, 220));
    } else if (to_step > from_step) {
      for (let s = from_step + 1; s <= to_step; s++) {
        visualTokens[color][token_index] = s;
        sfx.playStep();
        await new Promise((r) => setTimeout(r, 135));
      }
    }
    isAnimatingMove = false;
  }

  gameState = newState;
  COLORS.forEach((c) => {
    visualTokens[c] = [...(gameState.tokens[c] || [-1, -1, -1, -1])];
  });
  syncUI();
}

// ---------------------------------------------------------------------------
// 6. Local / Offline Fallback Engine
// ---------------------------------------------------------------------------
function localComputeValidMoves(color, dice) {
  const res = [];
  gameState.tokens[color].forEach((step, idx) => {
    if (step === -1 && dice === 6) res.push(idx);
    else if (step >= 0 && step + dice <= 56) res.push(idx);
  });
  return res;
}

function localAdvanceTurn() {
  gameState.dice_value = null;
  gameState.dice_rolled = false;
  gameState.valid_moves = [];
  if (!gameState.players.length) return;
  gameState.turn_index = (gameState.turn_index + 1) % gameState.players.length;
  const curr = gameState.players[gameState.turn_index];
  gameState.current_color = curr.color;
  gameState.current_user_id = curr.user_id;
  syncUI();

  if (curr.is_ai && gameState.status === "playing") {
    setTimeout(localPlayAiTurn, 750);
  }
}

async function localRollDice() {
  if (gameState.status !== "playing" || gameState.dice_rolled || isAnimatingMove) return;
  const dice = Math.floor(Math.random() * 6) + 1;
  animateDiceCube(dice);
  if (dice === 6) sfx.playSix();
  else sfx.playRoll();

  gameState.dice_value = dice;
  gameState.dice_rolled = true;
  const curr = gameState.players[gameState.turn_index];
  const valid = localComputeValidMoves(curr.color, dice);
  gameState.valid_moves = valid;
  gameState.last_event = { text: `🎲 ${curr.name} rolled a ${dice}!` };
  syncUI();

  if (valid.length === 0) {
    setTimeout(() => {
      gameState.last_event = { text: `⏭️ No valid moves for ${curr.name}.` };
      localAdvanceTurn();
    }, 900);
  } else if (valid.length === 1 && curr.is_ai) {
    setTimeout(() => localMoveToken(valid[0]), 650);
  }
}

async function localMoveToken(tokenIdx) {
  if (!gameState.dice_rolled || !gameState.valid_moves.includes(tokenIdx) || isAnimatingMove) return;
  const curr = gameState.players[gameState.turn_index];
  const color = curr.color;
  const dice = gameState.dice_value;
  const oldStep = gameState.tokens[color][tokenIdx];
  const newStep = oldStep === -1 ? 0 : oldStep + dice;

  await applyIncomingState(
    {
      ...gameState,
      tokens: {
        ...gameState.tokens,
        [color]: gameState.tokens[color].map((v, i) => (i === tokenIdx ? newStep : v)),
      },
    },
    { color, token_index: tokenIdx, from_step: oldStep, to_step: newStep }
  );

  let bonus = dice === 6;
  if (newStep >= 0 && newStep <= 50) {
    const gpos = (START_OFFSETS[color] + newStep) % 52;
    if (!SAFE_GLOBAL_SET.has(gpos)) {
      gameState.players.forEach((opp) => {
        if (opp.color === color) return;
        gameState.tokens[opp.color].forEach((ostep, oidx) => {
          if (ostep >= 0 && ostep <= 50 && (START_OFFSETS[opp.color] + ostep) % 52 === gpos) {
            gameState.tokens[opp.color][oidx] = -1;
            visualTokens[opp.color][oidx] = -1;
            bonus = true;
            sfx.playCapture();
            gameState.last_event = { text: `⚔️ ${curr.name} cut ${opp.name}'s goti!` };
          }
        });
      });
    } else {
      sfx.playSafe();
    }
  }

  if (newStep === 56) {
    bonus = true;
    sfx.playHome();
    gameState.last_event = { text: `🏠 ${curr.name}'s goti reached Home!` };
  }

  if (gameState.tokens[color].every((s) => s === 56)) {
    gameState.status = "finished";
    gameState.winner_order.push(color);
    gameState.last_event = { winner: curr.name, text: `🏆 ${curr.name} Won the Match!` };
    sfx.playWin();
    syncUI();
    return;
  }

  if (bonus) {
    gameState.dice_value = null;
    gameState.dice_rolled = false;
    gameState.valid_moves = [];
    syncUI();
    if (curr.is_ai) setTimeout(localPlayAiTurn, 750);
  } else {
    localAdvanceTurn();
  }
}

async function localPlayAiTurn() {
  if (gameState.status !== "playing") return;
  await localRollDice();
  const curr = gameState.players[gameState.turn_index];
  if (curr && curr.is_ai && gameState.dice_rolled && gameState.valid_moves.length > 0) {
    setTimeout(() => {
      const pick = gameState.valid_moves[0];
      localMoveToken(pick);
    }, 650);
  }
}

// ---------------------------------------------------------------------------
// 7. UI Synchronization & Board Renderer
// ---------------------------------------------------------------------------
function animateDiceCube(val) {
  const cube = document.getElementById("diceCube");
  cube.classList.add("rolling");
  setTimeout(() => {
    cube.classList.remove("rolling");
    cube.setAttribute("data-val", String(val || 6));
  }, 380);
}

function syncUI() {
  const banner = document.getElementById("eventBanner");
  if (gameState.last_event && gameState.last_event.text) {
    banner.textContent = gameState.last_event.text;
  }

  COLORS.forEach((color) => {
    const card = document.getElementById(`card-${color}`);
    const nameEl = document.getElementById(`name-${color}`);
    const subEl = document.getElementById(`sub-${color}`);
    const scoreEl = document.getElementById(`score-${color}`);

    const player = gameState.players.find((p) => p.color === color);
    const tokens = gameState.tokens[color] || [-1, -1, -1, -1];
    const homeCount = tokens.filter((s) => s === 56).length;
    scoreEl.textContent = `${homeCount}/4`;

    if (player) {
      const isMe = Number(player.user_id) === MY_USER_ID;
      nameEl.textContent = isMe ? `${player.name} (You)` : player.name;
      subEl.textContent =
        gameState.current_color === color && gameState.status === "playing"
          ? gameState.dice_rolled
            ? "👉 Tap a Goti!"
            : "🎲 Rolling..."
          : player.is_ai
          ? "🤖 Miku AI"
          : `ID: ${player.user_id}`;
    } else {
      nameEl.textContent = "Empty Slot";
      subEl.textContent = "Waiting...";
    }

    if (gameState.status === "playing" && gameState.current_color === color) {
      card.classList.add("active-turn");
    } else {
      card.classList.remove("active-turn");
    }
  });

  const diceBtn = document.getElementById("diceBtn");
  const diceCaption = document.getElementById("diceCaption");
  const cube = document.getElementById("diceCube");

  if (gameState.dice_value) {
    cube.setAttribute("data-val", String(gameState.dice_value));
  }

  const isMyTurn =
    gameState.status === "playing" &&
    (!isOnlineMode || Number(gameState.current_user_id) === MY_USER_ID);

  if (gameState.status === "waiting") {
    diceCaption.textContent = "START MATCH";
    diceBtn.classList.remove("my-turn-glow");
  } else if (isMyTurn && !gameState.dice_rolled) {
    diceCaption.textContent = "YOUR TURN!";
    diceBtn.classList.add("my-turn-glow");
  } else if (isMyTurn && gameState.dice_rolled) {
    diceCaption.textContent = `MOVE (${gameState.dice_value})`;
    diceBtn.classList.add("my-turn-glow");
  } else {
    diceCaption.textContent = `${gameState.current_color.toUpperCase()}'S TURN`;
    diceBtn.classList.remove("my-turn-glow");
  }

  const modal = document.getElementById("winnerModal");
  if (gameState.status === "finished") {
    const winName =
      (gameState.last_event && gameState.last_event.winner) || "Champion";
    document.getElementById("winnerSubtitle").textContent =
      `👑 ${winName} won the Ludo Royale match!`;
    modal.classList.remove("hidden");
  } else {
    modal.classList.add("hidden");
  }
}

function spawnFloatingEmoji(emoji) {
  const layer = document.getElementById("floatingEmojiLayer");
  const el = document.createElement("div");
  el.className = "float-emoji";
  el.textContent = emoji;
  el.style.left = `${20 + Math.random() * 60}%`;
  layer.appendChild(el);
  setTimeout(() => el.remove(), 1850);
}

const canvas = document.getElementById("ludoCanvas");
const ctx = canvas.getContext("2d");

function drawStar(cx, cy, spikes, outerR, innerR, fillStyle) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
  }
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function renderBoard() {
  const W = canvas.width;
  const S = W / 15;
  ctx.clearRect(0, 0, W, W);

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, W, W);

  const tintTile = (c, r, fill) => {
    ctx.fillStyle = fill;
    ctx.fillRect(c * S, r * S, S, S);
  };

  for (let i = 1; i <= 5; i++) {
    tintTile(i, 7, COLOR_HEX.red);
    tintTile(7, i, COLOR_HEX.green);
    tintTile(14 - i, 7, COLOR_HEX.yellow);
    tintTile(7, 14 - i, COLOR_HEX.blue);
  }
  tintTile(1, 6, COLOR_HEX.red);
  tintTile(8, 1, COLOR_HEX.green);
  tintTile(13, 8, COLOR_HEX.yellow);
  tintTile(6, 13, COLOR_HEX.blue);

  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1.2;
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const inYard =
        (r < 6 && c < 6) ||
        (r < 6 && c > 8) ||
        (r > 8 && c < 6) ||
        (r > 8 && c > 8) ||
        (r >= 6 && r <= 8 && c >= 6 && c <= 8);
      if (!inYard) {
        ctx.strokeRect(c * S, r * S, S, S);
      }
    }
  }

  SAFE_GLOBAL_SET.forEach((gidx) => {
    const [c, r] = MAIN_TRACK_COORDS[gidx];
    const isStart = gidx === 0 || gidx === 13 || gidx === 26 || gidx === 39;
    drawStar(
      (c + 0.5) * S,
      (r + 0.5) * S,
      5,
      S * 0.34,
      S * 0.15,
      isStart ? "#ffffff" : "#64748b"
    );
  });

  const drawYard = (gx, gy, color) => {
    ctx.fillStyle = COLOR_HEX[color];
    ctx.fillRect(gx * S, gy * S, 6 * S, 6 * S);

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect((gx + 0.75) * S, (gy + 0.75) * S, 4.5 * S, 4.5 * S, 14);
    ctx.fill();
  };
  drawYard(0, 0, "red");
  drawYard(9, 0, "green");
  drawYard(9, 9, "yellow");
  drawYard(0, 9, "blue");

  COLORS.forEach((color) => {
    YARD_SPOTS[color].forEach(([cx, cy]) => {
      ctx.fillStyle = COLOR_LIGHT[color];
      ctx.strokeStyle = COLOR_HEX[color];
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx * S, cy * S, S * 0.52, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  });

  const midX = 7.5 * S;
  const midY = 7.5 * S;
  const tri = (x1, y1, x2, y2, color) => {
    ctx.beginPath();
    ctx.moveTo(midX, midY);
    ctx.lineTo(x1 * S, y1 * S);
    ctx.lineTo(x2 * S, y2 * S);
    ctx.closePath();
    ctx.fillStyle = COLOR_HEX[color];
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
  };
  tri(6, 6, 6, 9, "red");
  tri(6, 6, 9, 6, "green");
  tri(9, 6, 9, 9, "yellow");
  tri(6, 9, 9, 9, "blue");

  pulsePhase += 0.08;
  const posBuckets = {};

  COLORS.forEach((color) => {
    (visualTokens[color] || [-1, -1, -1, -1]).forEach((step, tidx) => {
      const [gx, gy] = getStepGridCoord(color, step, tidx);
      const key = `${gx.toFixed(1)},${gy.toFixed(1)}`;
      if (!posBuckets[key]) posBuckets[key] = [];
      posBuckets[key].push({ color, tidx, step, gx, gy });
    });
  });

  Object.values(posBuckets).forEach((bucket) => {
    bucket.forEach((item, stackIdx) => {
      const { color, tidx, gx, gy } = item;
      let offsetX = 0;
      let offsetY = 0;
      if (bucket.length > 1) {
        const angle = (stackIdx / bucket.length) * Math.PI * 2;
        offsetX = Math.cos(angle) * (S * 0.16);
        offsetY = Math.sin(angle) * (S * 0.16);
      }

      const px = gx * S + offsetX;
      const py = gy * S + offsetY;
      const radius = S * 0.36;

      const isMovable =
        gameState.status === "playing" &&
        gameState.dice_rolled &&
        gameState.current_color === color &&
        (gameState.valid_moves || []).includes(tidx);

      if (isMovable) {
        const pulseR = radius + 4 + Math.sin(pulsePhase) * 3.5;
        ctx.beginPath();
        ctx.arc(px, py, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = "#111827";
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.42)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;

      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = COLOR_HEX[color];
      ctx.fill();
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(px, py - radius * 0.12, radius * 0.48, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.fill();
    });
  });

  requestAnimationFrame(renderBoard);
}

// ---------------------------------------------------------------------------
// 8. Board Controls & Event Listeners
// ---------------------------------------------------------------------------
canvas.addEventListener("pointerdown", (e) => {
  if (gameState.status !== "playing" || !gameState.dice_rolled || isAnimatingMove) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clickX = (e.clientX - rect.left) * scaleX;
  const clickY = (e.clientY - rect.top) * scaleY;
  const S = canvas.width / 15;

  const activeColor = gameState.current_color;
  const validMoves = gameState.valid_moves || [];

  let bestTidx = null;
  let bestDist = Infinity;

  validMoves.forEach((tidx) => {
    const step = visualTokens[activeColor][tidx];
    const [gx, gy] = getStepGridCoord(activeColor, step, tidx);
    const dx = clickX - gx * S;
    const dy = clickY - gy * S;
    const dist = Math.hypot(dx, dy);
    if (dist < S * 0.85 && dist < bestDist) {
      bestDist = dist;
      bestTidx = tidx;
    }
  });

  if (bestTidx !== null) {
    if (!wsSend({ action: "move", token_index: bestTidx })) {
      localMoveToken(bestTidx);
    }
  }
});

document.getElementById("diceBtn").addEventListener("click", () => {
  if (gameState.status === "waiting") {
    document.getElementById("startMatchBtn").click();
    return;
  }
  if (!wsSend({ action: "roll" })) {
    localRollDice();
  }
});

document.getElementById("startMatchBtn").addEventListener("click", () => {
  sfx.playOpen();
  if (!wsSend({ action: "start_game" })) {
    if (gameState.players.length < 2) {
      gameState.players.push({
        user_id: 900001,
        name: "Miku AI 💙",
        color: "green",
        is_ai: true,
      });
    }
    gameState.status = "playing";
    gameState.turn_index = 0;
    gameState.current_color = gameState.players[0].color;
    gameState.current_user_id = gameState.players[0].user_id;
    gameState.last_event = { text: "🎮 Match Started! Roll the dice!" };
    syncUI();
  }
});

document.getElementById("addBotBtn").addEventListener("click", () => {
  if (!wsSend({ action: "add_bot" })) {
    if (gameState.status !== "waiting" || gameState.players.length >= 4) return;
    const nextColor = COLORS[gameState.players.length];
    const botNum = gameState.players.filter((p) => p.is_ai).length + 1;
    gameState.players.push({
      user_id: 900000 + botNum,
      name: `Miku Bot #${botNum}`,
      color: nextColor,
      is_ai: true,
    });
    sfx.playOpen();
    gameState.last_event = { text: `🤖 Miku Bot #${botNum} joined as ${nextColor.toUpperCase()}!` };
    syncUI();
  }
});

document.getElementById("soundToggleBtn").addEventListener("click", (e) => {
  sfx.enabled = !sfx.enabled;
  e.currentTarget.textContent = sfx.enabled ? "🔊" : "🔇";
  if (sfx.enabled) sfx.playStep();
});

document.getElementById("resetBtn").addEventListener("click", () => {
  if (!wsSend({ action: "reset" })) {
    COLORS.forEach((c) => {
      gameState.tokens[c] = [-1, -1, -1, -1];
      visualTokens[c] = [-1, -1, -1, -1];
    });
    gameState.status = "waiting";
    gameState.dice_rolled = false;
    gameState.dice_value = null;
    gameState.winner_order = [];
    gameState.last_event = { text: "🔄 Board reset! Ready for a new match!" };
    syncUI();
  }
});

document.getElementById("playAgainBtn").addEventListener("click", () => {
  document.getElementById("winnerModal").classList.add("hidden");
  document.getElementById("resetBtn").click();
});

document.querySelectorAll(".emoji-btn[data-emoji]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const emoji = btn.getAttribute("data-emoji");
    if (!wsSend({ action: "emoji", emoji })) {
      spawnFloatingEmoji(emoji);
      sfx.playStep();
    }
  });
});

// Connect in background & start canvas loop (Starts on Home Screen by default)
connectWebSocket();
syncUI();
requestAnimationFrame(renderBoard);
