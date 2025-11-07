import { useContext } from 'react';
import { LeagueDataContext } from '../context/LeagueDataContext';

export const useLeagueData = () => {
  const context = useContext(LeagueDataContext);

  if (!context) {
    throw new Error('useLeagueData must be used within a LeagueDataProvider');
  }

  return context;
};

export default useLeagueData;
