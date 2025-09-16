import React, { useState, useEffect } from ‘react’;
import { ChevronUp, ChevronDown, Trophy, Save, X, AlertCircle } from ‘lucide-react’;

const RoundManagerMobile = ({
isOpen,
setIsOpen,
roundData,
players: initialPlayers,
onSave,
onCancel,
roundNumber,
tournamentName
}) => {
const [players, setPlayers] = useState(initialPlayers || []);
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
const [sortedPlayers, setSortedPlayers] = useState([]);

// Atualizar players quando prop mudar
useEffect(() => {
if (initialPlayers) {
setPlayers(initialPlayers.map(player => ({
…player,
points: player.points || 0,
tiebreakOrder: player.tiebreakOrder || 0
})));
}
}, [initialPlayers]);

// Ordenar jogadores automaticamente por pontos + desempate manual
useEffect(() => {
const sorted = […players].sort((a, b) => {
// Primeiro critério: pontos (maior para menor)
if (b.points !== a.points) {
return b.points - a.points;
}
// Segundo critério: ordem de desempate manual (se definida)
if (a.tiebreakOrder !== 0 || b.tiebreakOrder !== 0) {
return a.tiebreakOrder - b.tiebreakOrder;
}
// Terceiro critério: manter ordem original
return players.indexOf(a) - players.indexOf(b);
});
setSortedPlayers(sorted);
}, [players]);

// Atualizar pontos
const updatePoints = (playerId, newPoints) => {
const points = Math.max(0, parseInt(newPoints) || 0);

```
setPlayers(prevPlayers => {
  const updated = prevPlayers.map(player =>
    player.id === playerId
      ? { ...player, points, tiebreakOrder: 0 }
      : player
  );
  
  // Resetar tiebreakOrder para todos quando pontos mudam
  return updated.map(p => ({ ...p, tiebreakOrder: 0 }));
});
setHasUnsavedChanges(true);
```

};

// Verificar se pode mover para cima (apenas dentro do grupo empatado)
const canMoveUp = (index) => {
if (index === 0) return false;
return sortedPlayers[index].points === sortedPlayers[index - 1].points;
};

// Verificar se pode mover para baixo (apenas dentro do grupo empatado)
const canMoveDown = (index) => {
if (index === sortedPlayers.length - 1) return false;
return sortedPlayers[index].points === sortedPlayers[index + 1].points;
};

// Obter grupo de jogadores empatados
const getTiedGroup = (playerIndex) => {
const player = sortedPlayers[playerIndex];
const tiedPlayers = [];

```
// Procurar para cima
for (let i = playerIndex - 1; i >= 0; i--) {
  if (sortedPlayers[i].points === player.points) {
    tiedPlayers.unshift(i);
  } else break;
}

// Adicionar o próprio jogador
tiedPlayers.push(playerIndex);

// Procurar para baixo
for (let i = playerIndex + 1; i < sortedPlayers.length; i++) {
  if (sortedPlayers[i].points === player.points) {
    tiedPlayers.push(i);
  } else break;
}

return tiedPlayers;
```

};

// Mover jogador para cima (apenas entre empatados)
const movePlayerUp = (index) => {
if (!canMoveUp(index)) return;

```
const tiedGroup = getTiedGroup(index);
const currentPlayer = sortedPlayers[index];
const targetPlayer = sortedPlayers[index - 1];

setPlayers(prevPlayers => {
  return prevPlayers.map(player => {
    if (player.id === currentPlayer.id) {
      return { 
        ...player, 
        tiebreakOrder: targetPlayer.tiebreakOrder || tiedGroup.indexOf(index - 1) + 1 
      };
    }
    if (player.id === targetPlayer.id) {
      return { 
        ...player, 
        tiebreakOrder: currentPlayer.tiebreakOrder || tiedGroup.indexOf(index) + 1 
      };
    }
    return player;
  });
});

setHasUnsavedChanges(true);

if (navigator.vibrate) {
  navigator.vibrate(50);
}
```

};

// Mover jogador para baixo (apenas entre empatados)
const movePlayerDown = (index) => {
if (!canMoveDown(index)) return;

```
const tiedGroup = getTiedGroup(index);
const currentPlayer = sortedPlayers[index];
const targetPlayer = sortedPlayers[index + 1];

setPlayers(prevPlayers => {
  return prevPlayers.map(player => {
    if (player.id === currentPlayer.id) {
      return { 
        ...player, 
        tiebreakOrder: targetPlayer.tiebreakOrder || tiedGroup.indexOf(index + 1) + 1 
      };
    }
    if (player.id === targetPlayer.id) {
      return { 
        ...player, 
        tiebreakOrder: currentPlayer.tiebreakOrder || tiedGroup.indexOf(index) + 1 
      };
    }
    return player;
  });
});

setHasUnsavedChanges(true);

if (navigator.vibrate) {
  navigator.vibrate(50);
}
```

};

// Guardar alterações
const handleSave = () => {
const finalResults = sortedPlayers.map((player, index) => ({
…player,
finalPosition: index + 1
}));

```
if (onSave) {
  onSave(finalResults);
}

setHasUnsavedChanges(false);
```

};

// Cancelar
const handleCancel = () => {
if (hasUnsavedChanges) {
if (!confirm(‘Tem alterações não guardadas. Deseja sair?’)) {
return;
}
}

```
if (onCancel) {
  onCancel();
} else {
  setIsOpen(false);
}
```

};

// Verificar se há empates
const hasTies = () => {
const pointsCount = {};
sortedPlayers.forEach(player => {
pointsCount[player.points] = (pointsCount[player.points] || 0) + 1;
});
return Object.values(pointsCount).some(count => count > 1);
};

// Verificar se jogador está empatado
const isPlayerTied = (playerIndex) => {
const player = sortedPlayers[playerIndex];
return sortedPlayers.filter(p => p.points === player.points).length > 1;
};

// Obter display da posição
const getPositionDisplay = (position) => {
if (position === 1) return ‘🥇’;
if (position === 2) return ‘🥈’;
if (position === 3) return ‘🥉’;
return `${position}º`;
};

// Calcular total de pontos
const totalPoints = sortedPlayers.reduce((sum, player) => sum + player.points, 0);

if (!isOpen) return null;

return (
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
<div className="bg-white w-full sm:max-w-lg sm:mx-4 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[95vh] sm:max-h-[85vh] flex flex-col animate-slideUp sm:animate-fadeIn">

```
    {/* Header */}
    <div className="flex-shrink-0">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 sm:p-6 rounded-t-3xl sm:rounded-t-2xl">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-6 h-6" />
              {roundNumber ? `Ronda ${roundNumber}` : 'Gestor de Ronda'}
            </h2>
            {tournamentName && (
              <p className="text-blue-100 text-sm mt-1">{tournamentName}</p>
            )}
            <div className="flex items-center gap-4 mt-2">
              <p className="text-blue-100 text-sm">
                Total: {totalPoints} pts
              </p>
              <p className="text-blue-100 text-sm">
                {players.length} jogadores
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors active:scale-90"
            aria-label="Fechar"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Aviso de Empate */}
      {hasTies() && (
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-amber-800 font-medium">
              Jogadores empatados!
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Use as setas para definir o desempate
            </p>
          </div>
        </div>
      )}
    </div>

    {/* Lista de Jogadores */}
    <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3">
      {sortedPlayers.map((player, index) => {
        const isTied = isPlayerTied(index);
        const canGoUp = canMoveUp(index);
        const canGoDown = canMoveDown(index);
        const showReorderButtons = isTied && (canGoUp || canGoDown);
        
        return (
          <div
            key={player.id}
            className={`
              relative rounded-2xl p-4 transition-all transform
              ${isTied 
                ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 shadow-md' 
                : 'bg-white border-2 border-gray-200 shadow-sm'
              }
              ${index === 0 ? 'scale-[1.02]' : ''}
              active:scale-[0.98]
            `}
          >
            {/* Badge de empate */}
            {isTied && (
              <div className="absolute -top-2 -right-2">
                <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                  EMPATE
                </span>
              </div>
            )}

            <div className="flex items-center gap-3">
              {/* Posição */}
              <div className="flex-shrink-0 text-center min-w-[50px]">
                <div className="text-3xl font-bold text-gray-700">
                  {getPositionDisplay(index + 1)}
                </div>
              </div>

              {/* Nome e Pontos */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 truncate text-base">
                  {player.name}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-gray-500">Pontos:</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={player.points}
                    onChange={(e) => updatePoints(player.id, e.target.value)}
                    className={`
                      w-20 px-3 py-2 text-center font-bold text-lg
                      border-2 rounded-xl transition-all
                      ${isTied 
                        ? 'border-amber-400 bg-amber-50 focus:border-amber-500' 
                        : 'border-gray-300 bg-gray-50 focus:border-blue-500'
                      }
                      focus:outline-none focus:ring-4 focus:ring-blue-500/20
                    `}
                  />
                </div>
              </div>

              {/* Botões de Reordenação */}
              {showReorderButtons ? (
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => movePlayerUp(index)}
                    disabled={!canGoUp}
                    className={`
                      p-2.5 rounded-xl transition-all transform
                      ${!canGoUp
                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        : 'bg-amber-100 text-amber-600 hover:bg-amber-200 active:scale-90'
                      }
                    `}
                    aria-label="Subir no desempate"
                  >
                    <ChevronUp className="w-5 h-5" strokeWidth={3} />
                  </button>
                  <button
                    onClick={() => movePlayerDown(index)}
                    disabled={!canGoDown}
                    className={`
                      p-2.5 rounded-xl transition-all transform
                      ${!canGoDown
                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        : 'bg-amber-100 text-amber-600 hover:bg-amber-200 active:scale-90'
                      }
                    `}
                    aria-label="Descer no desempate"
                  >
                    <ChevronDown className="w-5 h-5" strokeWidth={3} />
                  </button>
                </div>
              ) : (
                <div className="w-[52px]"></div>
              )}
            </div>
          </div>
        );
      })}
    </div>

    {/* Footer */}
    <div className="flex-shrink-0 border-t bg-gray-50 p-4 safe-area-pb">
      <div className="flex gap-3">
        <button
          onClick={handleCancel}
          className="flex-1 px-4 py-3.5 bg-white border-2 border-gray-300 text-gray-700 rounded-2xl font-semibold hover:bg-gray-100 transition-colors active:scale-95"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          className="flex-1 px-4 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg"
        >
          <Save className="w-5 h-5" />
          Guardar
        </button>
      </div>
      {hasUnsavedChanges && (
        <p className="text-center text-xs text-amber-600 mt-2 font-medium animate-pulse">
          * Alterações não guardadas
        </p>
      )}
    </div>
  </div>
</div>
```

);
};

// CSS Global (adicionar ao teu ficheiro de estilos global)
const globalStyles = `
@keyframes slideUp {
from {
transform: translateY(100%);
opacity: 0;
}
to {
transform: translateY(0);
opacity: 1;
}
}

@keyframes fadeIn {
from {
opacity: 0;
transform: scale(0.95);
}
to {
opacity: 1;
transform: scale(1);
}
}

.animate-slideUp {
animation: slideUp 0.3s ease-out;
}

.animate-fadeIn {
animation: fadeIn 0.2s ease-out;
}

.safe-area-pb {
padding-bottom: env(safe-area-inset-bottom, 1rem);
}

.overscroll-contain {
overscroll-behavior: contain;
-webkit-overflow-scrolling: touch;
}

@media (hover: none) and (pointer: coarse) {
button {
-webkit-tap-highlight-color: transparent;
}
}

input[type=“number”]::-webkit-inner-spin-button,
input[type=“number”]::-webkit-outer-spin-button {
-webkit-appearance: none;
margin: 0;
}

@keyframes pulse {
0%, 100% { opacity: 1; }
50% { opacity: 0.5; }
}

.animate-pulse {
animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
`;

export default RoundManagerMobile;

// Exemplo de como usar o componente:
/*
import RoundManagerMobile from ‘./RoundManagerMobile’;

function App() {
const [isRoundManagerOpen, setIsRoundManagerOpen] = useState(false);

// Os teus dados reais do backend/estado
const currentPlayers = [
{ id: 1, name: ‘João Silva’, points: 0 },
{ id: 2, name: ‘Maria Santos’, points: 0 },
// … mais jogadores
];

const handleSaveRound = async (finalResults) => {
try {
// Enviar para o backend
await api.post(’/rounds/save’, {
roundId: currentRound.id,
results: finalResults
});

```
  // Atualizar estado local
  setPlayers(finalResults);
  setIsRoundManagerOpen(false);
  toast.success('Ronda guardada com sucesso!');
} catch (error) {
  toast.error('Erro ao guardar ronda');
}
```

};

return (
<>
<button onClick={() => setIsRoundManagerOpen(true)}>
Gerir Ronda
</button>

```
  <RoundManagerMobile
    isOpen={isRoundManagerOpen}
    setIsOpen={setIsRoundManagerOpen}
    players={currentPlayers}
    onSave={handleSaveRound}
    roundNumber={1}
    tournamentName="Torneio de Verão 2024"
  />
</>
```

);
}
*/