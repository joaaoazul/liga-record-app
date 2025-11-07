import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { firestoreService } from '../services/firebase';

const defaultSettings = {
  entryFee: 12,
  weeklyPayment: 5,
  dinnerPotGoal: 200,
  distributionPercentages: [40, 30, 20, 10],
};

const initialState = {
  players: [],
  rounds: [],
  transactions: [],
  reports: [],
  settings: defaultSettings,
  loading: true,
  refreshing: false,
  error: null,
  lastUpdated: null,
};

export const LeagueDataContext = createContext(null);

export const LeagueDataProvider = ({ children }) => {
  const [state, setState] = useState(initialState);

  const loadAll = useCallback(async (options = {}) => {
    const silent = options?.silent ?? false;

    setState((prev) => ({
      ...prev,
      loading: silent ? prev.loading : true,
      refreshing: silent ? true : false,
      error: null,
    }));

    try {
      const [players, rounds, transactions, settings, reports] = await Promise.all([
        firestoreService.getPlayers().catch(() => []),
        firestoreService.getRounds().catch(() => []),
        firestoreService.getTransactions().catch(() => []),
        firestoreService.getSettings().catch(() => null),
        firestoreService.getFinancialReports().catch(() => []),
      ]);

      const normalizedSettings = {
        ...defaultSettings,
        ...(settings || {}),
      };

      const payload = {
        players,
        rounds,
        transactions,
        reports,
        settings: normalizedSettings,
        loading: false,
        refreshing: false,
        error: null,
        lastUpdated: new Date().toISOString(),
      };

      setState(payload);
      return payload;
    } catch (error) {
      console.error('Failed to load league data', error);
      const message = error?.message || 'Erro ao carregar dados da liga';
      setState((prev) => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: message,
      }));
      throw error;
    }
  }, []);

  useEffect(() => {
    loadAll().catch(() => {
      /* error handled in loadAll */
    });
  }, [loadAll]);

  const runAndRevalidate = useCallback(
    async (task, options = {}) => {
      const { silent = true, skipReload = false } = options;

      try {
        const result = await task();

        if (!skipReload) {
          await loadAll({ silent });
        } else if (silent) {
          setState((prev) => ({ ...prev, refreshing: false }));
        }

        return result;
      } catch (error) {
        if (!skipReload) {
          await loadAll({ silent });
        } else if (silent) {
          setState((prev) => ({ ...prev, refreshing: false }));
        }
        throw error;
      }
    },
    [loadAll],
  );

  const value = useMemo(
    () => ({
      ...state,
      reload: () => loadAll({ silent: false }),
      refresh: () => loadAll({ silent: true }),
      actions: {
        savePlayer: (player, options) =>
          runAndRevalidate(() => firestoreService.savePlayer(player), options),
        updatePlayer: (playerId, updates, options) =>
          runAndRevalidate(() => firestoreService.updatePlayer(playerId, updates), options),
        deletePlayer: (playerId, options) =>
          runAndRevalidate(() => firestoreService.deletePlayer(playerId), options),
        addRound: (roundData, options) =>
          runAndRevalidate(() => firestoreService.addRound(roundData), options),
        updateRound: (roundId, updates, options) =>
          runAndRevalidate(() => firestoreService.updateRound(roundId, updates), options),
        deleteRound: (roundId, options) =>
          runAndRevalidate(() => firestoreService.deleteRound(roundId), options),
        addTransaction: (transaction, options = { silent: true }) =>
          runAndRevalidate(() => firestoreService.addTransaction(transaction), options),
        chargeWeeklyFees: (amount, options) =>
          runAndRevalidate(() => firestoreService.chargeWeeklyFees(amount), options),
        settleAllDebts: (options) =>
          runAndRevalidate(() => firestoreService.settleAllDebts(), options),
        settleDebt: (playerId, amount, note, options) =>
          runAndRevalidate(() => firestoreService.settleDebt(playerId, amount, note), options),
        addDebt: (playerId, amount, note, options) =>
          runAndRevalidate(() => firestoreService.addDebt(playerId, amount, note), options),
        payDebt: (playerId, amount, note, options) =>
          runAndRevalidate(() => firestoreService.payDebt(playerId, amount, note), options),
        resetAllBalances: (options) =>
          runAndRevalidate(() => firestoreService.resetAllBalances(), options),
        confirmPayment: (paymentId, amount, options) =>
          runAndRevalidate(() => firestoreService.confirmPayment(paymentId, amount), options),
        generateFinancialReport: (leagueId, options) =>
          runAndRevalidate(() => firestoreService.generateFinancialReport(leagueId), options),
        updateSettings: (settingsUpdate, options) =>
          runAndRevalidate(() => firestoreService.updateSettings(settingsUpdate), options),
      },
      helpers: {
        getPlayerById: (playerId) => firestoreService.getPlayerById(playerId),
        getRoundById: (roundId) => firestoreService.getRoundById(roundId),
        getFinancialReport: (reportId) => firestoreService.getFinancialReport(reportId),
        fetchPlayers: () => firestoreService.getPlayers(),
        fetchRounds: () => firestoreService.getRounds(),
        fetchTransactions: () => firestoreService.getTransactions(),
      },
    }),
    [state, loadAll, runAndRevalidate],
  );

  return <LeagueDataContext.Provider value={value}>{children}</LeagueDataContext.Provider>;
};

export default LeagueDataProvider;
