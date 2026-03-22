# Personal AI Smart Assistant

A modern, voice-enabled AI assistant built with Next.js 15, React, and OpenAI. This assistant acts as a "local brain," capable of voice interaction, screen reading, file analysis, and critical brainstorming.
## Features

- **Voice Interaction**: Talk to your assistant and receive voice responses (Whisper STT & OpenAI TTS).
- **Chat Overlay**: A sleek, slide-out dialogue box for text-based interaction.
- **Brainstorming Mode**: A dedicated mode with a notepad that captures ideas, where the AI thinks critically and challenges your thoughts.
- **Screen Reading**: Capture and analyze your screen using GPT-4o Vision.
- **File Analysis**: Upload and summarize/explain files (txt, md, js, ts, etc.).
- **Scientific Knowledge**: Senior undergraduate level science computation and reasoning.

## Getting Started

### Prerequisites

- Node.js 18+
- An OpenAI API Key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Aadi-011/local-ai-smart-assistant.git
   cd Ai-Smart-Assistant
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory and add your OpenAI API key:
   ```env
   OPENAI_API_KEY=your_actual_api_key_here
   
   # Optional: Local Ollama Configuration
   NEXT_PUBLIC_USE_OLLAMA=false
   OLLAMA_CHAT_MODEL=qwen2.5
   OLLAMA_VISION_MODEL=llava
   ```

4. Run the development server:
   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Local Mode (Ollama)

To run the assistant locally:
1. Install [Ollama](https://ollama.com/).
2. Pull the required models:
   ```bash
   ollama pull qwen2.5
   ollama pull llava
   ```
3. Set `NEXT_PUBLIC_USE_OLLAMA=true` in your `.env.local`.
4. Note: Voice (STT/TTS) currently still uses OpenAI APIs for high quality, but chat and vision will run locally.

### Browser Permissions

For the assistant to work correctly, you will need to grant the following permissions when prompted by your browser:
- **Microphone Access**: Required for voice interaction and speech-to-text.
- **Screen Recording/Sharing**: Required for the "Read Screen" feature to capture and analyze your current display.

## Usage

- **Voice**: Click the microphone icon to start/stop recording.
- **Chat**: Click the message icon to open the chat overlay.
- **Brainstorm**: Click the brain icon to enter brainstorming mode.
- **Screen**: Click the monitor icon to capture and analyze your screen.
- **Files**: Click the upload icon to summarize a file.

## Initial Commit

To commit your changes to Git, run the following commands in your terminal:

```bash
git add .
git commit -m "Initial commit: AI Smart Assistant with voice, screen reading, and brainstorming"
```

If you haven't initialized a Git repository yet, run `git init` first. If you want to push to a remote repository (like GitHub), you'll need to add the remote origin.

Your `.gitignore` already includes `.env*`, so your API key will remain safe and won't be committed to Git.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
