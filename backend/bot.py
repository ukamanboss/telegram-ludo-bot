import os
import telebot
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from typing import List, Dict, Optional
import threading

# Load Bot Token and WebApp URL from environment variables on Render
BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
WEBAPP_URL = os.environ.get("WEBAPP_URL", "http://localhost:8000")

# Initialize the bot
bot = None
if BOT_TOKEN:
    try:
        # Use TeleBot (synchronous for simplicity)
        bot = telebot.TeleBot(BOT_TOKEN, parse_mode="MARKDOWN")
        print(f"[Bot] Initialized successfully. WebApp URL: {WEBAPP_URL}")
    except Exception as e:
        print(f"[Bot] Initialization failed: {e}")
else:
    print("[Bot] WARNING: TELEGRAM_BOT_TOKEN environment variable not set. Running in Web-only mode.")

def get_bot_username() -> str:
    if bot:
        try:
            return bot.get_me().username
        except Exception:
            pass
    return "ludo_game_bot"

def init_bot_handlers(game_manager):
    if not bot:
        return

    @bot.message_handler(commands=["start", "help"])
    def send_welcome(message):
        chat_type = message.chat.type
        user_name = message.from_user.first_name

        markup = InlineKeyboardMarkup()

        if chat_type in ["group", "supergroup"]:
            # --- If command is used in a Group ---
            game_url = f"{WEBAPP_URL}/?chat_id={message.chat.id}"
            
            # Action Buttons for Group
            markup.add(InlineKeyboardButton("🎮 Play Ludo with Group", web_app=WebAppInfo(url=game_url)))
            markup.add(InlineKeyboardButton("🏆 Group Leaderboard", callback_data="show_stats"))
            
            welcome_text = (
                f"🎲 *Hello {user_name}!* Ready to play Ludo Royale with everyone?\n\n"
                f"Tap the button below or send `/ludo` to create a new premium match lobby for this group!"
            )
            bot.reply_to(message, welcome_text, reply_markup=markup)
            
        else:
            # --- If command is used in Private Chat (DM) ---
            markup.add(InlineKeyboardButton("🎮 Play Ludo (Solo / Local)", web_app=WebAppInfo(url=f"{WEBAPP_URL}/")))
            
            # Feature: Add to group button dynamically fetching bot username
            bot_username = get_bot_username()
            markup.add(InlineKeyboardButton("➕ Add Bot to your Group", url=f"https://t.me/{bot_username}?startgroup=true"))
            markup.add(InlineKeyboardButton("🏆 Global Leaderboard & Stats", callback_data="show_stats"))
            
            welcome_text = (
                f"🎲 *Welcome to Premium Ludo Royale, {user_name}!*\n\n"
                f"You can play Ludo directly inside Telegram!\n\n"
                f"👉 *How to play with friends:*\n"
                f"1. Add me to your Telegram Group using the button below.\n"
                f"2. Send `/ludo` in the group chat.\n"
                f"3. Everyone can tap the join button to enter the same lobby!\n\n"
                f"Or play offline right now by tapping the button below!"
            )
            bot.send_message(message.chat.id, welcome_text, reply_markup=markup)

    @bot.message_handler(commands=["ludo"])
    def start_ludo_game(message):
        chat_id = str(message.chat.id)
        
        # Create a new room synced to this group chat
        room = game_manager.create_room(chat_id=chat_id)
        room_id = room.room_id

        # Pass the room and chat_id to the frontend
        game_url = f"{WEBAPP_URL}/?room={room_id}&chat_id={chat_id}"
        
        # Build premium invite message
        text = (
            f"🎲 *Ludo Match Created!* 🎲\n\n"
            f"🏠 *Room Code:* `{room_id}`\n"
            f"👥 *Players:* Up to 4 players can join.\n\n"
            f"Tap *Join Game* below to enter the premium lobby!"
        )

        markup = InlineKeyboardMarkup()
        markup.add(
            InlineKeyboardButton(
                text="🎮 Join Game Lobby",
                web_app=WebAppInfo(url=game_url)
            )
        )

        bot.send_message(message.chat.id, text, reply_markup=markup)

    # Feature: Handle Button Clicks (Leaderboard)
    @bot.callback_query_handler(func=lambda call: True)
    def handle_query(call):
        if call.data == "show_stats":
            bot.answer_callback_query(
                call.id, 
                "🏆 Leaderboard & Player Stats tracking is active! Global rankings will be revealed in the next major update.", 
                show_alert=True
            )

def send_game_results(chat_id: str, standings: List[Dict], img_bytes: Optional[bytes] = None):
    """Sends the standings list and the canvas certificate image back to the group."""
    if not bot:
        print("[Bot] Cannot send game results: Bot is not initialized.")
        return

    # Build Premium standings text
    text = "🏆 *LUDO ROYALE - MATCH RESULTS* 🏆\n\n"
    medals = ["🥇 1st Place", "🥈 2nd Place", "🥉 3rd Place", "🎖️ 4th Place"]
    
    for idx, player in enumerate(standings):
        medal = medals[idx] if idx < len(medals) else "🎖️ Finished"
        color_emoji = "🔴" if player["color"] == "Red" else \
                      "🟢" if player["color"] == "Green" else \
                      "🟡" if player["color"] == "Yellow" else "🔵"
        
        name = player["name"]
        username_str = f" (@{player['username']})" if player["username"] else ""
        text += f"{medal}: {color_emoji} *{name}*{username_str}\n"

    text += "\n🔄 *Ready for a rematch?* Send `/ludo` to play again!"

    try:
        if img_bytes:
            # Send high-quality photo with standings caption
            bot.send_photo(
                chat_id=chat_id,
                photo=img_bytes,
                caption=text,
                parse_mode="MARKDOWN"
            )
            print(f"[Bot] Successfully sent result image to chat {chat_id}")
        else:
            # Fallback to text only
            bot.send_message(chat_id=chat_id, text=text, parse_mode="MARKDOWN")
            print(f"[Bot] Successfully sent result text to chat {chat_id}")
    except Exception as e:
        print(f"[Bot] Failed to send game results to chat {chat_id}: {e}")

def run_bot_polling():
    if bot:
        def poll():
            print("[Bot] Starting polling thread...")
            try:
                # Remove webhook before polling to avoid conflict in Render
                bot.remove_webhook()
                bot.infinity_polling(timeout=10, long_polling_timeout=5)
            except Exception as e:
                print(f"[Bot] Polling error: {e}")
        
        t = threading.Thread(target=poll, daemon=True)
        t.start()
