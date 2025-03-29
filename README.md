# 🎭 Script Memorization Tool

A modern, browser-based application designed to help actors and theater students effectively memorize their lines by practicing them in context. Built with vanilla JavaScript, CSS, and HTML for maximum portability and ease of use without dependencies.

![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![Tests](https://img.shields.io/badge/tests-54_tests-blue.svg)

## 📖 Overview

The Script Memorization Tool helps performers learn their lines more effectively by:

- Isolating a character's lines while maintaining scene context
- Providing an interactive practice interface with reveal/next functionality
- Offering a converter to transform plain text scripts into structured format

Perfect for actors, drama students, and theater enthusiasts who need to memorize lines efficiently.

## 🚦 Project Status

This project is **under active development**:
- 🔄 Ongoing improvements to code quality and usability
- 📊 Support for different script formats is fully implemented
- 🔧 Bug fixes are being addressed through test-driven development
- 📱 Mobile-friendly functionality with touch gestures

## ✨ Features

### Script Management
- 📚 **Library Integration**: Load from built-in script library
- 📝 **Custom Scripts**: Paste your own script text
- 📁 **File Uploads**: Support for uploading script files
- 🔄 **Format Support**: Handles both plain text and structured script formats

### Practice Tools
- 👥 **Role Selection**: Choose your character from automatically detected roles
- 🔎 **Line Extraction**: Automatically isolate your character's lines
- 📊 **Contextual Learning**: Display lines with adjustable preceding context (0-5 lines)
- 📋 **Quick Access**: Copy lines to clipboard with one click
- 🔁 **Repetition**: Practice mode with reveal/next functionality

### User Experience
- 🌐 **Multilingual**: Support for English and Italian
- 🌓 **Theming**: Light/Dark theme toggle for different lighting conditions
- ⌨️ **Efficiency**: Keyboard shortcuts for hands-on practice
- 📱 **Mobile Support**: Touch gestures for tablet and smartphone use
- 💾 **Preferences**: Remembers user settings between sessions

### Advanced Features
- 🔄 **Script Converter**: Transform plain text scripts to structured format
- 👥 **Role Management**: Define character roles with aliases and descriptions
- 🔍 **Auto-Detection**: Intelligent parsing of character names and dialogue

## 🚀 Getting Started

### Installation

1. Clone the repository or download the ZIP file
2. No build process required - it's pure HTML, CSS, and JavaScript
3. Simply open `index.html` in any modern web browser

### Using the Tool

1. **Load a Script**:
   - Select from the built-in library, or
   - Paste your script text (in Advanced Mode), or
   - Upload a script file (in Advanced Mode)

2. **Prepare for Practice**:
   - Select your character from the detected role list
   - Set how many context lines you want to see (0-5)
   - Click "Extract My Lines" to begin practicing

3. **Practice Mode**:
   - Use the "Reveal" button to see your current line
   - Use "Next" to advance to the next line
   - The progress bar shows your position in the script
   - Restart at any time to begin again

4. **Script Conversion** (Advanced):
   - Use the Script Converter to transform a plain text script
   - Edit character roles and descriptions
   - Export to structured format for better organization

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Extract lines / Go to next line |
| `Space` | Reveal current line |
| `Esc` | Restart practice session |
| `Right Arrow` | Same as Reveal button |
| `Left Arrow` | Same as Next button |

## 📱 Touch Gestures

| Gesture | Action |
|---------|--------|
| Swipe left | Next line |
| Swipe right | Reveal line |

## 📜 Script Formats

The tool supports two script formats:

### Plain Text
Common in many scripts, with character names followed by their dialogue:

```
CHARACTER NAME: Their line of dialogue
ANOTHER CHARACTER: Response to the previous line
(Stage directions in parentheses)
CHARACTER NAME: Another line by the first character
```

### Structured Format
A more formal JSON-like format that allows for additional metadata:

```
@title "Play Title"
@author "Author Name"
@roles
  - [CHARACTER | ALIAS1, ALIAS2]: "Character Description"
  - [ANOTHER CHARACTER]: "Another Character Description"
@scene "Scene Title"
{
  dialogue {
    "CHARACTER": """
      Their line of dialogue
    """
    "ANOTHER CHARACTER": """
      Response to the previous line
    """
  }
}
```

## 🧪 Development

### Project Structure

- `/css` - Stylesheet files
- `/js` - JavaScript modules
  - `/core` - Core application functionality
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
4. For continuous testing: `npm run test:watch`
5. For coverage reports: `npm run test:coverage`

The test suite verifies critical functionality like:
- Script parsing and processing
- State management
- Caching functionality
- UI utility functions