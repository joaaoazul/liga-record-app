<<<<<<< HEAD
// Modal para finalizar ronda - VERSÃO CORRIGIDA COM SETAS FUNCIONAIS
import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Trophy, AlertCircle } from 'lucide-react';

const FinishRoundModal = ({ round, onClose, onSubmit, loading }) => {
  // Estado inicial com pontos a 0
  const [results, setResults] = useState(
    round.participants.map(p => ({
      ...p,
      points: 0,
      tiebreakOrder: 0
    }))
  );
  
  const [sortedResults, setSortedResults] = useState([]);
  
  // Debug mode para ver o que está a acontecer
  const [debugMode, setDebugMode] = useState(false);

  // Ordenar jogadores automaticamente
  useEffect(() => {
    if (!results || results.length === 0) {
      setSortedResults([]);
      return;
    }

    const sorted = [...results].sort((a, b) => {
      // Primeiro: pontos (maior para menor)
      const pointsDiff = (b.points || 0) - (a.points || 0);
      if (pointsDiff !== 0) {
        return pointsDiff;
      }
      
      // Segundo: ordem de desempate manual
      const aTiebreak = a.tiebreakOrder || 0;
      const bTiebreak = b.tiebreakOrder || 0;
      
      if (aTiebreak !== 0 || bTiebreak !== 0) {
        if (aTiebreak === 0) return 1;
        if (bTiebreak === 0) return -1;
        return aTiebreak - bTiebreak;
      }
      
      // Terceiro: manter ordem original
      return results.indexOf(a) - results.indexOf(b);
    });
    
    setSortedResults(sorted);
    
    if (debugMode) {
      console.log("Sorted results:", sorted.map(s => ({
        name: s.playerName,
        points: s.points,
        tiebreak: s.tiebreakOrder
      })));
    }
  }, [results, debugMode]);

  // Atualizar pontos
  const handlePointsChange = (playerId, points) => {
    const newPoints = parseInt(points) || 0;
    
    setResults(prevResults =>
      prevResults.map(r => {
        if (r.playerId === playerId) {
          return { ...r, points: newPoints, tiebreakOrder: 0 };
        }
        // Reset tiebreak order para todos quando pontos mudam
        return { ...r, tiebreakOrder: 0 };
      })
    );
  };

  // Verificar se dois jogadores estão empatados - SIMPLIFICADO
  const arePlayersTied = (index1, index2) => {
    if (!sortedResults[index1] || !sortedResults[index2]) return false;
    return sortedResults[index1].points === sortedResults[index2].points;
  };

  // Verificar se pode mover para cima - SIMPLIFICADO
  const canMoveUp = (index) => {
    if (index <= 0) return false;
    // Pode mover se o jogador de cima tem os mesmos pontos
    return arePlayersTied(index, index - 1);
  };

  // Verificar se pode mover para baixo - SIMPLIFICADO
  const canMoveDown = (index) => {
    if (index >= sortedResults.length - 1) return false;
    // Pode mover se o jogador de baixo tem os mesmos pontos
    return arePlayersTied(index, index + 1);
  };

  // Mover jogador para cima
  const movePlayerUp = (index) => {
    if (!canMoveUp(index)) return;
    
    const currentPlayer = sortedResults[index];
    const targetPlayer = sortedResults[index - 1];
    
    setResults(prevResults => {
      // Incrementar ordem de desempate para simular troca
      const currentOrder = currentPlayer.tiebreakOrder || 0;
      const targetOrder = targetPlayer.tiebreakOrder || 0;
      
      return prevResults.map(player => {
        if (player.playerId === currentPlayer.playerId) {
          return { ...player, tiebreakOrder: targetOrder - 1 };
        }
        if (player.playerId === targetPlayer.playerId) {
          return { ...player, tiebreakOrder: currentOrder + 1 };
        }
        return player;
      });
    });
    
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
  };

  // Mover jogador para baixo
  const movePlayerDown = (index) => {
    if (!canMoveDown(index)) return;
    
    const currentPlayer = sortedResults[index];
    const targetPlayer = sortedResults[index + 1];
    
    setResults(prevResults => {
      const currentOrder = currentPlayer.tiebreakOrder || 0;
      const targetOrder = targetPlayer.tiebreakOrder || 0;
      
      return prevResults.map(player => {
        if (player.playerId === currentPlayer.playerId) {
          return { ...player, tiebreakOrder: targetOrder + 1 };
        }
        if (player.playerId === targetPlayer.playerId) {
          return { ...player, tiebreakOrder: currentOrder - 1 };
        }
        return player;
      });
    });
    
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
  };

  // Verificar se há algum empate no total
  const hasTies = () => {
    for (let i = 0; i < sortedResults.length - 1; i++) {
      if (sortedResults[i].points === sortedResults[i + 1].points) {
        return true;
      }
    }
    return false;
  };

  // Verificar se um jogador específico está empatado
  const isPlayerTied = (index) => {
    return canMoveUp(index) || canMoveDown(index);
  };

  // Helper para display da posição
  const getPositionDisplay = (position) => {
    switch(position) {
      case 1: return "🥇";
      case 2: return "🥈";
      case 3: return "🥉";
      default: return position + "º";
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const hasZeroPoints = sortedResults.some(r => r.points === 0);
    if (hasZeroPoints) {
      const confirmZero = window.confirm(
        "Alguns jogadores têm 0 pontos. Continuar mesmo assim?"
      );
      if (!confirmZero) return;
    }
    
    // Adicionar posição final
    const finalResults = sortedResults.map((player, index) => ({
      ...player,
      position: index + 1
    }));
    
    onSubmit(finalResults);
  };

  const totalPoints = sortedResults.reduce((sum, p) => sum + (p.points || 0), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-4xl sm:mx-4 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex-shrink-0">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 sm:p-6 rounded-t-3xl sm:rounded-t-2xl">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  <Trophy className="w-6 h-6" />
                  Finalizar: {round.name}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <p className="text-blue-100 text-sm">
                    Total: {totalPoints} pts
                  </p>
                  <p className="text-blue-100 text-sm">
                    {sortedResults.length} jogadores
                  </p>
                  {/* Debug toggle */}
                  <button
                    type="button"
                    onClick={() => setDebugMode(!debugMode)}
                    className="text-blue-100 text-xs underline"
                  >
                    {debugMode ? "Debug ON" : "Debug OFF"}
                  </button>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={loading}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-xl transition-colors"
              >
                <span className="text-white text-2xl">×</span>
              </button>
            </div>
          </div>

          {/* Aviso de Empate */}
          {hasTies() && (
            <div className="bg-amber-50 border-b border-amber-200 px-5 py-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-amber-800 font-medium">
                    Jogadores empatados detetados!
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Use as setas para definir o desempate
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          {/* Layout Mobile/Desktop unificado */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-3">
              {sortedResults.map((participant, index) => {
                const isTied = isPlayerTied(index);
                const showUpButton = canMoveUp(index);
                const showDownButton = canMoveDown(index);
                
                return (
                  <div 
                    key={participant.playerId} 
                    className={`
                      relative rounded-2xl p-4 transition-all
                      ${isTied 
                        ? "bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 shadow-md" 
                        : "bg-white border-2 border-gray-200 shadow-sm"
                      }
                    `}
                  >
                    {/* Debug info */}
                    {debugMode && (
                      <div className="absolute -top-8 left-0 text-xs bg-black text-white p-1 rounded">
                        P:{participant.points} TB:{participant.tiebreakOrder} 
                        Up:{showUpButton.toString()} Down:{showDownButton.toString()}
                      </div>
                    )}

                    {/* Badge de empate */}
                    {isTied && (
                      <div className="absolute -top-2 -right-2">
                        <span className="bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
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
                          {participant.playerName}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-sm text-gray-500">Pontos:</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={participant.points || 0}
                            onChange={(e) => handlePointsChange(participant.playerId, e.target.value)}
                            className={`
                              w-20 px-3 py-2 text-center font-bold text-lg
                              border-2 rounded-xl transition-all
                              ${isTied 
                                ? "border-amber-400 bg-amber-50 focus:border-amber-500" 
                                : "border-gray-300 bg-gray-50 focus:border-blue-500"
                              }
                              focus:outline-none focus:ring-4 focus:ring-opacity-20
                            `}
                            disabled={loading}
                          />
                        </div>
                        <div className={`text-sm font-bold mt-2 ${
                          (round.paymentStructure?.[index] || 0) === 0 
                            ? "text-green-600" 
                            : "text-red-600"
                        }`}>
                          {round.paymentStructure?.[index] !== undefined ? (
                            round.paymentStructure[index] === 0 
                              ? "Grátis" 
                              : `Paga: ${round.paymentStructure[index].toFixed(2)}€`
                          ) : "N/A"}
                        </div>
                      </div>

                      {/* Botões de Reordenação - SEMPRE VISÍVEIS SE EMPATADO */}
                      <div className="flex flex-col gap-1">
                        {showUpButton ? (
                          <button
                            type="button"
                            onClick={() => movePlayerUp(index)}
                            className="p-2 rounded-xl bg-amber-100 text-amber-600 hover:bg-amber-200 active:scale-90 transition-all"
                          >
                            <ChevronUp className="w-5 h-5" strokeWidth={3} />
                          </button>
                        ) : (
                          <div className="p-2 opacity-0">
                            <ChevronUp className="w-5 h-5" />
                          </div>
                        )}
                        
                        {showDownButton ? (
                          <button
                            type="button"
                            onClick={() => movePlayerDown(index)}
                            className="p-2 rounded-xl bg-amber-100 text-amber-600 hover:bg-amber-200 active:scale-90 transition-all"
                          >
                            <ChevronDown className="w-5 h-5" strokeWidth={3} />
                          </button>
                        ) : (
                          <div className="p-2 opacity-0">
                            <ChevronDown className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t bg-gray-50 p-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-2xl font-semibold hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                {loading ? "A processar..." : "Confirmar e Finalizar"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FinishRoundModal;
=======
import React, { useState, useEffect } from ‘react’;
import { ChevronUp, ChevronDown, Trophy, Save, X, AlertCircle } from ‘lucide-react’;

const RoundManagerMobile = ({
isOpen = false,
setIsOpen = () => {},
roundData = {},
players: initialPlayers = [],
onSave = () => {},
onCancel = null,
roundNumber = null,
tournamentName = null
}) => {
const [players, setPlayers] = useState([]);
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
const [sortedPlayers, setSortedPlayers] = useState([]);

// Inicializar players
useEffect(() => {
if (initialPlayers && initialPlayers.length > 0) {
const formattedPlayers = initialPlayers.map(player => ({
id: player.id,
name: player.name || ‘Jogador’,
points: typeof player.points === ‘number’ ? player.points : 0,
tiebreakOrder: player.tiebreakOrder || 0,
…player // Manter outras propriedades
}));
setPlayers(formattedPlayers);
}
}, [initialPlayers]);

// Ordenar jogadores automaticamente por pontos + desempate manual
useEffect(() => {
if (!players || players.length === 0) {
setSortedPlayers([]);
return;
}

```
const sorted = [...players].sort((a, b) => {
  // Primeiro criterio: pontos (maior para menor)
  const pointsDiff = (b.points || 0) - (a.points || 0);
  if (pointsDiff !== 0) {
    return pointsDiff;
  }
  
  // Segundo criterio: ordem de desempate manual (se definida)
  const aTiebreak = a.tiebreakOrder || 0;
  const bTiebreak = b.tiebreakOrder || 0;
  
  if (aTiebreak !== 0 || bTiebreak !== 0) {
    if (aTiebreak === 0) return 1;
    if (bTiebreak === 0) return -1;
    return aTiebreak - bTiebreak;
  }
  
  // Terceiro criterio: manter ordem original
  const indexA = players.findIndex(p => p.id === a.id);
  const indexB = players.findIndex(p => p.id === b.id);
  return indexA - indexB;
});

setSortedPlayers(sorted);
```

}, [players]);

// Atualizar pontos
const updatePoints = (playerId, value) => {
const newPoints = Math.max(0, parseInt(value) || 0);

```
setPlayers(prevPlayers => {
  if (!prevPlayers) return [];
  
  // Resetar tiebreakOrder quando pontos mudam
  return prevPlayers.map(player => {
    if (player.id === playerId) {
      return { ...player, points: newPoints, tiebreakOrder: 0 };
    }
    return { ...player, tiebreakOrder: 0 };
  });
});

setHasUnsavedChanges(true);
```

};

// Verificar se pode mover para cima
const canMoveUp = (index) => {
if (!sortedPlayers || index <= 0 || index >= sortedPlayers.length) {
return false;
}
const current = sortedPlayers[index];
const previous = sortedPlayers[index - 1];
return current && previous && current.points === previous.points;
};

// Verificar se pode mover para baixo
const canMoveDown = (index) => {
if (!sortedPlayers || index < 0 || index >= sortedPlayers.length - 1) {
return false;
}
const current = sortedPlayers[index];
const next = sortedPlayers[index + 1];
return current && next && current.points === next.points;
};

// Obter grupo de jogadores empatados
const getTiedGroup = (playerIndex) => {
if (!sortedPlayers || !sortedPlayers[playerIndex]) return [playerIndex];

```
const player = sortedPlayers[playerIndex];
const tiedIndices = [];

// Procurar para cima
for (let i = playerIndex - 1; i >= 0; i--) {
  if (sortedPlayers[i] && sortedPlayers[i].points === player.points) {
    tiedIndices.unshift(i);
  } else break;
}

// Adicionar o proprio jogador
tiedIndices.push(playerIndex);

// Procurar para baixo
for (let i = playerIndex + 1; i < sortedPlayers.length; i++) {
  if (sortedPlayers[i] && sortedPlayers[i].points === player.points) {
    tiedIndices.push(i);
  } else break;
}

return tiedIndices;
```

};

// Mover jogador para cima
const movePlayerUp = (index) => {
if (!canMoveUp(index)) return;

```
const tiedGroup = getTiedGroup(index);
const currentPlayer = sortedPlayers[index];
const targetPlayer = sortedPlayers[index - 1];

if (!currentPlayer || !targetPlayer) return;

setPlayers(prevPlayers => {
  if (!prevPlayers) return [];
  
  const currentTiebreak = currentPlayer.tiebreakOrder || tiedGroup.indexOf(index) + 1;
  const targetTiebreak = targetPlayer.tiebreakOrder || tiedGroup.indexOf(index - 1) + 1;
  
  return prevPlayers.map(player => {
    if (player.id === currentPlayer.id) {
      return { ...player, tiebreakOrder: targetTiebreak };
    }
    if (player.id === targetPlayer.id) {
      return { ...player, tiebreakOrder: currentTiebreak };
    }
    return player;
  });
});

setHasUnsavedChanges(true);

if (window.navigator && window.navigator.vibrate) {
  window.navigator.vibrate(50);
}
```

};

// Mover jogador para baixo
const movePlayerDown = (index) => {
if (!canMoveDown(index)) return;

```
const tiedGroup = getTiedGroup(index);
const currentPlayer = sortedPlayers[index];
const targetPlayer = sortedPlayers[index + 1];

if (!currentPlayer || !targetPlayer) return;

setPlayers(prevPlayers => {
  if (!prevPlayers) return [];
  
  const currentTiebreak = currentPlayer.tiebreakOrder || tiedGroup.indexOf(index) + 1;
  const targetTiebreak = targetPlayer.tiebreakOrder || tiedGroup.indexOf(index + 1) + 1;
  
  return prevPlayers.map(player => {
    if (player.id === currentPlayer.id) {
      return { ...player, tiebreakOrder: targetTiebreak };
    }
    if (player.id === targetPlayer.id) {
      return { ...player, tiebreakOrder: currentTiebreak };
    }
    return player;
  });
});

setHasUnsavedChanges(true);

if (window.navigator && window.navigator.vibrate) {
  window.navigator.vibrate(50);
}
```

};

// Guardar alteracoes
const handleSave = () => {
const finalResults = sortedPlayers.map((player, index) => ({
…player,
finalPosition: index + 1
}));

```
onSave(finalResults);
setHasUnsavedChanges(false);
```

};

// Cancelar
const handleCancel = () => {
if (hasUnsavedChanges) {
const confirmExit = window.confirm(‘Tem alterações não guardadas. Deseja sair?’);
if (!confirmExit) {
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

// Verificar se ha empates
const hasTies = () => {
if (!sortedPlayers || sortedPlayers.length === 0) return false;

```
const pointsCount = {};
sortedPlayers.forEach(player => {
  const points = player.points || 0;
  pointsCount[points] = (pointsCount[points] || 0) + 1;
});

return Object.values(pointsCount).some(count => count > 1);
```

};

// Verificar se jogador esta empatado
const isPlayerTied = (playerIndex) => {
if (!sortedPlayers || !sortedPlayers[playerIndex]) return false;

```
const player = sortedPlayers[playerIndex];
const playerPoints = player.points || 0;
const samePointsCount = sortedPlayers.filter(p => (p.points || 0) === playerPoints).length;

return samePointsCount > 1;
```

};

// Obter display da posicao
const getPositionDisplay = (position) => {
switch(position) {
case 1: return ‘🥇’;
case 2: return ‘🥈’;
case 3: return ‘🥉’;
default: return position + ‘º’;
}
};

// Calcular total de pontos
const totalPoints = sortedPlayers.reduce((sum, player) => {
return sum + (player.points || 0);
}, 0);

if (!isOpen) return null;

return (
<div className="fixed inset-0 bg-black bg-opacity-60 flex items-end sm:items-center justify-center z-50">
<style>{`
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

```
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

    input[type="number"]::-webkit-inner-spin-button,
    input[type="number"]::-webkit-outer-spin-button {
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
  `}</style>

  <div className="bg-white w-full sm:max-w-lg sm:mx-4 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[95vh] sm:max-h-[85vh] flex flex-col animate-slideUp sm:animate-fadeIn">
    
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
                {sortedPlayers.length} jogadores
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-xl transition-colors"
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
            key={`player-${player.id}`}
            className={`
              relative rounded-2xl p-4 transition-all transform
              ${isTied 
                ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 shadow-md' 
                : 'bg-white border-2 border-gray-200 shadow-sm'
              }
              ${index === 0 ? 'scale-105' : ''}
            `}
          >
            {/* Badge de empate */}
            {isTied && (
              <div className="absolute -top-2 -right-2">
                <span className="bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  EMPATE
                </span>
              </div>
            )}

            <div className="flex items-center gap-3">
              {/* Posicao */}
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
                    value={player.points || 0}
                    onChange={(e) => updatePoints(player.id, e.target.value)}
                    className={`
                      w-20 px-3 py-2 text-center font-bold text-lg
                      border-2 rounded-xl transition-all
                      ${isTied 
                        ? 'border-amber-400 bg-amber-50 focus:border-amber-500' 
                        : 'border-gray-300 bg-gray-50 focus:border-blue-500'
                      }
                      focus:outline-none focus:ring-4 focus:ring-opacity-20
                    `}
                  />
                </div>
              </div>

              {/* Botoes de Reordenacao */}
              {showReorderButtons ? (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => movePlayerUp(index)}
                    disabled={!canGoUp}
                    className={`
                      p-2 rounded-xl transition-all transform
                      ${!canGoUp
                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        : 'bg-amber-100 text-amber-600 hover:bg-amber-200 active:scale-95'
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
                      p-2 rounded-xl transition-all transform
                      ${!canGoDown
                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        : 'bg-amber-100 text-amber-600 hover:bg-amber-200 active:scale-95'
                      }
                    `}
                    aria-label="Descer no desempate"
                  >
                    <ChevronDown className="w-5 h-5" strokeWidth={3} />
                  </button>
                </div>
              ) : (
                <div className="w-12"></div>
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
          className="flex-1 px-4 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-2xl font-semibold hover:bg-gray-100 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2 shadow-lg"
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

export default RoundManagerMobile;
>>>>>>> 249665b5ac875026f5493556f2f33ee208667efd
