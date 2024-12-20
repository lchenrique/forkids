import { Link } from 'react-router-dom';
import '../styles/game.css';

export default function GameMenu() {
  return (
    <div className="menu-wrapper">
      <h1>Jogos</h1>
      <div className="menu-grid">
        <Link to="/memory" className="menu-item">
          <span className="game-icon">🎮</span>
          <span className="game-name">Jogo da Memória</span>
        </Link>
        
        <Link to="/space" className="menu-item">
          <span className="game-icon">🚀</span>
          <span className="game-name">Navinha Espacial</span>
        </Link>
      </div>
    </div>
  );
} 