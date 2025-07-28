// src/components/financial/FinancialReport.js
import React, { useState, useEffect } from 'react';
import { FileText, Download, Share2, DollarSign, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { firestoreService } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';

const FinancialReport = ({ onBack, players }) => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  // IDs dos admins - SUBSTITUI COM OS VOSSOS IDs REAIS
  const ADMIN_ID = 'SEU_USER_ID_AQUI';
  const MANAGER_ID = 'RICARDO_USER_ID_AQUI';

  const isAdmin = user?.uid === ADMIN_ID || user?.uid === MANAGER_ID;

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const reportsData = await firestoreService.getFinancialReports();
      setReports(reportsData);
      setError(null);
    } catch (error) {
      console.error('Error loading reports:', error);
      setError('Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!isAdmin) {
      alert('⚠️ Apenas administradores podem gerar relatórios!');
      return;
    }

    setGenerating(true);
    setError(null);
    
    try {
      console.log('📊 Iniciando geração do relatório...');
      const result = await firestoreService.generateFinancialReport();
      
      if (result.success) {
        alert('✅ Relatório gerado com sucesso!');
        await loadReports();
        
        // Selecionar automaticamente o novo relatório
        const newReport = await firestoreService.getFinancialReport(result.reportId);
        if (newReport) {
          setSelectedReport(newReport);
        }
      } else {
        setError(result.error);
        alert(`❌ Erro: ${result.error}`);
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      setError('Erro ao gerar relatório');
      alert('❌ Erro ao gerar relatório');
    } finally {
      setGenerating(false);
    }
  };

  // src/components/financial/FinancialReport.js - Modifica a função shareWhatsApp


const shareWhatsApp = () => {
  if (!selectedReport) {
    alert('Nenhum relatório selecionado!');
    return;
  }
  
  // Verificar se os dados existem
  if (!selectedReport.playerSummary || selectedReport.playerSummary.length === 0) {
    alert('❌ Relatório sem dados de jogadores!');
    return;
  }
  
  // Ordenar jogadores: primeiro quem deve, depois quem recebe
  const sortedPlayers = [...selectedReport.playerSummary].sort((a, b) => {
    const balanceA = a.netBalance || a.currentBalance || 0;
    const balanceB = b.netBalance || b.currentBalance || 0;
    return balanceA - balanceB;
  });
  
  // Separar devedores e credores
  const devedores = sortedPlayers.filter(p => (p.totalOwed || 0) > 0);
  const credores = sortedPlayers.filter(p => (p.netBalance || p.currentBalance || 0) > 0);
  const neutros = sortedPlayers.filter(p => {
    const balance = p.netBalance || p.currentBalance || 0;
    const owed = p.totalOwed || 0;
    return balance === 0 && owed === 0;
  });
  
  // Construir mensagem estilizada
  let message = `⚽ *LIGA RECORD DOS CUÍCOS* ⚽\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📊 *ACERTO DE CONTAS*\n`;
  message += `🗓️ _${new Date().toLocaleDateString('pt-PT', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })}_\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Seção de quem deve pagar
  if (devedores.length > 0) {
    message += `💸 *DEVEM PAGAR:*\n`;
    message += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`;
    devedores.forEach((player, index) => {
      const owed = player.totalOwed || 0;
      // Usar emojis diferentes para variar
      const emoji = index % 2 === 0 ? '👉' : '▶️';
      message += `${emoji} *${player.playerName}*\n`;
      message += `     └─ €${owed.toFixed(2)} 💶\n`;
    });
    message += `\n`;
  }
  
  // Seção de quem vai receber
  if (credores.length > 0) {
    message += `💰 *VÃO RECEBER:*\n`;
    message += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`;
    credores.forEach((player, index) => {
      const receive = player.netBalance || player.currentBalance || 0;
      const emoji = index % 2 === 0 ? '✅' : '🎯';
      message += `${emoji} *${player.playerName}*\n`;
      message += `     └─ €${receive.toFixed(2)} 💵\n`;
    });
    message += `\n`;
  }
  
  // Seção dos neutros (se houver)
  if (neutros.length > 0 && neutros.length <= 3) { // Só mostrar se forem poucos
    message += `⚖️ *EQUILIBRADOS:*\n`;
    neutros.forEach(player => {
      message += `• ${player.playerName}\n`;
    });
    message += `\n`;
  }
  
  // Resumo final
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📈 *RESUMO FINAL*\n`;
  message += `├─ 💸 Total: *€${(selectedReport.totals?.totalToCollect || 0).toFixed(2)}*\n`;
  message += `├─ 👥 Jogadores: *${selectedReport.playerSummary.length}*\n`;
  message += `└─ 🏆 Época: *${selectedReport.season || new Date().getFullYear()}*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Assinatura
  message += `_Gerado automaticamente_\n`;
  message += `🤖 _Liga Record System_`;
  
  // Verificar tamanho e enviar
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
  
  console.log('📱 Tamanho da mensagem:', message.length, 'caracteres');
  console.log('📱 Tamanho da URL:', whatsappUrl.length, 'caracteres');
  
  if (whatsappUrl.length > 6000) {
    // Versão ultra compacta se ainda for muito grande
    let compactMessage = `⚽ *LIGA RECORD* ⚽\n\n`;
    compactMessage += `💸 *PAGAMENTOS:*\n`;
    devedores.forEach(p => {
      compactMessage += `${p.playerName}: -€${p.totalOwed.toFixed(2)}\n`;
    });
    compactMessage += `\n💰 *RECEBEM:*\n`;
    credores.forEach(p => {
      const amount = p.netBalance || p.currentBalance || 0;
      compactMessage += `${p.playerName}: +€${amount.toFixed(2)}\n`;
    });
    compactMessage += `\n*TOTAL: €${(selectedReport.totals?.totalToCollect || 0).toFixed(2)}*`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(compactMessage)}`, '_blank');
    
  } else {
    // Enviar mensagem normal
    window.open(whatsappUrl, '_blank');
  }
  
  // Backup: copiar para clipboard
  navigator.clipboard.writeText(message).catch(() => {
    console.log('Não foi possível copiar para clipboard');
  });
};

  const exportToPDF = () => {
    if (!selectedReport) {
      alert('Nenhum relatório selecionado!');
      return;
    }

    // Criar conteúdo HTML para impressão
    const printWindow = window.open('', '_blank');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório Financeiro - Liga Record dos Cuícos</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          h1, h2 {
            color: #333;
            text-align: center;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #ddd;
          }
          .date {
            color: #666;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
          }
          th {
            background-color: #f4f4f4;
            font-weight: bold;
          }
          .debt {
            color: #d32f2f;
            font-weight: bold;
          }
          .credit {
            color: #388e3c;
            font-weight: bold;
          }
          .neutral {
            color: #666;
          }
          .totals {
            margin-top: 30px;
            padding: 20px;
            background-color: #f9f9f9;
            border-radius: 8px;
          }
          .totals h3 {
            margin-top: 0;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 12px;
          }
          @media print {
            body {
              padding: 0;
            }
            button {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>⚽ Liga Record dos Cuícos</h1>
          <h2>Relatório Financeiro - Temporada ${selectedReport.season}</h2>
          <p class="date">Gerado em ${new Date(selectedReport.generatedAt).toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
        </div>

        <h3>Resumo por Jogador</h3>
        <table>
          <thead>
            <tr>
              <th>Jogador</th>
              <th>Rondas Jogadas</th>
              <th>Total Pago</th>
              <th>Balanço</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${selectedReport.playerSummary.map(player => `
              <tr>
                <td>${player.playerName}</td>
                <td style="text-align: center;">${player.roundsPlayed}</td>
                <td>€${player.totalPaid.toFixed(2)}</td>
                <td class="${player.netBalance < 0 ? 'debt' : player.netBalance > 0 ? 'credit' : 'neutral'}">
                  €${Math.abs(player.netBalance).toFixed(2)}
                </td>
                <td>
                  ${player.totalOwed > 0 
                    ? '<span class="debt">DEVE PAGAR</span>' 
                    : player.netBalance > 0 
                      ? '<span class="credit">VAI RECEBER</span>' 
                      : '<span class="neutral">EQUILIBRADO</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <h3>Resumo Financeiro</h3>
          <p><strong>Total a Cobrar:</strong> <span class="debt">€${selectedReport.totals.totalToCollect.toFixed(2)}</span></p>
          <p><strong>Total a Distribuir:</strong> <span class="credit">€${selectedReport.totals.totalToPay.toFixed(2)}</span></p>
          <p><strong>Balanço:</strong> €${selectedReport.totals.netBalance.toFixed(2)}</p>
        </div>

        <div class="footer">
          <p>Liga Record dos Cuícos - Relatório gerado automaticamente</p>
          <button onclick="window.print()" style="padding: 10px 20px; margin-top: 20px; cursor: pointer;">
            Imprimir / Guardar como PDF
          </button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Abrir diálogo de impressão automaticamente
    printWindow.onload = function() {
      printWindow.print();
    };
  };

  // Função para copiar texto
  const copyToClipboard = () => {
    if (!selectedReport) return;
    
    let text = `RELATÓRIO FINANCEIRO - TEMPORADA ${selectedReport.season}\n\n`;
    text += `Gerado: ${new Date(selectedReport.generatedAt).toLocaleDateString('pt-PT')}\n\n`;
    text += `RESUMO DE PAGAMENTOS:\n\n`;
    
    const sortedPlayers = [...selectedReport.playerSummary].sort((a, b) => a.netBalance - b.netBalance);
    
    sortedPlayers.forEach(player => {
      if (player.totalOwed > 0) {
        text += `❌ ${player.playerName}: DEVE PAGAR €${player.totalOwed.toFixed(2)}\n`;
      } else if (player.netBalance > 0) {
        text += `✅ ${player.playerName}: VAI RECEBER €${player.netBalance.toFixed(2)}\n`;
      } else {
        text += `➖ ${player.playerName}: Sem movimentos\n`;
      }
    });
    
    text += `\n━━━━━━━━━━━━━━━━━\n`;
    text += `💸 Total a cobrar: €${selectedReport.totals.totalToCollect.toFixed(2)}\n`;
    text += `💵 Total a distribuir: €${selectedReport.totals.totalToPay.toFixed(2)}\n`;
    
    navigator.clipboard.writeText(text).then(() => {
      alert('✅ Relatório copiado para a área de transferência!');
    }).catch(err => {
      console.error('Erro ao copiar:', err);
      alert('❌ Erro ao copiar o relatório');
    });
  };

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Relatórios Financeiros</h2>
            <p className="text-gray-600 mt-1">Gestão de pagamentos após 5 rondas</p>
          </div>
          
          <div className="flex items-center space-x-3">
            {isAdmin && (
              <button
                onClick={generateReport}
                disabled={generating}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2 font-semibold"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>A gerar...</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-5 w-5" />
                    <span>Gerar Novo Relatório</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Lista de Relatórios ou Detalhes */}
      {!selectedReport ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">Relatórios Anteriores</h3>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">A carregar relatórios...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Nenhum relatório gerado ainda</p>
              <p className="text-gray-400 text-sm mt-2">
                Após completar 5 rondas, podes gerar o primeiro relatório
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map(report => (
                <div
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 cursor-pointer transition-all"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800">
                        Temporada {report.season}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Gerado em {new Date(report.generatedAt).toLocaleDateString('pt-PT', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-red-600">
                        €{report.totals.totalToCollect.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">A cobrar</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <ReportDetails 
          report={selectedReport} 
          onBack={() => setSelectedReport(null)}
          onExport={exportToPDF}
          onShare={shareWhatsApp}
          onCopy={copyToClipboard}
        />
      )}
    </div>
  );
};

// Componente para mostrar detalhes do relatório
const ReportDetails = ({ report, onBack, onExport, onShare, onCopy }) => {
  return (
    <div className="space-y-6">
      {/* Ações */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            Relatório Temporada {report.season}
          </h2>
          
          <div className="flex space-x-3">
            <button
              onClick={onCopy}
              className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              <FileText className="h-4 w-4" />
              <span>Copiar</span>
            </button>
            
            <button
              onClick={onShare}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              <Share2 className="h-4 w-4" />
              <span>WhatsApp</span>
            </button>
            
            <button
              onClick={onExport}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              <span>PDF</span>
            </button>
            
            <button
              onClick={onBack}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 rounded-lg p-6 text-center">
          <DollarSign className="h-8 w-8 text-red-600 mx-auto mb-2" />
          <p className="text-sm text-red-600">Total a Cobrar</p>
          <p className="text-2xl font-bold text-red-800">
            €{report.totals.totalToCollect.toFixed(2)}
          </p>
        </div>
        
        <div className="bg-green-50 rounded-lg p-6 text-center">
          <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="text-sm text-green-600">Total a Pagar</p>
          <p className="text-2xl font-bold text-green-800">
            €{report.totals.totalToPay.toFixed(2)}
          </p>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-6 text-center">
          <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-blue-600">Jogadores</p>
          <p className="text-2xl font-bold text-blue-800">
            {report.playerSummary.length}
          </p>
        </div>
      </div>

      {/* Tabela de Jogadores */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Jogador
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Rondas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Total Pago
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Balanço
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Ação
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {report.playerSummary.map(player => (
              <tr key={player.playerId}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {player.playerName}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-500">
                    {player.roundsPlayed}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">
                    €{player.totalPaid.toFixed(2)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-sm font-medium ${
                    player.netBalance < 0 ? 'text-red-600' : 
                    player.netBalance > 0 ? 'text-green-600' : 
                    'text-gray-500'
                  }`}>
                    €{Math.abs(player.netBalance).toFixed(2)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {player.totalOwed > 0 ? (
                    <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                      Deve Pagar
                    </span>
                  ) : player.netBalance > 0 ? (
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                      Vai Receber
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                      Equilibrado
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FinancialReport;