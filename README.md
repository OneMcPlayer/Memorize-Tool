# Script Memorization Tool

A web-based tool to help actors memorize their lines by practicing them in context. Built with pure JavaScript, CSS and HTML.

## Features

- 🎭 Load scripts from a built-in library or paste your own
- 🔄 Display lines in context with adjustable preceding lines
- 🌐 Multi-language support (English and Italian)
- 🌓 Light/Dark theme
- ⌨️ Keyboard shortcuts for efficient practice
- 📱 Mobile-friendly with touch gestures
- 📝 Support for both plain text and structured script formats

## Usage

1. Open `index.html` in a web browser
2. Choose a script:
   - Select from the library
   - In advanced mode, you can also:
     - Paste text directly
     - Upload a script file
3. Select your character from the role list
4. Set how many context lines you want to see (0-5)
5. Click "Extract My Lines" to begin practicing

## Keyboard Shortcuts

- `Enter` - Extract lines / Go to next line
- `Space` - Reveal current line
- `Esc` - Restart practice session

## Touch Gestures

- Swipe left - Next line
- Swipe right - Reveal line

## Script Formats

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
}s
```

## Development

The project is structured as follows:

- `/css` - Stylesheet files
- `/js` - JavaScript modules
  - `/data` - Script library and data management
  - `/models` - Script model classes
  - `/services` - Script processing logic
  - `/utils` - Helper functions