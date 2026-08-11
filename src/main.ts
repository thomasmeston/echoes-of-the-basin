import './styles.css';
import { Game } from './game/Game';

async function main(): Promise<void> {
  const container = document.getElementById('game-container');
  if (!container) {
    throw new Error('Missing #game-container');
  }
  const game = new Game();
  window.game = game;
  await game.init(container);
}

void main();
