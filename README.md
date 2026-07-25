# Echoes of the Basin

A web-based game where players interact with a military radio interface to receive and respond to transmissions from various factions in the Amazon basin.

## Play the Game

Visit [https://thomasmeston.github.io/echoes-of-the-basin](https://thomasmeston.github.io/echoes-of-the-basin) to play the game directly in your browser.

## Features

- Interactive military radio interface
- Multiple faction interactions
- Resource management system
- Dynamic transmission system
- Retro-styled UI with authentic radio sounds

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/thomasmeston/echoes-of-the-basin.git
cd echoes-of-the-basin
```

2. Install and run:
```bash
npm install
npm run dev          # webpack-dev-server on port 3000
# or
npm run build && npm start   # Express serving dist/
```

3. Open your browser and navigate to `http://localhost:3000` (dev) or the port printed by `npm start`.

## Directory Structure

```
├── index.html
├── README.md
├── package.json
├── server.js
├── webpack.config.js
├── src/
│   ├── assets/
│   ├── game/
│   ├── styles.css
│   ├── index.js
│   └── main.js
└── assets/
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
