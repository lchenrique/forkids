import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

interface Card {
  key: string;
  animal: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface Sounds {
  flip: HTMLAudioElement;
  match: HTMLAudioElement;
  victory: HTMLAudioElement;
}

export default function MemoryGame() {
  const [cards, setCards] = useState<Card[]>([]);
  const [moves, setMoves] = useState(0);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [flippedCount, setFlippedCount] = useState(0);
  const [sounds, setSounds] = useState<Sounds | null>(null);

  useEffect(() => {
    setSounds({
      flip: new Audio('/sounds/flip.mp3'),
      match: new Audio('/sounds/match.mp3'),
      victory: new Audio('/sounds/victory.mp3')
    });
  }, []);

  const playSound = useCallback((soundType: keyof Sounds) => {
    if (sounds) {
      sounds[soundType].currentTime = 0;
      sounds[soundType].play().catch(console.error);
    }
  }, [sounds]);

  useEffect(() => {
    startNewGame();
  }, []);

  useEffect(() => {
    if (cards.length > 0 && cards.every(card => card.isMatched)) {
      setIsGameComplete(true);
      if (sounds?.victory) {
        sounds.victory.playbackRate = 1.5;
        playSound('victory');
      }
    }
  }, [cards, playSound]);

  const startNewGame = () => {
    const animals = ['🐶', '🐱', '🐸', '🐵', '🦊', '🐻'];
    const pairs = animals.flatMap(animal => [
      {
        key: `card_${animal}_1`,
        animal,
        isFlipped: false,
        isMatched: false,
      },
      {
        key: `card_${animal}_2`,
        animal,
        isFlipped: false,
        isMatched: false,
      }
    ]).sort(() => Math.random() - 0.5);
    
    setCards(pairs);
    setMoves(0);
    setFlippedCount(0);
    setIsGameComplete(false);
  };

  const handleCardClick = (cardKey: string) => {
    const clickedCardIndex = cards.findIndex(card => card.key === cardKey);
    if (clickedCardIndex === -1) return;
    
    if (cards[clickedCardIndex].isFlipped || cards[clickedCardIndex].isMatched) return;

    if (sounds?.flip) {
      sounds.flip.playbackRate = 3.0;
      playSound('flip');
    }

    if (flippedCount === 2) {
      setCards(currentCards => 
        currentCards.map(card => 
          card.key === cardKey
            ? { ...card, isFlipped: true }
            : card.isMatched 
              ? card 
              : { ...card, isFlipped: false }
        )
      );
      setFlippedCount(1);
      setMoves(moves => moves + 1);
      return;
    }

    setMoves(moves => moves + 1);

    setCards(currentCards => {
      const newCards = currentCards.map(card => 
        card.key === cardKey ? { ...card, isFlipped: true } : card
      );

      const flippedCards = newCards.filter(card => card.isFlipped && !card.isMatched);
      if (flippedCards.length === 2) {
        if (flippedCards[0].animal === flippedCards[1].animal) {
          if (sounds?.match) {
            sounds.match.playbackRate = 2.5;
            playSound('match');
          }
          return newCards.map(card => 
            flippedCards.some(f => f.key === card.key)
              ? { ...card, isMatched: true }
              : card
          );
        }
      }
      return newCards;
    });

    setFlippedCount(count => count + 1);
  };

  return (
    <div className="game-wrapper">
      <Link to="/" className="back-button">↩</Link>
      <div className="game-info">
        <h2>Jogo da Memória</h2>
        <p>Tentativas: {moves}</p>
        {isGameComplete && (
          <div className="victory-message">
            <div>
              <h3>🎉 Parabéns! 🎉</h3>
              <p>Você completou em {moves} tentativas!</p>
              <button onClick={startNewGame} className="new-game-btn">
                Jogar Novamente
              </button>
            </div>
          </div>
        )}
      </div>
      <div className={`memory-game ${isGameComplete ? 'game-complete' : ''}`}>
        {cards.map(card => (
          <div 
            key={card.key}
            className={`card ${card.isFlipped ? 'flipped' : ''} ${card.isMatched ? 'matched' : ''}`}
            onClick={() => handleCardClick(card.key)}
          >
            <div className="card-inner">
              <div className="card-front"></div>
              <div className="card-back">{card.animal}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 