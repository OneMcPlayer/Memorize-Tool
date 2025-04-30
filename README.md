# 🎭 Script Memorization Tool

A modern, browser-based application designed to help actors and theater students effectively memorize their lines by practicing them in context. Built with React, this tool provides an interactive interface for script practice.

![Version](https://img.shields.io/badge/version-2.1.0-green.svg)
![React](https://img.shields.io/badge/react-19.x-blue.svg)
![Mobile](https://img.shields.io/badge/mobile-friendly-brightgreen.svg)

## 📖 Overview

The Script Memorization Tool helps performers learn their lines more effectively by:

- Isolating a character's lines while maintaining scene context
- Providing an interactive practice interface with reveal/next functionality
- Offering a converter to transform plain text scripts into structured format

### Experimental Features
- 🔄 **Script Converter**: Transform plain text scripts to structured format
- 👥 **Role Management**: Define character roles with aliases and descriptions
- 🔍 **Auto-Detection**: Intelligent parsing of character names and dialogue

## 🚀 Getting Started

### Installation

1. Clone the repository
2. Install dependencies with `npm install`
3. Start the development server with `npm start`

### Using the Tool

1. **Load a Script**:
   - Select from the built-in library, or
   - Paste your script text, or
   - Upload a script file

2. **Select Your Character**:
   - Enter your character's name
   - Set the number of context lines to display

3. **Practice Your Lines**:
   - Use the reveal button to see your lines
   - Navigate through your lines with the next button
   - Use keyboard shortcuts for faster practice

## 🧪 Development

### Project Structure

- `/src` - React source code
  - `/components` - React components
  - `/context` - React context for state management
  - `/hooks` - Custom React hooks
  - `/services` - Script processing logic
  - `/utils` - Helper functions
  - `/data` - Script library and data management

### Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production
- `npm run eject` - Ejects from Create React App

### Running Tests

This project uses Jest and React Testing Library for unit tests, and Cypress for end-to-end tests.

To run the unit tests:

```
npm test
```

To run the Cypress tests:

```bash
# Make sure the application is running first
npm start

# In a separate terminal, run the tests
npx cypress run

# Or to open the Cypress Test Runner
npx cypress open
```

#### Cypress Test Coverage

The Cypress tests verify:

- Script loading and character detection
- Line extraction for specific characters
- Progress through practice mode
- Navigation between lines

## 🏷️ Version Information

### Current Version: v2.1.0

This is the stable React version with the following features and improvements:

- Complete rewrite using React and modern JavaScript
- Mobile-friendly responsive design
- Landscape and portrait orientation support
- Touch-optimized interface
- Fixed issue with last line display in practice mode
- Improved Cypress tests and GitHub Actions workflow

### Release History

- **v2.1.0**: Current stable version with improved testing and workflow
- **v2.1.0-react-stable**: Stable React implementation
- **v2.0.0-react-demo**: React demo version with mobile improvements
- **v1.0.0-vanilla-js**: Original vanilla JavaScript version

## 📜 Version History

This application was originally built with vanilla JavaScript (HTML, CSS, and JavaScript without any dependencies). It has been completely migrated to React, which is now the default and recommended version.


