import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MemoryGame from './games/MemoryGame';
import SpaceGame from './games/SpaceGame';
import GameMenu from './components/GameMenu';
import './styles/game.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GameMenu />} />
        <Route path="/memory" element={<MemoryGame />} />
        <Route path="/space" element={<SpaceGame />} />
      </Routes>
    </Router>
  );
}

export default App;
