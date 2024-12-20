import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../styles/space.css';

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  type?: string;
  lastShot?: number;
  velocityX?: number;
  velocityY?: number;
  isEnemyShot?: boolean;
}

interface BackgroundStar {
  x: number;
  y: number;
  size: number;
  speed: number;
}

interface PowerUp extends GameObject {
  type: 'doubleLaser';
  collected: boolean;
}

interface Explosion {
  x: number;
  y: number;
  size: number;
  age: number;
  color: string;
}

export default function SpaceGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scoreRef = useRef(0);
  const shipRef = useRef({ x: 0, y: 0, width: 50, height: 50 });
  const lasersRef = useRef<GameObject[]>([]);
  const meteorsRef = useRef<GameObject[]>([]);
  const bgStarsRef = useRef<BackgroundStar[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const isDraggingRef = useRef(false);
  const lastShotRef = useRef(0);
  const powerLevelRef = useRef(0);
  const powerUpTimeoutRef = useRef<number>();
  const explosionsRef = useRef<Explosion[]>([]);
  const rocketImageRef = useRef<HTMLImageElement>();
  const powerUpImageRef = useRef<HTMLImageElement>();
  const bulletImageRef = useRef<HTMLImageElement>();
  const enemyImagesRef = useRef<{ [key: string]: HTMLImageElement }>({});
  const energyRef = useRef(100);
  const isInvulnerableRef = useRef(false);
  const isGameOverRef = useRef(false);
  const energySpriteRef = useRef<HTMLImageElement>();
  const energyItemsRef = useRef<GameObject[]>([]);
  const previousEnergyRef = useRef(100);

  // Cores dos tiros baseadas no nível
  const laserColors = [
    { core: '#00ffff', glow: 'rgba(0, 255, 255, ' },   // Nível 0: Ciano
    { core: '#ff00ff', glow: 'rgba(255, 0, 255, ' },   // Nível 1: Magenta
    { core: '#ffff00', glow: 'rgba(255, 255, 0, ' },   // Nível 2: Amarelo
    { core: '#ff0000', glow: 'rgba(255, 0, 0, ' },     // Nível 3: Vermelho
    { core: '#ff8800', glow: 'rgba(255, 136, 0, ' },   // Nível 4: Laranja
    { core: '#ff0088', glow: 'rgba(255, 0, 136, ' }    // Nível 5: Rosa
  ];

  // Configurações dos tiros baseadas no nível
  const laserConfigs = [
    { count: 1, spread: 0, fireRate: 300, angle: 0 },      // Nível 0: Tiro único reto
    { count: 2, spread: 15, fireRate: 250, angle: 8 },     // Nível 1: 2 tiros, ±8 graus
    { count: 3, spread: 12, fireRate: 200, angle: 12 },    // Nível 2: 3 tiros, ±12 graus
    { count: 4, spread: 10, fireRate: 150, angle: 16 },    // Nível 3: 4 tiros, ±16 graus
    { count: 5, spread: 8, fireRate: 100, angle: 20 },     // Nível 4: 5 tiros, ±20 graus
    { count: 6, spread: 6, fireRate: 50, angle: 25 }       // Nível 5: 6 tiros, ±25 graus
  ];

  useEffect(() => {
    // Carrega as imagens
    rocketImageRef.current = new Image();
    rocketImageRef.current.src = '/sprites/main.png'; // Nave principal
    
    // Carrega todos os tipos de inimigos
    const enemyTypes = ['enimie', 'enimiie', 'enimie4'];
    enemyTypes.forEach(type => {
      enemyImagesRef.current[type] = new Image();
      enemyImagesRef.current[type].src = `/sprites/${type}.png`;
    });
    
    powerUpImageRef.current = new Image();
    powerUpImageRef.current.src = '/sprites/power.png'; // Power-up

    bulletImageRef.current = new Image();
    bulletImageRef.current.src = '/sprites/bulet.png';

    energySpriteRef.current = new Image();
    energySpriteRef.current.src = '/sprites/power2.png'; // Sprite de energia

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      shipRef.current.x = canvas.width / 2;
      shipRef.current.y = canvas.height - 150;
      
      // Create initial background stars
      bgStarsRef.current = Array.from({ length: 100 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 2 + 1
      }));
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Game objects
    const ship = shipRef.current;
    const lasers = lasersRef.current;
    const meteors = meteorsRef.current;
    const bgStars = bgStarsRef.current;
    const powerUps = powerUpsRef.current;

    // Game loop
    const gameLoop = (timestamp: number) => {
      // Clear canvas
      ctx.fillStyle = '#000428';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw background stars
      for (const star of bgStars) {
        star.y += star.speed;
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Create meteors randomly
      if (Math.random() < 0.01) {
        // Escolhe um tipo aleatório de inimigo
        const enemyTypes = ['enimie', 'enimiie', 'enimie4'];
        const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        
        meteors.push({
          x: Math.random() * canvas.width,
          y: -20,
          width: 40,
          height: 40,
          type: randomType,
          lastShot: timestamp
        });
      }

      // Create power-ups randomly
      if (Math.random() < 0.0010) { // Frequência ajustada para um valor intermediário
        powerUpsRef.current.push({
          x: Math.random() * canvas.width,
          y: -20,
          width: 30,
          height: 30,
          type: 'doubleLaser',
          collected: false
        });

        // Adiciona efeito visual quando o power-up aparece
        for (let i = 0; i < 10; i++) {
          explosionsRef.current.push({
            x: Math.random() * canvas.width,
            y: -20,
            size: Math.random() * 3 + 1,
            age: 0,
            color: '#ffff00'
          });
        }
      }

      // Create lasers (continuous shooting)
      const config = laserConfigs[powerLevelRef.current];
      if (timestamp - lastShotRef.current > config.fireRate) {
        const spread = config.spread;
        
        // Calcula as posições e ângulos dos tiros baseado no nível
        const shots = [];
        if (config.count === 1) {
          shots.push({ offset: 0, angle: 0 }); // Tiro central reto
        } else {
          for (let i = 0; i < config.count; i++) {
            const progress = i / (config.count - 1); // 0 a 1
            const angle = -config.angle + (config.angle * 2 * progress);
            const offset = spread * (i - (config.count - 1) / 2);
            shots.push({ offset, angle });
          }
        }

        // Cria os tiros com suas direções
        shots.forEach(shot => {
          const radians = (shot.angle * Math.PI) / 180;
          lasers.push({
            x: ship.x - 4 + shot.offset,
            y: ship.y - 20,
            width: 12,
            height: 24,
            velocityX: Math.sin(radians) * 8,
            velocityY: -Math.cos(radians) * 8
          });
        });
        
        lastShotRef.current = timestamp;
      }

      // Update and draw lasers
      for (let i = lasers.length - 1; i >= 0; i--) {
        const laser = lasers[i];
        laser.x += laser.velocityX || 0;
        laser.y += laser.velocityY || (laser.isEnemyShot ? 8 : -8);

        if (laser.y < -20 || laser.y > canvas.height + 20 || laser.x < -20 || laser.x > canvas.width + 20) {
          lasers.splice(i, 1);
          continue;
        }

        // Check collision with ship for enemy shots
        if (laser.isEnemyShot &&
            !isInvulnerableRef.current &&
            laser.x > ship.x - 25 &&
            laser.x < ship.x + 25 &&
            laser.y > ship.y - 25 &&
            laser.y < ship.y + 25) {
          
          // Reduz energia e remove o tiro
          energyRef.current -= 20; // Perde 20 de energia por tiro
          lasers.splice(i, 1);

          // Efeito de dano
          explosionsRef.current.push({
            x: ship.x,
            y: ship.y,
            size: 1,
            age: 0,
            color: '#ff0000'
          });

          // Período de invulnerabilidade
          isInvulnerableRef.current = true;
          setTimeout(() => {
            isInvulnerableRef.current = false;
          }, 1000); // 1 segundo de invulnerabilidade

          // Verifica game over
          if (energyRef.current <= 0) {
            isGameOverRef.current = true;
          }

          continue;
        }

        // Draw laser with effects
        ctx.save();
        ctx.translate(laser.x, laser.y);
        
        // Calcula o ângulo do tiro para rotacionar
        const angle = Math.atan2(laser.velocityX || 0, laser.isEnemyShot ? (laser.velocityY || 8) : -(laser.velocityY || 8));
        ctx.rotate(angle);

        const color = laser.isEnemyShot 
          ? { core: '#ff0000', glow: 'rgba(255, 0, 0, ' }  // Tiros inimigos são vermelhos
          : laserColors[powerLevelRef.current];
        
        // Trilha do laser
        const trailGradient = ctx.createLinearGradient(0, 20, 0, -20);
        trailGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        trailGradient.addColorStop(0.3, color.glow + '0.2)');
        trailGradient.addColorStop(0.7, color.glow + '0.4)');
        trailGradient.addColorStop(1, color.glow + '0.1)');
        
        ctx.fillStyle = trailGradient;
        ctx.beginPath();
        ctx.moveTo(-3, 20);
        ctx.lineTo(3, 20);
        ctx.lineTo(2, -20);
        ctx.lineTo(-2, -20);
        ctx.closePath();
        ctx.fill();

        // Núcleo do laser
        const coreGradient = ctx.createLinearGradient(0, 10, 0, -10);
        coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        coreGradient.addColorStop(0.5, color.core);
        coreGradient.addColorStop(1, 'rgba(255, 255, 255, 0.3)');

        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.moveTo(-1, 10);
        ctx.lineTo(1, 10);
        ctx.lineTo(1, -10);
        ctx.lineTo(-1, -10);
        ctx.closePath();
        ctx.fill();

        // Brilho central
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fill();

        // Glow effect
        const glowSize = 15;
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
        glow.addColorStop(0, color.glow + '0.3)');
        glow.addColorStop(0.5, color.glow + '0.1)');
        glow.addColorStop(1, color.glow + '0)');
        
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // Update and draw meteors
      for (let i = meteors.length - 1; i >= 0; i--) {
        const meteor = meteors[i];
        meteor.y += 2;

        // Enemy shooting logic
        if (timestamp - (meteor.lastShot || 0) > 1500 && meteor.y > 0) { // Tiro a cada 1.5 segundos (era 1 segundo)
          meteor.lastShot = timestamp;
          
          switch(meteor.type) {
            case 'enimie':
              // Tiro único direto mais lento
              lasers.push({
                x: meteor.x,
                y: meteor.y + 20,
                width: 12, // Maior (era 8)
                height: 24, // Maior (era 16)
                velocityY: 5, // Mais lento (era 7)
                isEnemyShot: true
              });
              break;
              
            case 'enimiie':
              // Tiro triplo em leque mais lento
              for (let angle = -20; angle <= 20; angle += 20) {
                const radians = (angle * Math.PI) / 180;
                lasers.push({
                  x: meteor.x,
                  y: meteor.y + 20,
                  width: 12,
                  height: 24,
                  velocityX: Math.sin(radians) * 5,
                  velocityY: Math.cos(radians) * 5,
                  isEnemyShot: true
                });
              }
              break;
              
            case 'enimie4':
              // Tiro duplo lateral mais lento
              lasers.push(
                {
                  x: meteor.x - 15,
                  y: meteor.y + 20,
                  width: 12,
                  height: 24,
                  velocityY: 5,
                  isEnemyShot: true
                },
                {
                  x: meteor.x + 15,
                  y: meteor.y + 20,
                  width: 12,
                  height: 24,
                  velocityY: 5,
                  isEnemyShot: true
                }
              );
              break;
          }
        }

        if (meteor.y > canvas.height + 20) {
          meteors.splice(i, 1);
          continue;
        }

        // Check collision with lasers
        for (let j = lasers.length - 1; j >= 0; j--) {
          const laser = lasers[j];
          if (!laser.isEnemyShot && // Só destrói o inimigo se não for tiro dele
            laser.x < meteor.x + meteor.width &&
            laser.x + laser.width > meteor.x &&
            laser.y < meteor.y + meteor.height &&
            laser.y + laser.height > meteor.y
          ) {
            meteors.splice(i, 1);
            lasers.splice(j, 1);
            scoreRef.current += 1;

            // Adiciona explosão
            explosionsRef.current.push({
              x: meteor.x,
              y: meteor.y,
              size: 1,
              age: 0,
              color: '#ffaa00'
            });
            break;
          }
        }

        // Draw meteor with rotation and effects
        ctx.save();
        ctx.translate(meteor.x, meteor.y);

        // Meteor trail (rastro alinhado com a rotação)
        const meteorTrail = ctx.createLinearGradient(0, -30, 0, 10);
        meteorTrail.addColorStop(0, 'rgba(255, 80, 0, 0)');
        meteorTrail.addColorStop(0.5, 'rgba(255, 80, 0, 0.3)');
        meteorTrail.addColorStop(1, 'rgba(255, 80, 0, 0.7)');
        
        ctx.fillStyle = meteorTrail;
        ctx.beginPath();
        ctx.moveTo(-15, -30);
        ctx.lineTo(15, -30);
        ctx.lineTo(10, 10);
        ctx.lineTo(-10, 10);
        ctx.closePath();
        ctx.fill();

        // Meteor glow
        const meteorGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
        meteorGlow.addColorStop(0, 'rgba(255, 80, 0, 0.3)');
        meteorGlow.addColorStop(1, 'rgba(255, 80, 0, 0)');
        ctx.fillStyle = meteorGlow;
        ctx.beginPath();
        ctx.arc(0, 0, 40, 0, Math.PI * 2);
        ctx.fill();

        // Draw meteor sprite
        const enemyType = meteor.type || 'enimie';
        if (enemyImagesRef.current[enemyType]) {
          ctx.drawImage(enemyImagesRef.current[enemyType], -30, -30, 60, 60);
        }
        
        ctx.restore();
      }

      // Update and draw explosions
      const explosions = explosionsRef.current;
      for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        explosion.age += 1;
        explosion.size += 2;

        if (explosion.age > 20) {
          explosions.splice(i, 1);
          continue;
        }

        const opacity = 1 - explosion.age / 20;
        const gradient = ctx.createRadialGradient(
          explosion.x, explosion.y, 0,
          explosion.x, explosion.y, explosion.size
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
        gradient.addColorStop(0.4, `rgba(255, 170, 0, ${opacity})`);
        gradient.addColorStop(1, `rgba(255, 68, 0, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.size, 0, Math.PI * 2);
        ctx.fill();

        // Partículas da explosão
        for (let j = 0; j < 8; j++) {
          const angle = (j / 8) * Math.PI * 2;
          const x = explosion.x + Math.cos(angle) * explosion.size * 0.8;
          const y = explosion.y + Math.sin(angle) * explosion.size * 0.8;
          
          ctx.fillStyle = `rgba(255, 170, 0, ${opacity * 0.5})`;
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Update and draw power-ups
      for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        powerUp.y += 2;

        if (powerUp.y > canvas.height + 20) {
          powerUps.splice(i, 1);
          continue;
        }

        // Check collision with ship
        if (!powerUp.collected &&
            ship.x < powerUp.x + powerUp.width &&
            ship.x + ship.width > powerUp.x &&
            ship.y < powerUp.y + powerUp.height &&
            ship.y + ship.height > powerUp.y) {
          
          powerUp.collected = true;
          powerUps.splice(i, 1);
          
          // Aumenta o nível do power-up até o máximo
          powerLevelRef.current = Math.min(powerLevelRef.current + 1, 5); // Aumentado para 5 níveis
          
          // Limpa o timeout anterior se existir
          if (powerUpTimeoutRef.current) {
            window.clearTimeout(powerUpTimeoutRef.current);
          }
          
          // Define novo timeout para reduzir o nível do power-up
          powerUpTimeoutRef.current = window.setTimeout(() => {
            powerLevelRef.current = Math.max(0, powerLevelRef.current - 1);
          }, 7000); // Aumentado para 7 segundos
          
          continue;
        }

        // Draw power-up
        ctx.save();
        ctx.translate(powerUp.x, powerUp.y);
        
        // Efeito de brilho
        const glow = ctx.createRadialGradient(15, 0, 0, 15, 0, 20);
        glow.addColorStop(0, 'rgba(255, 255, 0, 0.3)');
        glow.addColorStop(1, 'rgba(255, 255, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(15, 0, 20, 0, Math.PI * 2);
        ctx.fill();

        // Draw power-up sprite
        if (powerUpImageRef.current) {
          ctx.drawImage(powerUpImageRef.current, 0, -15, 30, 30);
        }
        
        ctx.restore();
      }

      // Draw ship with fire effect
      ctx.save();
      ctx.translate(ship.x, ship.y);
      
      // Draw rocket sprite
      if (rocketImageRef.current) {
        ctx.drawImage(rocketImageRef.current, -30, -30, 60, 60);
      }
      
      // Draw fire effect
      const fireColors = ['#ff4400', '#ff6600', '#ff8800', '#ffaa00'];
      const fireSize = Math.sin(timestamp / 100) * 3 + 7;
      
      // Posição ajustada do fogo para sair direto da base
      const fireOffsetX = 0;
      const fireOffsetY = 25;
      
      // Desenha várias camadas de fogo
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = fireColors[i];
        
        // Fogo principal
        ctx.beginPath();
        ctx.arc(fireOffsetX, fireOffsetY + (i * 5), fireSize - (i * 1), 0, Math.PI * 2);
        ctx.fill();
        
        // Fogo lateral esquerdo
        ctx.beginPath();
        ctx.arc(fireOffsetX - 6, fireOffsetY + (i * 4), (fireSize - (i * 1)) * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // Fogo lateral direito
        ctx.beginPath();
        ctx.arc(fireOffsetX + 6, fireOffsetY + (i * 4), (fireSize - (i * 1)) * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();

      // Draw score and energy
      ctx.fillStyle = 'white';
      ctx.font = '24px Arial';
      ctx.fillText(`Meteoros: ${scoreRef.current}`, 20, 40);
      
      // Barra de energia com efeitos melhorados
      const energyWidth = 200;
      const energyHeight = 25; // Aumentado para melhor visibilidade
      const energyX = canvas.width - energyWidth - 20;
      const energyY = 20;

      // Fundo da barra com gradiente
      const bgGradient = ctx.createLinearGradient(energyX, energyY, energyX + energyWidth, energyY);
      bgGradient.addColorStop(0, 'rgba(50, 50, 50, 0.5)');
      bgGradient.addColorStop(1, 'rgba(70, 70, 70, 0.5)');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(energyX, energyY, energyWidth, energyHeight);

      // Energia atual com gradiente e efeito pulsante
      const energyPercent = energyRef.current / 100;
      const pulseEffect = Math.sin(timestamp / 200) * 0.1; // Efeito pulsante
      const baseColor = energyPercent > 0.6 ? 
                       ['rgba(0, 255, 0, 0.7)', 'rgba(150, 255, 150, 0.9)'] : 
                       energyPercent > 0.3 ? 
                       ['rgba(255, 255, 0, 0.7)', 'rgba(255, 255, 150, 0.9)'] : 
                       ['rgba(255, 0, 0, 0.7)', 'rgba(255, 150, 150, 0.9)'];
      
      const energyGradient = ctx.createLinearGradient(energyX, energyY, energyX + energyWidth * energyPercent, energyY);
      energyGradient.addColorStop(0, baseColor[0]);
      energyGradient.addColorStop(1, baseColor[1]);
      
      ctx.fillStyle = energyGradient;
      ctx.fillRect(energyX, energyY, energyWidth * (energyPercent + pulseEffect), energyHeight);

      // Linhas de energia (efeito visual)
      const lineCount = 10;
      const lineSpacing = energyWidth / lineCount;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      for (let i = 1; i < lineCount; i++) {
        const x = energyX + i * lineSpacing;
        ctx.beginPath();
        ctx.moveTo(x, energyY);
        ctx.lineTo(x, energyY + energyHeight);
        ctx.stroke();
      }

      // Borda com brilho
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.strokeRect(energyX, energyY, energyWidth, energyHeight);
      
      // Brilho externo
      const glowSize = 3;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + pulseEffect})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(energyX - glowSize, energyY - glowSize, 
                    energyWidth + glowSize * 2, energyHeight + glowSize * 2);

      // Texto da energia com sombra
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.textAlign = 'right';
      ctx.fillText(`Energia: ${energyRef.current}%`, energyX - 8, energyY + 18);
      ctx.fillStyle = 'white';
      ctx.fillText(`Energia: ${energyRef.current}%`, energyX - 10, energyY + 16);

      // Efeito de dano quando a energia está baixa
      if (energyRef.current < 30) {
        const damageOpacity = (Math.sin(timestamp / 100) * 0.2 + 0.2);
        ctx.fillStyle = `rgba(255, 0, 0, ${damageOpacity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Removido o efeito de piscar verde
      // Adicionado efeito mais sutil de brilho ao coletar energia
      if (energyRef.current > previousEnergyRef.current) {
        const healGlow = ctx.createRadialGradient(
          ship.x, ship.y, 0,
          ship.x, ship.y, 60
        );
        healGlow.addColorStop(0, 'rgba(0, 255, 128, 0.3)');
        healGlow.addColorStop(1, 'rgba(0, 255, 128, 0)');
        ctx.fillStyle = healGlow;
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, 60, 0, Math.PI * 2);
        ctx.fill();
      }
      previousEnergyRef.current = energyRef.current;

      // Efeito de rastro da nave
      ctx.save();
      const trailGradient = ctx.createLinearGradient(ship.x, ship.y, ship.x, ship.y + 30);
      trailGradient.addColorStop(0, 'rgba(255, 100, 0, 0.5)');
      trailGradient.addColorStop(1, 'rgba(255, 200, 0, 0)');
      ctx.fillStyle = trailGradient;
      
      // Rastro principal
      ctx.beginPath();
      ctx.moveTo(ship.x - 10, ship.y);
      ctx.lineTo(ship.x + 10, ship.y);
      ctx.lineTo(ship.x, ship.y + 30);
      ctx.closePath();
      ctx.fill();
      
      // Rastros laterais
      ctx.beginPath();
      ctx.moveTo(ship.x - 15, ship.y);
      ctx.lineTo(ship.x - 5, ship.y);
      ctx.lineTo(ship.x - 10, ship.y + 20);
      ctx.closePath();
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(ship.x + 5, ship.y);
      ctx.lineTo(ship.x + 15, ship.y);
      ctx.lineTo(ship.x + 10, ship.y + 20);
      ctx.closePath();
      ctx.fill();
      
      ctx.restore();

      // Create energy items randomly
      if (Math.random() < 0.001) { // Ajuste a frequência conforme necessário
        energyItemsRef.current.push({
          x: Math.random() * canvas.width,
          y: -20,
          width: 30,
          height: 30
        });
      }

      // Update and draw energy items
      for (let i = energyItemsRef.current.length - 1; i >= 0; i--) {
        const energyItem = energyItemsRef.current[i];
        energyItem.y += 2;

        if (energyItem.y > canvas.height + 20) {
          energyItemsRef.current.splice(i, 1);
          continue;
        }

        // Check collision with ship
        if (
          ship.x < energyItem.x + energyItem.width &&
          ship.x + ship.width > energyItem.x &&
          ship.y < energyItem.y + energyItem.height &&
          ship.y + ship.height > energyItem.y
        ) {
          energyRef.current = Math.min(100, energyRef.current + 20); // Recupera 20 de energia
          energyItemsRef.current.splice(i, 1);
          continue;
        }

        // Draw energy item
        ctx.save();
        ctx.translate(energyItem.x, energyItem.y);
        if (energySpriteRef.current) {
          ctx.drawImage(energySpriteRef.current, 0, 0, 30, 30);
        }
        ctx.restore();
      }

      // Draw game over screen if game is over
      if (isGameOverRef.current) {
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Game Over text
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = 'bold 48px Arial';
        ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 50);

        // Score text
        ctx.font = '24px Arial';
        ctx.fillText(`Pontuação Final: ${scoreRef.current}`, canvas.width / 2, canvas.height / 2);

        // Restart button
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonX = canvas.width / 2 - buttonWidth / 2;
        const buttonY = canvas.height / 2 + 50;

        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.fillText('Jogar Novamente', canvas.width / 2, buttonY + 32);

        // Check for click on restart button
        const handleRestartClick = (e: MouseEvent) => {
          const rect = canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;

          console.log('Canvas clicked at:', x, y);
          console.log('Button position and size:', buttonX, buttonY, buttonWidth, buttonHeight);

          if (x > buttonX && x < buttonX + buttonWidth &&
              y > buttonY && y < buttonY + buttonHeight) {
            console.log('Restart button clicked');
            // Reset game
            isGameOverRef.current = false;
            energyRef.current = 100;
            scoreRef.current = 0;
            meteors.length = 0;
            lasers.length = 0;
            powerLevelRef.current = 0;
            canvas.onclick = null;

            // Restart game loop
            requestAnimationFrame(gameLoop);
          } else {
            console.log('Click was outside the restart button');
          }
        };

        canvas.addEventListener('click', handleRestartClick);

        return; // Don't continue game loop if game over
      }

      // Quando um meteoro é destruído, adiciona mais partículas
      for (let j = lasers.length - 1; j >= 0; j--) {
        const laser = lasers[j];
        if (!laser.isEnemyShot) {
          for (let i = meteors.length - 1; i >= 0; i--) {
            const meteor = meteors[i];
            if (laser.x < meteor.x + meteor.width &&
                laser.x + laser.width > meteor.x &&
                laser.y < meteor.y + meteor.height &&
                laser.y + laser.height > meteor.y
            ) {
              meteors.splice(i, 1);
              lasers.splice(j, 1);
              scoreRef.current += 1;

              // Adiciona mais partículas na explosão
              for (let k = 0; k < 15; k++) {
                const angle = (Math.random() * Math.PI * 2);
                const distance = Math.random() * 30;
                explosionsRef.current.push({
                  x: meteor.x + Math.cos(angle) * distance,
                  y: meteor.y + Math.sin(angle) * distance,
                  size: Math.random() * 4 + 2,
                  age: 0,
                  color: k % 2 === 0 ? '#ffaa00' : '#ff4400'
                });
              }
              break;
            }
          }
        }
      }

      // Melhorar o efeito visual quando coleta power-up
      if (powerLevelRef.current > 0) {
        // Adiciona um efeito de brilho ao redor da nave
        const shipGlow = ctx.createRadialGradient(
          ship.x, ship.y, 0,
          ship.x, ship.y, 40
        );
        shipGlow.addColorStop(0, `rgba(255, 255, 0, ${0.2 + Math.sin(timestamp / 200) * 0.1})`);
        shipGlow.addColorStop(1, 'rgba(255, 255, 0, 0)');
        ctx.fillStyle = shipGlow;
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, 40, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(gameLoop);
    };

    // Start game loop
    requestAnimationFrame(gameLoop);

    // Handle touch/mouse events
    const handlePointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      isDraggingRef.current = true;
      
      // Move o foguete imediatamente para a posição do clique
      ship.x = x;
      // Limita o movimento vertical entre 100px do topo e 100px do fundo
      ship.y = Math.max(100, Math.min(canvas.height - 100, y));
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Limita o movimento horizontal e vertical
      ship.x = Math.max(25, Math.min(canvas.width - 25, x));
      ship.y = Math.max(100, Math.min(canvas.height - 100, y));
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
    };
  }, []);

  return (
    <div className="space-wrapper">
      <Link to="/" className="back-button">↩</Link>
      <canvas ref={canvasRef} className="space-game" />
    </div>
  );
} 