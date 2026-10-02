# 📢 LinguaCast

### *Broadcast your voice worldwide*

A real-time voice translation web app built with pure HTML, CSS, and JavaScript. Speak in one language, and LinguaCast instantly translates and speaks it back in another — no backend, no API keys, no cost.

---

## ✨ Features

- 🎤 **Real-time speech recognition** using the Web Speech API
- 🌍 **30 languages** including Tamil, Hindi, Telugu, Bengali, Malayalam, Marathi, Gujarati, Kannada, Punjabi, Urdu, Spanish, French, German, Italian, Portuguese, Russian, Dutch, Turkish, Polish, Swedish, Japanese, Korean, Chinese, Thai, Vietnamese, Indonesian, Arabic, Hebrew, Persian, and English
- 🔊 **Text-to-speech playback** with adjustable speed (0.5× – 1.5×)
- 🌗 **Dark / Light theme** toggle with saved preference
- 🌐 **Live internet status** indicator
- 🔇 **Echo guard** — prevents the mic from re-capturing the TTS output
- 📜 **Translation history** saved locally (last 100 entries)
- 📥  Export history** as JSON
- 🔄 **Swap languages** with one click
- 📊 **Live audio visualizer** (canvas-based)
- 📋 **Copy** original or translated text
- ⌨️ **Keyboard shortcuts** — `Space` toggles mic, `T` toggles theme
- 🎨 **Futuristic glassmorphic UI** with animated background

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Speech Recognition** | Web Speech API (`SpeechRecognition`) |
| **Translation** | Google Translate public endpoint |
| **Text-to-Speech** | Web Speech API (`speechSynthesis`) |
| **Storage** | `localStorage` |
| **Visualizer** | Canvas + Web Audio API |
| **UI** | Pure HTML + CSS (no frameworks) |

**No build tools. No npm. No backend.**

---

## 🚀 How to Run

1. Download or clone the project folder.
2. Serve it via a local server (mic requires `localhost` or `https://`):
   ```bash
   python -m http.server 8000