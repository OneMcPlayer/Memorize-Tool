# 🎭 Script Memorization Tool

A modern, browser-based application designed to help actors effectively memorize their lines by practicing them in context. Built with vanilla JavaScript, CSS, and HTML for maximum portability.

![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![Tests](https://img.shields.io/badge/tests-54_tests-blue.svg)

## 🚦 Project Status

This project is **under active development**:
- 🔄 Ongoing improvements to code quality and usability
- 📊 Support for different script formats is implemented
- 🔧 Bug fixes are being addressed through test-driven development

## ✨ Features

- **Script Management**
  - 📚 Load from built-in script library
  - 📝 Paste your own script text
  - 📁 Upload script files
  - 🔄 Support for both plain text and structured script formats

- **Practice Tools**
  - 👥 Select your character from detected roles
  - 🔎 Automatically extract your lines
  - 📊 Display lines in context with adjustable preceding lines (0-5)
  - 📋 Copy lines to clipboard with one click

- **User Experience**
  - 🌐 Multi-language support (English and Italian)
  - 🌓 Light/Dark theme toggle
  - ⌨️ Keyboard shortcuts for efficient practice
  - 📱 Mobile-friendly with touch gestures
  - 💾 Remembers your preferences

- **Advanced Features**
  - 🔄 Script converter to transform plain text scripts to structured format
  - 📊 Character role management with aliases and descriptions

## 🚀 Getting Started

### Installation

1. Clone the repository or download the ZIP file
2. No build process required - it's pure HTML, CSS, and JavaScript
3. Simply open `index.html` in any modern web browser

### Using the Tool

1. Open `index.html` in your web browser
2. Choose a script using one of these methods:
   - Select from the built-in library
   - Paste your script text (in Advanced Mode)
   - Upload a script file (in Advanced Mode)
3. Select your character from the detected role list
4. Set how many context lines you want to see (0-5)
5. Click "Extract My Lines" to begin practicing
6. Use the "Reveal" button to see your current line and "Next" to move to the next line

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Extract lines / Go to next line |
| `Space` | Reveal current line |
| `Esc` | Restart practice session |

## 📱 Touch Gestures

| Gesture | Action |
|---------|--------|
| Swipe left | Next line |
| Swipe right | Reveal line |

## 📜 Script Formats

The tool supports two script formats:

### Plain Text
```
CHARACTER NAME: Their line of dialogue
ANOTHER CHARACTER: Response
(Stage directions in parentheses)
```

### Structured Format
```
@title "Play Title"
@author "Author Name"
@roles
  - [CHARACTER | ALIAS]: "Description"
@scene "Scene Title"
{
  dialogue {
    "CHARACTER": """
      Their line of dialogue
    """
  }
}
```

## 🧪 Development

The project is structured as follows:

- `/css` - Stylesheet files
- `/js` - JavaScript modules
  - `/data` - Script library and data management
  - `/models` - Script model classes
  - `/services` - Script processing logic
  - `/utils` - Helper functions
- `/tests` - Test suite
  - Unit tests for core functionality
  - Service tests
  - Model tests

### Running Tests

This project uses Jest for testing. To run the tests:

1. Make sure you have Node.js installed
2. Install dependencies with `npm install`
3. Run tests with `npm test`

The test suite verifies critical functionality like:
- Script parsing and processing
- State management
- Caching functionality
- UI utility functions