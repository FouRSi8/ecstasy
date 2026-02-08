# Ecstasy

**Ecstasy** is an advanced AI-powered image color grading application that transforms your photos with professional-grade adjustments. Leveraging **Google's Gemini 2.5** models, it intelligently analyzes your images to apply category-specific color grading, from cinematic landscapes to vibrant anime styles.

![Ecstasy Badge](https://img.shields.io/badge/AI-Powered-purple) ![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ Features

- **🤖 AI-Driven Analysis**: Automatically detects image categories (Landscape, Portrait, Wildlife, Urban, etc.) and applies tailored grading.
- **🎨 Professional Color Science**: Adjusts a comprehensive set of parameters including:
  - **Basic**: Exposure, Contrast, Saturation, Temperature, Tint, Highlights, Shadows.
  - **HSL**: Fine-tuned Hue and Saturation for Reds, Oranges, Greens, and Blues.
  - **Curves**: Advanced tonal control for Shadows, Midtones, and Highlights.
- **🖼️ Reference Matching**: Upload a reference image to transfer its color style to your target photo.
- **⚡ Performance Tiers**:
  - **Free**: Uses `gemini-2.5-flash` for fast, efficient grading.
  - **Pro**: Uses `gemini-2.5-pro` for maximum quality and nuance.
- **🔒 Privacy Focused**: Images are processed securely.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **UI library**: [React 19](https://react.dev/)
- **AI Model**: [Google Gemini API](https://ai.google.dev/) (@google/generative-ai)
- **Styling**: Tailwind CSS / CSS Modules

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed.
- A **Google Gemini API Key**. Get one [here](https://aistudio.google.com/app/apikey).

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/FouRSi8/ecstasy.git
    cd ecstasy
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Configure Environment**:
    Create a `.env.local` file in the root directory and add your API key:
    ```env
    GEMINI_API_KEY=your_api_key_here
    ```

4.  **Run the application**:
    ```bash
    npm run dev
    ```

5.  Open [http://localhost:3000](http://localhost:3000) to start grading!

## 📸 How It Works

1.  **Upload**: specific an image you want to grade.
2.  **Analyze**: The AI agent (`src/app/api/grade/route.js`) acts as a professional colorist, analyzing content and context.
3.  **Grade**: It generates a JSON profile of color adjustments which are applied in real-time.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
