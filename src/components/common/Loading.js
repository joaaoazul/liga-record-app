// src/components/common/Loading.js
import React from 'react';
import { Trophy } from 'lucide-react';

const Loading = ({ message = 'A carregar...' }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <Trophy className="h-12 w-12 text-green-600 animate-pulse" />
        </div>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg">{message}</p>
      </div>
    </div>
  );
};

export default Loading;